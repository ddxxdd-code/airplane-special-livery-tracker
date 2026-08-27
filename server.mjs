import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeAirportCode } from "./lib/airport.mjs";
import { mergeAndMatchSpecials, matchDemoFlights } from "./lib/flights.mjs";

const root = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(root, "public");

try {
  const envFile = await readFile(path.join(root, ".env"), "utf8");
  for (const line of envFile.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || match[2].startsWith("#") || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, "$2");
  }
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}

const port = Number(process.env.PORT || 4173);
const photoCache = new Map();

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

async function loadJson(relative) {
  return JSON.parse(await readFile(path.join(root, relative), "utf8"));
}

function sendJson(response, status, value) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  response.end(JSON.stringify(value));
}

function validateDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : new Date().toISOString().slice(0, 10);
}

function validateAirport(value) {
  return normalizeAirportCode(value || "KSEA");
}

async function getAeroDataBoxFlights(airport, date) {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) return null;
  const host = process.env.AERODATABOX_API_HOST || "aerodatabox.p.rapidapi.com";
  const ranges = [["00:00", "12:00"], ["12:00", "23:59"]];
  const payloads = [];

  for (const [index, [from, to]] of ranges.entries()) {
    // AeroDataBox's free plan permits one request per second. A full day needs
    // two 12-hour requests, so they must not be sent concurrently.
    if (index > 0) await new Promise((resolve) => setTimeout(resolve, 1100));
    const url = new URL(`https://${host}/flights/airports/icao/${airport}/${date}T${from}/${date}T${to}`);
    url.searchParams.set("direction", "Both");
    url.searchParams.set("withLeg", "true");
    url.searchParams.set("withCancelled", "true");
    url.searchParams.set("withCodeshared", "false");
    url.searchParams.set("withCargo", "false");
    url.searchParams.set("withPrivate", "false");
    const request = () => fetch(url, { headers: { "x-rapidapi-key": key, "x-rapidapi-host": host } });
    let result = await request();
    if (result.status === 429) {
      const retrySeconds = Math.max(1.1, Number(result.headers.get("retry-after") || 1.1));
      await new Promise((resolve) => setTimeout(resolve, retrySeconds * 1000));
      result = await request();
    }
    if (!result.ok) throw new Error(`AeroDataBox returned ${result.status}`);
    payloads.push(await result.json());
  }

  return payloads;
}

async function flightResponse(airport, date) {
  airport = normalizeAirportCode(airport);
  const registry = await loadJson("data/special-liveries.json");
  try {
    const providerPayloads = await getAeroDataBoxFlights(airport, date);
    if (providerPayloads) {
      const flights = mergeAndMatchSpecials(providerPayloads, registry);
      const totalFlights = providerPayloads.reduce((sum, p) => sum + (p.arrivals?.length || 0) + (p.departures?.length || 0), 0);
      return {
        flights,
        registry,
        meta: { mode: "live", provider: "AeroDataBox", airport, date, totalFlights, generatedAt: new Date().toISOString() }
      };
    }
  } catch (error) {
    const demo = await loadJson("data/demo-flights.json");
    return {
      flights: airport === "KSEA" ? matchDemoFlights(demo, registry, date) : [],
      registry,
      meta: { mode: "demo", provider: "Demo data", airport, date, totalFlights: airport === "KSEA" ? demo.length : 0, generatedAt: new Date().toISOString(), warning: airport === "KSEA" ? error.message : `${error.message}; demo movements are only available for KSEA` }
    };
  }

  const demo = await loadJson("data/demo-flights.json");
  return {
    flights: airport === "KSEA" ? matchDemoFlights(demo, registry, date) : [],
    registry,
    meta: { mode: "demo", provider: "Demo data", airport, date, totalFlights: airport === "KSEA" ? demo.length : 0, generatedAt: new Date().toISOString(), warning: airport === "KSEA" ? undefined : "Demo movements are only available for KSEA" }
  };
}

async function photoResponse(registration) {
  const cached = photoCache.get(registration);
  if (cached && cached.expires > Date.now()) return cached.value;
  const contact = process.env.LIVERY_WATCH_CONTACT_URL || "https://github.com/livery-watch/local";
  const result = await fetch(`https://api.planespotters.net/pub/photos/reg/${encodeURIComponent(registration)}`, {
    headers: { "user-agent": `LiveryWatch/1.0 (+${contact})` }
  });
  if (!result.ok) throw new Error(`Planespotters returned ${result.status}`);
  const payload = await result.json();
  const item = payload.photos?.[0];
  const value = item ? {
    image: item.thumbnail_large?.src || item.thumbnail?.src || null,
    link: item.link || null,
    photographer: item.photographer || "Planespotters contributor"
  } : null;
  photoCache.set(registration, { value, expires: Date.now() + 12 * 60 * 60 * 1000 });
  return value;
}

async function serveStatic(requestPath, response) {
  const requested = requestPath === "/" ? "/index.html" : requestPath;
  const normalized = path.normalize(requested).replace(/^(\.\.(\/|\\|$))+/, "");
  const filePath = path.join(publicDir, normalized);
  if (!filePath.startsWith(publicDir)) return false;
  try {
    const body = await readFile(filePath);
    response.writeHead(200, {
      "content-type": types[path.extname(filePath)] || "application/octet-stream",
      "cache-control": "no-cache"
    });
    response.end(body);
    return true;
  } catch {
    return false;
  }
}

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
    if (request.method === "GET" && url.pathname === "/api/flights") {
      return sendJson(response, 200, await flightResponse(validateAirport(url.searchParams.get("airport")), validateDate(url.searchParams.get("date"))));
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/photo/")) {
      const registration = url.pathname.split("/").pop().toUpperCase();
      try {
        return sendJson(response, 200, { photo: await photoResponse(registration) });
      } catch (error) {
        return sendJson(response, 200, { photo: null, warning: error.message });
      }
    }
    if (request.method === "GET" && url.pathname === "/api/health") {
      return sendJson(response, 200, { ok: true, liveProviderConfigured: Boolean(process.env.AERODATABOX_API_KEY) });
    }
    if (request.method === "GET" && await serveStatic(url.pathname, response)) return;
    sendJson(response, 404, { error: "Not found" });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
});

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  server.listen(port, () => console.log(`Livery Watch is running at http://localhost:${port}`));
}

export { server, flightResponse, validateAirport };
