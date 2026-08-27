import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { mergeAndMatchSpecials, normalizeRegistration } from "../lib/flights.mjs";

test("normalizes registrations for reliable matching", () => {
  assert.equal(normalizeRegistration(" n-985 ak "), "N985AK");
  assert.equal(normalizeRegistration("HL-7732"), "HL7732");
});

test("keeps only flights whose registration is in the livery registry", () => {
  const payload = {
    arrivals: [{
      number: "OZ 272", status: "Expected", airline: { name: "Asiana Airlines" },
      aircraft: { reg: "HL7732", model: "Boeing 777-200ER" },
      departure: { airport: { iata: "ICN", icao: "RKSI", name: "Incheon", municipalityName: "Seoul" } },
      arrival: { scheduledTime: { local: "2026-08-25T15:45-07:00" }, revisedTime: { local: "2026-08-25T16:08-07:00" }, gate: "S16" }
    }, {
      number: "AS 1", aircraft: { reg: "N00000" }, departure: {}, arrival: {}
    }],
    departures: []
  };
  const registry = [{ registration: "HL-7732", name: "Star Alliance" }];
  const flights = mergeAndMatchSpecials([payload], registry);
  assert.equal(flights.length, 1);
  assert.equal(flights[0].flightNumber, "OZ 272");
  assert.equal(flights[0].livery.name, "Star Alliance");
  assert.equal(flights[0].estimated, "2026-08-25T16:08-07:00");
});

test("special-livery registry has complete, unique registrations", async () => {
  const registry = JSON.parse(await readFile(new URL("../data/special-liveries.json", import.meta.url), "utf8"));
  const required = ["registration", "name", "airline", "aircraftType", "category", "colors", "verifiedOn", "sourceUrl", "note"];
  const normalized = registry.map((item) => item.registration.replace(/[^A-Z0-9]/gi, "").toUpperCase());

  assert.equal(new Set(normalized).size, registry.length, "registrations must be unique after normalization");
  for (const item of registry) {
    for (const field of required) assert.ok(item[field], `${item.registration || "unknown"} is missing ${field}`);
    assert.match(item.verifiedOn, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(Array.isArray(item.colors) && item.colors.length >= 2, `${item.registration} needs display colors`);
  }
});
