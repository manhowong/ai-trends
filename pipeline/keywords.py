"""Per-topic TF-IDF keyword extraction."""

import subprocess
import sys

import numpy as np
import spacy
from sklearn.feature_extraction.text import TfidfVectorizer


def load_spacy_model(model_name: str):
    try:
        nlp = spacy.load(model_name, disable=["ner"]) # disable "ner" to save time
    except OSError:
        subprocess.run([sys.executable, "-m", "spacy", "download", model_name], check=True)
        nlp = spacy.load(model_name, disable=["ner"])
    if "merge_noun_chunks" not in nlp.pipe_names:
        nlp.add_pipe("merge_noun_chunks") # This merge noun phrases
    nlp.max_length = 3_000_000
    return nlp


def lemmatize_texts(texts: list[str], model_name: str) -> list[str]:
    nlp = load_spacy_model(model_name)

    # Exclude unlikely words (words other than nouns, adj, proper nouns)
    excluded_pos = {"VERB", "ADV", "PRON", "ADP", "CONJ", "DET", "PUNCT"}

    return [
        " ".join(
            token.lemma_.lower().replace(" ", "_") # handle plurals and connect noun phrases
            for token in doc
            if token.pos_ not in excluded_pos 
            # and not token.is_stop    # Remove stop words
            and len(token.text) > 1 # More than 1 character
        )
        for doc in nlp.pipe(texts, batch_size=20, n_process=1)
    ]


def compute_tfidf(corpus: list[str], max_features: int, max_df: float, min_df: int):
    vectorizer = TfidfVectorizer(
        sublinear_tf=True,
        max_features=max_features, # max number of unique terms
        stop_words="english",
        token_pattern=r"(?=.*[a-zA-Z])[\w\-]{3,}", # at least 2 chars with 1 letter
        max_df=max_df, # Ignore terms that appear in more than max_df% of all topics 
        min_df=min_df, # Ignore terms that only appear in less than min_df topics
    )
    try:
        matrix = vectorizer.fit_transform(corpus)
        all_terms = vectorizer.get_feature_names_out()
    except ValueError as error:
        if "empty vocabulary" in str(error):
            return None, None
        raise
    return matrix, all_terms


def get_top_k(all_terms: np.ndarray, scores: np.ndarray, k: int) -> list[str]:
    nonzero_scores = scores[scores > 0]
    if not len(nonzero_scores): # Return if all terms have zero scores
        return []
    
    # Ignore terms with score below or above a range
    lower_bound = np.min(nonzero_scores) + np.std(nonzero_scores)
    upper_bound = 1

    top_terms = []
    for index in scores.argsort()[::-1]: # Sort by score descending
        term = all_terms[index]
        if (
            scores[index] <= lower_bound
            or scores[index] >= upper_bound
            or any(term in existing for existing in top_terms) # Skip if the term is a sub-part of a phrase already in our list
        ):                                                     # e.g., if "deep learning" is in, skip "learning"
            continue
        top_terms.append(term)
        if len(top_terms) == k:
            break
    return top_terms


def get_keyword_dict(
    tfidf_matrix,
    all_terms: np.ndarray,
    active_nodes: list[str],
    abstracts_by_node: dict[str, list[str]],
    top_k: int,
    min_abs: int,
) -> dict:
    keyword_dict = {}
    for index, node in enumerate(active_nodes):
        scores = tfidf_matrix[index].toarray().ravel()
        keywords = get_top_k(all_terms, scores, top_k)
        counts = []
        for kw in keywords:
            kw_plain = kw.replace("_", " ").lower()
            mentions = sum(kw_plain in abstract.lower() for abstract in abstracts_by_node[node])
            if mentions > min_abs:
                counts.append({"N": kw_plain, "V": mentions})
        keyword_dict[node] = counts
    return keyword_dict


def extract_keywords(labeled_data, node_ids: list[str], config: dict) -> dict:

    # Group abstracts by node
    # each node's keywords are extracted from only the T1 abtracts assigned to that node 
    abstracts_by_node = {node: [] for node in node_ids}
    for nodes, abstract in zip(labeled_data["T1"], labeled_data["abstract"]):
        for node in nodes:
            abstracts_by_node[node].append(abstract)

    # Nodes that have papers
    active_nodes = [node for node, abstracts in abstracts_by_node.items() if abstracts]
    if not active_nodes:
        return {}

    # Create a corpus for computing TFIDF (1-2 min for 2K abstracts on CPU)
    # 1. Pool abstracts by L2 node. Each node becomes a document in the corpus (a long string).
    # 2. Lemmatize the tokens to get the final corpus.
    pooled_abstracts = [" ".join(abstracts_by_node[node]) for node in active_nodes]
    corpus = lemmatize_texts(pooled_abstracts, config["spacy"]["model"])

    # Compute TFIDF matrix
    tfidf_config = config["tfidf"]
    tfidf_matrix, all_terms = compute_tfidf(
        corpus,
        tfidf_config["max_features"],
        tfidf_config["max_df"],
        tfidf_config["min_df"],
    )
    if tfidf_matrix is None:
        return {}

    # keyword metions per node
    return get_keyword_dict(
        tfidf_matrix,
        all_terms,
        active_nodes,
        abstracts_by_node,
        tfidf_config["top_k"],
        config["Keyword_stat"]["min_abs"],
    )
