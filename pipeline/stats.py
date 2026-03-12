"""
pipeline/stats.py

Compute V, VC, keyword V, and links for timeseries.json.
"""

import json
import polars as pl
from pathlib import Path
from itertools import combinations

METADATA_PATH    = "../data/metadata.json"
CLASSIFIED_DIR   = "../data/checkpoints/classified"
TIMESERIES_PATH  = "../data/timeseries.json"

def load_metadata():
    with open(METADATA_PATH) as f:
        return json.load(f)["nodes"]

def load_timeseries():
    path = Path(TIMESERIES_PATH)
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}

def get_prev_vc(timeseries, node_id, field="VC"):
    """Get the most recent VC value for a node across all months."""
    for month in sorted(timeseries.keys(), reverse=True):
        month_data = timeseries[month]
        for level in ["nodes_L1", "nodes_L2"]:
            if node_id in month_data.get(level, {}):
                return month_data[level][node_id][field]
    return 0

def get_prev_cc(timeseries, s, t):
    """Get the most recent CC value for a link across all months."""
    for month in sorted(timeseries.keys(), reverse=True):
        for link in timeseries[month].get("links", []):
            if link["S"] == s and link["T"] == t:
                return link["CC"]
    return 0

def run(year: int, month: int, top_term_stat: dict):
    ym = f"{year}-{month:02d}"
    ym_file = f"{year}{month:02d}"

    metadata   = load_metadata()
    timeseries = load_timeseries()
    df         = pl.read_parquet(f"{CLASSIFIED_DIR}/{ym_file}_classified.parquet")

    # All L1 and L2 node IDs
    l1_nodes = {k for k, v in metadata.items() if v["L"] == 1}
    l2_nodes = {k: v for k, v in metadata.items() if v["L"] == 2}

    # --- V per L2 node ---
    v_l2 = {node: 0 for node in l2_nodes}
    for row in df.iter_rows(named=True):
        all_nodes = row["T1"] + row["T2"] + row["T3"]
        for node in all_nodes:
            if node in v_l2:
                v_l2[node] += 1

    # --- V per L1 node (sum of children) ---
    v_l1 = {node: 0 for node in l1_nodes}
    for node, v in v_l2.items():
        parent = l2_nodes[node]["P"]
        v_l1[parent] += v

    # --- Links (L2 co-mentions) ---
    link_counts = {}
    for row in df.iter_rows(named=True):
        all_nodes = row["T1"] + row["T2"] + row["T3"]
        for s, t in combinations(all_nodes, 2):
            if s > t:
                s, t = t, s  # canonical order
            key = (s, t)
            link_counts[key] = link_counts.get(key, 0) + 1

    # --- Assemble output ---
    nodes_l1 = {}
    for node in l1_nodes:
        v  = v_l1[node]
        vc = get_prev_vc(timeseries, node) + v
        nodes_l1[node] = {"V": v, "VC": vc}

    nodes_l2 = {}
    for node in l2_nodes:
        v  = v_l2[node]
        vc = get_prev_vc(timeseries, node) + v
        nodes_l2[node] = {
            "V":  v,
            "VC": vc,
            "P":  l2_nodes[node]["P"],
            "K":  top_term_stat.get(node, []),
        }

    links = []
    for (s, t), c in link_counts.items():
        cc = get_prev_cc(timeseries, s, t) + c
        links.append({"S": s, "T": t, "C": c, "CC": cc})

    timeseries[ym] = {
        "nodes_L1": nodes_l1,
        "nodes_L2": nodes_l2,
        "links":    links,
    }

    with open(TIMESERIES_PATH, "w") as f:
        json.dump(timeseries, f, indent=2)

    print(f"Stats written for {ym}")
    print(f"  L1 nodes: {len(nodes_l1)}")
    print(f"  L2 nodes: {len(nodes_l2)}")
    print(f"  Links: {len(links)}")

if __name__ == "__main__":
    import argparse
    from keywords import run as run_keywords

    parser = argparse.ArgumentParser()
    parser.add_argument("year", type=int)
    parser.add_argument("month", type=int)
    args = parser.parse_args()

    top_term_stat = run_keywords(args.year, args.month)
    run(args.year, args.month, top_term_stat)
