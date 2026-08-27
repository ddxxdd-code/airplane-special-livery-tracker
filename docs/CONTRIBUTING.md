# Contributing

Contributions are welcome for airport support, watchlist accuracy, provider adapters, accessibility, UI improvements, tests, and documentation.

## Development setup

Requirements:

- Node.js 20 or newer
- `npm`
- An AeroDataBox key only when testing live provider behavior

```bash
git clone YOUR_REPOSITORY_URL
cd Livery_tracker
cp .env.example .env
npm test
npm run dev
```

Open [http://localhost:4173](http://localhost:4173). Keep `.env` local; see [API key setup](API_KEY_SETUP.md).

No third-party npm packages are currently required. Prefer Node built-ins and focused browser modules unless a dependency provides clear, reviewed value.

## Before changing code

1. Reproduce the behavior with the smallest airport/date example.
2. Check whether the provider returned the wrong data or the local normalization/matching code changed it.
3. Preserve the distinction between demo and live data.
4. Do not build against scraped or undocumented Flightradar24/JetTip endpoints.
5. Avoid committing generated reports unless a fixture is intentionally needed.

## Coding guidelines

- Use ES modules and the existing Node.js style.
- Keep provider normalization in `lib/`, HTTP behavior in `server.mjs`, and presentation in `public/` or the newsletter renderer.
- Keep pure filter/format helpers testable without a browser.
- Validate external input at the boundary.
- Escape untrusted values before writing HTML.
- Preserve airport-local time strings; do not silently convert them through the computer’s timezone.
- Handle missing registrations, times, gates, aircraft models, and photos.
- Make provider/demo status visible rather than silently substituting data.
- Keep API requests sequential when required by the provider rate limit.

## Add or correct a special livery

Edit `data/special-liveries.json`. Each entry should have:

```json
{
  "registration": "N123AB",
  "name": "Example special livery",
  "airline": "Example Air",
  "aircraftType": "Boeing 737-8",
  "category": "Commemorative",
  "colors": ["#123456", "#abcdef"],
  "verifiedOn": "2026-08-26",
  "sourceUrl": "https://airline.example/press-release",
  "note": "Why this aircraft is special."
}
```

Registry standards:

- Use the physical aircraft registration, not flight number, fleet number, or Mode-S hex code.
- Use uppercase registration text. Runtime normalization removes punctuation, but consistent source data is easier to review.
- Confirm that the livery is actually painted and active; do not add an announced design before application.
- Prefer an airline, airport, manufacturer, or alliance source. A reputable aviation database or photo source can support older liveries when no primary announcement exists.
- Describe whether the aircraft type normally serves the target airport or would require a substitution.
- Use `verifiedOn` to record the review date, not the paint date.
- Remove or update aircraft that return to standard colors, leave the fleet, or change registration.
- Do not copy copyrighted photographs into the repository. Store evidence links and let the runtime photo service provide attributed thumbnails.

Run the tests after every registry edit. Registration uniqueness and required fields should remain deterministic.

## Test changes

```bash
npm test
```

Add focused tests when changing:

- ICAO validation or airport display behavior.
- Registration normalization or matching.
- Provider record normalization and de-duplication.
- Direction or scheduled-time filters.
- HTTP route behavior and demo fallback.
- Newsletter output semantics.

For manual verification, test at least:

1. KSEA with no key, confirming clearly labeled demo mode.
2. A non-KSEA airport with no key, confirming no Seattle demo flights leak into the result.
3. KSEA and another airport with a key, confirming the response metadata contains the selected airport.
4. Arrival/departure, text, and both time-slider handles.
5. CSV and HTML export after filtering.
6. A CLI newsletter filename and heading for a non-KSEA airport.
7. Missing-photo fallback.

Live schedules are unstable and quota-consuming, so unit tests should use fixtures rather than rely on current provider results.

## Documentation changes

- Keep the root `README.md` focused on installation and daily use.
- Put implementation design in `docs/ARCHITECTURE.md`.
- Put credential setup/security in `docs/API_KEY_SETUP.md`.
- Put development policy in this file.
- Update documentation when commands, environment variables, endpoints, quota behavior, or registry fields change.

## Security and privacy

- Never commit `.env`, API keys, tokens, cookies, private keys, or provider responses containing personal data.
- Before committing, run `git diff --staged` and inspect every added line.
- If a secret is exposed, rotate it immediately; deleting a file or commit is not sufficient protection.
- Do not log request headers containing `x-rapidapi-key`.
- Do not move API calls that require credentials into browser code.

## Pull-request checklist

- [ ] The change is scoped and explained.
- [ ] `npm test` passes.
- [ ] Live and demo modes remain clearly distinguishable.
- [ ] Multi-airport behavior was considered.
- [ ] Provider quota impact was considered.
- [ ] Times remain airport-local.
- [ ] New HTML values are escaped.
- [ ] Registry changes include evidence and a verification date.
- [ ] No secret or local `.env` file is staged.
- [ ] README/docs were updated when user behavior or architecture changed.
