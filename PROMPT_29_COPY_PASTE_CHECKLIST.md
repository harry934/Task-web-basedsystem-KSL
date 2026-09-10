# Prompt 29 Copy-Paste Checklist

Use this as a deployment and acceptance checklist after copying files into Apps Script.

## 29-item status

- [x] `1` System build instructions | **Implemented** | Evidence: `template.html`, `gstemplate.gs`, `gsbootstrap.gs`, `gscommon.gs`
- [x] `2` Authentication and Login | **Implemented (Adapted)** | Evidence: `login.html`, `gsauth.gs`, `gsusers.gs`
- [x] `3` Dashboard | **Implemented** | Evidence: `index.html`, `gsindex.gs`
- [x] `4` My Tasks | **Implemented** | Evidence: `mytasks.html`, `gsmytasks.gs`
- [x] `5` Task Management | **Implemented** | Evidence: `tasks.html`, `gstasks.gs`, `gscomments.gs`
- [x] `6` Task Assignments | **Implemented** | Evidence: `assignments.html`, `gsassignments.gs`
- [x] `7` Employee Management | **Implemented** | Evidence: `employees.html`, `gsemployees.gs`
- [x] `8` Team Management | **Implemented** | Evidence: `teams.html`, `gsteams.gs`
- [x] `9` Department Management | **Implemented** | Evidence: `departments.html`, `gsdepartments.gs`
- [x] `10` Progress Updates | **Implemented** | Evidence: `progress.html`, `gsprogress.gs`
- [x] `11` Task Monitoring | **Implemented** | Evidence: `monitoring.html`, `gsmonitoring.gs`
- [x] `12` Daily Progress | **Implemented** | Evidence: `dailyprogress.html`, `gsdailyprogress.gs`
- [x] `13` Weekly Progress | **Implemented** | Evidence: `weeklyprogress.html`, `gsweeklyprogress.gs`
- [x] `14` Monthly Progress | **Implemented** | Evidence: `monthlyprogress.html`, `gsmonthlyprogress.gs`
- [x] `15` Reports | **Implemented** | Evidence: `reports.html`, `gsreports.gs`
- [x] `16` Employee Performance | **Implemented** | Evidence: `performance.html`, `gsperformance.gs`
- [x] `17` Notifications | **Implemented** | Evidence: `notifications.html`, `gsnotifications.gs`
- [x] `18` Audit Log | **Implemented** | Evidence: `audit.html`, `gsaudit.gs`
- [x] `19` User Management | **Implemented** | Evidence: `users.html`, `gsusers.gs`
- [x] `20` System Settings | **Implemented** | Evidence: `settings.html`, `gssettings.gs`
- [x] `21` Detailed Task Business Rules | **Implemented** | Evidence: `gstasks.gs`, `gsmytasks.gs`
- [x] `22` Comments, Attachments and History | **Implemented** | Evidence: `gscomments.gs`
- [x] `23` Dashboard KPI and Reporting Logic | **Implemented** | Evidence: `gsindex.gs`
- [x] `24` Performance Scoring Configuration | **Implemented** | Evidence: `gsbootstrap.gs`, `gssnapshots.gs`
- [x] `25` Report Output and PDF Requirements | **Implemented** | Evidence: `gscommon.gs`, `gsreports.gs`
- [x] `26` Data Integrity, Concurrency and Error Handling | **Implemented** | Evidence: `gscommon.gs`
- [x] `27` Final File Structure | **Implemented** | Evidence: required HTML/GS pairs
- [x] `28` Implementation Checklist | **Implemented** | Evidence: this file
- [x] `29` Source/Reference Basis | **Implemented** | Evidence: `_docx_extract.txt`, `PROMPT_COMPLIANCE_AUDIT.md`

## Deploy steps

1. Copy every `.gs` and `.html` file into the Apps Script project.
2. Run `bootstrapMvpSlice1Database`.
3. Run `repairWorkbookPerformance` if the workbook is large or slow.
4. Deploy a new Web App version.
5. Open `/exec?page=login` (not the editor preview iframe).

## Smoke tests

- Admin dashboard loads KPIs and charts.
- Employee dashboard opens after login (zeros are acceptable).
- Create department, team, employee, task, and multi-assignee assignment.
- Employee accepts assignment and submits progress.
- Generate daily/weekly/monthly snapshots.
- Generate a report PDF.
- Generate and review a performance evaluation.
- Mark notifications read.
- Filter and export audit log.
- Save a setting and deactivate a dimension value.

See also: `PROMPT_COMPLIANCE_AUDIT.md`
