var DEFAULT_SESSION_TTL_SECONDS = 21600;
var SESSION_CACHE_PREFIX = 'SESSION_';
var ACTIVITY_CACHE_PREFIX = 'ACT_';
var SETTINGS_CACHE_KEY = 'KSL_SETTINGS_MAP';
var DIMENSIONS_CACHE_KEY = 'KSL_DIMENSIONS_MAP';
var EXECUTION_SPREADSHEET_ = null;
var EXECUTION_SETTINGS_CACHE_ = null;
var EXECUTION_USERS_CACHE_ = null;
var EXECUTION_DIMENSIONS_CACHE_ = null;
var EXECUTION_CREDENTIALS_CACHE_ = null;
var SCRIPT_LOCK_HELD_ = false;
var INACTIVE_DIMENSION_PREFIX_ = '[INACTIVE] ';
var KSL_OFFICIAL_LOGO_URL =
  'https://kenyashipyards.co.ke/wp-content/uploads/2022/06/cropped-KSL-High-quality-Logo-300x273.png';

var PAGE_ROLE_ACCESS = {
  dashboard: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
  mytasks: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
  tasks: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
  assignments: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
  employees: ['Administrator', 'Manager'],
  teams: ['Administrator', 'Manager'],
  departments: ['Administrator', 'Manager'],
  progress: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
  monitoring: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
  dailyprogress: ['Administrator', 'Manager', 'Supervisor'],
  weeklyprogress: ['Administrator', 'Manager', 'Supervisor'],
  monthlyprogress: ['Administrator', 'Manager', 'Supervisor'],
  reports: ['Administrator', 'Manager', 'Supervisor'],
  performance: ['Administrator', 'Manager', 'Supervisor'],
  notifications: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
  audit: ['Administrator', 'Manager'],
  users: ['Administrator'],
  settings: ['Administrator'],
  login: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff']
};

function isStaffLikeRole_(role) {
  var value = normalizeString_(role);
  return value === 'Employee' || value === 'Staff';
}

function normalizeStoredRole_(role) {
  var value = normalizeString_(role);
  if (value === 'Employee') {
    return 'Staff';
  }
  return value || 'Staff';
}

function expandRolesWithStaffAlias_(roles) {
  var list = Array.isArray(roles) ? roles.slice() : [];
  var hasEmployee = list.indexOf('Employee') > -1;
  var hasStaff = list.indexOf('Staff') > -1;
  if (hasEmployee && !hasStaff) {
    list.push('Staff');
  }
  if (hasStaff && !hasEmployee) {
    list.push('Employee');
  }
  return list;
}

function roleIsAllowed_(role, allowedRoles) {
  var expanded = expandRolesWithStaffAlias_(allowedRoles || []);
  if (!expanded.length) {
    return true;
  }
  var value = normalizeString_(role);
  if (expanded.indexOf(value) > -1) {
    return true;
  }
  return isStaffLikeRole_(value) && (expanded.indexOf('Employee') > -1 || expanded.indexOf('Staff') > -1);
}

function peekNextSequenceId_(prefix) {
  var safePrefix = normalizeString_(prefix || 'ID').toUpperCase();
  var properties = PropertiesService.getScriptProperties();
  var current = normalizeNumber_(properties.getProperty('SEQ_' + safePrefix), 0);
  var next = current + 1;
  var datePart = Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyyMMdd');
  return safePrefix + '-' + datePart + '-' + String(next).padStart(5, '0');
}

function previewNextId(sessionToken, prefix) {
  try {
    requireSession_(sessionToken);
    return successResponse_('Next ID ready.', { nextId: peekNextSequenceId_(prefix) });
  } catch (error) {
    return errorResponse_(error.message || 'Unable to preview ID.');
  }
}

function listStaffOptions(sessionToken) {
  try {
    requireSession_(sessionToken);
    return successResponse_('Staff options loaded.', { items: getAssignablePeople_() });
  } catch (error) {
    return errorResponse_(error.message || 'Unable to load staff options.');
  }
}

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
  if (schema.key === 'USER_CREDENTIALS') {
    EXECUTION_CREDENTIALS_CACHE_ = records;
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

function normalizeUsername_(username) {
  return normalizeString_(username).toLowerCase();
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

function withScriptLock_(fn) {
  if (SCRIPT_LOCK_HELD_) {
    return fn();
  }
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  SCRIPT_LOCK_HELD_ = true;
  try {
    return fn();
  } finally {
    SCRIPT_LOCK_HELD_ = false;
    lock.releaseLock();
  }
}

function generateSequenceId_(prefix) {
  return withScriptLock_(function () {
    return generateSequenceIdUnlocked_(prefix);
  });
}

function generateSequenceIdUnlocked_(prefix) {
  var safePrefix = normalizeString_(prefix || 'ID').toUpperCase();
  var properties = PropertiesService.getScriptProperties();
  var sequenceKey = 'SEQ_' + safePrefix;
  var current = normalizeNumber_(properties.getProperty(sequenceKey), 0);
  var next = current + 1;
  properties.setProperty(sequenceKey, String(next));
  var datePart = Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyyMMdd');
  var counterPart = String(next).padStart(5, '0');
  return safePrefix + '-' + datePart + '-' + counterPart;
}

function safeReadSheetRecords_(schemaOrKey) {
  try {
    return readSheetRecords_(schemaOrKey);
  } catch (error) {
    return [];
  }
}

function buildCsvText_(headers, rows) {
  function escapeCell_(value) {
    var text = value === null || value === undefined ? '' : String(value);
    if (/[",\n\r]/.test(text)) {
      return '"' + text.replace(/"/g, '""') + '"';
    }
    return text;
  }
  var lines = [headers.map(escapeCell_).join(',')];
  (rows || []).forEach(function (row) {
    lines.push(
      headers.map(function (header, index) {
        if (Array.isArray(row)) {
          return escapeCell_(row[index]);
        }
        return escapeCell_(row[header]);
      }).join(',')
    );
  });
  return lines.join('\n');
}

function createPdfFromTable_(title, headers, rows) {
  var reportTitle = normalizeString_(title) || 'Report';
  var stamp = Utilities.formatDate(new Date(), APP_TIMEZONE, 'yyyyMMdd-HHmmss');
  var doc = DocumentApp.create(reportTitle + ' ' + stamp);
  try {
    var body = doc.getBody();
    body.appendParagraph(getSettingValue_('REPORT_ORG_NAME', 'Kenya Shipyards Limited')).setHeading(
      DocumentApp.ParagraphHeading.HEADING2
    );
    body.appendParagraph(reportTitle).setHeading(DocumentApp.ParagraphHeading.HEADING1);
    body.appendParagraph(
      'Generated: ' + Utilities.formatDate(new Date(), APP_TIMEZONE, 'dd/MM/yyyy HH:mm') + ' (Africa/Nairobi)'
    );
    var tableRows = [headers].concat(
      (rows || []).map(function (row) {
        return headers.map(function (header, index) {
          if (Array.isArray(row)) {
            return String(row[index] == null ? '' : row[index]);
          }
          return String(row[header] == null ? '' : row[header]);
        });
      })
    );
    if (tableRows.length === 1) {
      body.appendParagraph('No matching data found.');
    } else {
      body.appendTable(tableRows);
    }
    doc.saveAndClose();
    var file = DriveApp.getFileById(doc.getId());
    var pdf = file.getAs(MimeType.PDF);
    file.setTrashed(true);
    return {
      fileName: reportTitle.replace(/[^\w\-]+/g, '_') + '.pdf',
      mimeType: 'application/pdf',
      base64: Utilities.base64Encode(pdf.getBytes())
    };
  } catch (error) {
    try {
      DriveApp.getFileById(doc.getId()).setTrashed(true);
    } catch (ignore) {
      // Best-effort cleanup.
    }
    throw new Error('Unable to generate PDF output.');
  }
}

function downloadPayload_(fileName, mimeType, content) {
  return {
    fileName: fileName,
    mimeType: mimeType,
    base64: Utilities.base64Encode(Utilities.newBlob(content, mimeType, fileName).getBytes())
  };
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

function getUserCredentialRecordByUsername_(username) {
  var normalized = normalizeUsername_(username);
  if (!normalized) {
    return null;
  }
  var records = EXECUTION_CREDENTIALS_CACHE_ || readSheetRecords_('USER_CREDENTIALS');
  for (var index = 0; index < records.length; index += 1) {
    if (normalizeUsername_(records[index].Username) === normalized) {
      return records[index];
    }
  }
  return null;
}

function getUserCredentialRecordByUserId_(userId) {
  var normalized = normalizeString_(userId);
  if (!normalized) {
    return null;
  }
  var records = EXECUTION_CREDENTIALS_CACHE_ || readSheetRecords_('USER_CREDENTIALS');
  for (var index = 0; index < records.length; index += 1) {
    if (normalizeString_(records[index]['User ID']) === normalized) {
      return records[index];
    }
  }
  return null;
}

function getCredentialIndexByUserId_() {
  var map = {};
  var records = [];
  try {
    records = EXECUTION_CREDENTIALS_CACHE_ || readSheetRecords_('USER_CREDENTIALS');
  } catch (error) {
    records = [];
  }
  records.forEach(function (record) {
    var userId = normalizeString_(record['User ID']);
    if (!userId) {
      return;
    }
    map[userId] = {
      username: normalizeString_(record.Username),
      credentialStatus: normalizeString_(record['Credential Status'] || 'Active'),
      failedAttempts: normalizeNumber_(record['Failed Attempts'], 0),
      lockoutUntil: toClientDate_(record['Lockout Until'])
    };
  });
  return map;
}

function isValidUsername_(username) {
  var normalized = normalizeUsername_(username);
  return /^[a-z0-9._-]{4,40}$/.test(normalized);
}

function assertValidUsername_(username) {
  if (!isValidUsername_(username)) {
    throw new Error(
      'Username must be 4-40 characters and use only letters, numbers, dot, underscore, or hyphen.'
    );
  }
}

function deriveNameFromUsername_(username) {
  var normalized = normalizeUsername_(username);
  if (!normalized) {
    return 'User';
  }
  var parts = normalized.split(/[._-]+/).filter(Boolean);
  if (!parts.length) {
    return normalized;
  }
  return parts
    .map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function deriveNameFromEmail_(email) {
  var localPart = normalizeEmail_(email).split('@')[0] || '';
  if (!localPart) {
    return 'User';
  }
  var parts = localPart.split(/[._-]+/).filter(Boolean);
  if (!parts.length) {
    return localPart;
  }
  return parts
    .map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function getPasswordMinLength_() {
  return Math.max(6, normalizeNumber_(getSettingValue_('PASSWORD_MIN_LENGTH', 8), 8));
}

function getPasswordMaxFailedAttempts_() {
  return Math.max(3, normalizeNumber_(getSettingValue_('PASSWORD_MAX_FAILED_ATTEMPTS', 5), 5));
}

function getPasswordLockoutMinutes_() {
  return Math.max(1, normalizeNumber_(getSettingValue_('PASSWORD_LOCKOUT_MINUTES', 15), 15));
}

function assertPasswordStrength_(password) {
  var value = String(password || '');
  var minLength = getPasswordMinLength_();
  if (value.length < minLength) {
    throw new Error('Password must be at least ' + minLength + ' characters.');
  }
  if (!/[A-Z]/.test(value) || !/[a-z]/.test(value) || !/[0-9]/.test(value)) {
    throw new Error('Password must include uppercase, lowercase, and a number.');
  }
}

function generatePasswordSalt_() {
  return Utilities.getUuid().replace(/-/g, '');
}

function bytesToHex_(bytes) {
  return bytes
    .map(function (byte) {
      var value = byte;
      if (value < 0) {
        value += 256;
      }
      return value.toString(16).padStart(2, '0');
    })
    .join('');
}

function hashPasswordWithSalt_(password, salt) {
  var raw = String(salt || '') + '::' + String(password || '');
  var digest = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw,
    Utilities.Charset.UTF_8
  );
  return bytesToHex_(digest);
}

function secureEquals_(left, right) {
  var a = String(left || '');
  var b = String(right || '');
  if (!a || !b || a.length !== b.length) {
    return false;
  }
  var mismatch = 0;
  for (var i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function verifyCredentialPassword_(credentialRecord, plainPassword) {
  if (!credentialRecord) {
    return false;
  }
  var expected = normalizeString_(credentialRecord['Password Hash']);
  var salt = normalizeString_(credentialRecord['Password Salt']);
  if (!expected || !salt) {
    return false;
  }
  var actual = hashPasswordWithSalt_(plainPassword, salt);
  return secureEquals_(expected, actual);
}

function isCredentialActive_(credentialRecord) {
  return (
    normalizeString_(credentialRecord && credentialRecord['Credential Status'] || 'Active').toLowerCase() ===
    'active'
  );
}

function getCredentialLockoutUntilDate_(credentialRecord) {
  var raw = credentialRecord ? credentialRecord['Lockout Until'] : null;
  if (!raw) {
    return null;
  }
  var dateValue = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(dateValue.getTime())) {
    return null;
  }
  return dateValue;
}

function isCredentialCurrentlyLocked_(credentialRecord) {
  var lockoutUntil = getCredentialLockoutUntilDate_(credentialRecord);
  return Boolean(lockoutUntil && lockoutUntil.getTime() > Date.now());
}

function setCredentialPassword_(userId, username, plainPassword, actorId) {
  var normalizedUserId = normalizeString_(userId);
  var normalizedUsername = normalizeUsername_(username);
  var updatedBy = normalizeString_(actorId || normalizedUserId || 'system');
  if (!normalizedUserId) {
    throw new Error('userId is required when setting credentials.');
  }
  assertValidUsername_(normalizedUsername);
  assertPasswordStrength_(plainPassword);

  var schema = resolveSchema_('USER_CREDENTIALS');
  var sheet = getSheetBySchema_(schema);
  var records = readSheetRecords_(schema);
  var byUserId = records.find(function (record) {
    return normalizeString_(record['User ID']) === normalizedUserId;
  });
  var byUsername = records.find(function (record) {
    return normalizeUsername_(record.Username) === normalizedUsername;
  });

  if (byUsername && normalizeString_(byUsername['User ID']) !== normalizedUserId) {
    throw new Error('Username is already in use.');
  }

  var now = new Date();
  var salt = generatePasswordSalt_();
  var hash = hashPasswordWithSalt_(plainPassword, salt);
  var record = byUserId
    ? Object.assign({}, byUserId)
    : {
        'User ID': normalizedUserId,
        'Created Date': now,
        'Last Login': ''
      };

  record.Username = normalizedUsername;
  record['Password Hash'] = hash;
  record['Password Salt'] = salt;
  record['Credential Status'] = 'Active';
  record['Failed Attempts'] = 0;
  record['Lockout Until'] = '';
  record['Last Password Change'] = now;
  record['Updated Date'] = now;
  record['Updated By'] = updatedBy;

  if (byUserId) {
    updateSheetRecordByRow_(sheet, byUserId.__rowNumber, schema.columns, record);
    record.__rowNumber = byUserId.__rowNumber;
  } else {
    appendSheetRecord_(sheet, schema.columns, record);
    record.__rowNumber = Math.max(getLastPopulatedRow_(sheet), 2);
  }
  EXECUTION_CREDENTIALS_CACHE_ = null;
  return record;
}

function setUserCredential_(userId, username, plainPassword, actorId) {
  return setCredentialPassword_(userId, username, plainPassword, actorId);
}

function clearCredentialFailureState_(credentialRecord, actorId) {
  if (!credentialRecord || !credentialRecord.__rowNumber) {
    return credentialRecord;
  }
  var needsReset =
    normalizeNumber_(credentialRecord['Failed Attempts'], 0) > 0 ||
    normalizeString_(credentialRecord['Lockout Until']) !== '';
  if (!needsReset) {
    return credentialRecord;
  }
  var schema = resolveSchema_('USER_CREDENTIALS');
  var sheet = getSheetBySchema_(schema);
  var updated = Object.assign({}, credentialRecord);
  updated['Failed Attempts'] = 0;
  updated['Lockout Until'] = '';
  updated['Updated Date'] = new Date();
  updated['Updated By'] = normalizeString_(actorId || credentialRecord['User ID'] || 'system');
  updateSheetRecordByRow_(sheet, credentialRecord.__rowNumber, schema.columns, updated);
  updated.__rowNumber = credentialRecord.__rowNumber;
  EXECUTION_CREDENTIALS_CACHE_ = null;
  return updated;
}

function registerCredentialFailedAttempt_(credentialRecord) {
  if (!credentialRecord || !credentialRecord.__rowNumber) {
    return {
      credential: credentialRecord,
      locked: false,
      lockoutUntil: null
    };
  }
  var maxAttempts = getPasswordMaxFailedAttempts_();
  var lockoutMinutes = getPasswordLockoutMinutes_();
  var schema = resolveSchema_('USER_CREDENTIALS');
  var sheet = getSheetBySchema_(schema);
  var updated = Object.assign({}, credentialRecord);
  var attempts = normalizeNumber_(updated['Failed Attempts'], 0) + 1;
  var lockoutUntil = null;
  if (attempts >= maxAttempts) {
    lockoutUntil = new Date(Date.now() + lockoutMinutes * 60 * 1000);
    updated['Failed Attempts'] = 0;
    updated['Lockout Until'] = lockoutUntil;
  } else {
    updated['Failed Attempts'] = attempts;
  }
  updated['Updated Date'] = new Date();
  updated['Updated By'] = normalizeString_(credentialRecord['User ID'] || 'system');
  updateSheetRecordByRow_(sheet, credentialRecord.__rowNumber, schema.columns, updated);
  updated.__rowNumber = credentialRecord.__rowNumber;
  EXECUTION_CREDENTIALS_CACHE_ = null;
  return {
    credential: updated,
    locked: Boolean(lockoutUntil),
    lockoutUntil: lockoutUntil
  };
}

function mapUserRecordToSessionUser_(record) {
  if (!record) {
    return null;
  }
  var credential = null;
  try {
    credential = getUserCredentialRecordByUserId_(record['User ID']);
  } catch (error) {
    credential = null;
  }
  return {
    userId: normalizeString_(record['User ID']),
    googleSubjectId: normalizeString_(record['Google Subject ID']),
    email: normalizeEmail_(record['Google Email']),
    username: normalizeString_(credential ? credential.Username : ''),
    fullName: normalizeString_(record['Full Name']),
    role: normalizeString_(record.Role),
    displayRole: isStaffLikeRole_(record.Role) ? 'Staff' : normalizeString_(record.Role),
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

function requireSession_(sessionToken, allowedRoles, requestedPage, options) {
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

  var roles = expandRolesWithStaffAlias_(Array.isArray(allowedRoles) ? allowedRoles : []);
  if (roles.length > 0 && !roleIsAllowed_(user.role, roles)) {
    throw new Error('You do not have permission to perform this action.');
  }

  if (requestedPage && !isRoleAllowedForPage_(user.role, requestedPage)) {
    throw new Error('You are not authorized to access the requested page.');
  }

  var settings = options || {};
  if (!settings.skipActivity) {
    maybeUpdateUserActivity_(userRecord);
  }
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
  return roleIsAllowed_(role, allowedRoles);
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

function getDimensionValuesMap_() {
  if (EXECUTION_DIMENSIONS_CACHE_) {
    return EXECUTION_DIMENSIONS_CACHE_;
  }
  var cached = CacheService.getScriptCache().get(DIMENSIONS_CACHE_KEY);
  if (cached) {
    try {
      EXECUTION_DIMENSIONS_CACHE_ = JSON.parse(cached);
      return EXECUTION_DIMENSIONS_CACHE_;
    } catch (error) {
      EXECUTION_DIMENSIONS_CACHE_ = null;
    }
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
      if (!value || value.indexOf(INACTIVE_DIMENSION_PREFIX_) === 0) {
        return;
      }
      if (dimensions[columnName].indexOf(value) === -1) {
        dimensions[columnName].push(value);
      }
    });
  });

  EXECUTION_DIMENSIONS_CACHE_ = dimensions;
  try {
    CacheService.getScriptCache().put(DIMENSIONS_CACHE_KEY, JSON.stringify(dimensions), 180);
  } catch (error) {
    // Cache is best-effort only.
  }
  return dimensions;
}

function clearSettingsAndDimensionsCache_() {
  EXECUTION_SETTINGS_CACHE_ = null;
  EXECUTION_DIMENSIONS_CACHE_ = null;
  try {
    CacheService.getScriptCache().removeAll([SETTINGS_CACHE_KEY, DIMENSIONS_CACHE_KEY]);
  } catch (error) {
    // Best-effort only.
  }
}

function getDimensionValues_(columnName) {
  var valuesMap = getDimensionValuesMap_();
  return valuesMap[columnName] || [];
}

function getUnreadNotificationsCount_(userId, employeeId) {
  var normalizedUserId = normalizeString_(userId);
  var normalizedEmployeeId = normalizeString_(employeeId);
  if (!normalizedUserId && !normalizedEmployeeId) {
    return 0;
  }
  var cacheKey = 'UNREAD_NTF_' + (normalizedUserId || normalizedEmployeeId);
  var cached = CacheService.getScriptCache().get(cacheKey);
  if (cached !== null && cached !== undefined && cached !== '') {
    return normalizeNumber_(cached, 0);
  }
  var notificationSchema = KSL_SLICE1_SCHEMAS.NOTIFICATIONS;
  if (!notificationSchema) {
    return 0;
  }
  try {
    var records = readSheetRecords_(notificationSchema);
    var count = records.filter(function (record) {
      var matchesUser = normalizedUserId && normalizeString_(record['User ID']) === normalizedUserId;
      var matchesEmployee =
        normalizedEmployeeId && normalizeString_(record['Employee ID']) === normalizedEmployeeId;
      if (!matchesUser && !matchesEmployee) {
        return false;
      }
      return normalizeString_(record['Read Status']).toLowerCase() !== 'read';
    }).length;
    CacheService.getScriptCache().put(cacheKey, String(count), 90);
    return count;
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

function getDueSoonDays_() {
  return Math.max(1, normalizeNumber_(getSettingValue_('DUE_SOON_DAYS', 3), 3));
}

function assignmentAcceptanceRequired_() {
  var value = getSettingValue_('REQUIRE_ASSIGNMENT_ACCEPTANCE', true);
  if (typeof value === 'boolean') {
    return value;
  }
  return normalizeBoolean_(value);
}

function findTaskRecord_(taskId) {
  var id = normalizeString_(taskId);
  if (!id) {
    return null;
  }
  var tasks = readSheetRecords_('TASKS');
  for (var i = 0; i < tasks.length; i += 1) {
    if (normalizeString_(tasks[i]['Task ID']) === id) {
      return tasks[i];
    }
  }
  return null;
}

function findUserByEmployeeId_(employeeId) {
  var id = normalizeString_(employeeId);
  if (!id) {
    return null;
  }
  var users = EXECUTION_USERS_CACHE_ || readSheetRecords_('USERS');
  for (var i = 0; i < users.length; i += 1) {
    if (normalizeString_(users[i]['Employee ID']) === id) {
      return users[i];
    }
  }
  return null;
}

function writeTaskHistory_(actor, taskId, actionType, changedField, oldValue, newValue, remarks) {
  var schema = resolveSchema_('TASK_HISTORY');
  var sheet = getSheetBySchema_(schema);
  var record = {
    'History ID': generateSequenceId_('HIS'),
    'Task ID': normalizeString_(taskId),
    'Action Type': normalizeString_(actionType),
    'Previous Value': serializeForAudit_(oldValue),
    'New Value': serializeForAudit_(newValue),
    'Changed Field': normalizeString_(changedField),
    'Changed By': actor && actor.userId ? actor.userId : '',
    'Changed By Name': actor && actor.fullName ? actor.fullName : '',
    'Change Date': new Date(),
    'IP/Session Reference': '',
    Remarks: normalizeString_(remarks)
  };
  appendSheetRecord_(sheet, schema.columns, record);
}

function clearUnreadNotificationCache_(userId, employeeId) {
  try {
    var cache = CacheService.getScriptCache();
    var keys = [];
    var uid = normalizeString_(userId);
    var eid = normalizeString_(employeeId);
    if (uid) {
      keys.push('UNREAD_NTF_' + uid);
    }
    if (eid) {
      keys.push('UNREAD_NTF_' + eid);
      var personUser = findUserByEmployeeId_(eid);
      if (personUser && personUser['User ID']) {
        keys.push('UNREAD_NTF_' + normalizeString_(personUser['User ID']));
      }
    }
    if (keys.length) {
      cache.removeAll(keys);
    }
  } catch (error) {
    // Best-effort only.
  }
}

function notifyAssignedStaff_(staffId, title, message, taskId, priority) {
  var id = normalizeString_(staffId);
  if (!id) {
    return;
  }
  var personUser = findUserByEmployeeId_(id);
  createNotification_(
    personUser ? personUser['User ID'] : '',
    id,
    'Assignment',
    title,
    message,
    taskId,
    priority || 'High'
  );
}

function createNotification_(userId, employeeId, type, title, message, relatedTaskId, priority) {
  if (!normalizeString_(userId) && !normalizeString_(employeeId)) {
    return;
  }
  var schema = resolveSchema_('NOTIFICATIONS');
  var sheet = getSheetBySchema_(schema);
  var record = {
    'Notification ID': generateSequenceId_('NTF'),
    'User ID': normalizeString_(userId),
    'Employee ID': normalizeString_(employeeId),
    'Notification Type': normalizeString_(type || 'Assignment'),
    Title: normalizeString_(title),
    Message: normalizeString_(message),
    'Related Task ID': normalizeString_(relatedTaskId),
    Priority: normalizeString_(priority || 'Medium'),
    'Read Status': 'Unread',
    'Created Date': new Date(),
    'Read Date': '',
    'Expiry Date': ''
  };
  appendSheetRecord_(sheet, schema.columns, record);
  clearUnreadNotificationCache_(userId, employeeId);
}

function findEmployeeByEmail_(email) {
  var normalized = normalizeEmail_(email);
  if (!normalized) {
    return null;
  }
  try {
    return (
      readSheetRecords_('EMPLOYEES').find(function (record) {
        return normalizeEmail_(record.Email) === normalized;
      }) || null
    );
  } catch (error) {
    return null;
  }
}

function applyEmployeeDirectoryToUser_(userRecord) {
  if (!userRecord) {
    return userRecord;
  }
  var employee = findEmployeeByEmail_(userRecord['Google Email']);
  if (!employee) {
    return userRecord;
  }
  if (normalizeString_(employee['Employment Status']).toLowerCase() === 'inactive') {
    return userRecord;
  }
  if (!normalizeString_(userRecord['Employee ID'])) {
    userRecord['Employee ID'] = normalizeString_(employee['Employee ID']);
  }
  if (!normalizeString_(userRecord.Department)) {
    userRecord.Department = normalizeString_(employee.Department);
  }
  if (!normalizeString_(userRecord['Job Title'])) {
    userRecord['Job Title'] = normalizeString_(employee['Job Title']);
  }
  if (!normalizeString_(userRecord['Supervisor ID'])) {
    userRecord['Supervisor ID'] = normalizeString_(employee['Supervisor ID']);
  }
  var employeeName = normalizeString_(employee['Full Name']);
  var currentName = normalizeString_(userRecord['Full Name']);
  var derivedName = deriveNameFromEmail_(userRecord['Google Email']);
  if (employeeName && (!currentName || currentName === derivedName)) {
    userRecord['Full Name'] = employeeName;
  }
  return userRecord;
}

function upsertEmployeeFromUser_(userRecord) {
  var employeeId = normalizeString_(userRecord && userRecord['Employee ID']);
  if (!employeeId) {
    return;
  }
  var schema = resolveSchema_('EMPLOYEES');
  var sheet = getSheetBySchema_(schema);
  var employees = [];
  try {
    employees = readSheetRecords_(schema);
  } catch (error) {
    return;
  }
  var existing = employees.find(function (record) {
    return normalizeString_(record['Employee ID']) === employeeId;
  });
  var now = new Date();
  var fullName = normalizeString_(userRecord['Full Name']);
  var payload = existing ? Object.assign({}, existing) : {
    'Employee ID': employeeId,
    'Employee Number': employeeId,
    'Active Tasks': 0,
    'Completed Tasks': 0,
    'Overdue Tasks': 0,
    'Completion Rate': 0,
    'Performance Score': '',
    'Created Date': now
  };
  payload['Full Name'] = fullName;
  payload['First Name'] = normalizeString_(userRecord['Given Name']);
  payload['Last Name'] = normalizeString_(userRecord['Family Name']);
  payload.Email = normalizeEmail_(userRecord['Google Email']);
  payload.Department = normalizeString_(userRecord.Department);
  payload['Job Title'] = normalizeString_(userRecord['Job Title']);
  payload['Supervisor ID'] = normalizeString_(userRecord['Supervisor ID']);
  payload['Employment Status'] = isActiveAccountStatus_(userRecord['Account Status'])
    ? 'Active'
    : 'Inactive';
  payload['Profile Photo'] = normalizeString_(userRecord['Profile Photo']);
  payload['Updated Date'] = now;

  if (existing) {
    updateSheetRecordByRow_(sheet, existing.__rowNumber, schema.columns, payload);
  } else {
    appendSheetRecord_(sheet, schema.columns, payload);
  }
}

function getAssignablePeople_() {
  var people = [];
  var seen = {};

  function addPerson(person) {
    var id = normalizeString_(person.employeeId);
    if (!id || seen[id]) {
      return;
    }
    seen[id] = true;
    people.push(person);
  }

  var users = [];
  try {
    users = readSheetRecords_('USERS');
  } catch (error) {
    users = [];
  }
  var credentialsByUserId = {};
  try {
    credentialsByUserId = getCredentialIndexByUserId_();
  } catch (error) {
    credentialsByUserId = {};
  }

  users.forEach(function (record) {
    if (!isActiveAccountStatus_(record['Account Status'])) {
      return;
    }
    if (!normalizeString_(record['Employee ID'])) {
      return;
    }
    var userId = normalizeString_(record['User ID']);
    addPerson({
      employeeId: normalizeString_(record['Employee ID']),
      fullName: normalizeString_(record['Full Name']),
      department: normalizeString_(record.Department),
      jobTitle: normalizeString_(record['Job Title']),
      userId: userId,
      username: credentialsByUserId[userId] ? credentialsByUserId[userId].username : '',
      email: normalizeEmail_(record['Google Email'])
    });
  });

  var employees = [];
  try {
    employees = readSheetRecords_('EMPLOYEES');
  } catch (error) {
    employees = [];
  }
  employees.forEach(function (record) {
    if (normalizeString_(record['Employment Status']).toLowerCase() === 'inactive') {
      return;
    }
    addPerson({
      employeeId: normalizeString_(record['Employee ID']),
      fullName: normalizeString_(record['Full Name']),
      department: normalizeString_(record.Department),
      jobTitle: normalizeString_(record['Job Title']),
      userId: '',
      username: '',
      email: normalizeEmail_(record.Email)
    });
  });

  return people;
}

function refreshTaskAssigneeSummary_(taskId) {
  var task = findTaskRecord_(taskId);
  if (!task) {
    return;
  }
  var assignments = [];
  try {
    assignments = readSheetRecords_('TASK_ASSIGNMENTS');
  } catch (error) {
    assignments = [];
  }
  var active = assignments.filter(function (record) {
    if (normalizeString_(record['Task ID']) !== normalizeString_(taskId)) {
      return false;
    }
    var status = normalizeString_(record['Assignment Status']).toLowerCase();
    return status !== 'rejected' && status !== 'reassigned' && status !== 'cancelled';
  });
  var schema = resolveSchema_('TASKS');
  var sheet = getSheetBySchema_(schema);
  var updated = Object.assign({}, task);
  updated['Number of Assignees'] = active.length;
  if (active.length && !normalizeString_(updated['Primary Assignee'])) {
    updated['Primary Assignee'] = normalizeString_(active[0]['Employee ID']);
    updated['Primary Assignee Name'] = normalizeString_(active[0]['Employee Name']);
  }
  if (active.length && normalizeString_(updated.Status).toLowerCase() === 'draft') {
    updated.Status = 'Assigned';
  }
  updated['Updated Timestamp'] = new Date();
  applyTaskDerivedFields_(updated);
  updateSheetRecordByRow_(sheet, task.__rowNumber, schema.columns, updated);
}
