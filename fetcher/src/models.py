from __future__ import annotations

from dataclasses import dataclass, asdict, field
from datetime import datetime
from typing import Optional


@dataclass
class Article:
    """A candidate news item from any source tier.

    Neutral wrt claude_pulse_log.md schema — transformation happens later
    when a candidate is promoted to the published log.
    """

    title: str
    url: str
    source: str  # domain, e.g., "github.com"
    tier: str  # "T1" | "T2" | "T3" | "T4" | "T5"
    published_at: datetime  # UTC
    summary_raw: str = ""  # fetched body / description, pre-LLM
    guid: str = ""  # stable identifier for dedup (feed GUID or URL)
    category_hint: Optional[str] = None  # best guess from source (e.g., github → claude-code)
    meta: dict = field(default_factory=dict)  # feed-specific extras

    def to_dict(self) -> dict:
        d = asdict(self)
        d["published_at"] = self.published_at.isoformat()
        return d

    @classmethod
    def from_dict(cls, d: dict) -> "Article":
        d = dict(d)
        if isinstance(d["published_at"], str):
            d["published_at"] = datetime.fromisoformat(d["published_at"])
        return cls(**d)
