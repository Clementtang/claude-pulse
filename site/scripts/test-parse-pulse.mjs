/**
 * Unit tests for archive week bucketing (no full log parse required).
 * Run: npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  weekOfMonth,
  weekDayRange,
  getArchiveWeeks,
  getMonthWeekSummaries,
  getMonthAnchorWeekMap,
} from "../src/lib/parse-pulse.js";

describe("weekOfMonth", () => {
  it("maps calendar days 1–7 to w1 through 29–31 to w5", () => {
    assert.equal(weekOfMonth("2026-07-01"), "w1");
    assert.equal(weekOfMonth("2026-07-07"), "w1");
    assert.equal(weekOfMonth("2026-07-08"), "w2");
    assert.equal(weekOfMonth("2026-07-14"), "w2");
    assert.equal(weekOfMonth("2026-07-15"), "w3");
    assert.equal(weekOfMonth("2026-07-21"), "w3");
    assert.equal(weekOfMonth("2026-07-22"), "w4");
    assert.equal(weekOfMonth("2026-07-28"), "w4");
    assert.equal(weekOfMonth("2026-07-29"), "w5");
    assert.equal(weekOfMonth("2026-07-31"), "w5");
  });

  it("falls back to w1 on invalid day", () => {
    assert.equal(weekOfMonth("2026-07-xx"), "w1");
  });
});

describe("weekDayRange", () => {
  it("returns inclusive day ranges for w1–w5", () => {
    assert.deepEqual(weekDayRange("w1"), { start: 1, end: 7 });
    assert.deepEqual(weekDayRange("w2"), { start: 8, end: 14 });
    assert.deepEqual(weekDayRange("w5"), { start: 29, end: 31 });
  });
});

describe("month helpers against live log", () => {
  // Lightweight fixtures avoid depending on full parsePulseLog I/O shape
  // beyond what production uses; still exercises set/sort logic.
  const fixtures = [
    {
      month: "2026-07",
      week: "w1",
      displayDate: "2026-07-03",
      anchor: "a1",
    },
    {
      month: "2026-07",
      week: "w1",
      displayDate: "2026-07-06",
      anchor: "a2",
    },
    {
      month: "2026-07",
      week: "w4",
      displayDate: "2026-07-25",
      anchor: "a3",
    },
    {
      month: "2026-06",
      week: "w2",
      displayDate: "2026-06-10",
      anchor: "a4",
    },
  ];

  it("lists weeks newest-first for a month", () => {
    assert.deepEqual(getArchiveWeeks("2026-07", fixtures), ["w4", "w1"]);
  });

  it("summarizes counts and actual day span per week", () => {
    const rows = getMonthWeekSummaries("2026-07", fixtures);
    assert.deepEqual(rows, [
      { week: "w4", count: 1, startDay: 25, endDay: 25 },
      { week: "w1", count: 2, startDay: 3, endDay: 6 },
    ]);
  });

  it("maps anchors to weeks for legacy redirects", () => {
    assert.deepEqual(getMonthAnchorWeekMap("2026-07", fixtures), {
      a1: "w1",
      a2: "w1",
      a3: "w4",
    });
  });
});
