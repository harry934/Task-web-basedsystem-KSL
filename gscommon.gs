var DEFAULT_SESSION_TTL_SECONDS = 21600;
var SESSION_CACHE_PREFIX = 'SESSION_';
var ACTIVITY_CACHE_PREFIX = 'ACT_';
var SETTINGS_CACHE_KEY = 'KSL_SETTINGS_MAP';
var EXECUTION_SPREADSHEET_ = null;
var EXECUTION_SETTINGS_CACHE_ = null;
var EXECUTION_USERS_CACHE_ = null;
var EXECUTION_DIMENSIONS_CACHE_ = null;
var KSL_OFFICIAL_LOGO_URL =
  'https://kenyashipyards.co.ke/wp-content/uploads/2022/06/cropped-KSL-High-quality-Logo-300x273.png';

var PAGE_ROLE_ACCESS = {
  dashboard: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
  mytasks: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
  tasks: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
  assignments: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
  employees: ['Administrator', 'Manager'],
  teams: ['Administrator', 'Manager'],
  departments: ['Administrator', 'Manager'],
  progress: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
  monitoring: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
  dailyprogress: ['Administrator', 'Manager', 'Supervisor'],
  weeklyprogress: ['Administrator', 'Manager', 'Supervisor'],
  monthlyprogress: ['Administrator', 'Manager', 'Supervisor'],
  reports: ['Administrator', 'Manager', 'Supervisor'],
  performance: ['Administrator', 'Manager', 'Supervisor'],
  notifications: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
  audit: ['Administrator', 'Manager'],
  users: ['Administrator'],
  settings: ['Administrator'],
  login: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee']
};

function successResponse_(message, data) {
  return {
    success: true,
    message: message || 'Operation completed successfully.',
    data: data || {}
  };
}

function errorResponse_(message, data) {
  return {
    success: false,
    message: message || 'Operation failed.',
    data: data || {}
  };
}

function getDatabaseSpreadsheet_() {
  if (EXECUTION_SPREADSHEET_) {
    return EXECUTION_SPREADSHEET_;
  }

  var scriptProperties = PropertiesService.getScriptProperties();
  var spreadsheetId = String(scriptProperties.getProperty('DATABASE_SPREADSHEET_ID') || '').trim();

  if (spreadsheetId) {
    EXECUTION_SPREADSHEET_ = SpreadsheetApp.openById(spreadsheetId);
    return EXECUTION_SPREADSHEET_;
  }

  var activeSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  if (activeSpreadsheet) {
    EXECUTION_SPREADSHEET_ = activeSpreadsheet;
    return EXECUTION_SPREADSHEET_;
  }

  throw new Error(
    'Database spreadsheet is not configured. Set DATABASE_SPREADSHEET_ID in Script Properties.'
  );
}

function resolveSchema_(schemaOrKey) {
  if (typeof schemaOrKey === 'string') {
    var key = schemaOrKey.toUpperCase();
    var schemaFromKey = KSL_SLICE1_SCHEMAS[key];
    if (!schemaFromKey) {
      throw new Error('Unknown schema key: ' + schemaOrKey);
    }
    return schemaFromKey;
  }
  return schemaOrKey;
}

function getSheetBySchema_(schemaOrKey) {
  var schema = resolveSchema_(schemaOrKey);
  var spreadsheet = getDatabaseSpreadsheet_();
  var sheet = spreadsheet.getSheetByName(schema.sheetName);
  if (!sheet) {
    throw new Error('Sheet "' + schema.sheetName + '" was not found. Run bootstrapMvpSlice1Database first.');
  }
  return sheet;
}

function getLastPopulatedRow_(sheet) {
  var lastRow = sheet.getLastRow();
  if (lastRow < 1) {
    return 0;
  }
  if (lastRow <= 200) {
    return lastRow;
  }
  var values = sheet.getRange(1, 1, lastRow, 1).getValues();
  for (var i = values.length - 1; i >= 0; i -= 1) {
    if (String(values[i][0] || '').trim() !== '') {
      return i + 1;
    }
  }
  return 1;
}

function readSheetRecords_(schemaOrKey) {
  var schema = resolveSchema_(schemaOrKey);
  var sheet = getSheetBySchema_(schema);
  var lastRow = getLastPopulatedRow_(sheet);
  if (lastRow < 2) {
    return [];
  }

  var values = sheet.getRange(2, 1, lastRow - 1, schema.columns.length).getValues();
  var records = [];

  values.forEach(function (row, index) {
    if (isEmptyRow_(row)) {
      return;
    }
    var record = {};
    schema.columns.forEach(function (columnName, columnIndex) {
      record[columnName] = row[columnIndex];
    });
    record.__rowNumber = index + 2;
    records.push(record);
  });

  if (schema.key === 'USERS') {
    EXECUTION_USERS_CACHE_ = records;
  }

  return records;
}

function appendSheetRecord_(sheet, columns, record) {
  var rowValues = columns.map(function (columnName) {
    return record[columnName] === undefined ? '' : record[columnName];
  });
  var nextRow = Math.max(getLastPopulatedRow_(sheet), 1) + 1;
  sheet.getRange(nextRow, 1, 1, columns.length).setValues([rowValues]);
}

function updateSheetRecordByRow_(sheet, rowNumber, columns, record) {
  var rowValues = columns.map(function (columnName) {
    return record[columnName] === undefined ? '' : record[columnName];
  });
  sheet.getRange(rowNumber, 1, 1, columns.length).setValues([rowValues]);
}

function isEmptyRow_(row) {
  return row.every(function (value) {
    return String(value === null || value === undefined ? '' : value).trim() === '';
  });
}

function normalizeString_(value) {
  return String(value === null || value === undefined ? '' : value).trim();
}

function normalizeEmail_(email) {
  return normalizeString_(email).toLowerCase();
}

function normalizeBoolean_(value) {
  var normalized = normalizeString_(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

function normalizeNumber_(value, defaultValue) {
  var numberValue = Number(value);
  if (isNaN(numberValue)) {
    return defaultValue === undefined ? 0 : defaultValue;
  }
  return numberValue;
}

function generateSequenceId_(prefix) {
  var lock = LockService.getScriptLock();
  lock.waitLock(8000);
  try {
    var safePrefix = normalizeString_(prefix || 'ID').toUpperCase();
    var properties = PropertiesService.getScriptProperties();
    var sequenceKey = 'SEQ_' + safePrefix;
    var current = normalizeNumber_(properties.getProperty(sequenceKey), 0);
    var next = current + 1;
    properties.setProperty(sequenceKey, String(next));
    var datePart = Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyyMMdd');
    var counterPart = String(next).padStart(5, '0');
    return safePrefix + '-' + datePart + '-' + counterPart;
  } finally {
    lock.releaseLock();
  }
}

function toClientDate_(value) {
  if (!value) {
    return '';
  }
  if (value instanceof Date && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  }
  return String(value);
}

function serializeForAudit_(value) {
  if (value === null || value === undefined || value === '') {
    return '';
  }
  if (value instanceof Date) {
    return Utilities.formatDate(value, APP_TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss");
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function writeAuditLog_(actor, action, moduleName, recordId, description, oldValue, newValue) {
  var schema = resolveSchema_('AUDIT_LOG');
  var sheet = getSheetBySchema_(schema);
  var now = new Date();
  var record = {
    'Audit ID': 'AUD-' + Utilities.getUuid().replace(/-/g, '').substring(0, 12).toUpperCase(),
    'User ID': actor && actor.userId ? actor.userId : '',
    'User Name': actor && actor.fullName ? actor.fullName : '',
    Action: normalizeString_(action),
    Module: normalizeString_(moduleName),
    'Record ID': normalizeString_(recordId),
    Description: normalizeString_(description),
    'Old Value': serializeForAudit_(oldValue),
    'New Value': serializeForAudit_(newValue),
    Timestamp: now
  };
  appendSheetRecord_(sheet, schema.columns, record);
}

function getUserRecordByGoogleSubject_(googleSubjectId) {
  var subject = normalizeString_(googleSubjectId);
  if (!subject) {
    return null;
  }
  var users = readSheetRecords_('USERS');
  for (var index = 0; index < users.length; index += 1) {
    if (normalizeString_(users[index]['Google Subject ID']) === subject) {
      return users[index];
    }
  }
  return null;
}

function getUserRecordByUserId_(userId) {
  var id = normalizeString_(userId);
  if (!id) {
    return null;
  }
  var users = EXECUTION_USERS_CACHE_ || readSheetRecords_('USERS');
  for (var index = 0; index < users.length; index += 1) {
    if (normalizeString_(users[index]['User ID']) === id) {
      return users[index];
    }
  }
  return null;
}

function getUserRecordByEmail_(email) {
  var normalizedEmail = normalizeEmail_(email);
  if (!normalizedEmail) {
    return null;
  }
  var users = readSheetRecords_('USERS');
  for (var index = 0; index < users.length; index += 1) {
    if (normalizeEmail_(users[index]['Google Email']) === normalizedEmail) {
      return users[index];
    }
  }
  return null;
}

function mapUserRecordToSessionUser_(record) {
  if (!record) {
    return null;
  }
  return {
    userId: normalizeString_(record['User ID']),
    googleSubjectId: normalizeString_(record['Google Subject ID']),
    email: normalizeEmail_(record['Google Email']),
    fullName: normalizeString_(record['Full Name']),
    role: normalizeString_(record.Role),
    accountStatus: normalizeString_(record['Account Status']),
    employeeId: normalizeString_(record['Employee ID']),
    department: normalizeString_(record.Department),
    jobTitle: normalizeString_(record['Job Title']),
    profilePhoto: normalizeString_(record['Profile Photo'])
  };
}

function isActiveAccountStatus_(accountStatus) {
  return normalizeString_(accountStatus).toLowerCase() === 'active';
}

function updateUserActivity_(userRecord) {
  if (!userRecord || !userRecord.__rowNumber) {
    return;
  }
  var schema = resolveSchema_('USERS');
  var sheet = getSheetBySchema_(schema);
  var updatedRecord = Object.assign({}, userRecord);
  updatedRecord['Last Activity'] = new Date();
  updatedRecord['Updated Date'] = new Date();
  updatedRecord['Updated By'] = normalizeString_(userRecord['User ID']);
  updateSheetRecordByRow_(sheet, userRecord.__rowNumber, schema.columns, updatedRecord);
}

function createSession_(user) {
  var token = Utilities.getUuid().replace(/-/g, '');
  var ttlFromSettings = normalizeNumber_(
    getSettingValue_('SESSION_TTL_SECONDS', DEFAULT_SESSION_TTL_SECONDS),
    DEFAULT_SESSION_TTL_SECONDS
  );
  var ttl = Math.max(300, Math.min(ttlFromSettings, DEFAULT_SESSION_TTL_SECONDS));
  var now = new Date();
  var sessionPayload = {
    userId: user.userId,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
    createdAt: now.toISOString()
  };

  CacheService.getScriptCache().put(SESSION_CACHE_PREFIX + token, JSON.stringify(sessionPayload), ttl);

  return {
    sessionToken: token,
    ttlSeconds: ttl
  };
}

function getSessionContext_(sessionToken) {
  var token = normalizeString_(sessionToken);
  if (!token) {
    return null;
  }
  var serialized = CacheService.getScriptCache().get(SESSION_CACHE_PREFIX + token);
  if (!serialized) {
    return null;
  }
  try {
    return JSON.parse(serialized);
  } catch (error) {
    return null;
  }
}

function deleteSession_(sessionToken) {
  var token = normalizeString_(sessionToken);
  if (!token) {
    return;
  }
  CacheService.getScriptCache().remove(SESSION_CACHE_PREFIX + token);
}

function requireSession_(sessionToken, allowedRoles, requestedPage) {
  var session = getSessionContext_(sessionToken);
  if (!session || !session.userId) {
    throw new Error('Session expired or invalid. Please sign in again.');
  }

  var userRecord = getUserRecordByUserId_(session.userId);
  if (!userRecord) {
    throw new Error('User account no longer exists.');
  }

  var user = mapUserRecordToSessionUser_(userRecord);
  if (!isActiveAccountStatus_(user.accountStatus)) {
    throw new Error('Your account is not active. Contact an administrator.');
  }

  var roles = Array.isArray(allowedRoles) ? allowedRoles : [];
  if (roles.length > 0 && roles.indexOf(user.role) === -1) {
    throw new Error('You do not have permission to perform this action.');
  }

  if (requestedPage && !isRoleAllowedForPage_(user.role, requestedPage)) {
    throw new Error('You are not authorized to access the requested page.');
  }

  maybeUpdateUserActivity_(userRecord);
  return {
    user: user,
    record: userRecord,
    session: session
  };
}

function maybeUpdateUserActivity_(userRecord) {
  var userId = normalizeString_(userRecord && userRecord['User ID']);
  if (!userId) {
    return;
  }
  var cache = CacheService.getScriptCache();
  var cacheKey = ACTIVITY_CACHE_PREFIX + userId;
  if (cache.get(cacheKey)) {
    return;
  }
  cache.put(cacheKey, '1', 300);
  updateUserActivity_(userRecord);
}

function isRoleAllowedForPage_(role, page) {
  var allowedRoles = PAGE_ROLE_ACCESS[normalizeString_(page).toLowerCase()];
  if (!allowedRoles) {
    return false;
  }
  return allowedRoles.indexOf(normalizeString_(role)) > -1;
}

function getSettingsMap_() {
  if (EXECUTION_SETTINGS_CACHE_) {
    return EXECUTION_SETTINGS_CACHE_;
  }

  var cached = CacheService.getScriptCache().get(SETTINGS_CACHE_KEY);
  if (cached) {
    try {
      EXECUTION_SETTINGS_CACHE_ = JSON.parse(cached);
      return EXECUTION_SETTINGS_CACHE_;
    } catch (error) {
      EXECUTION_SETTINGS_CACHE_ = null;
    }
  }

  var settingsRecords = [];
  try {
    settingsRecords = readSheetRecords_('SETTINGS');
  } catch (error) {
    return {};
  }
  var map = {};

  settingsRecords.forEach(function (record) {
    var status = normalizeString_(record.Status || record['Status']);
    if (status && status.toLowerCase() !== 'active') {
      return;
    }
    var key = normalizeString_(record['Setting Key']);
    if (!key) {
      return;
    }
    var type = normalizeString_(record['Data Type']).toLowerCase();
    var rawValue = record['Setting Value'];
    map[key] = parseSettingValue_(rawValue, type);
  });

  EXECUTION_SETTINGS_CACHE_ = map;
  try {
    CacheService.getScriptCache().put(SETTINGS_CACHE_KEY, JSON.stringify(map), 180);
  } catch (error) {
    // Cache is best-effort only.
  }
  return map;
}

function parseSettingValue_(value, dataType) {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (dataType === 'number' || dataType === 'percentage') {
    return normalizeNumber_(value, 0);
  }
  if (dataType === 'boolean') {
    return normalizeBoolean_(value);
  }
  if (dataType === 'date') {
    return value instanceof Date ? value : new Date(value);
  }
  return String(value);
}

function getSettingValue_(key, defaultValue) {
  var settings = getSettingsMap_();
  if (Object.prototype.hasOwnProperty.call(settings, key)) {
    return settings[key];
  }
  return defaultValue === undefined ? '' : defaultValue;
}

function getGoogleClientId_() {
  var scriptPropertyClientId = normalizeString_(
    PropertiesService.getScriptProperties().getProperty('GOOGLE_CLIENT_ID')
  );
  if (scriptPropertyClientId) {
    return scriptPropertyClientId;
  }
  try {
    return normalizeString_(getSettingValue_('GOOGLE_CLIENT_ID', ''));
  } catch (error) {
    return '';
  }
}

function getDimensionValuesMap_() {
  if (EXECUTION_DIMENSIONS_CACHE_) {
    return EXECUTION_DIMENSIONS_CACHE_;
  }
  var schema = resolveSchema_('DIMENSIONS');
  var records = [];
  try {
    records = readSheetRecords_(schema);
  } catch (error) {
    records = [];
  }
  var dimensions = {};
  schema.columns.forEach(function (column) {
    dimensions[column] = [];
  });

  records.forEach(function (record) {
    schema.columns.forEach(function (columnName) {
      var value = normalizeString_(record[columnName]);
      if (!value) {
        return;
      }
      if (dimensions[columnName].indexOf(value) === -1) {
        dimensions[columnName].push(value);
      }
    });
  });

  EXECUTION_DIMENSIONS_CACHE_ = dimensions;
  return dimensions;
}

function getDimensionValues_(columnName) {
  var valuesMap = getDimensionValuesMap_();
  return valuesMap[columnName] || [];
}

function getUnreadNotificationsCount_(userId) {
  var notificationSchema = KSL_SLICE1_SCHEMAS.NOTIFICATIONS;
  if (!notificationSchema) {
    return 0;
  }
  try {
    var records = readSheetRecords_(notificationSchema);
    return records.filter(function (record) {
      return (
        normalizeString_(record['User ID']) === normalizeString_(userId) &&
        normalizeString_(record['Read Status']).toLowerCase() !== 'read'
      );
    }).length;
  } catch (error) {
    return 0;
  }
}

function buildPagedResult_(items, page, pageSize) {
  var safeItems = Array.isArray(items) ? items : [];
  var safePageSize = Math.max(1, normalizeNumber_(pageSize, 25));
  var safePage = Math.max(1, normalizeNumber_(page, 1));
  var total = safeItems.length;
  var pages = Math.max(1, Math.ceil(total / safePageSize));
  var clampedPage = Math.min(safePage, pages);
  var start = (clampedPage - 1) * safePageSize;
  var end = start + safePageSize;

  return {
    items: safeItems.slice(start, end),
    pagination: {
      page: clampedPage,
      pageSize: safePageSize,
      total: total,
      pages: pages
    }
  };
}

function safeDateFromInput_(value, fieldName) {
  if (!value) {
    return null;
  }
  var dateValue = value instanceof Date ? value : new Date(value);
  if (isNaN(dateValue.getTime())) {
    throw new Error('Invalid date value for ' + fieldName + '.');
  }
  return dateValue;
}

function formatDateInTimezone_(dateValue, format) {
  if (!(dateValue instanceof Date)) {
    return '';
  }
  var finalFormat = format || "yyyy-MM-dd'T'HH:mm:ss";
  return Utilities.formatDate(dateValue, APP_TIMEZONE, finalFormat);
}
