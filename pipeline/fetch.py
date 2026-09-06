"""Fetch a month's arXiv records (deduplicated) with retries and checkpointing."""

from datetime import date, timedelta
import json
import random
import time
from pathlib import Path
import shutil

import arxiv
import polars as pl
from tqdm import tqdm


def get_weekly_slices(year: int, month: int) -> list[tuple[str, str]]:
    """Splits a month into sequential 7-day chunks clamped to the month end.
       Example: 1st-7th, 8th-14th, etc.
    """
    slices = []
    current = date(year, month, 1)
    while current.month == month:
        # Calculate end of week, clamp to the final day of the current month
        end = current + timedelta(days=6)
        if end.month != month:
            next_month = date(year + 1, 1, 1) if month == 12 else date(year, month + 1, 1)
            end = next_month - timedelta(days=1)
        slices.append((current.strftime("%Y%m%d0000"), end.strftime("%Y%m%d2359")))
        current = end + timedelta(days=1)
    return slices


def fetch_slice_with_retries(
    client: arxiv.Client,
    category_query: str,
    start: str,
    end: str,
    max_retries: int = 3,
    base_backoff_seconds: float = 10.0,
) -> list[dict]:
    """Fetches records for a single time slice with exponential backoff (10s, 30s, 90s... +jitter)"""

    # Search configurations
    search = arxiv.Search(
        query=f"{category_query} AND submittedDate:[{start} TO {end}]",
        sort_by=arxiv.SortCriterion.SubmittedDate,
    )

    # Note: client.results() first makes an initial request, then make subsequent 
    # requests to fetch results page by page (e.g. a batch of 200 records, 
    # instead of thousands of records in one request)

    for attempt in range(1, max_retries + 1):
        try:
            records = []
            for result in client.results(search):
                # Strips version tags (e.g., '2401.12345v2' -> '2401.12345')
                arxiv_id = result.entry_id.rsplit("/", 1)[-1].split("v")[0]
                records.append(
                    {
                        "arxiv_id": arxiv_id,
                        "title": result.title.strip(),
                        "abstract": result.summary.strip(),
                    }
                )
            return records
        except Exception as error:
            if attempt == max_retries:
                tqdm.write(
                    f"\nERROR for fetching {start}–{end}: Exhausted all {max_retries} attempts. "
                    f"\nDetails: {error}\n"
                )
                raise error

            # Calculate exponential backoff with jitter (e.g., ~10s, ~30s, ~90s)
            backoff = (base_backoff_seconds * (3 ** (attempt - 1))) + random.uniform(1, 5)
            tqdm.write(
                f"\nWARNING for fetching {start}–{end}: Attempt {attempt}/{max_retries} failed. "
                f"\nDetails: {error}\n"
                f"\nRetrying in {backoff:.1f}s..."
            )
            time.sleep(backoff)

    return []


def fetch_month(
    year: int,
    month: int,
    categories: list[str],
    output_dir: Path,
    checkpoint_dir: Path,
) -> Path:
    """Fetch deduplicated metadata for specified categories in a given month.
       Uses local JSON checkpoints to skip completed slices across re-runs.
       Raises RuntimeError if a slice fails.
    """
    month_checkpoint_dir = checkpoint_dir / f"{year}{month:02d}"
    month_checkpoint_dir.mkdir(parents=True, exist_ok=True)

    # Configure the client (4-second delay to respect rate limits)
    client = arxiv.Client(page_size=200, delay_seconds=4, num_retries=5)

    # Combine categories into a single query string to minimize API calls
    # e.g.: "(cat:cs.LG OR cat:cs.AI OR cat:cs.CL)"
    category_query = "(" + " OR ".join(f"cat:{c}" for c in categories) + ")"

    weekly_slices = get_weekly_slices(year, month)
    rows, seen = [], set()
    for start, end in tqdm(weekly_slices, desc=f"Fetching {year}-{month:02d}"):
        checkpoint_file = month_checkpoint_dir / f"slice_{start}_{end}.json"

        # Recover from checkpoint if available, otherwise fetch from API
        if checkpoint_file.exists():
            tqdm.write(f"Fetching {year}-{month:02d}: Checkpoint found for {start}–{end}. Loading from cache...")
            with open(checkpoint_file, "r", encoding="utf-8") as f:
                slice_records = json.load(f)
        else:
            try:
                slice_records = fetch_slice_with_retries(client, category_query, start, end)
                # Save slice checkpoint
                with open(checkpoint_file, "w", encoding="utf-8") as f:
                    json.dump(slice_records, f, ensure_ascii=False, indent=2)
            except Exception as e:
                raise RuntimeError(
                    f"Fetch failed for range {start}–{end} after retries. "
                    f"\nCause: {e}\n"
                ) from e

        # Deduplicate across slices
        for record in slice_records:
            arxiv_id = record["arxiv_id"]
            if arxiv_id not in seen:
                seen.add(arxiv_id)
                rows.append(
                    {
                        "arxiv_id": arxiv_id,
                        "YYYY-MM": f"{year}-{month:02d}",
                        "title": record["title"],
                        "abstract": record["abstract"],
                    }
                )

    # Save final output
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{year}{month:02d}.parquet"
    pl.DataFrame(
        rows,
        schema={
            "arxiv_id": pl.String,
            "YYYY-MM": pl.String,
            "title": pl.String,
            "abstract": pl.String,
        },
    ).write_parquet(output_path)

    # Cleanup checkpoints on success
    if month_checkpoint_dir.exists():
        shutil.rmtree(month_checkpoint_dir)

    return output_path
