export function normalizeAirportCode(value = "KSEA") {
  const airport = String(value || "KSEA").trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(airport)) {
    throw new Error(`Airport must be a four-character ICAO code (received ${airport || "blank"})`);
  }
  return airport;
}

export function airportDisplay(icaoValue) {
  const icao = normalizeAirportCode(icaoValue);
  // Continental US ICAO identifiers are K + the three-letter IATA code.
  // For other regions we retain ICAO rather than guessing an incorrect IATA code.
  const iata = /^K[A-Z]{3}$/.test(icao) ? icao.slice(1) : icao;
  return { icao, iata };
}

export function formatLocalTime(value) {
  if (!value) return "—";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/);
  if (!match) return "—";
  const hour = Number(match[1]);
  const minute = match[2];
  return `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`;
}
