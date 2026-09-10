function listDailyProgress(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'dailyprogress');
    var filters = options || {};
    var dateKey = normalizeString_(filters.date);
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var items = safeReadSheetRecords_('DAILY_PROGRESS')
      .map(mapDailyProgress_)
      .filter(function (item) {
        if (dateKey && item.date !== dateKey) {
          return false;
        }
        return matchSnapshotFilters_(item, filters);
      })
      .sort(function (a, b) {
        return String(b.date).localeCompare(String(a.date));
      });
    return successResponse_('Daily progress loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load daily progress.');
  }
}

function generateDailyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'dailyprogress');
    var input = payload || {};
    var dateKey = nairobiDateKey_(input.date || new Date());
    var start = nairobiDateFromKey_(dateKey);
    var end = start;
    return withScriptLock_(function () {
      var schema = resolveSchema_('DAILY_PROGRESS');
      var sheet = getSheetBySchema_(schema);
      var existing = safeReadSheetRecords_(schema);
      var employees = getActiveEmployees_();
      var generated = 0;
      employees.forEach(function (employee) {
        var metrics = buildEmployeePeriodMetrics_(employee, start, end);
        var current = existing.find(function (record) {
          return (
            nairobiDateKey_(record.Date) === dateKey &&
            normalizeString_(record['Employee ID']) === metrics.employeeId
          );
        });
        var now = new Date();
        var record = current ? Object.assign({}, current) : {
          'Record ID': generateSequenceIdUnlocked_('DPR'),
          Date: dateKey,
          'Employee ID': metrics.employeeId,
          'Supervisor Remarks': ''
        };
        record['Employee Name'] = metrics.employeeName;
        record.Department = metrics.department;
        record.Supervisor = metrics.supervisor;
        record['Tasks Assigned'] = metrics.assigned;
        record['Tasks Started'] = metrics.started;
        record['Tasks Completed'] = metrics.completed;
        record['Tasks In Progress'] = metrics.inProgress;
        record['Tasks Overdue'] = metrics.overdue;
        record['Total Hours'] = metrics.hours;
        record['Average Progress %'] = metrics.averageProgress;
        record['Completion Rate'] = metrics.scores.completionRate;
        record['Performance Score'] = metrics.scores.overall;
        record['Generated Date'] = now;
        if (current) {
          updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, record);
        } else {
          appendSheetRecord_(sheet, schema.columns, record);
        }
        generated += 1;
      });
      writeAuditLog_(
        authContext.user,
        'GENERATE',
        'DailyProgress',
        dateKey,
        'Generated daily progress snapshots.',
        '',
        { date: dateKey, count: generated }
      );
      return successResponse_('Daily progress generated.', { date: dateKey, count: generated });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to generate daily progress.');
  }
}

function reviewDailyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'dailyprogress');
    var recordId = normalizeString_(payload && payload.recordId);
    var remarks = normalizeString_(payload && payload.remarks);
    if (!recordId) {
      throw new Error('recordId is required.');
    }
    var schema = resolveSchema_('DAILY_PROGRESS');
    var sheet = getSheetBySchema_(schema);
    var current = safeReadSheetRecords_(schema).find(function (record) {
      return normalizeString_(record['Record ID']) === recordId;
    });
    if (!current) {
      throw new Error('Daily progress record was not found.');
    }
    var updated = Object.assign({}, current);
    updated['Supervisor Remarks'] = remarks;
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    writeAuditLog_(authContext.user, 'REVIEW', 'DailyProgress', recordId, 'Updated supervisor remarks.', current['Supervisor Remarks'], remarks);
    return successResponse_('Supervisor remarks saved.', { record: mapDailyProgress_(updated) });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to review daily progress.');
  }
}

function exportDailyProgress(sessionToken, options) {
  try {
    var list = listDailyProgress(sessionToken, options || {});
    if (!list.success) {
      return list;
    }
    var headers = ['Record ID', 'Date', 'Employee', 'Department', 'Assigned', 'Completed', 'Overdue', 'Hours', 'Completion Rate', 'Score'];
    var rows = (list.data.items || []).map(function (item) {
      return [item.recordId, item.date, item.employeeName, item.department, item.assigned, item.completed, item.overdue, item.hours, item.completionRate, item.performanceScore];
    });
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Daily Progress', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('daily_progress.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export daily progress.');
  }
}

function mapDailyProgress_(record) {
  return {
    recordId: normalizeString_(record['Record ID']),
    date: nairobiDateKey_(record.Date),
    employeeId: normalizeString_(record['Employee ID']),
    employeeName: normalizeString_(record['Employee Name']),
    department: normalizeString_(record.Department),
    supervisor: normalizeString_(record.Supervisor),
    assigned: normalizeNumber_(record['Tasks Assigned'], 0),
    started: normalizeNumber_(record['Tasks Started'], 0),
    completed: normalizeNumber_(record['Tasks Completed'], 0),
    inProgress: normalizeNumber_(record['Tasks In Progress'], 0),
    overdue: normalizeNumber_(record['Tasks Overdue'], 0),
    hours: normalizeNumber_(record['Total Hours'], 0),
    averageProgress: normalizeNumber_(record['Average Progress %'], 0),
    completionRate: normalizeNumber_(record['Completion Rate'], 0),
    performanceScore: normalizeNumber_(record['Performance Score'], 0),
    remarks: normalizeString_(record['Supervisor Remarks']),
    generatedDate: toClientDate_(record['Generated Date'])
  };
}
