var REPORT_TYPES = [
  'Task Register',
  'Outstanding Tasks',
  'Overdue Tasks',
  'Daily Progress',
  'Weekly Progress',
  'Monthly Progress',
  'Department Performance',
  'Supervisor/Team Performance',
  'Employee Performance',
  'Assignment Report',
  'Audit Summary'
];

function generateReport(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'reports');
    var input = payload || {};
    var reportType = normalizeString_(input.reportType || 'Task Register');
    if (REPORT_TYPES.indexOf(reportType) === -1) {
      throw new Error('Unsupported report type.');
    }
    if (isRestrictedPerformanceReport_(reportType) && ['Administrator', 'Manager'].indexOf(authContext.user.role) === -1) {
      throw new Error('Access Denied. Employee-performance reports are restricted.');
    }

    var built = buildReportDataset_(reportType, input);
    writeAuditLog_(
      authContext.user,
      'GENERATE',
      'Reports',
      reportType,
      'Generated operational report.',
      '',
      { filters: input, rows: built.rows.length }
    );
    return successResponse_('Report generated.', {
      reportType: reportType,
      title: built.title,
      headers: built.headers,
      rows: built.rows,
      summary: built.summary
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to generate report.');
  }
}

function exportReport(sessionToken, payload) {
  try {
    var generated = generateReport(sessionToken, payload);
    if (!generated.success) {
      return generated;
    }
    var data = generated.data || {};
    var format = normalizeString_(payload && payload.format).toLowerCase();
    if (format === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_(data.title || data.reportType, data.headers, data.rows));
    }
    return successResponse_(
      'Export ready.',
      downloadPayload_(
        String(data.reportType || 'report').replace(/\s+/g, '_').toLowerCase() + '.csv',
        'text/csv',
        buildCsvText_(data.headers, data.rows)
      )
    );
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export report.');
  }
}

function isRestrictedPerformanceReport_(reportType) {
  return reportType === 'Employee Performance' || reportType === 'Department Performance' || reportType === 'Supervisor/Team Performance';
}

function reportMatchesFilters_(record, filters) {
  var options = filters || {};
  var department = normalizeString_(options.department).toLowerCase();
  var employee = normalizeString_(options.employee).toLowerCase();
  var supervisor = normalizeString_(options.supervisor).toLowerCase();
  var status = normalizeString_(options.status).toLowerCase();
  var priority = normalizeString_(options.priority).toLowerCase();
  var start = options.startDate ? nairobiDateKey_(options.startDate) : '';
  var end = options.endDate ? nairobiDateKey_(options.endDate) : '';
  if (department && normalizeString_(record.Department || record.department).toLowerCase() !== department) {
    return false;
  }
  if (employee) {
    var employeeHay = [
      record['Primary Assignee'],
      record['Primary Assignee Name'],
      record['Employee ID'],
      record['Employee Name']
    ]
      .join(' ')
      .toLowerCase();
    if (employeeHay.indexOf(employee) === -1) {
      return false;
    }
  }
  if (supervisor && normalizeString_(record['Supervisor Name'] || record.Supervisor || record.supervisor).toLowerCase().indexOf(supervisor) === -1) {
    return false;
  }
  if (status && normalizeString_(record.Status || record['Assignment Status']).toLowerCase() !== status) {
    return false;
  }
  if (priority && normalizeString_(record.Priority).toLowerCase() !== priority) {
    return false;
  }
  if (start || end) {
    var dateValue = record['Due Date'] || record.Date || record['Week Start'] || record['Created Date'] || record.Timestamp;
    if (dateValue) {
      var key = nairobiDateKey_(dateValue);
      if (start && key < start) {
        return false;
      }
      if (end && key > end) {
        return false;
      }
    }
  }
  return true;
}

function buildReportDataset_(reportType, filters) {
  if (reportType === 'Daily Progress') {
    return {
      title: 'Daily Progress',
      headers: ['Date', 'Employee', 'Department', 'Assigned', 'Completed', 'Score'],
      rows: safeReadSheetRecords_('DAILY_PROGRESS').filter(function (record) {
        return reportMatchesFilters_(record, filters);
      }).map(function (record) {
        return [nairobiDateKey_(record.Date), record['Employee Name'], record.Department, record['Tasks Assigned'], record['Tasks Completed'], record['Performance Score']];
      }),
      summary: {}
    };
  }
  if (reportType === 'Weekly Progress') {
    return {
      title: 'Weekly Progress',
      headers: ['Week Start', 'Employee', 'Department', 'Assigned', 'Completed', 'Overall'],
      rows: safeReadSheetRecords_('WEEKLY_PROGRESS').filter(function (record) {
        return reportMatchesFilters_(record, filters);
      }).map(function (record) {
        return [nairobiDateKey_(record['Week Start']), record['Employee Name'], record.Department, record['Tasks Assigned'], record['Tasks Completed'], record['Overall Performance Score']];
      }),
      summary: {}
    };
  }
  if (reportType === 'Monthly Progress') {
    return {
      title: 'Monthly Progress',
      headers: ['Month', 'Year', 'Employee', 'Department', 'Assigned', 'Overall'],
      rows: safeReadSheetRecords_('MONTHLY_PROGRESS').filter(function (record) {
        return reportMatchesFilters_(record, filters);
      }).map(function (record) {
        return [record.Month, record.Year, record['Employee Name'], record.Department, record['Tasks Assigned'], record['Overall Performance Score']];
      }),
      summary: {}
    };
  }
  if (reportType === 'Employee Performance') {
    return {
      title: 'Employee Performance',
      headers: ['Period', 'Employee', 'Department', 'Overall', 'Grade'],
      rows: safeReadSheetRecords_('PERFORMANCE').filter(function (record) {
        return reportMatchesFilters_(record, filters);
      }).map(function (record) {
        return [record['Evaluation Period'], record['Employee Name'], record.Department, record['Overall Score'], record['Performance Grade']];
      }),
      summary: {}
    };
  }
  if (reportType === 'Assignment Report') {
    return {
      title: 'Assignment Report',
      headers: ['Assignment ID', 'Task ID', 'Employee', 'Status', 'Acceptance', 'Progress'],
      rows: safeReadSheetRecords_('TASK_ASSIGNMENTS').filter(function (record) {
        return reportMatchesFilters_(record, filters);
      }).map(function (record) {
        return [record['Assignment ID'], record['Task ID'], record['Employee Name'], record['Assignment Status'], record['Employee Acceptance'], record['Employee Progress %']];
      }),
      summary: {}
    };
  }
  if (reportType === 'Audit Summary') {
    return {
      title: 'Audit Summary',
      headers: ['Timestamp', 'User', 'Action', 'Module', 'Record ID', 'Description'],
      rows: safeReadSheetRecords_('AUDIT_LOG').filter(function (record) {
        return reportMatchesFilters_(record, filters);
      }).map(function (record) {
        return [toClientDate_(record.Timestamp), record['User Name'], record.Action, record.Module, record['Record ID'], record.Description];
      }),
      summary: {}
    };
  }

  var tasks = safeReadSheetRecords_('TASKS').filter(function (record) {
    if (normalizeString_(record['Record Status'] || 'Active').toLowerCase() === 'archived' && reportType !== 'Task Register') {
      return false;
    }
    var derived = Object.assign({}, record);
    applyTaskDerivedFields_(derived);
    if (reportType === 'Outstanding Tasks') {
      var status = normalizeString_(derived.Status).toLowerCase();
      if (status === 'completed') {
        return false;
      }
    }
    if (reportType === 'Overdue Tasks' && String(derived['Is Overdue']).toLowerCase() !== 'true') {
      return false;
    }
    return reportMatchesFilters_(derived, filters);
  });

  if (reportType === 'Department Performance' || reportType === 'Supervisor/Team Performance') {
    var groups = {};
    tasks.forEach(function (record) {
      var key = reportType === 'Department Performance'
        ? normalizeString_(record.Department) || 'Unassigned'
        : normalizeString_(record['Supervisor Name'] || record.Team || record['Supervisor ID']) || 'Unassigned';
      if (!groups[key]) {
        groups[key] = { assigned: 0, completed: 0, overdue: 0, progress: 0 };
      }
      groups[key].assigned += 1;
      groups[key].progress += normalizeNumber_(record['Progress %'], 0);
      if (normalizeString_(record.Status).toLowerCase() === 'completed') {
        groups[key].completed += 1;
      }
      var derived = Object.assign({}, record);
      applyTaskDerivedFields_(derived);
      if (String(derived['Is Overdue']).toLowerCase() === 'true') {
        groups[key].overdue += 1;
      }
    });
    return {
      title: reportType,
      headers: ['Group', 'Assigned', 'Completed', 'Overdue', 'Average Progress'],
      rows: Object.keys(groups).map(function (key) {
        var group = groups[key];
        return [key, group.assigned, group.completed, group.overdue, group.assigned ? Math.round(group.progress / group.assigned) : 0];
      }),
      summary: { groups: Object.keys(groups).length }
    };
  }

  return {
    title: reportType,
    headers: ['Task ID', 'Title', 'Department', 'Assignee', 'Status', 'Priority', 'Progress', 'Due Date', 'Overdue'],
    rows: tasks.map(function (record) {
      var derived = Object.assign({}, record);
      applyTaskDerivedFields_(derived);
      return [
        derived['Task ID'],
        derived['Task Title'],
        derived.Department,
        derived['Primary Assignee Name'],
        derived.Status,
        derived.Priority,
        derived['Progress %'],
        toClientDate_(derived['Due Date']),
        String(derived['Is Overdue']).toLowerCase() === 'true' ? 'Yes' : 'No'
      ];
    }),
    summary: { total: tasks.length }
  };
}
