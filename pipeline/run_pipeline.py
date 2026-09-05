"""Run the complete monthly arXiv trend pipeline."""

import argparse
from datetime import date
from pathlib import Path
import sys

import polars as pl

if __package__:
    from .classify import classify, cosine_similarity
    from .embed import load_model, load_or_create
    from .fetch import fetch_month
    from .io import load_config, load_nodes, load_timeseries, write_timeseries
    from .keywords import extract_keywords
    from .paths import PipelinePaths
    from .stats import update_timeseries
else:  # Supports: python pipeline/run_pipeline.py --year ... --month ...
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from pipeline.classify import classify, cosine_similarity
    from pipeline.embed import load_model, load_or_create
    from pipeline.fetch import fetch_month
    from pipeline.io import load_config, load_nodes, load_timeseries, write_timeseries
    from pipeline.keywords import extract_keywords
    from pipeline.paths import PipelinePaths
    from pipeline.stats import update_timeseries


def run_pipeline(year: int, month: int, config_path: Path | None = None) -> None:
    """Fetch, classify, summarize, and persist one calendar month."""
    date(year, month, 1)  # validates the requested month
    ym = f"{year}{month:02d}"

    # Paths
    paths = PipelinePaths.default()
    paths.ensure_output_dirs()

    # Configurations
    config = load_config(config_path or paths.config)
    categories = config["arxiv"]["categories"]
    confidence_threshold = config["classification"]["confidence_threshold"]
    t1_gap = config["classification"]["t1_gap"]
    top_n_candidates= config["classification"]["top_n_candidates"]
    embedding_model = config["embedding"]["model"]
    embedding_device = config["embedding"].get("device")
    batch_size = config["embedding"]["batch_size"]

    # Metadata
    l1_nodes, l2_nodes = load_nodes(paths.metadata, 1), load_nodes(paths.metadata, 2)
    l2_node_ids = list(l2_nodes)
    node_texts = [f"Query: {node['N']}: {node['D']}" for node in l2_nodes.values()]

    print(f"1/6 Fetching papers for {year}-{month:02d}")
    # This calls the live arXiv API and overwrites data/arxiv_data/{ym}.parquet.
    paper_path = fetch_month(year, month, categories, paths.arxiv_dir)
    # Load fetched data
    arxiv_data = pl.read_parquet(paper_path)

    print("2/6 Loading embedding model")
    model = load_model(embedding_model, embedding_device)

    print("3/6 Loading or gnerating embeddings")
    node_embeddings = load_or_create(paths.embeddings_dir / "nodes.npy", model, node_texts, batch_size)
    abstract_embeddings = load_or_create(paths.embeddings_dir / f"{ym}_abstracts.npy", model, arxiv_data["abstract"].to_list(), batch_size)

    print("4/6 Classifying papers")
    classified, ambiguous = classify(arxiv_data, cosine_similarity(abstract_embeddings, node_embeddings), l2_node_ids, confidence_threshold, t1_gap, top_n_candidates)
    classified_path = paths.classified_dir / f"{ym}_classified.parquet"
    pl.DataFrame(classified).write_parquet(classified_path)
    pl.DataFrame(ambiguous).write_parquet(paths.classified_dir / f"{ym}_ambiguous.parquet")
    print(f"Classified: {len(classified)} | Ambiguous: {len(ambiguous)}")

    print("5/6 Extracting keywords")
    labeled_data = pl.read_parquet(classified_path).join(arxiv_data.select(["arxiv_id", "abstract"]), on="arxiv_id", how="left")
    keywords = extract_keywords(labeled_data, l2_node_ids, config)

    print("6/6 Updating timeseries.json")
    timeseries = update_timeseries(year, month, load_timeseries(paths.timeseries), labeled_data, keywords, l1_nodes, l2_nodes)
    write_timeseries(paths.timeseries, timeseries)
    print(f"Completed {year}-{month:02d}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the monthly arXiv trend pipeline.")
    parser.add_argument("--year", type=int, required=True, help="Four-digit year")
    parser.add_argument("--month", type=int, required=True, choices=range(1, 13), help="Month (1-12)")
    parser.add_argument("--config", type=Path, help="Optional settings.yml path")
    args = parser.parse_args()
    run_pipeline(args.year, args.month, args.config)


if __name__ == "__main__":
    main()
