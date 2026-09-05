"""Embed paper abstracts and L2 node descriptions."""

from pathlib import Path

import numpy as np
from sentence_transformers import SentenceTransformer


def load_model(model_name: str, device: str | None = None) -> SentenceTransformer:
    return SentenceTransformer(model_name, device=device)


def embed_texts(model: SentenceTransformer, texts: list[str], batch_size: int=256) -> np.ndarray:
    return model.encode(texts, batch_size=batch_size, show_progress_bar=True)


def load_or_create(path: Path, model: SentenceTransformer, texts: list[str], batch_size: int) -> np.ndarray:
    if path.exists():
        print(f"Loaded embeddings: {path}")
        return np.load(path)
    print(f"Generating embeddings: {path}")
    embeddings = embed_texts(model, texts, batch_size)
    np.save(path, embeddings)
    return embeddings
