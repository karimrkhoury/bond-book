# Bond Book

A small mobile web app for tracking bond holdings — nominal and market value per
holding and per currency. Frontend on GitHub Pages, data and auth on Supabase.
Designed to be added to an iPhone home screen from Safari.

- **Nominal value** = face value per unit × quantity
- **Market value** = nominal × clean price / 100 + accrued interest

Each account sees only its own holdings (Postgres row-level security), so several
family members can share the same URL.

## One-time setup (~5 minutes)

1. **Create the Supabase project** — [supabase.com](https://supabase.com) → New
   project (free tier; pick a nearby region, e.g. Frankfurt).
2. **Create the table** — SQL Editor → paste the contents of `schema.sql` → Run.
3. **Wire the app to it** — Settings → API → copy **Project URL** and the
   **anon public** key into `config.js`, commit, push. GitHub Pages redeploys in
   about a minute. (The anon key is meant to be public; row-level security is
   what protects the data.)
4. **Create the accounts** — Authentication → Users → **Add user** → email +
   password, tick **Auto Confirm User**. One for you, one for Dad.
   The app also has a "Create an account" flow; if you want the app closed to
   outsiders, disable signups under Authentication → Sign In / Up.

## Dad's iPhone (~1 minute)

1. Open `https://karimrkhoury.github.io/bond-book/` in Safari.
2. Share button → **Add to Home Screen**.
3. Open **Bond Book** from the home screen and sign in once — it stays signed in.

## Updating the app

Edit, commit, push to `main`. GitHub Pages redeploys automatically.

## Later: pulling prices automatically

The schema is already shaped for it: `isin` is the lookup key and `priced_at`
records freshness (the app shows "priced Nd ago"). The plan when you're ready:

1. A **Supabase Edge Function** that fetches a price per distinct ISIN and
   updates `clean_price` + `priced_at`.
2. Schedule it with Supabase **cron** (e.g. daily after market close).
3. No app changes needed.

Reality check on data: free bond-price APIs are rare. Realistic sources are your
broker's portfolio export, exchange endpoints (Börse Frankfurt exposes open JSON
quotes), or paid APIs (EOD Historical Data, Finnhub).

## Local development

```sh
python3 -m http.server 4321
# → http://localhost:4321
```

`design/` holds the design-system preview cards synced to claude.ai/design; the
app itself is `index.html` + `config.js` only.
