"""Configuration and project-data serialization helpers."""

import json
from pathlib import Path

import yaml


def load_config(path: Path) -> dict:
    with path.open(encoding="utf-8") as file:
        return yaml.safe_load(file)


def load_nodes(metadata_path: Path, level: int) -> dict:
    with metadata_path.open(encoding="utf-8") as file:
        metadata = json.load(file)
    return {node_id: node for node_id, node in metadata["nodes"].items() if node["L"] == level}


def load_timeseries(path: Path) -> dict:
    if not path.exists():
        return {}
    with path.open(encoding="utf-8") as file:
        return json.load(file)


def write_timeseries(path: Path, timeseries: dict) -> None:
    with path.open("w", encoding="utf-8") as file:
        json.dump(timeseries, file, indent=2)
        file.write("\n")
