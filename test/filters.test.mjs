import test from "node:test";
import assert from "node:assert/strict";
import { DAY_END_MINUTES, formatMinuteOfDay, isWithinTimeRange, minutesFromLocalTime } from "../public/filters.js";

test("extracts airport-local minutes without converting time zones", () => {
  assert.equal(minutesFromLocalTime("2026-08-26 00:58-04:00"), 58);
  assert.equal(minutesFromLocalTime("2026-08-26T21:43:00-07:00"), 1303);
  assert.equal(minutesFromLocalTime(null), null);
});

test("formats time slider labels", () => {
  assert.equal(formatMinuteOfDay(0), "12:00 AM");
  assert.equal(formatMinuteOfDay(12 * 60), "12:00 PM");
  assert.equal(formatMinuteOfDay(DAY_END_MINUTES), "12:00 AM next day");
});

test("filters scheduled local times inclusively", () => {
  const value = "2026-08-26 10:30-04:00";
  assert.equal(isWithinTimeRange(value, 9 * 60, 11 * 60), true);
  assert.equal(isWithinTimeRange(value, 11 * 60, DAY_END_MINUTES), false);
});
