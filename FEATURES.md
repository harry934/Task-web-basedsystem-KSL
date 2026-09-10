# Kenya Shipyards Limited Tasks Management System

This is the web app for planning, assigning, tracking, and reviewing work at Kenya Shipyards Limited. It runs on Google Apps Script with Google Sheets as the database. People sign in with a **username and password** issued by an administrator. There is no public sign-up.

Live app: `https://script.google.com/macros/s/AKfycbzn34cAzmEzRipA4Y2omX8psx4O0OPEWpOoufIkMqK2Mp-bz7I2Tz-yicHosAoRj3f2Pw/exec`

## How to sign in

1. Open the live `/exec` link.
2. Enter the username and password created in **Users**.
3. The dashboard opens for your role.

Guessing a page in the URL (for example `?page=progress`) without signing in sends you back to Sign in with: **You are not allowed to open that page. Sign in first.**

Accounts are created from **Staff** (person record) then **Users** (login). Staff cannot create their own accounts.

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
- Create login accounts, reset passwords, approve or disable users.
- Change Settings, dimension lists, backup, and **Rebuild Config**.
- Read the **Audit log**.

Typical setup order:

1. Settings → Rebuild Config (if sheets are missing).
2. Departments and Teams.
3. Staff records (this creates the Staff UID).
4. Users → New User (username, password, role, linked Staff UID).
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

- New User: username, password, role, linked staff.
- Approval queue, disable/enable, reset password, delete.
- Roles: Administrator, Manager, Supervisor, Team Leader, Staff.

### Settings (Administrator only)

- App title, due-soon days, assignment acceptance, completion rules, PDF size limit, performance weights.
- Dimensions (priorities, statuses, categories, and similar lists).
- Backup and **Rebuild Config** (creates missing sheets such as TaskSubtasks and extra TaskUpdates file columns).

---

## File uploads

Every document upload in the app is **PDF only** (progress summary, subtask evidence, task attachment). Word, images, and other types show **Only PDF files are allowed.** Maximum size is 2 MB unless Settings say otherwise.

---

## Other roles (short)

- **Team Leader**: tasks, assignments, monitoring, progress review for their scope; no organisation admin or Users/Settings.
- **Supervisor**: Team Leader pages plus daily/weekly/monthly progress, reports, and performance.
- **Manager**: Supervisor pages plus Staff, Teams, Departments, and Audit; not Users or Settings.

Data on most pages is still **scoped** (own department / team / assignments) except Administrator, who can see the full register.
