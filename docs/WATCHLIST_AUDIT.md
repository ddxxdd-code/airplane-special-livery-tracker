# Seattle airline watchlist audit

This audit records which passenger airlines were checked for the Seattle (`KSEA`/`SEA`) watchlist. It is a maintenance aid, not a promise that every listed aircraft can be assigned to a Seattle flight.

## Audit scope

- Audit date: 2026-08-27
- Route scope: the 35 passenger carriers on the Port of Seattle's 2026 domestic and international route pages
- Livery source: AirportWebcams.net's current special-livery database, last updated 2026-08-18
- Matching key: aircraft registration
- Additional requested operators: Hawaiian Airlines and Alaska's Horizon Air affiliate

The registry intentionally includes current special aircraft on route airlines even when that aircraft type is not normally scheduled to Seattle. This does not produce a false match: the application only shows the aircraft if the airport schedule actually returns that registration. It also does not increase AeroDataBox use because the schedule is fetched by airport and time window, then matched against the full registry locally.

## Coverage after the audit

| Airline | Registrations |
| --- | ---: |
| Aer Lingus | 1 |
| Aeromexico | 7 |
| Air Canada | 11 |
| Air France | 0 found |
| Alaska Airlines | 17 |
| All Nippon Airways | 16 |
| American Airlines | 22 |
| Asiana Airlines | 2 |
| British Airways | 11 |
| Cathay Pacific | 8 |
| China Airlines | 5 |
| Condor | 3 |
| Delta Air Lines | 18 |
| Emirates | 12 |
| EVA Air | 7 |
| Finnair | 7 |
| Frontier Airlines | 3 |
| Hainan Airlines | 11 |
| Icelandair | 2 |
| Japan Airlines | 8 |
| JetBlue | 24 |
| Korean Air | 2 |
| Lufthansa | 30 |
| Philippine Airlines | 2 |
| Qatar Airways | 31 passenger + 1 cargo |
| Scandinavian Airlines (SAS) | 2 |
| Singapore Airlines | 6 |
| STARLUX Airlines | 4 |
| Southwest Airlines | 23 |
| Sun Country Airlines | 2 |
| Turkish Airlines | 24 |
| United Airlines | 26 |
| Virgin Atlantic | 0 found |
| Volaris | 9 |
| WestJet | 1 |

Hawaiian Airlines has 4 registrations and Horizon Air has 5. They are retained because the user explicitly requested Hawaiian aircraft and Alaska regional operations.

No current special-livery registration was found for Air France or Virgin Atlantic in the audited source. Their absence means “none found in this audit,” not proof that no temporary sticker or newly painted aircraft exists.

## Maintenance procedure

1. Recheck the Port of Seattle route pages for carrier additions and removals.
2. Compare each active carrier with at least one current-livery catalogue and, where possible, an airline announcement or recent aircraft photo.
3. Add registrations to `data/special-liveries.json`; do not add a flight number because aircraft assignments change.
4. Record `verifiedOn`, an evidence URL, and a note if the aircraft type is an unlikely Seattle visitor.
5. Remove an entry only after confirming repainting, retirement, storage, or transfer.
6. Run `npm test` before committing the registry.

## Sources

- Port of Seattle: <https://www.portseattle.org/page/nonstop-international-routes>
- Port of Seattle: <https://www.portseattle.org/page/nonstop-domestic-routes>
- Current-livery catalogue: <https://airportwebcams.net/special-liveries/>
