# Kenya Shipyards Limited Tasks Management System

This is the web app for planning, assigning, tracking, and reviewing work at Kenya Shipyards Limited. It runs on Google Apps Script with Google Sheets as the database.

There is **one Sign in page for everyone** — Administrator, Manager, Supervisor, Team Leader, and Staff. After an administrator creates a staff person and issues them a username, that staff member uses the **same** Sign in page as the admin. There is no separate staff login and no public sign-up.

Live app (use this in email and other browsers):  
`https://script.google.com/a/*/macros/s/AKfycbzn34cAzmEzRipA4Y2omX8psx4O0OPEWpOoufIkMqK2Mp-bz7I2Tz-yicHosAoRj3f2Pw/exec`

Share only that `/exec` web app URL. A Google Sheet, Drive, Apps Script editor, `/dev`, or `usercontent.com` link is not the app and shows Drive’s “Sorry, unable to open the file at present” page. Recipients signed into more than one Google account should open the link in a private/incognito window.

## How to sign in

The Sign in page is shared. Admin and staff both open the same `/exec` link.

**Administrator**
1. Open the live `/exec` link.
2. Sign in with the admin username and password.
3. The full dashboard opens (all pages for the Administrator role).

**Staff (after the admin has created them)**
1. Admin creates the person on **Staff**.
2. Admin creates their login on **Users** (username, password, role). Pick the **staff member by name**. Staff UID and Login UID are generated automatically. The account is active immediately — there is no approval queue.
3. That staff member opens the **same** Sign in page, enters their username and password, and lands on the staff dashboard (Dashboard, My Tasks, Progress, Notifications).

Guessing a page in the URL (for example `?page=progress`) without signing in sends you back to Sign in with: **You are not allowed to open that page. Sign in first.**

Staff cannot create their own accounts. Only an administrator creates Staff records and User logins.

## Roles at a glance

| Area | Administrator | Manager | Supervisor | Team Leader | Staff |
|---|---|---|---|---|---|
| Dashboard, My Tasks, Progress, Notifications | Yes | Yes | Yes | Yes | Yes |
| Tasks, Assignments, Monitoring | Yes | Yes | Yes | Yes | No |
| Staff, Teams, Departments, Audit | Yes | Yes | No | No | No |
| Daily / Weekly / Monthly Progress, Reports, Performance | Yes | Yes | Yes | No | No |
| Users, Settings | Yes | No | No | No | No |
| Look up another person’s work | Yes | Yes | Yes | No | No |

**Staff** in this document means the day-to-day worker role (stored as Staff; older records may say Employee). They only see their own assignments, progress, and notifications.

**Administrator** can open every page, create logins, change settings, and see all work in scope.

---

## What Staff can do

- See a dashboard of **their** KPIs (counts are limited to their work).
- Open **My Tasks**: accept or reject assignments, complete subtasks, submit a progress update.
- Open **Progress**: submit an update on an assigned task (same rules as My Tasks).
- Read **Notifications** (assignments, progress reviews) and mark them read.
- Sign out.

Staff cannot create tasks, assign other people, manage users, change settings, or open admin reports.

### Completing work

- A task’s **Progress %** is not typed. It is `round(completed subtasks ÷ total subtasks × 100)`.
- Each subtask is completed from My Tasks with a **short summary** and a **PDF** (max 2 MB). Other file types are rejected.
- A progress update can attach **one summary PDF** for the whole update. That file does not mark subtasks complete.
- If a task has no subtasks, progress stays at 0% until subtasks are added on the Tasks page.

---

## What an Administrator can do

Everything Staff can do, plus:

- Create and edit **tasks** and **subtasks**.
- **Assign** and reassign work.
- Manage **Staff**, **Teams**, and **Departments**.
- Review progress updates (approve / reject).
- Monitor overdue, due soon, and blocked work.
- Generate daily / weekly / monthly snapshots, reports, and performance scores.
- Search any staff member’s tasks and subtasks from the dashboard (and Monitoring).
- Create login accounts, reset passwords, activate, suspend, or disable users.
- Change Settings, dimension lists, backup, and **Rebuild Config**.
- Read the **Audit log**.

Typical setup order:

1. Settings → Rebuild Config (if sheets are missing).
2. Departments and Teams.
3. Staff records (this creates the Staff UID).
4. Users → New User (pick the staff member by name, then username and password). The account can sign in immediately.
5. Tasks with subtasks → Assignments.

---

## Dashboard pages

### Dashboard

Home screen after sign-in.

- KPIs: total, assigned, in progress, completed, overdue, due soon, blocked, completion %.
- Filters: date range, department, supervisor.
- Charts: status, priority, department.
- Export CSV / PDF.
- Administrators, Managers, and Supervisors can **look up staff work** by name, username, or Staff UID.

### My Tasks

Personal work queue.

- Accept or reject a new assignment (if acceptance is required in Settings).
- Complete a subtask (summary + PDF).
- Submit a progress update (notes, hours, optional summary PDF). Progress % is locked to subtasks.

### Tasks

Create and maintain the task register (not shown to Staff).

- Title, description, department, dates, priority, status, optional primary assignee.
- Subtasks: each one counts equally toward Progress %.
- Comments and **PDF** attachments on a saved task.
- Archive, reopen, delete, export.

### Assignments

Put people on tasks.

- New assignment to one or more staff from the Staff list.
- Pending acceptance, reassign, delete.
- Assigning someone sends them a notification.

### Progress

History of progress submissions.

- Create an update after selecting a task (subtask checklist and locked %).
- Supervisors and above can **approve or reject** pending updates.
- Staff only see their own submissions.

### Monitoring

Operational flags: overdue, due soon, blocked, in progress. Staff lookup is available for admin-level roles.

### Staff, Teams, Departments

Organisation records. Create staff **before** creating a login. Archive is blocked when the record is still used by active tasks.

Settings → Dimensions lists **names only**. The Departments and Teams pages need actual records (ID, head/leader, status). If those pages are empty, use **Import from Dimensions**.

PDF Export opens a preview first; then Download. Deletes ask for confirmation and can be undone for a few seconds.

### Daily / Weekly / Monthly Progress

Snapshot reports generated from live tasks, then reviewed and exported. Supervisor and above.

### Reports

Generate Task Register, Outstanding, Overdue, progress, and performance reports. Preview, CSV, and PDF.

### Performance

Weighted staff scores and grades from settings (completion, timeliness, quality). Supervisor and above.

### Notifications

Assignment and review alerts. The bell on the top bar shows unread count and refreshes about every 30 seconds.

### Audit Log

Read-only history of sign-ins, creates, updates, deletes, and reviews. Administrator and Manager.

### Users (Administrator only)

- New User: pick the staff member by name, then username, password, and role. Staff UID and Login UID are automatic. The account is Active immediately.
- The first Administrator is the **Super Admin**. That account is permanent: nobody can edit, suspend, or delete it, including the Super Admin themselves.
- Only the Super Admin can create another Administrator, promote someone to Administrator, demote a normal Administrator, or **transfer ownership** (Make Super Admin).
- A normal Administrator can manage Manager / Supervisor / Team Leader / Staff accounts only.
- Activate, suspend, disable, reset password, and delete apply to other non-permanent accounts.
- No approval queue — the administrator creates both the staff record and the login.
- Roles: Super Admin (one owner), Administrator, Manager, Supervisor, Team Leader, Staff.

### Settings (Administrator only)

Labeled groups for application title, date format, due-soon days, workflow rules, performance weights, table page size, and sign-in limits. Use **Save Settings**, **Dimensions**, **Backup**, **Rebuild Config**, **Refresh**, and **Clear**. Rebuild Config creates missing sheets and default settings; it does not delete data.

---

## File uploads

Every document upload in the app is **PDF only** (progress summary, subtask evidence, task attachment). Word, images, and other types show **Only PDF files are allowed.** Maximum size is 2 MB unless Settings say otherwise.

---

## Other roles (short)

- **Team Leader**: tasks, assignments, monitoring, progress review for their scope; no organisation admin or Users/Settings.
- **Supervisor**: Team Leader pages plus daily/weekly/monthly progress, reports, and performance.
- **Manager**: Supervisor pages plus Staff, Teams, Departments, and Audit; not Users or Settings.

Data on most pages is still **scoped** (own department / team / assignments) except Administrator, who can see the full register.
