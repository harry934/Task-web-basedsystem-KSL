function listWeeklyProgress(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'weeklyprogress');
    var filters = options || {};
    var weekStart = normalizeString_(filters.weekStart);
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var items = safeReadSheetRecords_('WEEKLY_PROGRESS')
      .map(mapWeeklyProgress_)
      .filter(function (item) {
        if (weekStart && item.weekStart !== weekStart) {
          return false;
        }
        return matchSnapshotFilters_(item, filters);
      })
      .sort(function (a, b) {
        return String(b.weekStart).localeCompare(String(a.weekStart));
      });
    return successResponse_('Weekly progress loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load weekly progress.');
  }
}

function generateWeeklyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'weeklyprogress');
    var bounds = getWeekBounds_((payload && payload.weekStart) || new Date());
    return withScriptLock_(function () {
      var schema = resolveSchema_('WEEKLY_PROGRESS');
      var sheet = getSheetBySchema_(schema);
      var existing = safeReadSheetRecords_(schema);
      var generated = 0;
      getActiveEmployees_().forEach(function (employee) {
        var metrics = buildEmployeePeriodMetrics_(employee, bounds.start, bounds.end);
        var current = existing.find(function (record) {
          return (
            nairobiDateKey_(record['Week Start']) === bounds.startKey &&
            normalizeString_(record['Employee ID']) === metrics.employeeId
          );
        });
        var record = current ? Object.assign({}, current) : {
          'Record ID': generateSequenceIdUnlocked_('WPR'),
          'Week Start': bounds.startKey,
          'Week End': bounds.endKey,
          'Employee ID': metrics.employeeId,
          'Supervisor Comments': ''
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
        record['Overall Performance Score'] = metrics.scores.overall;
        record['Generated Date'] = new Date();
        if (current) {
          updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, record);
        } else {
          appendSheetRecord_(sheet, schema.columns, record);
        }
        generated += 1;
      });
      writeAuditLog_(authContext.user, 'GENERATE', 'WeeklyProgress', bounds.startKey, 'Generated weekly progress snapshots.', '', { count: generated });
      return successResponse_('Weekly progress generated.', { weekStart: bounds.startKey, weekEnd: bounds.endKey, count: generated });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to generate weekly progress.');
  }
}

function reviewWeeklyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'weeklyprogress');
    var recordId = normalizeString_(payload && payload.recordId);
    var comments = normalizeString_(payload && payload.comments);
    if (!recordId) {
      throw new Error('recordId is required.');
    }
    var schema = resolveSchema_('WEEKLY_PROGRESS');
    var sheet = getSheetBySchema_(schema);
    var current = safeReadSheetRecords_(schema).find(function (record) {
      return normalizeString_(record['Record ID']) === recordId;
    });
    if (!current) {
      throw new Error('Weekly progress record was not found.');
    }
    var updated = Object.assign({}, current);
    updated['Supervisor Comments'] = comments;
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    writeAuditLog_(authContext.user, 'REVIEW', 'WeeklyProgress', recordId, 'Updated supervisor comments.', current['Supervisor Comments'], comments);
    return successResponse_('Supervisor comments saved.', { record: mapWeeklyProgress_(updated) });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to review weekly progress.');
  }
}

function exportWeeklyProgress(sessionToken, options) {
  try {
    var list = listWeeklyProgress(sessionToken, options || {});
    if (!list.success) {
      return list;
    }
    var headers = ['Record ID', 'Week Start', 'Week End', 'Employee', 'Department', 'Assigned', 'Completed', 'Overall'];
    var rows = (list.data.items || []).map(function (item) {
      return [item.recordId, item.weekStart, item.weekEnd, item.employeeName, item.department, item.assigned, item.completed, item.overall];
    });
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Weekly Progress', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('weekly_progress.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export weekly progress.');
  }
}

function mapWeeklyProgress_(record) {
  return {
    recordId: normalizeString_(record['Record ID']),
    weekStart: nairobiDateKey_(record['Week Start']),
    weekEnd: nairobiDateKey_(record['Week End']),
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
    overall: normalizeNumber_(record['Overall Performance Score'], 0),
    comments: normalizeString_(record['Supervisor Comments']),
    generatedDate: toClientDate_(record['Generated Date'])
  };
}
