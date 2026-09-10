function listSettingsAdmin(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator'], 'settings');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var group = normalizeString_(filters.group).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 200);
    var items = safeReadSheetRecords_('SETTINGS')
      .map(mapSetting_)
      .filter(function (item) {
        if (item.key === 'AUTH_MODE' || !item.editable) {
          return false;
        }
        if (group && item.displayGroup.toLowerCase() !== group) {
          return false;
        }
        if (
          query &&
          (item.key + ' ' + item.label + ' ' + item.description + ' ' + item.value + ' ' + item.displayGroup)
            .toLowerCase()
            .indexOf(query) === -1
        ) {
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
      var parsedUpdates = updates.map(function (item) {
        var key = normalizeString_(item.key);
        var current = records.find(function (record) {
          return normalizeString_(record['Setting Key']) === key;
        });
        if (!current) {
          throw new Error('Unknown setting.');
        }
        if (normalizeString_(current.Editable).toUpperCase() === 'FALSE' || key === 'AUTH_MODE') {
          throw new Error('That setting cannot be changed.');
        }
        return {
          key: key,
          current: current,
          value: normalizeAdminSettingInput_(current['Data Type'], item.value, key)
        };
      });
      assertPerformanceWeights_(parsedUpdates, records);
      parsedUpdates.forEach(function (item) {
        var updated = Object.assign({}, item.current);
        var previous = item.current['Setting Value'];
        updated['Setting Value'] = item.value;
        updated['Updated Date'] = new Date();
        updated['Updated By'] = authContext.user.userId;
        updateSheetRecordByRow_(sheet, item.current.__rowNumber, schema.columns, updated);
        writeAuditLog_(authContext.user, 'UPDATE', 'Settings', item.key, 'Updated setting value.', previous, item.value);
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

function protectedDimensionValues_() {
  return {
    Roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Staff', 'Employee'],
    'Account Statuses': ['Active', 'Suspended', 'Disabled']
  };
}

function assertDimensionValueMutable_(column, value) {
  var protectedMap = protectedDimensionValues_();
  var locked = protectedMap[column] || [];
  if (
    locked.some(function (item) {
      return normalizeString_(item).toLowerCase() === normalizeString_(value).toLowerCase();
    })
  ) {
    throw new Error('This value is used by the system and cannot be renamed or deleted.');
  }
}

function dimensionUsageTargets_(column) {
  var map = {
    Departments: [
      { schema: 'EMPLOYEES', field: 'Department' },
      { schema: 'USERS', field: 'Department' },
      { schema: 'TASKS', field: 'Department' },
      { schema: 'TASK_ASSIGNMENTS', field: 'Department' },
      { schema: 'DEPARTMENTS', field: 'Department Name' }
    ],
    Sections: [
      { schema: 'EMPLOYEES', field: 'Section' },
      { schema: 'TASKS', field: 'Section' }
    ],
    Teams: [
      { schema: 'EMPLOYEES', field: 'Team' },
      { schema: 'TASKS', field: 'Team' },
      { schema: 'TASK_ASSIGNMENTS', field: 'Team' },
      { schema: 'TEAMS', field: 'Team Name' }
    ],
    'Job Titles': [
      { schema: 'EMPLOYEES', field: 'Job Title' },
      { schema: 'USERS', field: 'Job Title' }
    ],
    'Task Categories': [{ schema: 'TASKS', field: 'Task Category' }],
    'Task Types': [{ schema: 'TASKS', field: 'Task Type' }],
    Priorities: [{ schema: 'TASKS', field: 'Priority' }],
    'Task Statuses': [{ schema: 'TASKS', field: 'Status' }],
    'Delay Reasons': [{ schema: 'TASKS', field: 'Delay Reason' }],
    'Work Locations': [{ schema: 'EMPLOYEES', field: 'Work Location' }],
    'Employment Types': [{ schema: 'EMPLOYEES', field: 'Employment Type' }]
  };
  return map[column] || [];
}

function cascadeDimensionRename_(column, oldValue, newValue) {
  dimensionUsageTargets_(column).forEach(function (target) {
    var schema = resolveSchema_(target.schema);
    var sheet = getSheetBySchema_(schema);
    safeReadSheetRecords_(schema).forEach(function (record) {
      if (normalizeString_(record[target.field]) !== oldValue) {
        return;
      }
      var updated = Object.assign({}, record);
      updated[target.field] = newValue;
      updateSheetRecordByRow_(sheet, record.__rowNumber, schema.columns, updated);
    });
  });
}

function updateDimensionValue(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'settings');
    var input = payload || {};
    var column = normalizeString_(input.column);
    var oldValue = normalizeString_(input.oldValue);
    var newValue = normalizeString_(input.newValue);
    if (!column || !oldValue || !newValue) {
      throw new Error('column, oldValue, and newValue are required.');
    }
    if (oldValue === newValue) {
      return successResponse_('Dimension value unchanged.', {});
    }
    assertDimensionValueMutable_(column, oldValue);
    var schema = resolveSchema_('DIMENSIONS');
    if (schema.columns.indexOf(column) === -1) {
      throw new Error('Unknown dimension column.');
    }
    return withScriptLock_(function () {
      var sheet = getSheetBySchema_(schema);
      var records = safeReadSheetRecords_(schema);
      var duplicate = records.some(function (record) {
        var raw = normalizeString_(record[column]);
        var plain = raw.indexOf(INACTIVE_DIMENSION_PREFIX_) === 0 ? raw.substring(INACTIVE_DIMENSION_PREFIX_.length) : raw;
        return plain === newValue;
      });
      if (duplicate) {
        throw new Error('That dimension value already exists.');
      }
      var current = records.find(function (record) {
        var raw = normalizeString_(record[column]);
        return raw === oldValue || raw === INACTIVE_DIMENSION_PREFIX_ + oldValue;
      });
      if (!current) {
        throw new Error('Dimension value was not found.');
      }
      var wasInactive = normalizeString_(current[column]).indexOf(INACTIVE_DIMENSION_PREFIX_) === 0;
      var updated = Object.assign({}, current);
      updated[column] = wasInactive ? INACTIVE_DIMENSION_PREFIX_ + newValue : newValue;
      updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
      cascadeDimensionRename_(column, oldValue, newValue);
      clearSettingsAndDimensionsCache_();
      writeAuditLog_(authContext.user, 'UPDATE', 'Dimensions', column, 'Renamed dimension value.', oldValue, newValue);
      return successResponse_('Dimension value updated.', {});
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update dimension value.');
  }
}

function deleteDimensionValue(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'settings');
    var input = payload || {};
    var column = normalizeString_(input.column);
    var value = normalizeString_(input.value);
    if (!column || !value) {
      throw new Error('column and value are required.');
    }
    assertDimensionValueMutable_(column, value);
    var schema = resolveSchema_('DIMENSIONS');
    if (schema.columns.indexOf(column) === -1) {
      throw new Error('Unknown dimension column.');
    }
    return withScriptLock_(function () {
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
      updated[column] = '';
      updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
      clearSettingsAndDimensionsCache_();
      writeAuditLog_(authContext.user, 'DELETE', 'Dimensions', column, 'Deleted dimension value.', value, '');
      return successResponse_('Dimension value deleted.', {});
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to delete dimension value.');
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
  var key = normalizeString_(record['Setting Key']);
  var description = normalizeString_(record.Description);
  return {
    key: key,
    value: record['Setting Value'],
    group: normalizeString_(record['Setting Group']),
    displayGroup: displaySettingGroup_(record['Setting Group'], key),
    dataType: normalizeString_(record['Data Type']),
    description: description,
    label: settingLabel_(key, description),
    editable: normalizeString_(record.Editable).toUpperCase() !== 'FALSE',
    status: normalizeString_(record.Status || 'Active')
  };
}

function settingLabel_(key, description) {
  var labels = {
    APP_TITLE: 'Application title',
    DEFAULT_DATE_FORMAT: 'Date format',
    REPORT_ORG_NAME: 'Organisation name on reports',
    DUE_SOON_DAYS: 'Days before due to flag as due soon',
    DEFAULT_PAGE_SIZE: 'Rows per page in tables',
    REQUIRE_ASSIGNMENT_ACCEPTANCE: 'Assignees must accept tasks',
    REQUIRE_COMPLETION_NOTES: 'Require completion notes',
    ALLOW_COMPLETION_BELOW_100: 'Allow completing a task below 100%',
    REQUIRE_DELAY_REASON: 'Require a delay reason when overdue',
    REQUIRE_BLOCKER_DESCRIPTION: 'Require a blocker description',
    MAX_SUBTASK_PDF_MB: 'Maximum PDF size for subtask evidence (MB)',
    MAX_ATTACHMENT_MB: 'Maximum attachment size (MB)',
    WEIGHT_PRODUCTIVITY: 'Productivity weight (%)',
    WEIGHT_TIMELINESS: 'Timeliness weight (%)',
    WEIGHT_QUALITY: 'Quality weight (%)',
    WEIGHT_RELIABILITY: 'Reliability weight (%)',
    GRADE_EXCELLENT_MIN: 'Minimum score for Excellent',
    GRADE_GOOD_MIN: 'Minimum score for Good',
    GRADE_SATISFACTORY_MIN: 'Minimum score for Satisfactory',
    PASSWORD_MIN_LENGTH: 'Minimum password length',
    PASSWORD_MAX_FAILED_ATTEMPTS: 'Failed sign-in attempts before lockout',
    PASSWORD_LOCKOUT_MINUTES: 'Lockout duration (minutes)',
    SESSION_TTL_SECONDS: 'Signed-in session length (seconds)'
  };
  return labels[key] || description || key;
}

function displaySettingGroup_(group, key) {
  var keyUpper = normalizeString_(key).toUpperCase();
  if (keyUpper.indexOf('WEIGHT_') === 0 || keyUpper.indexOf('GRADE_') === 0) {
    return 'Performance';
  }
  if (keyUpper === 'DUE_SOON_DAYS') {
    return 'Tasks';
  }
  if (keyUpper === 'DEFAULT_PAGE_SIZE') {
    return 'Display';
  }
  if (keyUpper === 'APP_TITLE' || keyUpper === 'DEFAULT_DATE_FORMAT' || keyUpper === 'REPORT_ORG_NAME') {
    return 'General';
  }
  if (keyUpper.indexOf('PASSWORD_') === 0 || keyUpper === 'SESSION_TTL_SECONDS') {
    return 'Sign-in';
  }
  var normalized = normalizeString_(group).toLowerCase();
  if (normalized === 'ui' || normalized === 'interface') {
    return 'Display';
  }
  if (normalized === 'authentication' || normalized === 'security') {
    return 'Sign-in';
  }
  if (normalized === 'reports') {
    return 'General';
  }
  if (normalized === 'workflow') {
    return 'Workflow';
  }
  if (normalized === 'tasks') {
    return 'Tasks';
  }
  if (normalized === 'performance') {
    return 'Performance';
  }
  return normalizeString_(group) || 'Other';
}

function normalizeAdminSettingInput_(dataType, rawValue, key) {
  var type = normalizeString_(dataType).toLowerCase();
  var value = String(rawValue == null ? '' : rawValue).trim();
  if (type === 'boolean') {
    var normalized = value.toUpperCase();
    if (normalized === 'TRUE' || normalized === 'YES' || normalized === '1') {
      return 'TRUE';
    }
    if (normalized === 'FALSE' || normalized === 'NO' || normalized === '0') {
      return 'FALSE';
    }
    throw new Error(settingLabel_(key, '') + ' must be Yes or No.');
  }
  if (type === 'number' || type === 'percentage') {
    if (value === '' || isNaN(Number(value))) {
      throw new Error(settingLabel_(key, '') + ' must be a number.');
    }
    var num = Number(value);
    if (key === 'DUE_SOON_DAYS' && num < 0) {
      throw new Error('Due soon days cannot be negative.');
    }
    if (key === 'DEFAULT_PAGE_SIZE' && num < 1) {
      throw new Error('Rows per page must be at least 1.');
    }
    if (key.indexOf('WEIGHT_') === 0 && (num < 0 || num > 100)) {
      throw new Error('Performance weights must be between 0 and 100.');
    }
    if (key.indexOf('GRADE_') === 0 && (num < 0 || num > 100)) {
      throw new Error('Grade thresholds must be between 0 and 100.');
    }
    if (key.indexOf('PASSWORD_') === 0 && num < 1) {
      throw new Error('Sign-in numbers must be at least 1.');
    }
    if (key === 'SESSION_TTL_SECONDS' && num < 300) {
      throw new Error('Session length must be at least 300 seconds.');
    }
    if ((key === 'MAX_ATTACHMENT_MB' || key === 'MAX_SUBTASK_PDF_MB') && num < 1) {
      throw new Error('File size limit must be at least 1 MB.');
    }
    return String(num);
  }
  if (type === 'date' && value) {
    return value;
  }
  if (!value && key === 'APP_TITLE') {
    throw new Error('Application title is required.');
  }
  return value;
}

function assertPerformanceWeights_(parsedUpdates, records) {
  var weights = {};
  records.forEach(function (record) {
    var key = normalizeString_(record['Setting Key']);
    if (key.indexOf('WEIGHT_') === 0) {
      weights[key] = Number(record['Setting Value']);
    }
  });
  parsedUpdates.forEach(function (item) {
    if (item.key.indexOf('WEIGHT_') === 0) {
      weights[item.key] = Number(item.value);
    }
  });
  var keys = Object.keys(weights);
  if (keys.length < 4) {
    return;
  }
  var sum = keys.reduce(function (total, key) {
    return total + (Number(weights[key]) || 0);
  }, 0);
  if (sum !== 100) {
    throw new Error('Performance weights must add up to 100. Current total: ' + sum + '.');
  }
}
