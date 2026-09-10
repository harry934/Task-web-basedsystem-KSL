function getDashboardSummary(sessionToken, options) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
      'dashboard',
      { skipActivity: true }
    );
    var filters = options || {};
    var department = normalizeString_(filters.department).toLowerCase();
    var supervisor = normalizeString_(filters.supervisor).toLowerCase();
    var start = filters.startDate ? nairobiDateKey_(filters.startDate) : '';
    var end = filters.endDate ? nairobiDateKey_(filters.endDate) : '';
    var dueSoonDays = getDueSoonDays_();

    var tasks = [];
    try {
      tasks = applyTaskScopeForUser_(safeReadSheetRecords_('TASKS'), authContext.user);
    } catch (error) {
      tasks = [];
    }

    var scoped = tasks.filter(function (record) {
      if (department && normalizeString_(record.Department).toLowerCase() !== department) {
        return false;
      }
      if (supervisor && normalizeString_(record['Supervisor Name'] || record['Supervisor ID']).toLowerCase().indexOf(supervisor) === -1) {
        return false;
      }
      if (start || end) {
        var key = record['Due Date'] ? nairobiDateKey_(record['Due Date']) : '';
        if (start && key && key < start) {
          return false;
        }
        if (end && key && key > end) {
          return false;
        }
      }
      return true;
    });

    var summary = {
      totalTasks: 0,
      assignedTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      dueSoonTasks: 0,
      blockedTasks: 0,
      archivedTasks: 0,
      unassignedTasks: 0,
      completionRate: 0,
      charts: {
        status: {},
        priority: {},
        department: {}
      }
    };

    scoped.forEach(function (record) {
      var derived = Object.assign({}, record);
      applyTaskDerivedFields_(derived);
      var recordStatus = normalizeString_(derived['Record Status'] || 'Active').toLowerCase();
      if (recordStatus === 'archived') {
        summary.archivedTasks += 1;
        return;
      }
      summary.totalTasks += 1;
      var status = normalizeString_(derived.Status) || 'Unknown';
      var priority = normalizeString_(derived.Priority) || 'Unknown';
      var dept = normalizeString_(derived.Department) || 'Unassigned';
      summary.charts.status[status] = (summary.charts.status[status] || 0) + 1;
      summary.charts.priority[priority] = (summary.charts.priority[priority] || 0) + 1;
      summary.charts.department[dept] = (summary.charts.department[dept] || 0) + 1;
      if (normalizeString_(derived['Primary Assignee']) || normalizeNumber_(derived['Number of Assignees'], 0) > 0) {
        summary.assignedTasks += 1;
      } else {
        summary.unassignedTasks += 1;
      }
      if (status.toLowerCase() === 'in progress') {
        summary.inProgressTasks += 1;
      }
      if (status.toLowerCase() === 'completed') {
        summary.completedTasks += 1;
      }
      if (String(derived['Is Overdue']).toLowerCase() === 'true') {
        summary.overdueTasks += 1;
      }
      var daysRemaining = derived['Days Remaining'] === '' ? null : Number(derived['Days Remaining']);
      if (daysRemaining !== null && !isNaN(daysRemaining) && daysRemaining >= 0 && daysRemaining <= dueSoonDays && status.toLowerCase() !== 'completed') {
        summary.dueSoonTasks += 1;
      }
      if (status.toLowerCase() === 'blocked' || normalizeString_(derived.Blocker).toLowerCase() === 'yes') {
        summary.blockedTasks += 1;
      }
    });
    summary.completionRate = summary.totalTasks ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0;

    return successResponse_('Dashboard summary loaded.', summary);
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load dashboard summary.');
  }
}

function exportDashboard(sessionToken, options) {
  try {
    var summaryResponse = getDashboardSummary(sessionToken, options || {});
    if (!summaryResponse.success) {
      return summaryResponse;
    }
    var summary = summaryResponse.data || {};
    var headers = ['Metric', 'Value'];
    var rows = [
      ['Total Tasks', summary.totalTasks],
      ['Assigned Tasks', summary.assignedTasks],
      ['In Progress', summary.inProgressTasks],
      ['Completed', summary.completedTasks],
      ['Overdue', summary.overdueTasks],
      ['Due Soon', summary.dueSoonTasks],
      ['Blocked', summary.blockedTasks],
      ['Archived', summary.archivedTasks],
      ['Completion Rate', summary.completionRate]
    ];
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Operations Dashboard', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('dashboard.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export dashboard.');
  }
}
