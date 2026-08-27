# Create and protect an AeroDataBox API key

Livery Watch uses AeroDataBox through RapidAPI. The browser never receives the key: the local Node.js server reads it from `.env` and adds it only to server-to-server requests.

## 1. Create a RapidAPI account

1. Open the [AeroDataBox API page on RapidAPI](https://rapidapi.com/aedbx-aedbx/api/aerodatabox).
2. Sign in or create a RapidAPI account.
3. Open the **Pricing** tab and select a plan. The [AeroDataBox pricing page](https://rapidapi.com/aedbx-aedbx/api/aerodatabox/pricing) shows the current quotas and charges; review it before subscribing because they can change.
4. Make sure the AeroDataBox subscription belongs to the RapidAPI app you intend to use for Livery Watch.

As of 2026-08-26, RapidAPI lists a Basic plan with 600 API units per month. The FIDS time-range endpoint used by this project is Tier 2 and is listed at two units per request. Livery Watch uses two requests for a full day, normally four units per airport/date load. Treat the pricing page as authoritative.

## 2. Find the key

RapidAPI creates an app and an `X-RapidAPI-Key` when you sign up. You can find the key in either place:

- Select an AeroDataBox endpoint in the API playground; the generated request example includes the selected app key.
- Open the RapidAPI Developer Dashboard, choose the app, and open its **Authorization** page.

RapidAPI documents both methods in [API Keys / Key Rotation](https://docs.rapidapi.com/docs/keys-and-key-rotation). Copy only the key value, without quotes or spaces.

## 3. Store the key locally

From the project directory:

```bash
cp .env.example .env
```

Edit `.env`:

```dotenv
AERODATABOX_API_KEY=your_real_x_rapidapi_key
AERODATABOX_API_HOST=aerodatabox.p.rapidapi.com
LIVERY_WATCH_CONTACT_URL=https://example.com/contact
PORT=4173
```

Do not put the key in `.env.example`, `public/app.js`, a generated HTML file, a screenshot, an issue, or a pull request.

## 4. Verify the configuration

Restart the server after changing `.env`:

```bash
npm start
```

In another Terminal window:

```bash
curl http://localhost:4173/api/health
```

Expected:

```json
{"ok":true,"liveProviderConfigured":true}
```

Then load an airport/date in the browser. The data note should say **AeroDataBox** and **live**, not **Demo mode**. A live request may still return zero special-livery matches when registrations are missing, stale, or absent from the watchlist.

## 5. Confirm Git will not upload the key

The project `.gitignore` excludes `.env`, all `.env.*` variants, and common private-key files while explicitly allowing `.env.example`.

After initializing or cloning a Git repository, verify:

```bash
git check-ignore -v .env
git ls-files .env
```

The first command should identify the `.gitignore` rule. The second should print nothing.

If `.env` was already tracked, ignoring it is not enough. Preserve the local file but remove it from future commits:

```bash
git rm --cached .env
git commit -m "Stop tracking local environment file"
```

If a real key ever appeared in a commit, log, screenshot, issue, or pull request, immediately rotate it from the app’s RapidAPI **Authorization** page and update the local `.env`. Removing the visible file does not remove the secret from Git history.

## GitHub Actions

Never commit an API key to a workflow file. Add it under the GitHub repository’s **Settings → Secrets and variables → Actions**, then expose it only to the required step:

```yaml
env:
  AERODATABOX_API_KEY: ${{ secrets.AERODATABOX_API_KEY }}
  AERODATABOX_API_HOST: aerodatabox.p.rapidapi.com
```

Keep Actions usage within the AeroDataBox quota because each airport/date generation performs a new full-day API load.

## Common errors

- **Demo mode after adding the key:** confirm the filename is exactly `.env`, the variable name is exact, and the server was restarted.
- **401 or 403:** verify the key, selected RapidAPI app, and AeroDataBox subscription.
- **429:** the rate or monthly quota was reached. Livery Watch retries each half-day request once, then reports the provider error.
- **Key exposed:** rotate it before doing anything else, then remove it from tracked files and history.
