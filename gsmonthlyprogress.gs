function listMonthlyProgress(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'monthlyprogress');
    var filters = options || {};
    var month = normalizeString_(filters.month);
    var year = normalizeString_(filters.year);
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var items = safeReadSheetRecords_('MONTHLY_PROGRESS')
      .map(mapMonthlyProgress_)
      .filter(function (item) {
        if (month && String(item.month) !== String(month) && String(item.monthName).toLowerCase() !== month.toLowerCase()) {
          return false;
        }
        if (year && String(item.year) !== String(year)) {
          return false;
        }
        return matchSnapshotFilters_(item, filters);
      })
      .sort(function (a, b) {
        return String(b.year + '-' + b.month).localeCompare(String(a.year + '-' + a.month));
      });
    return successResponse_('Monthly progress loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load monthly progress.');
  }
}

function generateMonthlyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'monthlyprogress');
    var input = payload || {};
    var now = new Date();
    var bounds = getMonthBounds_(input.year || now.getFullYear(), input.month || now.getMonth() + 1);
    return withScriptLock_(function () {
      var schema = resolveSchema_('MONTHLY_PROGRESS');
      var sheet = getSheetBySchema_(schema);
      var existing = safeReadSheetRecords_(schema);
      var generated = 0;
      getActiveEmployees_().forEach(function (employee) {
        var metrics = buildEmployeePeriodMetrics_(employee, bounds.start, bounds.end);
        var current = existing.find(function (record) {
          return (
            normalizeString_(record.Month) === bounds.monthName &&
            String(record.Year) === String(bounds.year) &&
            normalizeString_(record['Employee ID']) === metrics.employeeId
          );
        });
        var record = current ? Object.assign({}, current) : {
          'Record ID': generateSequenceIdUnlocked_('MPR'),
          Month: bounds.monthName,
          Year: bounds.year,
          'Employee ID': metrics.employeeId,
          'Supervisor Comments': '',
          'Management Comments': ''
        };
        record['Employee Name'] = metrics.employeeName;
        record.Department = metrics.department;
        record.Supervisor = metrics.supervisor;
        record['Tasks Assigned'] = metrics.assigned;
        record['Tasks Completed'] = metrics.completed;
        record['Tasks In Progress'] = metrics.inProgress;
        record['Tasks Overdue'] = metrics.overdue;
        record['Total Hours'] = metrics.hours;
        record['Average Progress %'] = metrics.averageProgress;
        record['Completion Rate'] = metrics.scores.completionRate;
        record['Productivity Score'] = metrics.scores.productivity;
        record['Quality Score'] = metrics.scores.quality;
        record['Timeliness Score'] = metrics.scores.timeliness;
        record['Reliability Score'] = metrics.scores.reliability;
        record['Overall Performance Score'] = metrics.scores.overall;
        record['Generated Date'] = new Date();
        if (current) {
          updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, record);
        } else {
          appendSheetRecord_(sheet, schema.columns, record);
        }
        generated += 1;
      });
      writeAuditLog_(authContext.user, 'GENERATE', 'MonthlyProgress', bounds.monthName + ' ' + bounds.year, 'Generated monthly progress snapshots.', '', { count: generated });
      return successResponse_('Monthly progress generated.', { month: bounds.monthName, year: bounds.year, count: generated });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to generate monthly progress.');
  }
}

function reviewMonthlyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'monthlyprogress');
    var recordId = normalizeString_(payload && payload.recordId);
    if (!recordId) {
      throw new Error('recordId is required.');
    }
    var schema = resolveSchema_('MONTHLY_PROGRESS');
    var sheet = getSheetBySchema_(schema);
    var current = safeReadSheetRecords_(schema).find(function (record) {
      return normalizeString_(record['Record ID']) === recordId;
    });
    if (!current) {
      throw new Error('Monthly progress record was not found.');
    }
    var updated = Object.assign({}, current);
    if (payload.supervisorComments !== undefined) {
      updated['Supervisor Comments'] = normalizeString_(payload.supervisorComments);
    }
    if (payload.managementComments !== undefined && ['Administrator', 'Manager'].indexOf(authContext.user.role) > -1) {
      updated['Management Comments'] = normalizeString_(payload.managementComments);
    }
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    writeAuditLog_(authContext.user, 'REVIEW', 'MonthlyProgress', recordId, 'Updated monthly review comments.', '', mapMonthlyProgress_(updated));
    return successResponse_('Review comments saved.', { record: mapMonthlyProgress_(updated) });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to review monthly progress.');
  }
}

function exportMonthlyProgress(sessionToken, options) {
  try {
    var list = listMonthlyProgress(sessionToken, options || {});
    if (!list.success) {
      return list;
    }
    var headers = ['Record ID', 'Month', 'Year', 'Employee', 'Department', 'Assigned', 'Completed', 'Overall'];
    var rows = (list.data.items || []).map(function (item) {
      return [item.recordId, item.monthName, item.year, item.employeeName, item.department, item.assigned, item.completed, item.overall];
    });
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Monthly Progress', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('monthly_progress.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export monthly progress.');
  }
}

function mapMonthlyProgress_(record) {
  var monthName = normalizeString_(record.Month);
  var monthNumber = Number(monthName);
  if (isNaN(monthNumber)) {
    var sample = new Date(monthName + ' 1, 2000');
    monthNumber = isNaN(sample.getTime()) ? 0 : sample.getMonth() + 1;
  }
  return {
    recordId: normalizeString_(record['Record ID']),
    month: monthNumber,
    monthName: monthName,
    year: normalizeNumber_(record.Year, 0),
    employeeId: normalizeString_(record['Employee ID']),
    employeeName: normalizeString_(record['Employee Name']),
    department: normalizeString_(record.Department),
    supervisor: normalizeString_(record.Supervisor),
    assigned: normalizeNumber_(record['Tasks Assigned'], 0),
    completed: normalizeNumber_(record['Tasks Completed'], 0),
    inProgress: normalizeNumber_(record['Tasks In Progress'], 0),
    overdue: normalizeNumber_(record['Tasks Overdue'], 0),
    hours: normalizeNumber_(record['Total Hours'], 0),
    averageProgress: normalizeNumber_(record['Average Progress %'], 0),
    completionRate: normalizeNumber_(record['Completion Rate'], 0),
    productivity: normalizeNumber_(record['Productivity Score'], 0),
    quality: normalizeNumber_(record['Quality Score'], 0),
    timeliness: normalizeNumber_(record['Timeliness Score'], 0),
    reliability: normalizeNumber_(record['Reliability Score'], 0),
    overall: normalizeNumber_(record['Overall Performance Score'], 0),
    supervisorComments: normalizeString_(record['Supervisor Comments']),
    managementComments: normalizeString_(record['Management Comments']),
    generatedDate: toClientDate_(record['Generated Date'])
  };
}
