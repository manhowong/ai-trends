"""Repository-relative paths used by the monthly pipeline."""

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class PipelinePaths:
    root: Path
    config: Path
    metadata: Path
    timeseries: Path
    arxiv_dir: Path
    arxiv_checkpoint_dir: Path
    embeddings_dir: Path
    classified_dir: Path

    @classmethod
    def default(cls, root: Path | None = None) -> "PipelinePaths":
        project_root = root or Path(__file__).resolve().parent.parent
        data_dir = project_root / "data"
        return cls(
            root=project_root,
            config=project_root / "config" / "settings.yml",
            metadata=data_dir / "metadata.json",
            timeseries=data_dir / "timeseries.json",
            arxiv_dir=data_dir / "arxiv_data",
            arxiv_checkpoint_dir = data_dir /  "checkpoints" / "arxiv",
            embeddings_dir=data_dir / "checkpoints" / "embeddings",
            classified_dir=data_dir / "checkpoints" / "classified",
        )

    def ensure_output_dirs(self) -> None:
        directories = (
            self.arxiv_dir,
            self.arxiv_checkpoint_dir,
            self.embeddings_dir,
            self.classified_dir,
        )
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
