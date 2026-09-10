function listSettingsAdmin(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator'], 'settings');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var group = normalizeString_(filters.group).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var items = safeReadSheetRecords_('SETTINGS')
      .map(mapSetting_)
      .filter(function (item) {
        if (group && item.group.toLowerCase() !== group) {
          return false;
        }
        if (query && (item.key + ' ' + item.description + ' ' + item.value).toLowerCase().indexOf(query) === -1) {
          return false;
        }
        return true;
      });
    return successResponse_('Settings loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load settings.');
  }
}

function saveSettingsAdmin(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'settings');
    var updates = (payload && payload.settings) || [];
    if (!updates.length) {
      throw new Error('No settings were submitted.');
    }
    return withScriptLock_(function () {
      var schema = resolveSchema_('SETTINGS');
      var sheet = getSheetBySchema_(schema);
      var records = safeReadSheetRecords_(schema);
      updates.forEach(function (item) {
        var key = normalizeString_(item.key);
        var current = records.find(function (record) {
          return normalizeString_(record['Setting Key']) === key;
        });
        if (!current) {
          return;
        }
        if (normalizeString_(current.Editable).toUpperCase() === 'FALSE') {
          return;
        }
        var updated = Object.assign({}, current);
        var previous = current['Setting Value'];
        updated['Setting Value'] = item.value;
        updated['Updated Date'] = new Date();
        updated['Updated By'] = authContext.user.userId;
        updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
        writeAuditLog_(authContext.user, 'UPDATE', 'Settings', key, 'Updated setting value.', previous, item.value);
      });
      clearSettingsAndDimensionsCache_();
      return successResponse_('Settings saved.', {});
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to save settings.');
  }
}

function listDimensionsAdmin(sessionToken) {
  try {
    requireSession_(sessionToken, ['Administrator'], 'settings');
    var schema = resolveSchema_('DIMENSIONS');
    var records = safeReadSheetRecords_(schema);
    var items = [];
    schema.columns.forEach(function (columnName) {
      records.forEach(function (record) {
        var raw = normalizeString_(record[columnName]);
        if (!raw) {
          return;
        }
        var inactive = raw.indexOf(INACTIVE_DIMENSION_PREFIX_) === 0;
        items.push({
          column: columnName,
          value: inactive ? raw.substring(INACTIVE_DIMENSION_PREFIX_.length) : raw,
          status: inactive ? 'Inactive' : 'Active',
          rowNumber: record.__rowNumber
        });
      });
    });
    return successResponse_('Dimensions loaded.', { items: items, columns: schema.columns });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load dimensions.');
  }
}

function saveDimensionValue(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'settings');
    var input = payload || {};
    var column = normalizeString_(input.column);
    var value = normalizeString_(input.value);
    if (!column || !value) {
      throw new Error('column and value are required.');
    }
    var schema = resolveSchema_('DIMENSIONS');
    if (schema.columns.indexOf(column) === -1) {
      throw new Error('Unknown dimension column.');
    }
    return withScriptLock_(function () {
      var sheet = getSheetBySchema_(schema);
      var records = safeReadSheetRecords_(schema);
      var exists = records.some(function (record) {
        var raw = normalizeString_(record[column]);
        return raw === value || raw === INACTIVE_DIMENSION_PREFIX_ + value;
      });
      if (exists) {
        throw new Error('That dimension value already exists.');
      }
      var empty = records.find(function (record) {
        return !normalizeString_(record[column]);
      });
      if (empty) {
        var updated = Object.assign({}, empty);
        updated[column] = value;
        updateSheetRecordByRow_(sheet, empty.__rowNumber, schema.columns, updated);
      } else {
        var record = {};
        schema.columns.forEach(function (name) {
          record[name] = name === column ? value : '';
        });
        appendSheetRecord_(sheet, schema.columns, record);
      }
      clearSettingsAndDimensionsCache_();
      writeAuditLog_(authContext.user, 'CREATE', 'Dimensions', column, 'Added dimension value.', '', value);
      return successResponse_('Dimension value saved.', {});
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to save dimension value.');
  }
}

function deactivateDimensionValue(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'settings');
    var input = payload || {};
    var column = normalizeString_(input.column);
    var value = normalizeString_(input.value);
    var activate = Boolean(input.activate);
    return withScriptLock_(function () {
      var schema = resolveSchema_('DIMENSIONS');
      var sheet = getSheetBySchema_(schema);
      var records = safeReadSheetRecords_(schema);
      var current = records.find(function (record) {
        var raw = normalizeString_(record[column]);
        return raw === value || raw === INACTIVE_DIMENSION_PREFIX_ + value;
      });
      if (!current) {
        throw new Error('Dimension value was not found.');
      }
      var updated = Object.assign({}, current);
      updated[column] = activate ? value : INACTIVE_DIMENSION_PREFIX_ + value;
      updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
      clearSettingsAndDimensionsCache_();
      writeAuditLog_(authContext.user, activate ? 'ACTIVATE' : 'DEACTIVATE', 'Dimensions', column, 'Updated dimension status.', value, updated[column]);
      return successResponse_(activate ? 'Dimension value reactivated.' : 'Dimension value deactivated.', {});
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update dimension value.');
  }
}

function backupSettingsConfig(sessionToken) {
  try {
    requireSession_(sessionToken, ['Administrator'], 'settings');
    var payload = {
      settings: safeReadSheetRecords_('SETTINGS').map(mapSetting_),
      dimensions: listDimensionsAdmin(sessionToken).data || {}
    };
    return successResponse_(
      'Backup ready.',
      downloadPayload_('ksl_settings_backup.json', 'application/json', JSON.stringify(payload, null, 2))
    );
  } catch (error) {
    return errorResponse_(error.message || 'Failed to backup settings.');
  }
}

function rebuildSettingsConfig(sessionToken) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'settings');
    var result = bootstrapMvpSlice1Database();
    writeAuditLog_(authContext.user, 'REBUILD', 'Settings', 'CONFIG', 'Rebuilt missing settings and schemas.', '', result);
    clearSettingsAndDimensionsCache_();
    return successResponse_('Configuration rebuilt.', result.data || {});
  } catch (error) {
    return errorResponse_(error.message || 'Failed to rebuild configuration.');
  }
}

function mapSetting_(record) {
  return {
    key: normalizeString_(record['Setting Key']),
    value: record['Setting Value'],
    group: normalizeString_(record['Setting Group']),
    dataType: normalizeString_(record['Data Type']),
    description: normalizeString_(record.Description),
    editable: normalizeString_(record.Editable).toUpperCase() !== 'FALSE',
    status: normalizeString_(record.Status || 'Active')
  };
}
