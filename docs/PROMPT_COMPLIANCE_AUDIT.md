# Prompt Compliance Audit (29 Items)

This audit maps the current repository against all 29 items in [`spec/Master_Prompt.docx`](spec/Master_Prompt.docx). Application source lives in [`../src/`](../src/).
- Item 1-20: `PROMPT 1` through `PROMPT 20`
- Item 21-29: continuation sections (`DETAILED TASK BUSINESS RULES` through `SOURCE/REFERENCE BASIS`)

## Scope Notes

- Authentication remains **username/password** by confirmed product decision.
- Because of that decision, `PROMPT 2` is marked **Implemented (Adapted)** and Prompt 1 Google-login wording is treated as adapted, not missing.

## Status Summary

- **Implemented:** 28
- **Implemented (Adapted):** 1
- **Partial:** 0
- **Missing:** 0

## 29-Item Compliance Matrix

| Item | Prompt/Section | Status | File Evidence | Main Gap |
|---|---|---|---|---|
| 1 | PROMPT 1 - System build instructions | Implemented | [`template.html`](../src/template.html), [`gstemplate.gs`](../src/gstemplate.gs), [`gsbootstrap.gs`](../src/gsbootstrap.gs), [`gscommon.gs`](../src/gscommon.gs) | Auth is username/password rather than GIS. |
| 2 | PROMPT 2 - Authentication and Login | Implemented (Adapted) | [`login.html`](../src/login.html), [`gsauth.gs`](../src/gsauth.gs), [`gsusers.gs`](../src/gsusers.gs) | Username/password instead of Google GIS. |
| 3 | PROMPT 3 - Dashboard | Implemented | [`index.html`](../src/index.html), [`gsindex.gs`](../src/gsindex.gs) | KPI, date/department/supervisor filters, charts, CSV/PDF export. |
| 4 | PROMPT 4 - My Tasks | Implemented | [`mytasks.html`](../src/mytasks.html), [`gsmytasks.gs`](../src/gsmytasks.gs) | Accept/reject, progress, Next Action, Challenges, Work Remaining. |
| 5 | PROMPT 5 - Task Management | Implemented | [`tasks.html`](../src/tasks.html), [`gstasks.gs`](../src/gstasks.gs) | Advanced fields, export, comments/attachments/history drill-down. |
| 6 | PROMPT 6 - Task Assignments | Implemented | [`assignments.html`](../src/assignments.html), [`gsassignments.gs`](../src/gsassignments.gs) | One-form multi-assignee create plus reassignment. |
| 7 | PROMPT 7 - Employee Management | Implemented | [`employees.html`](../src/employees.html), [`gsemployees.gs`](../src/gsemployees.gs) | Supervisor filter, metrics recalc, export. |
| 8 | PROMPT 8 - Team Management | Implemented | [`teams.html`](../src/teams.html), [`gsteams.gs`](../src/gsteams.gs) | Create/edit/archive with active-task dependency check. |
| 9 | PROMPT 9 - Department Management | Implemented | [`departments.html`](../src/departments.html), [`gsdepartments.gs`](../src/gsdepartments.gs) | Head filter, clear, archive protection. |
| 10 | PROMPT 10 - Progress Updates | Implemented | [`progress.html`](../src/progress.html), [`gsprogress.gs`](../src/gsprogress.gs) | On-page create plus review workflow. |
| 11 | PROMPT 11 - Task Monitoring | Implemented | [`monitoring.html`](../src/monitoring.html), [`gsmonitoring.gs`](../src/gsmonitoring.gs) | Flag views, extra filters, drill-down. |
| 12 | PROMPT 12 - Daily Progress | Implemented | [`dailyprogress.html`](../src/dailyprogress.html), [`gsdailyprogress.gs`](../src/gsdailyprogress.gs) | Controlled upsert snapshots, review, export. |
| 13 | PROMPT 13 - Weekly Progress | Implemented | [`weeklyprogress.html`](../src/weeklyprogress.html), [`gsweeklyprogress.gs`](../src/gsweeklyprogress.gs) | Week-range generate/review/export. |
| 14 | PROMPT 14 - Monthly Progress | Implemented | [`monthlyprogress.html`](../src/monthlyprogress.html), [`gsmonthlyprogress.gs`](../src/gsmonthlyprogress.gs) | Month generate/review/export. |
| 15 | PROMPT 15 - Reports | Implemented | [`reports.html`](../src/reports.html), [`gsreports.gs`](../src/gsreports.gs) | Required report types, preview, CSV/PDF. |
| 16 | PROMPT 16 - Employee Performance | Implemented | [`performance.html`](../src/performance.html), [`gsperformance.gs`](../src/gsperformance.gs) | Weighted scoring, grades, review fields. |
| 17 | PROMPT 17 - Notifications | Implemented | [`notifications.html`](../src/notifications.html), [`gsnotifications.gs`](../src/gsnotifications.gs) | List/filter/mark-read/mark-all-read. |
| 18 | PROMPT 18 - Audit Log | Implemented | [`audit.html`](../src/audit.html), [`gsaudit.gs`](../src/gsaudit.gs) | Read-only search and export. |
| 19 | PROMPT 19 - User Management | Implemented | [`users.html`](../src/users.html), [`gsusers.gs`](../src/gsusers.gs) | New User, Approval Queue, role/department/status. |
| 20 | PROMPT 20 - System Settings | Implemented | [`settings.html`](../src/settings.html), [`gssettings.gs`](../src/gssettings.gs) | Settings CRUD, dimensions, backup, rebuild. |
| 21 | 21. Detailed Task Business Rules | Implemented | [`gstasks.gs`](../src/gstasks.gs), [`gsmytasks.gs`](../src/gsmytasks.gs), [`gsassignments.gs`](../src/gsassignments.gs) | Progress bounds, overdue calc, delay/blocker, parent/assignee checks. |
| 22 | 22. Comments, Attachments and History | Implemented | [`gscomments.gs`](../src/gscomments.gs), [`gstasks.gs`](../src/gstasks.gs) | Comments, Drive attachments, immutable TaskHistory. |
| 23 | 23. Dashboard KPI and Reporting Logic | Implemented | [`gsindex.gs`](../src/gsindex.gs), [`index.html`](../src/index.html) | Required KPI set plus status/priority/department charts. |
| 24 | 24. Performance Scoring Configuration | Implemented | [`gsbootstrap.gs`](../src/gsbootstrap.gs), [`gssnapshots.gs`](../src/gssnapshots.gs), [`gsperformance.gs`](../src/gsperformance.gs) | Settings-driven weights and grade thresholds. |
| 25 | 25. Report Output and PDF Requirements | Implemented | [`gsreports.gs`](../src/gsreports.gs), [`gscommon.gs`](../src/gscommon.gs) | Server-side DocumentApp PDF generation. |
| 26 | 26. Data Integrity, Concurrency and Error Handling | Implemented | [`gscommon.gs`](../src/gscommon.gs) | Script locks, structured errors, scoped auth, soft archive. |
| 27 | 27. Final File Structure | Implemented | Repo file pairs listed below | Required HTML/GS pairs are present. |
| 28 | 28. Implementation Checklist | Implemented | This file and [`PROMPT_29_COPY_PASTE_CHECKLIST.md`](PROMPT_29_COPY_PASTE_CHECKLIST.md) | Manual deploy/test checklist included. |
| 29 | 29. Source/Reference Basis | Implemented | [`spec/Master_Prompt.docx`](spec/Master_Prompt.docx), this audit | Spec basis documented and implemented. |

## Required File Pairs

All pairs are under `src/`.

- `src/index.html` / `src/gsindex.gs`
- `src/mytasks.html` / `src/gsmytasks.gs`
- `src/tasks.html` / `src/gstasks.gs`
- `src/assignments.html` / `src/gsassignments.gs`
- `src/employees.html` / `src/gsemployees.gs`
- `src/teams.html` / `src/gsteams.gs`
- `src/departments.html` / `src/gsdepartments.gs`
- `src/progress.html` / `src/gsprogress.gs`
- `src/monitoring.html` / `src/gsmonitoring.gs`
- `src/dailyprogress.html` / `src/gsdailyprogress.gs`
- `src/weeklyprogress.html` / `src/gsweeklyprogress.gs`
- `src/monthlyprogress.html` / `src/gsmonthlyprogress.gs`
- `src/reports.html` / `src/gsreports.gs`
- `src/performance.html` / `src/gsperformance.gs`
- `src/notifications.html` / `src/gsnotifications.gs`
- `src/audit.html` / `src/gsaudit.gs`
- `src/users.html` / `src/gsusers.gs`
- `src/settings.html` / `src/gssettings.gs`
- `src/login.html` / `src/gsauth.gs`

## Manual Deployment And Test Checklist

### Deploy

1. From the repo root run `clasp push --force` (clasp `rootDir` is `src/`).
2. Run `bootstrapMvpSlice1Database`.
3. Optionally run `repairWorkbookPerformance`.
4. Deploy a new Web App version and open `/exec?page=login`.

### Admin flow

1. Sign in as administrator.
2. Confirm dashboard KPIs and filters load without a long hang.
3. Create Department, Team, Employee, User, and Task.
4. Assign multiple employees to one task.
5. Generate Daily/Weekly/Monthly snapshots and a Report PDF.
6. Generate and review a Performance evaluation.
7. Open Notifications, Audit, and Settings.

### Employee flow

1. Approve or create an Employee-role user with an Employee ID.
2. Sign in as that user.
3. Confirm dashboard opens (empty KPIs are valid).
4. Open My Tasks, accept an assignment, and submit progress including Next Action/Challenges/Work Remaining.
5. Open Notifications and mark items read.

## Final Note

This re-audit is file-backed against the current repository after the missing-first implementation pass. Redeploy Apps Script and re-bootstrap the workbook before production testing.
