from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

from src.collectors.anthropic_news import AnthropicNewsCollector
from src.collectors.base import Collector
from src.collectors.claude_status import ClaudeStatusCollector
from src.collectors.github_releases import GitHubReleasesCollector
from src.dedup import dedup, filter_already_seen
from src.models import Article
from src.state import State

DATA_DIR = Path(__file__).resolve().parent.parent.parent / "data"
STATE_PATH = DATA_DIR / "state.json"
CANDIDATES_PATH = DATA_DIR / "candidates.json"
RAW_DIR = DATA_DIR / "raw"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger("fetcher")


def get_collectors() -> list[Collector]:
    """Phase 2: T1 sources only, no LLM."""
    return [
        GitHubReleasesCollector(),
        ClaudeStatusCollector(),
        AnthropicNewsCollector(),
    ]


def load_existing_candidates() -> list[Article]:
    if not CANDIDATES_PATH.exists():
        return []
    try:
        data = json.loads(CANDIDATES_PATH.read_text())
        return [Article.from_dict(d) for d in data]
    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("candidates.json unreadable (%s), starting fresh", e)
        return []


def save_candidates(articles: list[Article]) -> None:
    CANDIDATES_PATH.parent.mkdir(parents=True, exist_ok=True)
    payload = [a.to_dict() for a in articles]
    CANDIDATES_PATH.write_text(
        json.dumps(payload, indent=2, ensure_ascii=False)
    )


def run() -> int:
    logger.info("Fetcher run started at %s", datetime.now(timezone.utc).isoformat())
    RAW_DIR.mkdir(parents=True, exist_ok=True)

    state = State(STATE_PATH)
    collectors = get_collectors()

    all_new: list[Article] = []
    for collector in collectors:
        try:
            fetched = collector.collect()
        except Exception as e:  # noqa: BLE001 — we want any collector failure isolated
            logger.exception("Collector %s crashed: %s", collector.name, e)
            continue

        new_only = filter_already_seen(fetched, state, collector.name)
        if new_only:
            # Feed ordering is typically newest-first; record the newest as last-seen
            newest = max(new_only, key=lambda a: a.published_at)
            state.update(collector.name, newest.guid, newest.published_at)
            logger.info("%s: %d new items", collector.name, len(new_only))
        else:
            logger.info("%s: no new items", collector.name)

        all_new.extend(new_only)

    deduped = dedup(all_new)

    # Merge with existing candidates (preserve items not yet reviewed)
    existing = load_existing_candidates()
    existing_guids = {a.guid for a in existing if a.guid}
    merged = existing + [a for a in deduped if a.guid not in existing_guids]

    save_candidates(merged)
    state.save()

    logger.info(
        "Run complete: %d new (%d after dedup), %d total candidates",
        len(all_new),
        len(deduped),
        len(merged),
    )
    return 0


if __name__ == "__main__":
    sys.exit(run())
