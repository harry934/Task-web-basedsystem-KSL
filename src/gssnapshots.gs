function getActiveEmployees_() {
  return safeReadSheetRecords_('EMPLOYEES').filter(function (record) {
    return normalizeString_(record['Employment Status'] || 'Active').toLowerCase() === 'active';
  });
}

function nairobiDateKey_(value) {
  var dateValue = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (isNaN(dateValue.getTime())) {
    dateValue = new Date();
  }
  return Utilities.formatDate(dateValue, APP_TIMEZONE, 'yyyy-MM-dd');
}

function nairobiDateFromKey_(key) {
  var parts = normalizeString_(key).split('-');
  if (parts.length !== 3) {
    return new Date();
  }
  return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
}

function getWeekBounds_(dateValue) {
  var key = nairobiDateKey_(dateValue);
  var local = nairobiDateFromKey_(key);
  var day = local.getDay();
  var mondayOffset = day === 0 ? -6 : 1 - day;
  var start = new Date(local.getFullYear(), local.getMonth(), local.getDate() + mondayOffset);
  var end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6);
  return {
    start: start,
    end: end,
    startKey: nairobiDateKey_(start),
    endKey: nairobiDateKey_(end)
  };
}

function getMonthBounds_(year, month) {
  var safeYear = normalizeNumber_(year, new Date().getFullYear());
  var safeMonth = normalizeNumber_(month, new Date().getMonth() + 1);
  var start = new Date(safeYear, safeMonth - 1, 1);
  var end = new Date(safeYear, safeMonth, 0);
  return {
    start: start,
    end: end,
    monthName: Utilities.formatDate(start, APP_TIMEZONE, 'MMMM'),
    year: safeYear,
    month: safeMonth
  };
}

function dateInRange_(value, start, end) {
  if (!value) {
    return false;
  }
  var dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) {
    return false;
  }
  var key = nairobiDateKey_(dateValue);
  return key >= nairobiDateKey_(start) && key <= nairobiDateKey_(end);
}

function getPerformanceWeights_() {
  return {
    productivity: normalizeNumber_(getSettingValue_('WEIGHT_PRODUCTIVITY', 25), 25),
    timeliness: normalizeNumber_(getSettingValue_('WEIGHT_TIMELINESS', 25), 25),
    quality: normalizeNumber_(getSettingValue_('WEIGHT_QUALITY', 25), 25),
    reliability: normalizeNumber_(getSettingValue_('WEIGHT_RELIABILITY', 25), 25)
  };
}

function gradeFromOverallScore_(score) {
  var excellent = normalizeNumber_(getSettingValue_('GRADE_EXCELLENT_MIN', 85), 85);
  var good = normalizeNumber_(getSettingValue_('GRADE_GOOD_MIN', 70), 70);
  var satisfactory = normalizeNumber_(getSettingValue_('GRADE_SATISFACTORY_MIN', 55), 55);
  if (score >= excellent) {
    return 'Excellent';
  }
  if (score >= good) {
    return 'Good';
  }
  if (score >= satisfactory) {
    return 'Satisfactory';
  }
  return 'Needs Improvement';
}

function computeScoreBundle_(metrics) {
  var assigned = Math.max(0, normalizeNumber_(metrics.assigned, 0));
  var completed = Math.max(0, normalizeNumber_(metrics.completed, 0));
  var overdue = Math.max(0, normalizeNumber_(metrics.overdue, 0));
  var onTimeCompleted = Math.max(0, normalizeNumber_(metrics.onTimeCompleted, completed));
  var averageProgress = Math.max(0, Math.min(100, normalizeNumber_(metrics.averageProgress, 0)));
  var productivity = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
  var timeliness = assigned > 0 ? Math.round(((assigned - overdue) / assigned) * 100) : 100;
  var quality = Math.round(averageProgress);
  var reliability = assigned > 0 ? Math.round((onTimeCompleted / assigned) * 100) : 100;
  var weights = getPerformanceWeights_();
  var weightTotal = weights.productivity + weights.timeliness + weights.quality + weights.reliability;
  if (weightTotal <= 0) {
    weightTotal = 100;
  }
  var overall = Math.round(
    (productivity * weights.productivity +
      timeliness * weights.timeliness +
      quality * weights.quality +
      reliability * weights.reliability) /
      weightTotal
  );
  return {
    productivity: Math.max(0, Math.min(100, productivity)),
    timeliness: Math.max(0, Math.min(100, timeliness)),
    quality: Math.max(0, Math.min(100, quality)),
    reliability: Math.max(0, Math.min(100, reliability)),
    overall: Math.max(0, Math.min(100, overall)),
    grade: gradeFromOverallScore_(overall),
    completionRate: productivity,
    onTimeCompletionRate: assigned > 0 ? Math.round((onTimeCompleted / assigned) * 100) : 0
  };
}

function getEmployeeTaskUniverse_(employeeId) {
  var id = normalizeString_(employeeId);
  var assignmentTaskIds = {};
  safeReadSheetRecords_('TASK_ASSIGNMENTS').forEach(function (record) {
    if (normalizeString_(record['Employee ID']) !== id) {
      return;
    }
    var status = normalizeString_(record['Assignment Status']).toLowerCase();
    if (status === 'cancelled' || status === 'reassigned') {
      return;
    }
    assignmentTaskIds[normalizeString_(record['Task ID'])] = true;
  });
  return safeReadSheetRecords_('TASKS').filter(function (record) {
    if (normalizeString_(record['Record Status'] || 'Active').toLowerCase() === 'archived') {
      return false;
    }
    return (
      normalizeString_(record['Primary Assignee']) === id ||
      assignmentTaskIds[normalizeString_(record['Task ID'])]
    );
  });
}

function buildEmployeePeriodMetrics_(employee, start, end) {
  var employeeId = normalizeString_(employee['Employee ID']);
  var tasks = getEmployeeTaskUniverse_(employeeId);
  var assigned = 0;
  var started = 0;
  var completed = 0;
  var inProgress = 0;
  var overdue = 0;
  var onTimeCompleted = 0;
  var progressTotal = 0;
  tasks.forEach(function (record) {
    var created = record['Created Date'] || record['Assigned Date'] || record['Created Timestamp'];
    var completedDate = record['Completed Date'];
    var dueDate = record['Due Date'];
    var inWindow =
      dateInRange_(created, start, end) ||
      dateInRange_(completedDate, start, end) ||
      dateInRange_(dueDate, start, end) ||
      dateInRange_(record['Updated Timestamp'], start, end);
    if (!inWindow && tasks.length > 0) {
      var startKey = nairobiDateKey_(start);
      var createdKey = created ? nairobiDateKey_(created) : '';
      var completedKey = completedDate ? nairobiDateKey_(completedDate) : '9999-12-31';
      inWindow = createdKey && createdKey <= nairobiDateKey_(end) && completedKey >= startKey;
    }
    if (!inWindow) {
      return;
    }
    assigned += 1;
    var status = normalizeString_(record.Status).toLowerCase();
    var progress = normalizeNumber_(record['Progress %'], 0);
    progressTotal += progress;
    if (progress > 0 || status === 'in progress' || status === 'started') {
      started += 1;
    }
    if (status === 'in progress') {
      inProgress += 1;
    }
    var isCompleted = status === 'completed' || progress >= 100;
    if (isCompleted) {
      completed += 1;
      if (!dueDate || (completedDate && nairobiDateKey_(completedDate) <= nairobiDateKey_(dueDate))) {
        onTimeCompleted += 1;
      }
    }
    var derived = Object.assign({}, record);
    applyTaskDerivedFields_(derived);
    if (String(derived['Is Overdue']).toLowerCase() === 'true') {
      overdue += 1;
    }
  });

  var hours = 0;
  safeReadSheetRecords_('TASK_UPDATES').forEach(function (record) {
    if (normalizeString_(record['Employee ID']) !== employeeId) {
      return;
    }
    if (!dateInRange_(record['Update Date'] || record['Created Timestamp'], start, end)) {
      return;
    }
    hours += normalizeNumber_(record['Hours Worked'], 0);
  });

  var averageProgress = assigned > 0 ? Math.round(progressTotal / assigned) : 0;
  var scores = computeScoreBundle_({
    assigned: assigned,
    completed: completed,
    overdue: overdue,
    onTimeCompleted: onTimeCompleted,
    averageProgress: averageProgress
  });

  return {
    employeeId: employeeId,
    employeeName: normalizeString_(employee['Full Name']),
    department: normalizeString_(employee.Department),
    supervisor: normalizeString_(employee['Supervisor Name'] || employee['Supervisor ID']),
    assigned: assigned,
    started: started,
    completed: completed,
    inProgress: inProgress,
    overdue: overdue,
    hours: Math.round(hours * 100) / 100,
    averageProgress: averageProgress,
    scores: scores
  };
}

function matchSnapshotFilters_(item, filters) {
  var options = filters || {};
  var department = normalizeString_(options.department).toLowerCase();
  var supervisor = normalizeString_(options.supervisor).toLowerCase();
  var query = normalizeString_(options.query).toLowerCase();
  if (department && normalizeString_(item.department).toLowerCase() !== department) {
    return false;
  }
  if (supervisor && normalizeString_(item.supervisor).toLowerCase().indexOf(supervisor) === -1) {
    return false;
  }
  if (!query) {
    return true;
  }
  var haystack = [
    item.recordId,
    item.employeeId,
    item.employeeName,
    item.department,
    item.supervisor
  ]
    .join(' ')
    .toLowerCase();
  return haystack.indexOf(query) > -1;
}
