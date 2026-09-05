"""Timeseries volume and co-occurrence statistics."""

from itertools import combinations


def get_prev_vc(timeseries: dict, node_id: str, field: str) -> int:
    """Get the most recent VC value for a node across all months."""
    for timestamp in sorted(timeseries, reverse=True):
        for level in ("nodes_L1", "nodes_L2"):
            if node_id in timeseries[timestamp].get(level, {}):
                return timeseries[timestamp][level][node_id][field]
    return 0


def get_prev_cc(timeseries: dict, source: str, target: str) -> int:
    """Get the most recent CC value for a link across all months."""
    for timestamp in sorted(timeseries, reverse=True):
        for link in timeseries[timestamp].get("links", []):
            if link["S"] == source and link["T"] == target:
                return link["CC"]
    return 0


def update_timeseries(year: int, month: int, timeseries: dict, labeled_data, keywords: dict, l1_nodes: dict, l2_nodes: dict) -> dict:

    # Count volume per L2 node and links per L2-node pair
    l2_volume = {node: 0 for node in l2_nodes}
    link_counts = {}
    for row in labeled_data.iter_rows(named=True):
        nodes = row["T1"] + row["T2"] # + row["T3"]
        # Count volume per L2 node
        for node in nodes:
            if node in l2_volume:
                l2_volume[node] += 1
        # Count links per L2-node pair (L2 co-mentions)        
        for source, target in combinations(nodes, 2):
            key = tuple(sorted((source, target)))
            link_counts[key] = link_counts.get(key, 0) + 1

    # Count volume per L1 node (sum of children's volumes)
    l1_volume = {node: 0 for node in l1_nodes}
    for node, volume in l2_volume.items():
        l1_volume[l2_nodes[node]["P"]] += volume

    # Update timeseries
    timestamp = f"{year}-{month:02d}"
    timeseries[timestamp] = {
        "nodes_L1": {node: {"V": volume, "VC": get_prev_vc(timeseries, node, "VC") + volume} for node, volume in l1_volume.items()},
        "nodes_L2": {node: {"V": volume, "VC": get_prev_vc(timeseries, node, "VC") + volume, "P": l2_nodes[node]["P"], "K": keywords.get(node, [])} for node, volume in l2_volume.items()},
        "links": [{"S": source, "T": target, "C": count, "CC": get_prev_cc(timeseries, source, target) + count} for (source, target), count in link_counts.items()],
    }
    return timeseries
