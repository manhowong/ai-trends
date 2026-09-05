"""Fetch a month's arXiv records (deduplicated)."""

from datetime import date, timedelta
from pathlib import Path
import time

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


def fetch_month(year: int, month: int, categories: list[str], output_dir: Path) -> Path:
    """Fetch deduplicated metadata for all specified categories in a given month,
       and write ``YYYYMM.parquet``.
    """
    rows, seen = [], set()

    # Configure the client (4-second delay to respect rate limits)
    client = arxiv.Client(page_size=200, delay_seconds=4, num_retries=5)

    # Combine categories into a single query string to minimize API calls
    # e.g.: "(cat:cs.LG OR cat:cs.AI OR cat:cs.CL)"
    category_query = "(" + " OR ".join(f"cat:{c}" for c in categories) + ")"

    for start, end in tqdm(get_weekly_slices(year, month), desc=f"Fetching {year}-{month:02d}"):
        search = arxiv.Search(
            query=f"{category_query} AND submittedDate:[{start} TO {end}]",
            sort_by=arxiv.SortCriterion.SubmittedDate,
        )
        try:
            # The library generator automatically fetches next pages cleanly
            for result in client.results(search):
                # Strips version tags (e.g., '2401.12345v2' -> '2401.12345')
                arxiv_id = result.entry_id.rsplit("/", 1)[-1].split("v")[0]
                if arxiv_id not in seen:
                    seen.add(arxiv_id)
                    rows.append({"arxiv_id": arxiv_id, "YYYY-MM": f"{year}-{month:02d}",
                                 "title": result.title.strip(), "abstract": result.summary.strip()})
        except Exception as error:
            tqdm.write(f"Warning: request failed for {start}–{end}: {error}")
            time.sleep(10)

    output_path = output_dir / f"{year}{month:02d}.parquet"
    pl.DataFrame(rows, schema={"arxiv_id": pl.String, "YYYY-MM": pl.String,
                               "title": pl.String, "abstract": pl.String}).write_parquet(output_path)
    return output_path
