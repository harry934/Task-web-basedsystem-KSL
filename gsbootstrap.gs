var APP_TIMEZONE = 'Africa/Nairobi';

var KSL_SLICE1_SCHEMAS = {
  USERS: {
    key: 'USERS',
    sheetName: 'Users',
    rangeName: 'RANGEUSERS',
    columns: [
      'User ID',
      'Google Subject ID',
      'Google Email',
      'Email Verified',
      'Full Name',
      'Given Name',
      'Family Name',
      'Profile Photo',
      'Hosted Domain',
      'Employee ID',
      'Department',
      'Job Title',
      'Role',
      'Supervisor ID',
      'Account Status',
      'First Login',
      'Last Login',
      'Last Activity',
      'Created By',
      'Created Date',
      'Updated By',
      'Updated Date'
    ]
  },
  DEPARTMENTS: {
    key: 'DEPARTMENTS',
    sheetName: 'Departments',
    rangeName: 'RANGEDEPARTMENTS',
    columns: [
      'Department ID',
      'Department Name',
      'Department Head',
      'Department Description',
      'Status',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By'
    ]
  },
  TASKS: {
    key: 'TASKS',
    sheetName: 'Tasks',
    rangeName: 'RANGETASKS',
    columns: [
      'Task ID',
      'Parent Task ID',
      'Task Title',
      'Task Description',
      'Department',
      'Section',
      'Team',
      'Task Category',
      'Task Type',
      'Priority',
      'Status',
      'Progress %',
      'Created Date',
      'Created By',
      'Assigned Date',
      'Start Date',
      'Due Date',
      'Completed Date',
      'Estimated Hours',
      'Actual Hours',
      'Assigned By',
      'Primary Assignee',
      'Primary Assignee Name',
      'Supervisor ID',
      'Supervisor Name',
      'Number of Assignees',
      'Delay Reason',
      'Blocker',
      'Blocker Description',
      'Completion Notes',
      'Supervisor Review Status',
      'Supervisor Review Date',
      'Supervisor Review By',
      'Management Review Status',
      'Management Review Date',
      'Task Score',
      'Is Overdue',
      'Days Remaining',
      'Days Overdue',
      'Created Timestamp',
      'Updated Timestamp',
      'Updated By',
      'Record Status'
    ]
  },
  DIMENSIONS: {
    key: 'DIMENSIONS',
    sheetName: 'Dimensions',
    rangeName: 'RANGEDIMENSIONS',
    columns: [
      'Departments',
      'Sections',
      'Teams',
      'Job Titles',
      'Task Categories',
      'Task Types',
      'Priorities',
      'Task Statuses',
      'Progress Statuses',
      'Delay Reasons',
      'Completion Reasons',
      'Work Locations',
      'Employment Types',
      'Performance Ratings',
      'Notification Types',
      'Roles',
      'Account Statuses'
    ]
  },
  SETTINGS: {
    key: 'SETTINGS',
    sheetName: 'Settings',
    rangeName: 'RANGESETTINGS',
    columns: [
      'Setting Key',
      'Setting Value',
      'Setting Group',
      'Data Type',
      'Description',
      'Editable',
      'Status',
      'Updated Date',
      'Updated By'
    ]
  },
  AUDIT_LOG: {
    key: 'AUDIT_LOG',
    sheetName: 'AuditLog',
    rangeName: 'RANGEAUDITLOG',
    columns: [
      'Audit ID',
      'User ID',
      'User Name',
      'Action',
      'Module',
      'Record ID',
      'Description',
      'Old Value',
      'New Value',
      'Timestamp'
    ]
  },
  EMPLOYEES: {
    key: 'EMPLOYEES',
    sheetName: 'Employees',
    rangeName: 'RANGEEMPLOYEES',
    columns: [
      'Employee ID',
      'Employee Number',
      'Full Name',
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      'Department',
      'Section',
      'Job Title',
      'Employment Type',
      'Supervisor ID',
      'Supervisor Name',
      'Team',
      'Employment Status',
      'Date Joined',
      'Work Location',
      'Profile Photo',
      'Active Tasks',
      'Completed Tasks',
      'Overdue Tasks',
      'Completion Rate',
      'Performance Score',
      'Created Date',
      'Updated Date'
    ]
  },
  TASK_ASSIGNMENTS: {
    key: 'TASK_ASSIGNMENTS',
    sheetName: 'TaskAssignments',
    rangeName: 'RANGETASKASSIGNMENTS',
    columns: [
      'Assignment ID',
      'Task ID',
      'Employee ID',
      'Employee Name',
      'Department',
      'Team',
      'Assigned By',
      'Assignment Date',
      'Start Date',
      'Due Date',
      'Assignment Status',
      'Employee Acceptance',
      'Acceptance Date',
      'Employee Progress %',
      'Employee Status',
      'Last Progress Update',
      'Completion Date',
      'Employee Remarks',
      'Created Date',
      'Updated Date'
    ]
  },
  TASK_UPDATES: {
    key: 'TASK_UPDATES',
    sheetName: 'TaskUpdates',
    rangeName: 'RANGETASKUPDATES',
    columns: [
      'Update ID',
      'Task ID',
      'Employee ID',
      'Employee Name',
      'Update Date',
      'Progress %',
      'Previous Progress %',
      'Status',
      'Work Completed',
      'Work Remaining',
      'Challenges',
      'Blockers',
      'Next Action',
      'Hours Worked',
      'Employee Remarks',
      'Supervisor Review',
      'Supervisor Comment',
      'Supervisor Review Date',
      'Created Timestamp'
    ]
  },
  TASK_HISTORY: {
    key: 'TASK_HISTORY',
    sheetName: 'TaskHistory',
    rangeName: 'RANGETASKHISTORY',
    columns: [
      'History ID',
      'Task ID',
      'Action Type',
      'Previous Value',
      'New Value',
      'Changed Field',
      'Changed By',
      'Changed By Name',
      'Change Date',
      'IP/Session Reference',
      'Remarks'
    ]
  },
  NOTIFICATIONS: {
    key: 'NOTIFICATIONS',
    sheetName: 'Notifications',
    rangeName: 'RANGENOTIFICATIONS',
    columns: [
      'Notification ID',
      'User ID',
      'Employee ID',
      'Notification Type',
      'Title',
      'Message',
      'Related Task ID',
      'Priority',
      'Read Status',
      'Created Date',
      'Read Date',
      'Expiry Date'
    ]
  }
};

function bootstrapMvpSlice1Database() {
  var spreadsheet = getDatabaseSpreadsheet_();
  var schemaKeys = Object.keys(KSL_SLICE1_SCHEMAS);
  var result = [];

  schemaKeys.forEach(function (key) {
    var schema = KSL_SLICE1_SCHEMAS[key];
    var sheet = ensureSheetSchema_(spreadsheet, schema);
    result.push({
      sheetName: sheet.getName(),
      namedRange: schema.rangeName,
      columns: schema.columns.length
    });
  });

  seedDimensionsDefaults_();
  seedSettingsDefaults_();

  return {
    success: true,
    message: 'MVP Slice 1 schema bootstrap completed.',
    data: {
      spreadsheetId: spreadsheet.getId(),
      sheets: result
    }
  };
}

function ensureSheetSchema_(spreadsheet, schema) {
  var sheet = spreadsheet.getSheetByName(schema.sheetName);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(schema.sheetName);
  }

  sheet.setFrozenRows(1);
  ensureHeaders_(sheet, schema.columns);
  ensureNamedRange_(spreadsheet, sheet, schema.rangeName, schema.columns.length);
  autosizeColumns_(sheet, schema.columns.length);

  return sheet;
}

function ensureHeaders_(sheet, headers) {
  var headerRange = sheet.getRange(1, 1, 1, headers.length);
  var existing = headerRange.getValues()[0];
  var hasAnyHeader = existing.some(function (value) {
    return String(value || '').trim() !== '';
  });

  if (!hasAnyHeader) {
    headerRange.setValues([headers]);
    return;
  }

  var mismatches = [];
  headers.forEach(function (expected, index) {
    var actual = String(existing[index] || '').trim();
    if (actual !== expected) {
      mismatches.push({
        column: index + 1,
        expected: expected,
        actual: actual
      });
    }
  });

  if (mismatches.length > 0) {
    throw new Error(
      'Header mismatch in sheet "' +
        sheet.getName() +
        '". Fix columns before continuing: ' +
        JSON.stringify(mismatches)
    );
  }
}

function ensureNamedRange_(spreadsheet, sheet, rangeName, columnCount) {
  var lastRow = Math.max(getLastPopulatedRow_(sheet), 2);
  var bufferRows = 100;
  var neededRows = lastRow + bufferRows;
  if (sheet.getMaxRows() < neededRows) {
    sheet.insertRowsAfter(sheet.getMaxRows(), neededRows - sheet.getMaxRows());
  }
  var totalRows = Math.max(sheet.getMaxRows() - 1, bufferRows);
  var range = sheet.getRange(2, 1, totalRows, columnCount);
  spreadsheet.setNamedRange(rangeName, range);
}

function repairWorkbookPerformance() {
  var spreadsheet = getDatabaseSpreadsheet_();
  var schemaKeys = Object.keys(KSL_SLICE1_SCHEMAS);
  var trimmed = [];

  schemaKeys.forEach(function (key) {
    var schema = KSL_SLICE1_SCHEMAS[key];
    var sheet = spreadsheet.getSheetByName(schema.sheetName);
    if (!sheet) {
      return;
    }
    var lastPopulated = Math.max(getLastPopulatedRow_(sheet), 1);
    var keepRows = Math.max(lastPopulated + 50, 80);
    var maxRows = sheet.getMaxRows();
    if (maxRows > keepRows) {
      sheet.deleteRows(keepRows + 1, maxRows - keepRows);
    }
    ensureNamedRange_(spreadsheet, sheet, schema.rangeName, schema.columns.length);
    trimmed.push({
      sheetName: schema.sheetName,
      keptRows: sheet.getMaxRows()
    });
  });

  return {
    success: true,
    message: 'Workbook trimmed. Reload the web app after this completes.',
    data: {
      sheets: trimmed
    }
  };
}

function autosizeColumns_(sheet, columnCount) {
  for (var i = 1; i <= columnCount; i += 1) {
    sheet.autoResizeColumn(i);
  }
}

function seedDimensionsDefaults_() {
  var schema = KSL_SLICE1_SCHEMAS.DIMENSIONS;
  var sheet = getDatabaseSpreadsheet_().getSheetByName(schema.sheetName);
  var values = getDimensionSeedMap_();
  var maxRows = getMaxSeedLength_(values);
  var dataRows = [];

  for (var rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    var row = schema.columns.map(function (columnName) {
      var options = values[columnName] || [];
      return options[rowIndex] || '';
    });
    dataRows.push(row);
  }

  if (sheet.getLastRow() > 1) {
    return;
  }

  if (dataRows.length === 0) {
    return;
  }

  sheet.getRange(2, 1, dataRows.length, schema.columns.length).setValues(dataRows);
}

function seedSettingsDefaults_() {
  var schema = KSL_SLICE1_SCHEMAS.SETTINGS;
  var sheet = getDatabaseSpreadsheet_().getSheetByName(schema.sheetName);
  if (sheet.getLastRow() > 1) {
    return;
  }

  var updatedDate = new Date();
  var updatedBy = 'system-bootstrap';
  var settings = [
    [
      'APP_TITLE',
      'Kenya Shipyards Limited Tasks Management System',
      'General',
      'Text',
      'Application title used in the shell header.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'DEFAULT_DATE_FORMAT',
      'DD/MM/YYYY',
      'General',
      'Text',
      'Preferred display format for dates.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'DEFAULT_PAGE_SIZE',
      '25',
      'UI',
      'Number',
      'Default pagination size for list pages.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'DUE_SOON_DAYS',
      '3',
      'Tasks',
      'Number',
      'Threshold used to classify tasks as due soon.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'REQUIRE_ASSIGNMENT_ACCEPTANCE',
      'TRUE',
      'Workflow',
      'Boolean',
      'Whether assignees must accept assignments.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'ALLOW_COMPLETION_BELOW_100',
      'FALSE',
      'Workflow',
      'Boolean',
      'Allow completion when progress is below 100%.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'SESSION_TTL_SECONDS',
      '21600',
      'Security',
      'Number',
      'Session cache duration in seconds.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'ALLOW_EFFECTIVE_USER_FALLBACK',
      'TRUE',
      'Security',
      'Boolean',
      'Allow fallback to Session.getEffectiveUser email when active user email is not available.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'GOOGLE_CLIENT_ID',
      '',
      'Authentication',
      'Text',
      'Google Identity Services web client ID.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ]
  ];

  sheet.getRange(2, 1, settings.length, schema.columns.length).setValues(settings);
}

function getDimensionSeedMap_() {
  return {
    Departments: ['Engineering', 'Operations', 'Procurement', 'Finance', 'Human Resources'],
    Sections: ['Shipbuilding', 'Maintenance', 'Planning', 'Support'],
    Teams: ['Hull Team', 'Electrical Team', 'Dock Team', 'Safety Team'],
    'Job Titles': ['Manager', 'Supervisor', 'Engineer', 'Technician', 'Officer'],
    'Task Categories': ['Production', 'Maintenance', 'Compliance', 'Administration'],
    'Task Types': ['One-Time', 'Recurring', 'Inspection', 'Repair'],
    Priorities: ['Low', 'Medium', 'High', 'Critical'],
    'Task Statuses': ['Draft', 'Assigned', 'In Progress', 'Blocked', 'Completed', 'Archived'],
    'Progress Statuses': ['On Track', 'At Risk', 'Delayed', 'Completed'],
    'Delay Reasons': ['Awaiting Materials', 'Awaiting Approval', 'Resource Constraint', 'Technical Issue'],
    'Completion Reasons': ['Completed As Planned', 'Completed With Delay', 'Partially Completed'],
    'Work Locations': ['Main Yard', 'Dry Dock', 'Workshop', 'Office'],
    'Employment Types': ['Permanent', 'Contract', 'Intern'],
    'Performance Ratings': ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'],
    'Notification Types': ['Assignment', 'Due Soon', 'Overdue', 'Progress Review', 'Account'],
    Roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
    'Account Statuses': ['Pending Approval', 'Active', 'Suspended', 'Disabled']
  };
}

function getMaxSeedLength_(seedMap) {
  return Object.keys(seedMap).reduce(function (max, key) {
    return Math.max(max, (seedMap[key] || []).length);
  }, 0);
}

function bootstrapFirstAdminUser(firstAdminInput) {
  var schema = KSL_SLICE1_SCHEMAS.USERS;
  var data = firstAdminInput || {};
  var now = new Date();
  var sheet = getDatabaseSpreadsheet_().getSheetByName(schema.sheetName);
  var existingUsers = readSheetRecords_(schema);
  var googleSubjectId = String(data.googleSubjectId || '').trim();
  var email = String(data.email || '').trim().toLowerCase();

  if (!googleSubjectId || !email) {
    throw new Error('googleSubjectId and email are required to bootstrap the first admin user.');
  }

  var alreadyExists = existingUsers.some(function (record) {
    return (
      String(record['Google Subject ID'] || '') === googleSubjectId ||
      String(record['Google Email'] || '').toLowerCase() === email
    );
  });

  if (alreadyExists) {
    return {
      success: true,
      message: 'Admin user already exists.',
      data: {
        email: email
      }
    };
  }

  var userId = generateSequenceId_('USR');
  var record = {
    'User ID': userId,
    'Google Subject ID': googleSubjectId,
    'Google Email': email,
    'Email Verified': 'TRUE',
    'Full Name': data.fullName || email,
    'Given Name': data.givenName || '',
    'Family Name': data.familyName || '',
    'Profile Photo': data.profilePhoto || '',
    'Hosted Domain': data.hostedDomain || '',
    'Employee ID': data.employeeId || '',
    Department: data.department || '',
    'Job Title': data.jobTitle || 'Administrator',
    Role: 'Administrator',
    'Supervisor ID': '',
    'Account Status': 'Active',
    'First Login': now,
    'Last Login': now,
    'Last Activity': now,
    'Created By': 'system-bootstrap',
    'Created Date': now,
    'Updated By': 'system-bootstrap',
    'Updated Date': now
  };

  appendSheetRecord_(sheet, schema.columns, record);

  return {
    success: true,
    message: 'First administrator bootstrapped.',
    data: {
      userId: userId,
      email: email
    }
  };
}

function bootstrapFirstAdminByEmail(firstAdminInput) {
  var schema = KSL_SLICE1_SCHEMAS.USERS;
  var data = firstAdminInput || {};
  var now = new Date();
  var sheet = getDatabaseSpreadsheet_().getSheetByName(schema.sheetName);
  var email = String(data.email || '').trim().toLowerCase();

  if (!email) {
    throw new Error('email is required to bootstrap the first admin user.');
  }

  var existingByEmail = getUserRecordByEmail_(email);
  if (existingByEmail) {
    var updated = Object.assign({}, existingByEmail);
    updated['Full Name'] = data.fullName || updated['Full Name'] || email;
    updated['Given Name'] = data.givenName || updated['Given Name'] || '';
    updated['Family Name'] = data.familyName || updated['Family Name'] || '';
    updated['Profile Photo'] = data.profilePhoto || updated['Profile Photo'] || '';
    updated['Employee ID'] = data.employeeId || updated['Employee ID'] || '';
    updated.Department = data.department || updated.Department || '';
    updated['Job Title'] = data.jobTitle || updated['Job Title'] || 'Administrator';
    updated.Role = 'Administrator';
    updated['Account Status'] = 'Active';
    updated['Last Activity'] = now;
    updated['Updated By'] = 'system-bootstrap';
    updated['Updated Date'] = now;

    updateSheetRecordByRow_(sheet, existingByEmail.__rowNumber, schema.columns, updated);

    return {
      success: true,
      message: 'Existing user upgraded to active administrator. Sign in with the same email.',
      data: {
        userId: updated['User ID'],
        email: email
      }
    };
  }

  var userId = generateSequenceId_('USR');
  var record = {
    'User ID': userId,
    'Google Subject ID': '',
    'Google Email': email,
    'Email Verified': 'TRUE',
    'Full Name': data.fullName || email,
    'Given Name': data.givenName || '',
    'Family Name': data.familyName || '',
    'Profile Photo': data.profilePhoto || '',
    'Hosted Domain': data.hostedDomain || '',
    'Employee ID': data.employeeId || '',
    Department: data.department || '',
    'Job Title': data.jobTitle || 'Administrator',
    Role: 'Administrator',
    'Supervisor ID': '',
    'Account Status': 'Active',
    'First Login': now,
    'Last Login': now,
    'Last Activity': now,
    'Created By': 'system-bootstrap',
    'Created Date': now,
    'Updated By': 'system-bootstrap',
    'Updated Date': now
  };

  appendSheetRecord_(sheet, schema.columns, record);

  return {
    success: true,
    message: 'Administrator bootstrapped by email. On first login, Google subject will auto-link.',
    data: {
      userId: userId,
      email: email
    }
  };
}
