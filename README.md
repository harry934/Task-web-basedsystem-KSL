# Kenya Shipyards Limited — Tasks Management System

A web-based system for **Kenya Shipyards Limited (KSL)** to create, assign, monitor, and report on operational tasks.

KSL is a state company under the **Ministry of Defence**. This application supports supervisors, managers, team leaders, and employees in day-to-day work: who is doing what, by when, and how far it has progressed.

**Official site:** [kenyashipyards.co.ke](https://kenyashipyards.co.ke/)

---

## What this system does

| Area | Purpose |
|------|---------|
| **Access control** | Google sign-in, pending approval, roles (Administrator, Manager, Supervisor, Team Leader, Employee) |
| **Organisation** | Departments used when creating and reporting on tasks |
| **Tasks** | Create, edit, archive, and reopen work items with dates, priority, progress, and blockers |
| **Assignments** | Assign a task to one or more employees and set a primary assignee |
| **My Tasks** | Employees see their own work, accept or reject assignments, and submit progress |
| **Progress** | Immutable progress history; supervisors can approve or reject updates |
| **Monitoring** | Supervisory view of overdue, due soon, blocked, and in-progress work |
| **Dashboard** | Role-scoped counts (total, assigned, in progress, completed, overdue) |
| **Audit** | Server-side log of important create / update / archive / approval actions |

Data is stored in **Google Sheets**. The user interface is a **Google Apps Script web app** (HTML/CSS/JavaScript). Timezone: **Africa/Nairobi**.

---

## Who uses it

- **Administrator** — users, departments, all operational modules  
- **Manager / Supervisor / Team Leader** — tasks, assignments, progress review, monitoring  
- **Employee** — dashboard and **My Tasks** only (until given a higher role)

New Google accounts start as **Pending Approval**. An administrator must assign Employee ID, department, job title, and role before they can use operational pages.

---

## What works now vs later

**Working now (Slice 1 + Phase 2)**

- Login and user approval  
- Departments  
- Task management  
- Assignments, My Tasks, Progress updates, Monitoring  
- Dashboard and branding (official KSL logo)

**Not built yet (later phases)**

- Full Employees / Teams admin screens  
- Notifications centre page  
- Audit log viewer and Settings UI  
- Daily / weekly / monthly snapshots  
- Reports, PDF export, performance scoring  
- Comments, Drive attachments, parent/child tasks  

---

## Important: this is not a normal website folder

Files such as `index.html` are **page fragments**. They are injected into `template.html` by Apps Script.

- Opening `index.html` in Cursor or a browser **will not** show the real app.  
- The live UI is the **web app URL** after you deploy (for example `.../exec?page=login`).

---

## Beginner setup

### 1. Create the spreadsheet

1. Create a Google Sheet named `Kenya Shipyards Tasks Management System`.  
2. Copy the Sheet ID from the URL (`/d/`**THIS_PART**`/edit`).  
3. Open **Extensions → Apps Script**.

### 2. Copy this repository into Apps Script

Copy every `.gs` file, every `.html` file, and `appsscript.json` into the Apps Script project. Save.

### 3. Script properties

**Project Settings → Script properties:**

| Name | Value |
|------|--------|
| `DATABASE_SPREADSHEET_ID` | Your Sheet ID (optional if the script is bound to that sheet) |
| `GOOGLE_CLIENT_ID` | Leave empty (Apps Script session login). GIS OAuth origins are often blocked on `script.google.com`. |

### 4. Create sheets and the first admin

In the Apps Script editor, run these **in order**:

1. `bootstrapMvpSlice1Database` — creates sheets, headers, named ranges, and seed data.  
2. `repairWorkbookPerformance` — trims extra empty rows (keeps the app fast).  
3. Add a helper and run it (use **your** Google email):

```javascript
function runAdminSetup() {
  return bootstrapFirstAdminByEmail({
    email: "youremail@gmail.com",
    fullName: "Your Name",
    employeeId: "EMP-001",
    department: "Engineering"
  });
}
```

### 5. Deploy the web app

1. **Deploy → New deployment → Web app**  
2. Execute as: **User accessing the web app**  
3. Who has access: **Anyone with a Google account** (or your organisation)  
4. Open the URL with `?page=login`  
5. Click **Sign in with Google account**

After later code changes: **Manage deployments → pencil → New version → Deploy**, then **Ctrl + F5**.

---

## Project files

| File | Role |
|------|------|
| `appsscript.json` | Apps Script manifest (timezone, scopes) |
| `gsbootstrap.gs` | Workbook schema, seed data, first admin, performance repair |
| `gscommon.gs` | Sheets helpers, sessions, roles, audit, notifications |
| `gstemplate.gs` | Routing (`doGet`) and shell |
| `gsauth.gs` / `gslogin.gs` | Login |
| `gsusers.gs` / `gsdepartments.gs` / `gstasks.gs` | Slice 1 modules |
| `gsassignments.gs` / `gsmytasks.gs` / `gsprogress.gs` / `gsmonitoring.gs` | Phase 2 modules |
| `template.html`, `styles.html`, `scripts.html` | Shared shell and UI |
| Feature `*.html` files | Page fragments for each module |

---

## Licence and branding

Application code in this repository is for KSL operational use. The **Kenya Shipyards Limited** name and logo belong to Kenya Shipyards Limited / the Government of Kenya. The logo used in the UI is loaded from the official website.
