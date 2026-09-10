# Kenya Shipyards Limited — Tasks Management System

Web-based operational task system for **Kenya Shipyards Limited (KSL)** using:
- **Database:** Google Sheets
- **Backend:** Google Apps Script
- **Frontend:** HTML/CSS/JavaScript fragments rendered inside a shared template

Timezone is **Africa/Nairobi**.

## Authentication Mode (Current)

This version uses **classic username/password authentication** with:
- self-registration (new users start as **Pending Approval**)
- administrator approval and role assignment
- server-side password hashing and temporary lockout after repeated failed attempts

Google OAuth / GIS sign-in is no longer required in this branch.

## What Works Now

- Username/password registration and login
- User approval, New User create, suspend/disable, and admin password reset
- Employees, Teams, and Departments master-data
- Task management with comments, attachments, history, and export
- Multi-assignee assignments
- My Tasks and on-page progress updates
- Daily / Weekly / Monthly snapshot generation and review
- Reports preview with CSV and server-side PDF export
- Employee performance scoring from Settings weights
- Notifications center and Audit viewer
- Settings and Dimensions administration
- Dashboard KPIs, filters, charts, and export

## Important Runtime Note

Files such as `index.html` are **not standalone web pages**. They are page fragments included by `template.html` in Apps Script.

Open the deployed Apps Script web app URL (for example `.../exec?page=login`) to use the system.

## Beginner Setup (Detailed)

### 1) Create the database spreadsheet

1. Create a Google Sheet named `Kenya Shipyards Tasks Management System`.
2. Copy the sheet ID from the URL (the text between `/d/` and `/edit`).
3. Open **Extensions -> Apps Script** from that sheet.

### 2) Copy code files into Apps Script

Copy all files from this project:
- all `.gs` files
- all `.html` files
- `appsscript.json`

If `appsscript.json` is hidden in Apps Script:
1. Open **Project Settings**.
2. Enable **Show "appsscript.json" manifest file in editor**.
3. Paste the manifest content.

### 3) Configure script properties

In Apps Script:
1. Open **Project Settings**.
2. Scroll to **Script properties**.
3. Add:
   - `DATABASE_SPREADSHEET_ID` = your sheet ID (optional if bound to same sheet)

No Google OAuth client ID is needed for this auth mode.

### 4) Bootstrap sheets and defaults

Run these functions in Apps Script editor:

1. `bootstrapMvpSlice1Database`
2. `repairWorkbookPerformance`

### 5) Create first administrator user record

Run:

```javascript
function runAdminUserBootstrap() {
  return bootstrapFirstAdminByEmail({
    email: "admin@yourcompany.com",
    fullName: "System Administrator",
    employeeId: "EMP-001",
    department: "Engineering",
    jobTitle: "Administrator"
  });
}
```

### 6) Create first administrator credentials

Run:

```javascript
function runAdminCredentialsBootstrap() {
  return bootstrapFirstAdminCredentials({
    email: "admin@yourcompany.com",
    username: "admin.ksl",
    password: "Admin12345"
  });
}
```

Password rules are enforced from settings (default minimum 8 chars with uppercase/lowercase/number).

### 7) Deploy web app

1. Click **Deploy -> New deployment -> Web app**.
2. Execute as: **User accessing the web app**.
3. Who has access: **Anyone with Google account** (or your organization policy).
4. Open deployed URL with `?page=login`.
5. Sign in with:
   - Username: `admin.ksl`
   - Password: the value you set in bootstrap

### 8) Migrate existing users after auth switch

For users that existed before password auth:
1. Log in as admin.
2. Open **Users** page.
3. Click **Set Password** for each user.
4. Enter username + temporary password.
5. Share credentials securely with user.

### 9) Add staff for assignment

1. Open **Employees** page.
2. Click **New employee**.
3. Save staff profile.

Assignments use active Employees (plus active approved Users with Employee ID).

### 10) After any code update

1. Copy updated files into Apps Script.
2. **Deploy -> Manage deployments -> Edit -> New version -> Deploy**.
3. Hard refresh browser (`Ctrl + F5`).

## Compliance Audit

Prompt-by-prompt completion status is tracked in:
- `PROMPT_COMPLIANCE_AUDIT.md`

## After this update

1. Copy all new and changed `.gs` / `.html` files into Apps Script.
2. Run `bootstrapMvpSlice1Database` to create missing sheets/ranges (`Teams`, `TaskComments`, `TaskAttachments`, `DailyProgress`, `WeeklyProgress`, `MonthlyProgress`, `Performance`) and seed missing settings.
3. Optionally run `repairWorkbookPerformance`.
4. Deploy a new web app version and open `/exec?page=login`.

Admin login (if previously bootstrapped): `innovatehubke.admin` / `KslAdmin2026`.

## Main Files

- `gsbootstrap.gs`: schema bootstrap, defaults, admin bootstrap helpers
- `gscommon.gs`: shared helpers, sessions, credential hashing, audit/history helpers
- `gsauth.gs`: register/login/logout logic
- `gsindex.gs`: dashboard KPIs, charts, and export
- `gsteams.gs`, `gsdailyprogress.gs`, `gsweeklyprogress.gs`, `gsmonthlyprogress.gs`, `gsreports.gs`, `gsperformance.gs`, `gsnotifications.gs`, `gsaudit.gs`, `gssettings.gs`, `gscomments.gs`, `gssnapshots.gs`
- `gstasks.gs`, `gsassignments.gs`, `gsmytasks.gs`, `gsprogress.gs`, `gsmonitoring.gs`, `gsemployees.gs`, `gsdepartments.gs`, `gsusers.gs`
- `template.html`, `styles.html`, `scripts.html`: reusable shell and frontend shared logic

## Branding and Ownership

The **Kenya Shipyards Limited** name and logo belong to KSL / Government of Kenya.
