# Kenya Shipyards Limited Tasks Management System

Public entry is a **GitHub Pages** shell that embeds the live Apps Script web app.

- **GitHub Pages:** custom HTML wrapper (this repo)
- **App runtime:** Google Apps Script + Sheets (source kept **local**, not on GitHub)

## Live links

| Use | URL |
|---|---|
| **Share this (GitHub Pages entry)** | Enable Pages on `main` / root, then use your `*.github.io/...` site URL |
| **Direct Apps Script `/exec`** | https://script.google.com/a/*/macros/s/AKfycbwUz5HsPL4O76bxFe_HxCCWZamQ3-LkjXN7OtfWfQRGFHM5Fqn4TW0huPRZNMphVT7Hxw/exec?page=login |

Do not share a Google Sheet, Drive file, Apps Script editor, `/dev`, or `usercontent.com` URL.

## What is on GitHub

```text
.
├── index.html                Public embed page (GitHub Pages)
├── README.md
├── .gitignore
├── .clasp.json.example       Local clasp setup only
├── assets/ksl-logo.png
└── docs/                     Guides and specs
```

`src/` (all `.gs` / Apps Script HTML) is gitignored and must not be pushed.

## Enable GitHub Pages

1. Repo **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / folder: `/ (root)`
4. Save, then open the published site URL

The page loads the Apps Script app in an iframe and includes **Open in new tab** if a browser blocks the embed.

## Update the embedded app URL

Edit `APP_URL` in [`index.html`](index.html) when you create a new Apps Script deployment.

## Local Apps Script deploy (clasp)

On a machine that has the private `src/` folder:

```bash
cp .clasp.json.example .clasp.json
# set scriptId
clasp push --force
```

## Branding

The Kenya Shipyards Limited name and logo belong to KSL / Government of Kenya.
