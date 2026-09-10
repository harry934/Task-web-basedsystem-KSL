function listPerformance(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'performance');
    var filters = options || {};
    var period = normalizeString_(filters.period).toLowerCase();
    var employee = normalizeString_(filters.employee).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var items = safeReadSheetRecords_('PERFORMANCE')
      .map(mapPerformance_)
      .filter(function (item) {
        if (period && normalizeString_(item.period).toLowerCase() !== period) {
          return false;
        }
        if (employee && (item.employeeName + ' ' + item.employeeId).toLowerCase().indexOf(employee) === -1) {
          return false;
        }
        return matchSnapshotFilters_(item, filters);
      })
      .sort(function (a, b) {
        return String(b.period).localeCompare(String(a.period));
      });
    return successResponse_('Performance records loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load performance records.');
  }
}

function generatePerformance(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'performance');
    var input = payload || {};
    var now = new Date();
    var bounds = getMonthBounds_(input.year || now.getFullYear(), input.month || now.getMonth() + 1);
    var period = bounds.year + '-' + String(bounds.month).padStart(2, '0');
    return withScriptLock_(function () {
      var schema = resolveSchema_('PERFORMANCE');
      var sheet = getSheetBySchema_(schema);
      var existing = safeReadSheetRecords_(schema);
      var generated = 0;
      getActiveEmployees_().forEach(function (employee) {
        if (normalizeString_(input.employeeId) && normalizeString_(input.employeeId) !== normalizeString_(employee['Employee ID'])) {
          return;
        }
        var current = existing.find(function (record) {
          return (
            normalizeString_(record['Evaluation Period']) === period &&
            normalizeString_(record['Employee ID']) === normalizeString_(employee['Employee ID'])
          );
        });
        if (current && normalizeString_(current['Reviewed By'])) {
          return;
        }
        var metrics = buildEmployeePeriodMetrics_(employee, bounds.start, bounds.end);
        var record = current ? Object.assign({}, current) : {
          'Performance ID': generateSequenceIdUnlocked_('PRF'),
          'Evaluation Period': period,
          'Employee ID': metrics.employeeId,
          Strengths: '',
          'Areas for Improvement': '',
          Recommendations: '',
          'Review Date': '',
          'Reviewed By': ''
        };
        record['Employee Name'] = metrics.employeeName;
        record.Department = metrics.department;
        record.Supervisor = metrics.supervisor;
        record['Tasks Assigned'] = metrics.assigned;
        record['Tasks Completed'] = metrics.completed;
        record['Tasks Overdue'] = metrics.overdue;
        record['Completion Rate'] = metrics.scores.completionRate;
        record['On-Time Completion Rate'] = metrics.scores.onTimeCompletionRate;
        record['Average Progress'] = metrics.averageProgress;
        record['Total Hours'] = metrics.hours;
        record['Productivity Score'] = metrics.scores.productivity;
        record['Timeliness Score'] = metrics.scores.timeliness;
        record['Quality Score'] = metrics.scores.quality;
        record['Reliability Score'] = metrics.scores.reliability;
        record['Supervisor Rating'] = normalizeNumber_(record['Supervisor Rating'], 0);
        record['Management Rating'] = normalizeNumber_(record['Management Rating'], 0);
        record['Overall Score'] = metrics.scores.overall;
        record['Performance Grade'] = metrics.scores.grade;
        if (current) {
          updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, record);
        } else {
          appendSheetRecord_(sheet, schema.columns, record);
        }
        generated += 1;
      });
      writeAuditLog_(authContext.user, 'GENERATE', 'Performance', period, 'Generated employee performance evaluations.', '', { count: generated });
      return successResponse_('Evaluations generated.', { period: period, count: generated });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to generate evaluations.');
  }
}

function reviewPerformance(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor'], 'performance');
    var input = payload || {};
    var performanceId = normalizeString_(input.performanceId);
    if (!performanceId) {
      throw new Error('performanceId is required.');
    }
    var schema = resolveSchema_('PERFORMANCE');
    var sheet = getSheetBySchema_(schema);
    var current = safeReadSheetRecords_(schema).find(function (record) {
      return normalizeString_(record['Performance ID']) === performanceId;
    });
    if (!current) {
      throw new Error('Performance record was not found.');
    }
    if (normalizeString_(current['Reviewed By']) && authContext.user.role !== 'Administrator') {
      throw new Error('Completed historical evaluations cannot be overwritten. Ask an administrator for an auditable correction.');
    }
    var updated = Object.assign({}, current);
    updated['Supervisor Rating'] = normalizeNumber_(input.supervisorRating, updated['Supervisor Rating']);
    if (['Administrator', 'Manager'].indexOf(authContext.user.role) > -1) {
      updated['Management Rating'] = normalizeNumber_(input.managementRating, updated['Management Rating']);
    }
    updated.Strengths = normalizeString_(input.strengths);
    updated['Areas for Improvement'] = normalizeString_(input.areasForImprovement);
    updated.Recommendations = normalizeString_(input.recommendations);
    updated['Review Date'] = new Date();
    updated['Reviewed By'] = authContext.user.userId;
    var scores = computeScoreBundle_({
      assigned: updated['Tasks Assigned'],
      completed: updated['Tasks Completed'],
      overdue: updated['Tasks Overdue'],
      onTimeCompleted: Math.round((normalizeNumber_(updated['On-Time Completion Rate'], 0) / 100) * normalizeNumber_(updated['Tasks Assigned'], 0)),
      averageProgress: updated['Average Progress']
    });
    var supervisorRating = normalizeNumber_(updated['Supervisor Rating'], 0);
    var managementRating = normalizeNumber_(updated['Management Rating'], 0);
    if (supervisorRating || managementRating) {
      scores.overall = Math.round((scores.overall * 0.7) + (supervisorRating * 0.2) + (managementRating * 0.1));
      scores.grade = gradeFromOverallScore_(scores.overall);
    }
    updated['Overall Score'] = scores.overall;
    updated['Performance Grade'] = scores.grade;
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    writeAuditLog_(authContext.user, 'REVIEW', 'Performance', performanceId, 'Reviewed employee performance.', mapPerformance_(current), mapPerformance_(updated));
    return successResponse_('Performance review saved.', { record: mapPerformance_(updated) });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to review performance.');
  }
}

function exportPerformance(sessionToken, options) {
  try {
    var list = listPerformance(sessionToken, options || {});
    if (!list.success) {
      return list;
    }
    var headers = ['Period', 'Employee', 'Department', 'Overall', 'Grade'];
    var rows = (list.data.items || []).map(function (item) {
      return [item.period, item.employeeName, item.department, item.overall, item.grade];
    });
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Employee Performance', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('employee_performance.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export performance.');
  }
}

function mapPerformance_(record) {
  return {
    performanceId: normalizeString_(record['Performance ID']),
    period: normalizeString_(record['Evaluation Period']),
    employeeId: normalizeString_(record['Employee ID']),
    employeeName: normalizeString_(record['Employee Name']),
    department: normalizeString_(record.Department),
    supervisor: normalizeString_(record.Supervisor),
    assigned: normalizeNumber_(record['Tasks Assigned'], 0),
    completed: normalizeNumber_(record['Tasks Completed'], 0),
    overdue: normalizeNumber_(record['Tasks Overdue'], 0),
    completionRate: normalizeNumber_(record['Completion Rate'], 0),
    productivity: normalizeNumber_(record['Productivity Score'], 0),
    timeliness: normalizeNumber_(record['Timeliness Score'], 0),
    quality: normalizeNumber_(record['Quality Score'], 0),
    reliability: normalizeNumber_(record['Reliability Score'], 0),
    supervisorRating: normalizeNumber_(record['Supervisor Rating'], 0),
    managementRating: normalizeNumber_(record['Management Rating'], 0),
    overall: normalizeNumber_(record['Overall Score'], 0),
    grade: normalizeString_(record['Performance Grade']),
    strengths: normalizeString_(record.Strengths),
    areasForImprovement: normalizeString_(record['Areas for Improvement']),
    recommendations: normalizeString_(record.Recommendations),
    reviewDate: toClientDate_(record['Review Date']),
    reviewedBy: normalizeString_(record['Reviewed By'])
  };
}
