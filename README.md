# Daily reset — GitHub Pages version (no card, ever)

This version uses only GitHub: **GitHub Pages** to host the page,
**a GitHub Gist** as the data store. Neither ever asks for a card. You
already have a GitHub account, so this is the fastest path.

## 1. Create a repo and push this folder

On github.com: **New repository** → name it `daily-reset` → Public →
Create. Then from your PC:

```bash
cd path\to\daily-reset-gh
git init
git add .
git commit -m "daily reset tracker"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/daily-reset.git
git push -u origin main
```

## 2. Turn on GitHub Pages

Repo → **Settings** → **Pages** → under "Build and deployment", Source:
**Deploy from a branch** → Branch: `main`, folder: `/docs` → Save.

Wait ~1 minute, then your app is live at:
`https://YOUR_USERNAME.github.io/daily-reset/`

## 3. Create the data store (a gist)

Go to https://gist.github.com → add one file named `data.json` with just
`{}` as the content → click **Create secret gist** (secret = unlisted, not
searchable, but not fully private — fine for a personal tracker).

Copy the gist's ID from the URL bar: `gist.github.com/YOUR_USERNAME/`**`THIS_ID`**

## 4. Create a scoped token

Go to https://github.com/settings/personal-access-tokens/new
- Token name: `daily-reset`
- Expiration: pick something like 1 year
- Under **Account permissions** find **Gists** → set to **Read and write**
- Leave everything else untouched — this token will only ever be able to
  touch your gists, nothing else in your account
- Generate, copy the token (starts with `github_pat_`)

## 5. Paste both into the app

Open `docs/index.html`, near the top of the `<script>` tag:

```js
const GIST_ID = "PASTE_GIST_ID";
const GITHUB_TOKEN = "PASTE_TOKEN";
```

Replace both, then commit and push:

```bash
git add .
git commit -m "add config"
git push
```

Give GitHub Pages a minute to rebuild, then reload your URL.

## 6. Use it on both devices

- **PC**: open `https://YOUR_USERNAME.github.io/daily-reset/`, bookmark it.
- **Phone**: open the same URL in Chrome → menu (⋮) → **Add to Home Screen**.

Changes sync within about 25 seconds automatically, or tap the text at the
bottom of the page to refresh instantly.

## The one real tradeoff

Because this is a public static page, your token is visible to anyone who
views the page source. That's why the token is scoped to **gists only** —
worst case someone could mess with your gists, not your repos, account
settings, or anything else. Fine for a personal tracker with no sensitive
data in it. If that ever bothers you, the fix is to swap this for a small
backend that holds the token server-side — worth doing later, not needed
to get started now.
