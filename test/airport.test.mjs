import test from "node:test";
import assert from "node:assert/strict";
import { airportDisplay, formatLocalTime, normalizeAirportCode } from "../lib/airport.mjs";
import { renderNewsletter } from "../scripts/generate-newsletter.mjs";

test("normalizes arbitrary four-character ICAO airport codes", () => {
  assert.equal(normalizeAirportCode(" kbos "), "KBOS");
  assert.deepEqual(airportDisplay("KBOS"), { icao: "KBOS", iata: "BOS" });
  assert.deepEqual(airportDisplay("EGLL"), { icao: "EGLL", iata: "EGLL" });
  assert.throws(() => normalizeAirportCode("BOS"), /four-character ICAO/);
});

test("preserves the airport-local wall-clock time in provider values", () => {
  assert.equal(formatLocalTime("2026-08-26 00:58-04:00"), "12:58 AM");
  assert.equal(formatLocalTime("2026-08-26T21:43:00-04:00"), "9:43 PM");
});

test("renders a Boston newsletter without Seattle route labels or time conversion", () => {
  const html = renderNewsletter({
    airport: "KBOS",
    date: "2026-08-26",
    meta: { mode: "live" },
    flights: [{
      direction: "arrival",
      registration: "N167AN",
      livery: { name: "Flagship Valor" },
      flightNumber: "AA 1054",
      airline: "American",
      airport: { iata: "MIA" },
      scheduled: "2026-08-26 00:58-04:00",
      estimated: null,
      actual: null,
      status: "Expected"
    }]
  });

  assert.match(html, /LIVERY WATCH · KBOS/);
  assert.match(html, /MIA ↔ BOS/);
  assert.match(html, /Scheduled 12:58 AM/);
  assert.match(html, /id="reportFilters"/);
  assert.match(html, /data-direction="arrival" data-minute="58"/);
  assert.match(html, /data-report-direction="departure"/);
  assert.doesNotMatch(html, /↔ SEA/);
});
