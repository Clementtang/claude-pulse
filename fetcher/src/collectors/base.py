from __future__ import annotations

from typing import Protocol

from src.models import Article


class Collector(Protocol):
    """A collector pulls articles from a single source.

    Implementations must be idempotent — callers rely on state.json
    to de-duplicate across runs.
    """

    name: str
    tier: str

    def collect(self) -> list[Article]: ...
