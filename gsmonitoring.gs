function listMonitoredTasks(sessionToken, options) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
      'monitoring'
    );
    var filters = options || {};
    var view = normalizeString_(filters.view).toLowerCase() || 'all';
    var departmentFilter = normalizeString_(filters.department).toLowerCase();
    var query = normalizeString_(filters.query).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var dueSoonDays = getDueSoonDays_();

    var items = applyTaskScopeForUser_(readSheetRecords_('TASKS'), authContext.user)
      .filter(function (record) {
        return normalizeString_(record['Record Status'] || 'Active').toLowerCase() !== 'archived';
      })
      .map(function (record) {
        var mapped = mapTaskForResponse_(record);
        var daysRemaining = mapped.daysRemaining === '' ? null : Number(mapped.daysRemaining);
        mapped.monitorFlag = 'ontrack';
        if (mapped.isOverdue) {
          mapped.monitorFlag = 'overdue';
        } else if (normalizeString_(mapped.status).toLowerCase() === 'blocked' || mapped.blocker) {
          mapped.monitorFlag = 'blocked';
        } else if (daysRemaining !== null && !isNaN(daysRemaining) && daysRemaining <= dueSoonDays) {
          mapped.monitorFlag = 'duesoon';
        } else if (normalizeString_(mapped.status).toLowerCase() === 'in progress') {
          mapped.monitorFlag = 'inprogress';
        }
        return mapped;
      })
      .filter(function (item) {
        if (departmentFilter && normalizeString_(item.department).toLowerCase() !== departmentFilter) {
          return false;
        }
        if (view !== 'all' && item.monitorFlag !== view) {
          return false;
        }
        if (!query) {
          return true;
        }
        return (item.taskId + ' ' + item.taskTitle + ' ' + item.primaryAssigneeName)
          .toLowerCase()
          .indexOf(query) > -1;
      })
      .sort(function (a, b) {
        var rank = { overdue: 0, blocked: 1, duesoon: 2, inprogress: 3, ontrack: 4 };
        return (rank[a.monitorFlag] || 9) - (rank[b.monitorFlag] || 9);
      });

    var summary = {
      overdue: 0,
      duesoon: 0,
      blocked: 0,
      inprogress: 0
    };
    items.forEach(function (item) {
      if (summary[item.monitorFlag] !== undefined) {
        summary[item.monitorFlag] += 1;
      }
    });

    var paged = buildPagedResult_(items, page, pageSize);
    paged.summary = summary;
    return successResponse_('Monitoring list loaded.', paged);
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load monitoring view.');
  }
}
