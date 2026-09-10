# Prompt Compliance Audit (29 Items)

This audit maps the current repository against all 29 items in `Kenya_Shipyards_Limited_Tasks_Management_System_Master_Prompt (1).docx`:
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
| 1 | PROMPT 1 - System build instructions | Implemented | [`template.html`](template.html), [`gstemplate.gs`](gstemplate.gs), [`gsbootstrap.gs`](gsbootstrap.gs), [`gscommon.gs`](gscommon.gs) | Auth is username/password rather than GIS. |
| 2 | PROMPT 2 - Authentication and Login | Implemented (Adapted) | [`login.html`](login.html), [`gsauth.gs`](gsauth.gs), [`gsusers.gs`](gsusers.gs) | Username/password instead of Google GIS. |
| 3 | PROMPT 3 - Dashboard | Implemented | [`index.html`](index.html), [`gsindex.gs`](gsindex.gs) | KPI, date/department/supervisor filters, charts, CSV/PDF export. |
| 4 | PROMPT 4 - My Tasks | Implemented | [`mytasks.html`](mytasks.html), [`gsmytasks.gs`](gsmytasks.gs) | Accept/reject, progress, Next Action, Challenges, Work Remaining. |
| 5 | PROMPT 5 - Task Management | Implemented | [`tasks.html`](tasks.html), [`gstasks.gs`](gstasks.gs) | Advanced fields, export, comments/attachments/history drill-down. |
| 6 | PROMPT 6 - Task Assignments | Implemented | [`assignments.html`](assignments.html), [`gsassignments.gs`](gsassignments.gs) | One-form multi-assignee create plus reassignment. |
| 7 | PROMPT 7 - Employee Management | Implemented | [`employees.html`](employees.html), [`gsemployees.gs`](gsemployees.gs) | Supervisor filter, metrics recalc, export. |
| 8 | PROMPT 8 - Team Management | Implemented | [`teams.html`](teams.html), [`gsteams.gs`](gsteams.gs) | Create/edit/archive with active-task dependency check. |
| 9 | PROMPT 9 - Department Management | Implemented | [`departments.html`](departments.html), [`gsdepartments.gs`](gsdepartments.gs) | Head filter, clear, archive protection. |
| 10 | PROMPT 10 - Progress Updates | Implemented | [`progress.html`](progress.html), [`gsprogress.gs`](gsprogress.gs) | On-page create plus review workflow. |
| 11 | PROMPT 11 - Task Monitoring | Implemented | [`monitoring.html`](monitoring.html), [`gsmonitoring.gs`](gsmonitoring.gs) | Flag views, extra filters, drill-down. |
| 12 | PROMPT 12 - Daily Progress | Implemented | [`dailyprogress.html`](dailyprogress.html), [`gsdailyprogress.gs`](gsdailyprogress.gs) | Controlled upsert snapshots, review, export. |
| 13 | PROMPT 13 - Weekly Progress | Implemented | [`weeklyprogress.html`](weeklyprogress.html), [`gsweeklyprogress.gs`](gsweeklyprogress.gs) | Week-range generate/review/export. |
| 14 | PROMPT 14 - Monthly Progress | Implemented | [`monthlyprogress.html`](monthlyprogress.html), [`gsmonthlyprogress.gs`](gsmonthlyprogress.gs) | Month generate/review/export. |
| 15 | PROMPT 15 - Reports | Implemented | [`reports.html`](reports.html), [`gsreports.gs`](gsreports.gs) | Required report types, preview, CSV/PDF. |
| 16 | PROMPT 16 - Employee Performance | Implemented | [`performance.html`](performance.html), [`gsperformance.gs`](gsperformance.gs) | Weighted scoring, grades, review fields. |
| 17 | PROMPT 17 - Notifications | Implemented | [`notifications.html`](notifications.html), [`gsnotifications.gs`](gsnotifications.gs) | List/filter/mark-read/mark-all-read. |
| 18 | PROMPT 18 - Audit Log | Implemented | [`audit.html`](audit.html), [`gsaudit.gs`](gsaudit.gs) | Read-only search and export. |
| 19 | PROMPT 19 - User Management | Implemented | [`users.html`](users.html), [`gsusers.gs`](gsusers.gs) | New User, Approval Queue, role/department/status. |
| 20 | PROMPT 20 - System Settings | Implemented | [`settings.html`](settings.html), [`gssettings.gs`](gssettings.gs) | Settings CRUD, dimensions, backup, rebuild. |
| 21 | 21. Detailed Task Business Rules | Implemented | [`gstasks.gs`](gstasks.gs), [`gsmytasks.gs`](gsmytasks.gs), [`gsassignments.gs`](gsassignments.gs) | Progress bounds, overdue calc, delay/blocker, parent/assignee checks. |
| 22 | 22. Comments, Attachments and History | Implemented | [`gscomments.gs`](gscomments.gs), [`gstasks.gs`](gstasks.gs) | Comments, Drive attachments, immutable TaskHistory. |
| 23 | 23. Dashboard KPI and Reporting Logic | Implemented | [`gsindex.gs`](gsindex.gs), [`index.html`](index.html) | Required KPI set plus status/priority/department charts. |
| 24 | 24. Performance Scoring Configuration | Implemented | [`gsbootstrap.gs`](gsbootstrap.gs), [`gssnapshots.gs`](gssnapshots.gs), [`gsperformance.gs`](gsperformance.gs) | Settings-driven weights and grade thresholds. |
| 25 | 25. Report Output and PDF Requirements | Implemented | [`gsreports.gs`](gsreports.gs), [`gscommon.gs`](gscommon.gs) | Server-side DocumentApp PDF generation. |
| 26 | 26. Data Integrity, Concurrency and Error Handling | Implemented | [`gscommon.gs`](gscommon.gs) | Script locks, structured errors, scoped auth, soft archive. |
| 27 | 27. Final File Structure | Implemented | Repo file pairs listed below | Required HTML/GS pairs are present. |
| 28 | 28. Implementation Checklist | Implemented | This file and [`PROMPT_29_COPY_PASTE_CHECKLIST.md`](PROMPT_29_COPY_PASTE_CHECKLIST.md) | Manual deploy/test checklist included. |
| 29 | 29. Source/Reference Basis | Implemented | [`_docx_extract.txt`](_docx_extract.txt), this audit | Spec basis documented and implemented. |

## Required File Pairs

- `index.html` / `gsindex.gs`
- `mytasks.html` / `gsmytasks.gs`
- `tasks.html` / `gstasks.gs`
- `assignments.html` / `gsassignments.gs`
- `employees.html` / `gsemployees.gs`
- `teams.html` / `gsteams.gs`
- `departments.html` / `gsdepartments.gs`
- `progress.html` / `gsprogress.gs`
- `monitoring.html` / `gsmonitoring.gs`
- `dailyprogress.html` / `gsdailyprogress.gs`
- `weeklyprogress.html` / `gsweeklyprogress.gs`
- `monthlyprogress.html` / `gsmonthlyprogress.gs`
- `reports.html` / `gsreports.gs`
- `performance.html` / `gsperformance.gs`
- `notifications.html` / `gsnotifications.gs`
- `audit.html` / `gsaudit.gs`
- `users.html` / `gsusers.gs`
- `settings.html` / `gssettings.gs`
- `login.html` / `gsauth.gs`

## Manual Deployment And Test Checklist

### Deploy

1. Copy all `.gs` and `.html` files plus `appsscript.json` into Apps Script.
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
