function listNotifications(sessionToken, options) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'notifications'
    );
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var unreadOnly = Boolean(filters.unreadOnly);
    var priority = normalizeString_(filters.priority).toLowerCase();
    var type = normalizeString_(filters.type).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var userId = normalizeString_(authContext.user.userId);
    var employeeId = normalizeString_(authContext.user.employeeId);
    var nowKey = nairobiDateKey_(new Date());

    var items = safeReadSheetRecords_('NOTIFICATIONS')
      .filter(function (record) {
        var expiry = record['Expiry Date'] ? nairobiDateKey_(record['Expiry Date']) : '';
        if (expiry && expiry < nowKey) {
          return false;
        }
        var matchesUser = normalizeString_(record['User ID']) === userId;
        var matchesEmployee = employeeId && normalizeString_(record['Employee ID']) === employeeId;
        return matchesUser || matchesEmployee;
      })
      .map(mapNotification_)
      .filter(function (item) {
        if (unreadOnly && item.readStatus.toLowerCase() === 'read') {
          return false;
        }
        if (priority && item.priority.toLowerCase() !== priority) {
          return false;
        }
        if (type && item.type.toLowerCase() !== type) {
          return false;
        }
        if (query && (item.title + ' ' + item.message + ' ' + item.relatedTaskId).toLowerCase().indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .sort(function (a, b) {
        return new Date(b.createdDate || 0).getTime() - new Date(a.createdDate || 0).getTime();
      });

    return successResponse_('Notifications loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load notifications.');
  }
}

function markNotificationRead(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'notifications'
    );
    var notificationId = normalizeString_(payload && payload.notificationId);
    if (!notificationId) {
      throw new Error('notificationId is required.');
    }
    return updateNotificationReadState_(authContext.user, [notificationId]);
  } catch (error) {
    return errorResponse_(error.message || 'Failed to mark notification as read.');
  }
}

function markAllNotificationsRead(sessionToken) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'notifications'
    );
    return updateNotificationReadState_(authContext.user, null);
  } catch (error) {
    return errorResponse_(error.message || 'Failed to mark notifications as read.');
  }
}

function updateNotificationReadState_(user, notificationIds) {
  var schema = resolveSchema_('NOTIFICATIONS');
  var sheet = getSheetBySchema_(schema);
  var userId = normalizeString_(user.userId);
  var employeeId = normalizeString_(user.employeeId);
  var updatedCount = 0;
  safeReadSheetRecords_(schema).forEach(function (record) {
    var matchesUser = normalizeString_(record['User ID']) === userId || (employeeId && normalizeString_(record['Employee ID']) === employeeId);
    if (!matchesUser) {
      return;
    }
    if (notificationIds && notificationIds.indexOf(normalizeString_(record['Notification ID'])) === -1) {
      return;
    }
    if (normalizeString_(record['Read Status']).toLowerCase() === 'read') {
      return;
    }
    var updated = Object.assign({}, record);
    updated['Read Status'] = 'Read';
    updated['Read Date'] = new Date();
    updateSheetRecordByRow_(sheet, record.__rowNumber, schema.columns, updated);
    updatedCount += 1;
  });
  try {
    CacheService.getScriptCache().remove('UNREAD_NTF_' + userId);
  } catch (error) {
    // Best-effort only.
  }
  return successResponse_('Notifications updated.', { updatedCount: updatedCount });
}

function mapNotification_(record) {
  return {
    notificationId: normalizeString_(record['Notification ID']),
    type: normalizeString_(record['Notification Type']),
    title: normalizeString_(record.Title),
    message: normalizeString_(record.Message),
    relatedTaskId: normalizeString_(record['Related Task ID']),
    priority: normalizeString_(record.Priority || 'Medium'),
    readStatus: normalizeString_(record['Read Status'] || 'Unread'),
    createdDate: toClientDate_(record['Created Date']),
    readDate: toClientDate_(record['Read Date'])
  };
}
