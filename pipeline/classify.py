"""Classify by graded relevance (based on cosine similarity)."""

import numpy as np
import polars as pl


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a = a / np.linalg.norm(a, axis=1, keepdims=True)
    b = b / np.linalg.norm(b, axis=1, keepdims=True)
    return a @ b.T


def assign_tiers(scores: np.ndarray, node_ids: list[str], threshold: float, t1_gap: float):
    ranked_indices = np.argsort(scores)[::-1]
    candidates = [(node_ids[index], scores[index]) for index in ranked_indices if scores[index] >= threshold]
    if not candidates:
        return [], [], [], [], [], []
    top_score = candidates[0][1]
    t1 = [(node, score) for node, score in candidates if top_score - score < t1_gap][:2]
    t2 = candidates[len(t1):len(t1) + 2]
    t3 = candidates[len(t1) + 2:len(t1) + 6]
    return (
        [node for node, _ in t1], [round(float(score), 4) for _, score in t1], 
        [node for node, _ in t2], [round(float(score), 4) for _, score in t2],
        [node for node, _ in t3], [round(float(score), 4) for _, score in t3],
    )


def classify(arxiv_data: pl.DataFrame, sim_matrix: np.ndarray, node_ids: list[str], threshold: float, t1_gap: float, top_n_candidates: int) -> tuple[list[dict], list[dict]]:
    classified, ambiguous = [], []
    for index, row in enumerate(arxiv_data.iter_rows(named=True)):
        scores = sim_matrix[index]
        t1, t1_scores, t2, t2_scores, t3, t3_scores = assign_tiers(scores, node_ids, threshold, t1_gap)
        record = {
            "arxiv_id":   row["arxiv_id"],
            "YYYY-MM":    row["YYYY-MM"],
            "T1":         t1,  
            "T1_cos_sim": t1_scores,
            "T2":         t2,  
            "T2_cos_sim": t2_scores,
            # "T3":         t3,  
            # "T3_cos_sim": t3_scores,
            "TU":         [],
            "K":          [],
            "method":     "emb",
        }
        if t1:
            classified.append(record)
        else:
            record["top_candidates"] = [
                {"node": node_ids[item], "score": round(float(scores[item]), 4)}
                for item in np.argsort(scores)[::-1][:top_n_candidates]
            ]
            ambiguous.append(record)
    return classified, ambiguous
