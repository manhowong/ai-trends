"""
pipeline/keywords.py

Extract per-node keywords using TF-IDF.
"""

import json
import polars as pl
import yaml
from sklearn.feature_extraction.text import TfidfVectorizer
import numpy as np
import spacy
import subprocess
import sys

CONFIG_PATH   = "../config/settings.yml"
METADATA_PATH = "../data/metadata.json"
CLASSIFIED_DIR = "../data/checkpoints/classified"
ARXIV_DIR = "../data/arxiv_data"

def load_config():
    with open(CONFIG_PATH) as f:
        return yaml.safe_load(f)

def load_l2_nodes():
    with open(METADATA_PATH) as f:
        metadata = json.load(f)
    return {k for k, v in metadata["nodes"].items() if v["L"] == 2}

def load_spacy_model(model_name):
    try:
        nlp = spacy.load(model_name, disable=["ner"]) # disable "ner" to save time
    except OSError:
        print(f"Downloading {model_name}...")
        subprocess.run([sys.executable, "-m", "spacy", "download", model_name])
        nlp = spacy.load(model_name, disable=["ner"])
    
    if "merge_noun_chunks" not in nlp.pipe_names:
        nlp.add_pipe("merge_noun_chunks") # This merge noun phrases
    
    nlp.max_length = 3000000 
    return nlp

def lemmatize_texts(texts, model_name):
    # Process all topics in one batch using spaCy's pipe
    # n_process=-1 uses all available CPU cores
    # use nlp.pipe to handle large strings efficiently

    nlp = load_spacy_model(model_name)
    processed_corpus = []
    for doc in nlp.pipe(texts, batch_size=20, n_process=1):
        
        # Exclude unlikely words (words other than nouns, adj, proper nouns)
        exclude_pos = ("VERB", "ADV", "PRON", "ADP", "CONJ", "DET", "PUNCT")

        tokens = [
            token.lemma_.lower().replace(" ", "_") # handle plurals and connect noun phrases           
            for token in doc 
            if token.pos_ not in exclude_pos
            # and not token.is_stop    # Remove stop words
            and len(token.text) > 1    # More than 1 character
        ]
        processed_corpus.append(" ".join(tokens))
    return processed_corpus

def get_top_k(all_terms, scores, k=20):
    
    # Sort by score descending
    top_idx = scores.argsort()[::-1][:k]
    non_zeros = scores[scores > 0]

    # Return if all terms have zero scores
    if len(non_zeros) == 0:
        return []
    
    # Ignore terms with score below or above a range
    score_low_bound = np.min(non_zeros) + 1 * np.std(non_zeros)
    score_up_bound = 1

    top_terms = []   
    for i in top_idx:
        term = all_terms[i]
        
        if (
            scores[i] <= score_low_bound or 
            scores[i] >= score_up_bound or 
            any(term in existing for existing in top_terms) # Skip if the term is a sub-part of a phrase already in our list
            ):                                              # e.g., if "deep learning" is in, skip "learning"
            continue

        top_terms.append(term)

    return top_terms


def run(year: int, month: int):

    config = load_config()
    model_name = config["spacy"]["model"]
    top_k = config["tfidf"]["top_k"]
    max_features = config["tfidf"]["max_features"]
    max_df = config["tfidf"]["max_df"]
    min_df = config["tfidf"]["min_df"]
    min_abs = config["Keyword_stat"]["min_abs"]

    ym = f"{year}{month:02d}"

    arxiv_data = pl.read_parquet(f"{ARXIV_DIR}/{ym}.parquet")
    labeled_data = pl.read_parquet(f"{CLASSIFIED_DIR}/{ym}_classified.parquet")
    labeled_data = labeled_data.join(arxiv_data.select(["arxiv_id", "abstract"]), 
                                    on="arxiv_id", how="left")

    # Group abstracts by node (only using papers on T1, since they contain 
    # keywords most relevant to a node)
    l2_nodes = load_l2_nodes()
    abstracts_by_node = {node: [] for node in l2_nodes}
    for row in labeled_data.iter_rows(named=True):
        for node in row["T1"]:
            if node in abstracts_by_node:
                abstracts_by_node[node].append(row["abstract"])

    # Nodes that have papers
    active_nodes = [n for n, a in abstracts_by_node.items() if a]

    # Pooled abstracts by node. Each node has a long string (a document for TFIDF)
    pooled_abstracts = [" ".join(abstracts_by_node[n]) for n in active_nodes]

    # Lemmatize tokens to get the final Corpus
    corpus = lemmatize_texts(pooled_abstracts, model_name) # 1-2 min for 2K abstracts on CPU

    # TFIDF vectorizer
    # Note: 1 document = abstracts from 1 node 
    vectorizer = TfidfVectorizer(
        sublinear_tf=True,
        max_features=max_features, # max number of unique terms
        stop_words="english", 
        token_pattern=r"(?=.*[a-zA-Z])[\w\-]{2,}", # at least 2 chars with 1 letter
        max_df=max_df, # Ignore terms that appear in more than max_df% of all topics 
        min_df=min_df # Ignore terms that only appear in less than min_df topic(s)
    )

    # Get TF-IDF scores and terms
    tfidf_matrix = vectorizer.fit_transform(corpus)
    all_terms = vectorizer.get_feature_names_out()

    # Get top terms by scores
    top_terms_by_node = {}
    for i, node in enumerate(active_nodes):
        scores = tfidf_matrix[i].toarray().flatten()
        top_terms_by_node[node] = get_top_k(all_terms, scores, k=top_k)

    # Count top terms by node
    top_term_stat = {}
    for node, keywords in top_terms_by_node.items():
        abstracts = abstracts_by_node[node]
        counts = []
        for kw in keywords:
            kw_plain = kw.replace("_", " ")
            v = sum(1 for abstract in abstracts if kw_plain.lower() in abstract.lower())
            if v > min_abs: # Only include terms that appear in > min_abs abstract(s)
                counts.append({"N": kw_plain, "V": v})
        top_term_stat[node] = counts

    return top_term_stat

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("year", type=int)
    parser.add_argument("month", type=int)
    args = parser.parse_args()
    run(args.year, args.month)








