# Kenya Shipyards Limited Tasks Management System

Web app for planning, assigning, tracking, reviewing work, and daily staff deployment at Kenya Shipyards Limited.

- **Frontend / backend:** Google Apps Script (kept **local**, not in this GitHub repo)
- **Database:** Google Sheets (Africa/Nairobi)
- **This repository:** documentation, branding assets, and deployment notes only

**Live app (share this in email):**  
https://script.google.com/a/*/macros/s/AKfycbzn34cAzmEzRipA4Y2omX8psx4O0OPEWpOoufIkMqK2Mp-bz7I2Tz-yicHosAoRj3f2Pw/exec

Send that `/exec` web app link only. Do not send a Google Sheet, Drive file, Apps Script editor, `/dev`, or `usercontent.com` URL.

## What is on GitHub

```text
.
├── README.md                 This landing page
├── .gitignore
├── .clasp.json.example       Local clasp setup template (script ID not committed)
├── assets/                   Branding (logo)
└── docs/                     Guides, compliance notes, and specs
```

Apps Script sources (`src/*.gs`, `src/*.html`, `appsscript.json`) are **intentionally excluded** from GitHub. Deploy the running app with **clasp** from your local machine.

## Documentation

| File | What it covers |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | Sign-in, roles, pages, Admin vs Staff |
| [docs/PROMPT_COMPLIANCE_AUDIT.md](docs/PROMPT_COMPLIANCE_AUDIT.md) | Prompt-by-prompt build audit |
| [docs/PROMPT_29_COPY_PASTE_CHECKLIST.md](docs/PROMPT_29_COPY_PASTE_CHECKLIST.md) | Manual test / deploy checklist |

## Local Apps Script deploy (clasp)

On a machine that has the private `src/` project folder:

```bash
cp .clasp.json.example .clasp.json
# set scriptId in .clasp.json
clasp push --force
clasp version "Describe the change"
clasp deploy -i YOUR_DEPLOYMENT_ID -V VERSION
```

Then hard-refresh the `/exec` URL (`Ctrl+F5`).

## First-time Apps Script setup

1. Create or open the Google Sheet used as the database.
2. Bind or point the script at that sheet (`DATABASE_SPREADSHEET_ID` in Script properties if needed).
3. Push the local `src/` folder with clasp.
4. In the Apps Script editor run `bootstrapMvpSlice1Database`, then create the first administrator.
5. Deploy as a web app (username/password auth).

## Branding

The Kenya Shipyards Limited name and logo belong to KSL / Government of Kenya.
