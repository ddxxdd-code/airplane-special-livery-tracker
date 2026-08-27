import { DAY_END_MINUTES, formatMinuteOfDay, isWithinTimeRange } from "./filters.js";

const state = { flights: [], registry: [], meta: null, direction: "all", search: "", airport: "KSEA", timeStart: 0, timeEnd: DAY_END_MINUTES };
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const today = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const elements = {
  list: $("#flightList"), empty: $("#emptyState"), date: $("#dateInput"), airport: $("#airportInput"), refresh: $("#refreshButton"),
  note: $("#dataNote"), registryDialog: $("#registryDialog"), toast: $("#toast"),
  timeStart: $("#timeStart"), timeEnd: $("#timeEnd"), timeRangeLabel: $("#timeRangeLabel"), timeSliderShell: $("#timeSliderShell")
};

elements.date.value = today;
elements.airport.value = new URLSearchParams(location.search).get("airport") || localStorage.getItem("livery-airport") || "KSEA";
if (localStorage.getItem("livery-theme") === "dark") document.documentElement.classList.add("dark");

function formatTime(value) {
  if (!value) return "—";
  const match = String(value).match(/^\d{4}-\d{2}-\d{2}[T ](\d{2}):(\d{2})/);
  if (!match) return "—";
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour < 12 ? "AM" : "PM"}`;
}

function formatUpdatedTime(value) {
  return value ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value)) : "—";
}

function normalizeAirport(value) {
  const airport = String(value || "").trim().toUpperCase();
  if (!/^[A-Z0-9]{4}$/.test(airport)) throw new Error("Enter a four-character ICAO airport code, such as KSEA or KBOS");
  return airport;
}

function airportDisplay(value) {
  const icao = normalizeAirport(value);
  return { icao, iata: /^K[A-Z]{3}$/.test(icao) ? icao.slice(1) : icao };
}

function updateAirportUi(value) {
  const airport = airportDisplay(value);
  document.title = `Livery Watch · ${airport.icao}`;
  $("#heroAirportIata").textContent = airport.iata;
  $("#heroAirportLabel").textContent = `Selected airport · ${airport.icao}`;
  $("#heroAirportIcao").textContent = airport.icao;
}

function formatDate(value) {
  return new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function escaped(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
}

function timeAndSearchFilteredFlights() {
  return state.flights.filter((flight) => {
    if (!isWithinTimeRange(flight.scheduled, state.timeStart, state.timeEnd)) return false;
    const haystack = [flight.flightNumber, flight.airline, flight.registration, flight.airport?.city, flight.airport?.iata, flight.livery?.name].join(" ").toLowerCase();
    return haystack.includes(state.search.toLowerCase());
  });
}

function filteredFlights() {
  return timeAndSearchFilteredFlights().filter((flight) => state.direction === "all" || flight.direction === state.direction);
}

function updateTimeFilterUi() {
  elements.timeRangeLabel.textContent = `${formatMinuteOfDay(state.timeStart)} – ${formatMinuteOfDay(state.timeEnd)}`;
  elements.timeSliderShell.style.setProperty("--range-start", `${state.timeStart / DAY_END_MINUTES * 100}%`);
  elements.timeSliderShell.style.setProperty("--range-end", `${state.timeEnd / DAY_END_MINUTES * 100}%`);
}

function setTimeRange(changedHandle) {
  let start = Number(elements.timeStart.value);
  let end = Number(elements.timeEnd.value);
  if (start > end - 30) {
    if (changedHandle === "start") start = Math.max(0, end - 30);
    else end = Math.min(DAY_END_MINUTES, start + 30);
  }
  state.timeStart = start;
  state.timeEnd = end;
  elements.timeStart.value = String(start);
  elements.timeEnd.value = String(end);
  updateTimeFilterUi();
  render();
}

function statusClass(status) {
  return /delay|cancel/i.test(status || "") ? "delayed" : "";
}

function cardFor(flight) {
  const card = $("#flightCardTemplate").content.cloneNode(true);
  const article = $(".flight-card", card);
  article.dataset.direction = flight.direction;
  $(".photo-registration", card).textContent = flight.registration || "REG PENDING";
  $(".category-pill", card).textContent = `${flight.livery.category} livery`;
  $(".livery-name", card).textContent = flight.livery.name;
  $(".aircraft-name", card).textContent = flight.aircraftType || flight.livery.aircraftType;
  $(".flight-number", card).textContent = flight.flightNumber;
  $(".airline-name", card).textContent = flight.airline;
  $(".route-label", card).textContent = flight.direction === "arrival" ? "From" : "To";
  $(".other-airport", card).textContent = flight.airport?.iata || flight.airport?.icao || "—";
  $(".other-city", card).textContent = flight.airport?.city || flight.airport?.name || "Unknown";
  const target = airportDisplay(state.meta?.airport || state.airport);
  $(".selected-airport-icao", card).textContent = target.icao;
  $(".selected-airport-iata", card).textContent = target.iata;
  $(".scheduled-time", card).textContent = formatTime(flight.scheduled);
  const dynamicLabel = $(".dynamic-time-label", card);
  const dynamicTime = $(".dynamic-time", card);
  dynamicLabel.textContent = flight.actual ? "Actual" : "Estimated";
  dynamicTime.textContent = formatTime(flight.actual || flight.estimated || flight.scheduled);
  const status = $(".status-pill", card);
  status.textContent = flight.status || "Scheduled";
  const statusModifier = statusClass(flight.status);
  if (statusModifier) status.classList.add(statusModifier);
  $(".gate-value", card).textContent = flight.gate || flight.terminal || "—";
  $(".livery-note", card).textContent = flight.livery.note;
  $(".source-link", card).href = flight.livery.sourceUrl;
  hydratePhoto($(".photo-panel", card), flight.registration, `${flight.airline} ${flight.livery.name} aircraft ${flight.registration}`);
  return card;
}

async function hydratePhoto(panel, registration, alt) {
  try {
    const response = await fetch(`/api/photo/${encodeURIComponent(registration)}`);
    const { photo } = await response.json();
    if (!photo?.image) return;
    const image = $(".aircraft-photo", panel);
    image.src = photo.image;
    image.alt = alt;
    image.addEventListener("load", () => panel.classList.add("has-photo"), { once: true });
    const credit = $(".photo-credit", panel);
    credit.textContent = `© ${photo.photographer}`;
    credit.href = photo.link || "https://www.planespotters.net/";
  } catch { /* The local illustrated fallback stays visible. */ }
}

function render() {
  updateTimeFilterUi();
  const timeAndSearchFlights = timeAndSearchFilteredFlights();
  const flights = filteredFlights();
  elements.list.replaceChildren(...flights.map(cardFor));
  elements.empty.hidden = flights.length > 0;
  const arrivals = timeAndSearchFlights.filter((f) => f.direction === "arrival").length;
  const departures = timeAndSearchFlights.filter((f) => f.direction === "departure").length;
  $("#totalSpecials").textContent = flights.length;
  $("#arrivalCount").textContent = arrivals;
  $("#departureCount").textContent = departures;
  $("#allBadge").textContent = timeAndSearchFlights.length;
  $("#arrivalBadge").textContent = arrivals;
  $("#departureBadge").textContent = departures;
  const firstVisible = flights[0];
  $("#nextTime").textContent = firstVisible ? formatTime(firstVisible.estimated || firstVisible.scheduled) : "—";
  $("#registryCount").textContent = state.registry.length;
  renderRegistry();
}

function renderRegistry() {
  $("#registryList").innerHTML = state.registry.map((item) => `
    <div class="registry-item">
      <strong>${escaped(item.registration)}</strong>
      <div><strong>${escaped(item.name)}</strong><span>${escaped(item.airline)} · ${escaped(item.aircraftType)}</span></div>
      <a href="${escaped(item.sourceUrl)}" target="_blank" rel="noopener">Source ↗</a>
    </div>`).join("");
}

async function loadFlights() {
  let airport;
  try {
    airport = normalizeAirport(elements.airport.value);
  } catch (error) {
    elements.note.textContent = error.message;
    return;
  }
  state.airport = airport;
  elements.airport.value = airport;
  localStorage.setItem("livery-airport", airport);
  updateAirportUi(airport);
  elements.refresh.classList.add("loading");
  elements.refresh.disabled = true;
  elements.note.textContent = "Checking the registration list against the airport board…";
  try {
    const response = await fetch(`/api/flights?airport=${encodeURIComponent(airport)}&date=${elements.date.value}`);
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const payload = await response.json();
    state.flights = payload.flights;
    state.registry = payload.registry;
    state.meta = payload.meta;
    state.airport = payload.meta.airport;
    updateAirportUi(state.airport);
    elements.note.innerHTML = payload.meta.mode === "demo"
      ? `<span class="demo-badge">Demo mode</span>${escaped(payload.meta.warning || `Showing representative flights for ${formatDate(elements.date.value)}.`)} Add an AeroDataBox key for live airport times.`
      : `Matched <strong>${payload.flights.length}</strong> special liveries from <strong>${payload.meta.totalFlights}</strong> ${payload.meta.provider} movements at <strong>${escaped(payload.meta.airport)}</strong> · updated ${formatUpdatedTime(payload.meta.generatedAt)}.`;
    render();
  } catch (error) {
    state.flights = [];
    elements.note.textContent = `Could not load flights: ${error.message}`;
    render();
  } finally {
    elements.refresh.classList.remove("loading");
    elements.refresh.disabled = false;
  }
}

function shiftDate(days) {
  const date = new Date(`${elements.date.value}T12:00:00`);
  date.setDate(date.getDate() + days);
  elements.date.value = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
  loadFlights();
}

function download(name, type, content) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportCsv() {
  const airport = airportDisplay(state.meta?.airport || state.airport);
  const rows = [["Direction", "Flight", "Airline", "From/To", "Scheduled", "Estimated", "Actual", "Status", "Registration", "Livery", "Aircraft"]];
  for (const f of filteredFlights()) rows.push([f.direction, f.flightNumber, f.airline, f.airport?.iata, f.scheduled, f.estimated, f.actual, f.status, f.registration, f.livery.name, f.aircraftType]);
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  download(`livery-watch-${airport.icao}-${elements.date.value}.csv`, "text/csv", csv);
  showToast("CSV exported");
}

function exportNewsletter() {
  const airport = airportDisplay(state.meta?.airport || state.airport);
  const cards = filteredFlights().map((f) => `<tr><td style="padding:18px 0;border-bottom:1px solid #ccd4d0"><div style="color:#c94e36;font-size:11px;text-transform:uppercase">${escaped(f.direction)} · ${escaped(f.registration)}</div><h2 style="margin:5px 0">${escaped(f.livery.name)}</h2><b>${escaped(f.flightNumber)}</b> ${escaped(f.airline)} · ${escaped(f.airport?.iata)} ↔ ${escaped(airport.iata)}<br><span style="color:#617078">Scheduled ${formatTime(f.scheduled)} · ${f.actual ? "Actual" : "Estimated"} ${formatTime(f.actual || f.estimated)} · ${escaped(f.status)}</span></td></tr>`).join("");
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Livery Watch ${airport.icao} ${elements.date.value}</title></head><body style="margin:0;background:#f4f2eb;color:#0a2433;font-family:Arial,sans-serif"><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="600" style="max-width:94%;background:#fffdf8;margin:25px auto;padding:30px"><tr><td><div style="color:#ed6a4c;font-weight:bold">LIVERY WATCH · ${escaped(airport.icao)}</div><h1 style="font-size:44px;line-height:1;margin:15px 0">Today's rare birds.</h1><p>${formatDate(elements.date.value)} · ${filteredFlights().length} special movements</p></td></tr>${cards}<tr><td style="padding-top:25px;color:#617078;font-size:11px">Times shown in the selected airport's local time. Matched by registration; confirm operations with the airline or airport.</td></tr></table></td></tr></table></body></html>`;
  download(`livery-watch-${airport.icao}-${elements.date.value}.html`, "text/html", html);
  showToast("Newsletter HTML downloaded");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 2200);
}

$$('[data-direction]').forEach((button) => button.addEventListener("click", () => {
  state.direction = button.dataset.direction;
  $$(".tab").forEach((tab) => { tab.classList.toggle("active", tab === button); tab.setAttribute("aria-selected", String(tab === button)); });
  render();
}));
$("#searchInput").addEventListener("input", (event) => { state.search = event.target.value; render(); });
$("#previousDate").addEventListener("click", () => shiftDate(-1));
$("#nextDate").addEventListener("click", () => shiftDate(1));
elements.date.addEventListener("change", loadFlights);
elements.airport.addEventListener("input", () => { elements.airport.value = elements.airport.value.toUpperCase(); });
elements.airport.addEventListener("change", loadFlights);
elements.airport.addEventListener("keydown", (event) => { if (event.key === "Enter") loadFlights(); });
elements.timeStart.addEventListener("input", () => setTimeRange("start"));
elements.timeEnd.addEventListener("input", () => setTimeRange("end"));
$("#timeReset").addEventListener("click", () => {
  elements.timeStart.value = "0";
  elements.timeEnd.value = String(DAY_END_MINUTES);
  setTimeRange("end");
});
elements.refresh.addEventListener("click", loadFlights);
$("#csvButton").addEventListener("click", exportCsv);
$("#newsletterButton").addEventListener("click", exportNewsletter);
$("#registryButton").addEventListener("click", () => elements.registryDialog.showModal());
$("#closeRegistry").addEventListener("click", () => elements.registryDialog.close());
elements.registryDialog.addEventListener("click", (event) => { if (event.target === elements.registryDialog) elements.registryDialog.close(); });
$("#themeButton").addEventListener("click", () => {
  document.documentElement.classList.toggle("dark");
  localStorage.setItem("livery-theme", document.documentElement.classList.contains("dark") ? "dark" : "light");
});

loadFlights();
