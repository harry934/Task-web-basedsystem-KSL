function listAuditLog(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager'], 'audit');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var userFilter = normalizeString_(filters.user).toLowerCase();
    var moduleFilter = normalizeString_(filters.module).toLowerCase();
    var actionFilter = normalizeString_(filters.action).toLowerCase();
    var recordId = normalizeString_(filters.recordId).toLowerCase();
    var start = filters.startDate ? nairobiDateKey_(filters.startDate) : '';
    var end = filters.endDate ? nairobiDateKey_(filters.endDate) : '';
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var items = safeReadSheetRecords_('AUDIT_LOG')
      .map(mapAudit_)
      .filter(function (item) {
        if (userFilter && (item.userName + ' ' + item.userId).toLowerCase().indexOf(userFilter) === -1) {
          return false;
        }
        if (moduleFilter && item.module.toLowerCase() !== moduleFilter) {
          return false;
        }
        if (actionFilter && item.action.toLowerCase() !== actionFilter) {
          return false;
        }
        if (recordId && item.recordId.toLowerCase().indexOf(recordId) === -1) {
          return false;
        }
        if (start || end) {
          var key = item.timestamp ? nairobiDateKey_(item.timestamp) : '';
          if (start && key < start) {
            return false;
          }
          if (end && key > end) {
            return false;
          }
        }
        if (query) {
          var haystack = [item.userName, item.action, item.module, item.recordId, item.description].join(' ').toLowerCase();
          if (haystack.indexOf(query) === -1) {
            return false;
          }
        }
        return true;
      })
      .sort(function (a, b) {
        return new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime();
      });

    return successResponse_('Audit log loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load audit log.');
  }
}

function exportAuditLog(sessionToken, options) {
  try {
    var list = listAuditLog(sessionToken, options || {});
    if (!list.success) {
      return list;
    }
    var headers = ['Timestamp', 'User', 'Action', 'Module', 'Record ID', 'Description', 'Old Value', 'New Value'];
    var rows = (list.data.items || []).map(function (item) {
      return [item.timestamp, item.userName, item.action, item.module, item.recordId, item.description, item.oldValue, item.newValue];
    });
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Audit Log', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('audit_log.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export audit log.');
  }
}

function mapAudit_(record) {
  return {
    auditId: normalizeString_(record['Audit ID']),
    userId: normalizeString_(record['User ID']),
    userName: normalizeString_(record['User Name']),
    action: normalizeString_(record.Action),
    module: normalizeString_(record.Module),
    recordId: normalizeString_(record['Record ID']),
    description: normalizeString_(record.Description),
    oldValue: normalizeString_(record['Old Value']),
    newValue: normalizeString_(record['New Value']),
    timestamp: toClientDate_(record.Timestamp)
  };
}
