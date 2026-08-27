export function normalizeRegistration(value = "") {
  return String(value).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function buildRegistryIndex(registry) {
  return new Map(registry.map((item) => [normalizeRegistration(item.registration), item]));
}

function timeValue(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.local || value.utc || null;
}

function airportValue(airport) {
  if (!airport) return { iata: "—", icao: "—", name: "Unknown airport", city: "Unknown" };
  return {
    iata: airport.iata || airport.iataCode || "—",
    icao: airport.icao || airport.icaoCode || "—",
    name: airport.name || airport.shortName || "Unknown airport",
    city: airport.municipalityName || airport.city || airport.name || "Unknown"
  };
}

function actualTime(movement) {
  return timeValue(movement?.runwayTime) || timeValue(movement?.gateTime);
}

function estimatedTime(movement) {
  return timeValue(movement?.revisedTime) || timeValue(movement?.predictedTime);
}

function normalizeStatus(status, hasActual) {
  const raw = String(status || (hasActual ? "Arrived" : "Scheduled"));
  const readable = raw.replace(/([a-z])([A-Z])/g, "$1 $2");
  return readable.charAt(0).toUpperCase() + readable.slice(1).toLowerCase();
}

export function normalizeAeroDataBoxFlight(flight, direction) {
  const movement = direction === "arrival" ? flight.arrival : flight.departure;
  const opposite = direction === "arrival" ? flight.departure : flight.arrival;
  const registration = flight.aircraft?.reg || flight.aircraft?.registration || "";
  const actual = actualTime(movement);
  const flightNumber = flight.number || flight.callSign || "Unknown";
  return {
    id: [direction, flightNumber, timeValue(movement?.scheduledTime), registration].join("-"),
    direction,
    flightNumber,
    airline: flight.airline?.name || flight.airline?.shortName || "Unknown airline",
    airport: airportValue(opposite?.airport),
    scheduled: timeValue(movement?.scheduledTime),
    estimated: estimatedTime(movement),
    actual,
    status: normalizeStatus(flight.status, Boolean(actual)),
    terminal: movement?.terminal || null,
    gate: movement?.gate || null,
    registration,
    aircraftType: flight.aircraft?.model || flight.aircraft?.modeS || "Aircraft type unavailable"
  };
}

export function mergeAndMatchSpecials(payloads, registry) {
  const index = buildRegistryIndex(registry);
  const seen = new Set();
  const all = [];

  for (const payload of payloads) {
    for (const direction of ["arrival", "departure"]) {
      const source = direction === "arrival" ? payload.arrivals : payload.departures;
      for (const raw of source || []) {
        const flight = normalizeAeroDataBoxFlight(raw, direction);
        const key = normalizeRegistration(flight.registration);
        const livery = index.get(key);
        if (!livery || seen.has(flight.id)) continue;
        seen.add(flight.id);
        all.push({ ...flight, livery });
      }
    }
  }

  return all.sort((a, b) => new Date(a.scheduled || 0) - new Date(b.scheduled || 0));
}

export function matchDemoFlights(flights, registry, date) {
  const index = buildRegistryIndex(registry);
  return flights.map((flight) => {
    const shiftDate = (value) => value ? `${date}${value.slice(10)}` : null;
    return {
      ...flight,
      scheduled: shiftDate(flight.scheduled),
      estimated: shiftDate(flight.estimated),
      actual: shiftDate(flight.actual),
      livery: index.get(normalizeRegistration(flight.registration))
    };
  }).filter((flight) => flight.livery);
}
