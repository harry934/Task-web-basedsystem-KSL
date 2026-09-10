# Kenya Shipyards Limited Tasks Management System

Web app for planning, assigning, tracking, and reviewing work at Kenya Shipyards Limited.

- **Frontend:** HTML pages inside a shared Apps Script template
- **Backend:** Google Apps Script
- **Database:** Google Sheets (Africa/Nairobi)

There is **one Sign in page** for Administrator and Staff. After an admin creates a staff record and a username, that person signs in on the same page.

**Live app (share this in email):**  
https://script.google.com/a/*/macros/s/AKfycbzn34cAzmEzRipA4Y2omX8psx4O0OPEWpOoufIkMqK2Mp-bz7I2Tz-yicHosAoRj3f2Pw/exec

Send that `/exec` web app link only. Do not send a Google Sheet, Drive file, Apps Script editor, `/dev`, or `usercontent.com` URL — those show Google Drive’s “Sorry, unable to open the file at present” page. If a recipient is signed into several Google accounts, ask them to open the link in a private/incognito window.

## Repository layout

```text
.
├── README.md                 GitHub landing page
├── .gitignore
├── .clasp.json.example       Copy to .clasp.json and set your script ID
├── assets/                   Branding (logo)
├── docs/                     Guides and compliance notes
│   ├── FEATURES.md           What each page does; Admin vs Staff
│   ├── PROMPT_COMPLIANCE_AUDIT.md
│   └── PROMPT_29_COPY_PASTE_CHECKLIST.md
└── src/                      Apps Script project (clasp rootDir)
    ├── appsscript.json
    ├── gstemplate.gs         Routing and doGet
    ├── gs*.gs                Server modules
    ├── template.html         Shared shell
    ├── styles.html
    ├── scripts.html
    └── *.html                Page fragments (login, dashboard, tasks, …)
```

`src/` stays flat on purpose. Apps Script `include('styles')` and `createHtmlOutputFromFile('login')` use the file name only, so nested folders inside `src/` would break the app.

## Documentation

| File | What it covers |
|---|---|
| [docs/FEATURES.md](docs/FEATURES.md) | Sign-in, roles, every dashboard page, Admin vs Staff |
| [docs/PROMPT_COMPLIANCE_AUDIT.md](docs/PROMPT_COMPLIANCE_AUDIT.md) | Prompt-by-prompt build audit |
| [docs/PROMPT_29_COPY_PASTE_CHECKLIST.md](docs/PROMPT_29_COPY_PASTE_CHECKLIST.md) | Manual test / deploy checklist |

## Push and deploy (clasp)

From the repository root (not from `src/`):

```bash
cp .clasp.json.example .clasp.json
# set scriptId in .clasp.json
clasp push --force
clasp version "Describe the change"
clasp deploy -i YOUR_DEPLOYMENT_ID -V VERSION
```

Then hard-refresh the `/exec` URL (`Ctrl+F5`).

Page fragments in `src/*.html` are not standalone websites. Always open the deployed web app URL.

## First-time Apps Script setup

1. Create or open the Google Sheet used as the database.
2. Bind or point the script at that sheet (`DATABASE_SPREADSHEET_ID` in Script properties if needed).
3. Push this `src/` folder with clasp.
4. In the Apps Script editor run `bootstrapMvpSlice1Database`, then create the first administrator from **Users** (or the bootstrap helpers).
5. Deploy as a web app. This project uses username/password (not Google sign-in).

Public self-registration is disabled. Only an administrator creates Staff records and User logins.

## Branding

The Kenya Shipyards Limited name and logo belong to KSL / Government of Kenya.
