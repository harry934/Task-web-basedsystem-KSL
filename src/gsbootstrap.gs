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
  USER_CREDENTIALS: {
    key: 'USER_CREDENTIALS',
    sheetName: 'UserCredentials',
    rangeName: 'RANGEUSERCREDENTIALS',
    columns: [
      'User ID',
      'Username',
      'Password Hash',
      'Password Salt',
      'Credential Status',
      'Failed Attempts',
      'Lockout Until',
      'Last Login',
      'Last Password Change',
      'Must Change Password',
      'Created Date',
      'Updated Date',
      'Updated By'
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
      'Duty Statuses',
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
      'Created Timestamp',
      'File Name',
      'File URL',
      'File ID',
      'MIME Type',
      'File Size'
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
  },
  TEAMS: {
    key: 'TEAMS',
    sheetName: 'Teams',
    rangeName: 'RANGETEAMS',
    columns: [
      'Team ID',
      'Team Name',
      'Department',
      'Team Leader',
      'Team Description',
      'Status',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By'
    ]
  },
  TASK_COMMENTS: {
    key: 'TASK_COMMENTS',
    sheetName: 'TaskComments',
    rangeName: 'RANGETASKCOMMENTS',
    columns: [
      'Comment ID',
      'Task ID',
      'Employee ID',
      'Employee Name',
      'Comment',
      'Comment Date',
      'Comment Type',
      'Parent Comment ID',
      'Created Timestamp'
    ]
  },
  TASK_ATTACHMENTS: {
    key: 'TASK_ATTACHMENTS',
    sheetName: 'TaskAttachments',
    rangeName: 'RANGETASKATTACHMENTS',
    columns: [
      'Attachment ID',
      'Task ID',
      'Employee ID',
      'Employee Name',
      'File Name',
      'File URL',
      'File ID',
      'MIME Type',
      'File Size',
      'Attachment Type',
      'Uploaded Date',
      'Uploaded By',
      'Status'
    ]
  },
  TASK_SUBTASKS: {
    key: 'TASK_SUBTASKS',
    sheetName: 'TaskSubtasks',
    rangeName: 'RANGETASKSUBTASKS',
    columns: [
      'Subtask ID',
      'Task ID',
      'Title',
      'Status',
      'Assigned Staff ID',
      'Assigned Staff Name',
      'Summary',
      'File Name',
      'File URL',
      'File ID',
      'MIME Type',
      'File Size',
      'Completed Date',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By',
      'Record Status'
    ]
  },
  DAILY_PROGRESS: {
    key: 'DAILY_PROGRESS',
    sheetName: 'DailyProgress',
    rangeName: 'RANGEDAILYPROGRESS',
    columns: [
      'Record ID',
      'Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Supervisor',
      'Tasks Assigned',
      'Tasks Started',
      'Tasks Completed',
      'Tasks In Progress',
      'Tasks Overdue',
      'Total Hours',
      'Average Progress %',
      'Completion Rate',
      'Performance Score',
      'Supervisor Remarks',
      'Generated Date'
    ]
  },
  WEEKLY_PROGRESS: {
    key: 'WEEKLY_PROGRESS',
    sheetName: 'WeeklyProgress',
    rangeName: 'RANGEWEEKLYPROGRESS',
    columns: [
      'Record ID',
      'Week Start',
      'Week End',
      'Employee ID',
      'Employee Name',
      'Department',
      'Supervisor',
      'Tasks Assigned',
      'Tasks Completed',
      'Tasks In Progress',
      'Tasks Overdue',
      'Total Hours',
      'Average Progress %',
      'Completion Rate',
      'Productivity Score',
      'Quality Score',
      'Timeliness Score',
      'Overall Performance Score',
      'Supervisor Comments',
      'Generated Date'
    ]
  },
  MONTHLY_PROGRESS: {
    key: 'MONTHLY_PROGRESS',
    sheetName: 'MonthlyProgress',
    rangeName: 'RANGEMONTHLYPROGRESS',
    columns: [
      'Record ID',
      'Month',
      'Year',
      'Employee ID',
      'Employee Name',
      'Department',
      'Supervisor',
      'Tasks Assigned',
      'Tasks Completed',
      'Tasks In Progress',
      'Tasks Overdue',
      'Total Hours',
      'Average Progress %',
      'Completion Rate',
      'Productivity Score',
      'Quality Score',
      'Timeliness Score',
      'Reliability Score',
      'Overall Performance Score',
      'Supervisor Comments',
      'Management Comments',
      'Generated Date'
    ]
  },
  PERFORMANCE: {
    key: 'PERFORMANCE',
    sheetName: 'Performance',
    rangeName: 'RANGEPERFORMANCE',
    columns: [
      'Performance ID',
      'Evaluation Period',
      'Employee ID',
      'Employee Name',
      'Department',
      'Supervisor',
      'Tasks Assigned',
      'Tasks Completed',
      'Tasks Overdue',
      'Completion Rate',
      'On-Time Completion Rate',
      'Average Progress',
      'Total Hours',
      'Productivity Score',
      'Timeliness Score',
      'Quality Score',
      'Reliability Score',
      'Supervisor Rating',
      'Management Rating',
      'Overall Score',
      'Performance Grade',
      'Strengths',
      'Areas for Improvement',
      'Recommendations',
      'Review Date',
      'Reviewed By'
    ]
  },
  STAFF_DEPLOYMENT_BATCHES: {
    key: 'STAFF_DEPLOYMENT_BATCHES',
    sheetName: 'StaffDeploymentBatches',
    rangeName: 'RANGESTAFFDEPLOYMENTBATCHES',
    columns: [
      'Batch ID',
      'Operational Date',
      'Department',
      'Section',
      'Location',
      'Workflow Status',
      'Submitted By',
      'Submitted By Name',
      'Submitted At',
      'RSM By',
      'RSM By Name',
      'RSM At',
      'RSM Comment',
      'Approval File Name',
      'Approval File URL',
      'Approval File ID',
      'Admin By',
      'Admin By Name',
      'Admin At',
      'Admin Comment',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By'
    ]
  },
  STAFF_DEPLOYMENT_ENTRIES: {
    key: 'STAFF_DEPLOYMENT_ENTRIES',
    sheetName: 'StaffDeploymentEntries',
    rangeName: 'RANGESTAFFDEPLOYMENTENTRIES',
    columns: [
      'Entry ID',
      'Batch ID',
      'Operational Date',
      'Employee ID',
      'Employee Name',
      'Department',
      'Section',
      'Location',
      'Duty Status',
      'Destination',
      'Notes',
      'Created Date',
      'Created By',
      'Updated Date',
      'Updated By'
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
  ensureRequiredDimensionValues_();
  seedSettingsDefaults_();
  ensureMissingSettings_();

  return {
    success: true,
    message: 'MVP Slice 1 schema bootstrap completed.',
    data: {
      spreadsheetId: spreadsheet.getId(),
      sheets: result
    }
  };
}

function ensureRequiredDimensionValues_() {
  var required = {
    'Employment Types': ['Casual'],
    'Work Locations': ['Mombasa', 'Kisumu'],
    'Duty Statuses': ['On Duty', 'Off Duty', 'On Leave', 'Absent', 'Other']
  };
  Object.keys(required).forEach(function (columnName) {
    required[columnName].forEach(function (value) {
      ensureDimensionValueExists_(columnName, value);
    });
  });
}

function ensureDimensionValueExists_(columnName, value) {
  var schema = resolveSchema_('DIMENSIONS');
  var sheet = getSheetBySchema_(schema);
  var columns = schema.columns;
  var columnIndex = columns.indexOf(columnName);
  if (columnIndex < 0) {
    return;
  }
  var target = normalizeString_(value);
  if (!target) {
    return;
  }
  var records = readSheetRecords_(schema);
  var exists = records.some(function (record) {
    var raw = normalizeString_(record[columnName]);
    if (!raw) {
      return false;
    }
    if (raw.indexOf(INACTIVE_DIMENSION_PREFIX_) === 0) {
      raw = normalizeString_(raw.slice(INACTIVE_DIMENSION_PREFIX_.length));
    }
    return raw.toLowerCase() === target.toLowerCase();
  });
  if (exists) {
    return;
  }
  var emptyRow = records.find(function (record) {
    return !normalizeString_(record[columnName]);
  });
  if (emptyRow && emptyRow.__rowNumber) {
    var updated = Object.assign({}, emptyRow);
    updated[columnName] = target;
    updateSheetRecordByRow_(sheet, emptyRow.__rowNumber, columns, updated);
  } else {
    var payload = {};
    columns.forEach(function (column) {
      payload[column] = column === columnName ? target : '';
    });
    appendSheetRecord_(sheet, columns, payload);
  }
  clearSettingsAndDimensionsCache_();
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
  var needsWrite = existing.length < headers.length;
  headers.forEach(function (expected, index) {
    var actual = String(existing[index] || '').trim();
    if (!actual) {
      needsWrite = true;
      return;
    }
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
  if (needsWrite) {
    headerRange.setValues([headers]);
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
      'AUTH_MODE',
      'PASSWORD',
      'Authentication',
      'Text',
      'Authentication mode for this deployment.',
      'FALSE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'PASSWORD_MIN_LENGTH',
      '8',
      'Authentication',
      'Number',
      'Minimum password length for username/password authentication.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'PASSWORD_MAX_FAILED_ATTEMPTS',
      '5',
      'Authentication',
      'Number',
      'Failed login attempts allowed before temporary lockout.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
    [
      'PASSWORD_LOCKOUT_MINUTES',
      '15',
      'Authentication',
      'Number',
      'Temporary lockout duration in minutes after too many failed attempts.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ],
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
      'REQUIRE_COMPLETION_NOTES',
      'TRUE',
      'Workflow',
      'Boolean',
      'Require completion notes when a task is marked completed.',
      'TRUE',
      'Active',
      updatedDate,
      updatedBy
    ]
  ].concat(getPerformanceSettingSeedRows_(updatedDate, updatedBy));

  sheet.getRange(2, 1, settings.length, schema.columns.length).setValues(settings);
}

function getPerformanceSettingSeedRows_(updatedDate, updatedBy) {
  return [
    ['WEIGHT_PRODUCTIVITY', '25', 'Performance', 'Number', 'Weight for productivity score.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['WEIGHT_TIMELINESS', '25', 'Performance', 'Number', 'Weight for timeliness score.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['WEIGHT_QUALITY', '25', 'Performance', 'Number', 'Weight for quality score.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['WEIGHT_RELIABILITY', '25', 'Performance', 'Number', 'Weight for reliability score.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['GRADE_EXCELLENT_MIN', '85', 'Performance', 'Number', 'Minimum overall score for Excellent.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['GRADE_GOOD_MIN', '70', 'Performance', 'Number', 'Minimum overall score for Good.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['GRADE_SATISFACTORY_MIN', '55', 'Performance', 'Number', 'Minimum overall score for Satisfactory.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['REPORT_ORG_NAME', 'Kenya Shipyards Limited', 'Reports', 'Text', 'Organization name used on printed and PDF reports.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['MAX_ATTACHMENT_MB', '8', 'Workflow', 'Number', 'Maximum attachment size in megabytes.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['MAX_SUBTASK_PDF_MB', '2', 'Workflow', 'Number', 'Maximum PDF size in megabytes for subtask evidence.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['REQUIRE_DELAY_REASON', 'TRUE', 'Workflow', 'Boolean', 'Require a delay reason when a task is delayed or overdue.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['REQUIRE_BLOCKER_DESCRIPTION', 'TRUE', 'Workflow', 'Boolean', 'Require a blocker description when a task is blocked.', 'TRUE', 'Active', updatedDate, updatedBy],
    ['SUPER_ADMIN_USER_ID', '', 'Security', 'Text', 'Permanent Super Admin user ID.', 'FALSE', 'Active', updatedDate, updatedBy]
  ];
}

function ensureMissingSettings_() {
  var schema = resolveSchema_('SETTINGS');
  var sheet = getSheetBySchema_(schema);
  var existing = {};
  readSheetRecords_(schema).forEach(function (record) {
    existing[normalizeString_(record['Setting Key'])] = true;
  });
  var now = new Date();
  var rows = getPerformanceSettingSeedRows_(now, 'system-bootstrap').filter(function (row) {
    return !existing[normalizeString_(row[0])];
  });
  rows.forEach(function (row) {
    var record = {};
    schema.columns.forEach(function (column, index) {
      record[column] = row[index];
    });
    appendSheetRecord_(sheet, schema.columns, record);
  });
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
    'Work Locations': ['Mombasa', 'Kisumu', 'Main Yard', 'Dry Dock', 'Workshop', 'Office'],
    'Employment Types': ['Permanent', 'Contract', 'Casual', 'Intern'],
    'Duty Statuses': ['On Duty', 'Off Duty', 'On Leave', 'Absent', 'Other'],
    'Performance Ratings': ['Excellent', 'Good', 'Satisfactory', 'Needs Improvement'],
    'Notification Types': [
      'Assignment',
      'Due Soon',
      'Overdue',
      'Progress Review',
      'Account',
      'System',
      'Deployment'
    ],
    Roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Staff'],
    'Account Statuses': ['Active', 'Suspended', 'Disabled']
  };
}

function getMaxSeedLength_(seedMap) {
  return Object.keys(seedMap).reduce(function (max, key) {
    return Math.max(max, (seedMap[key] || []).length);
  }, 0);
}

function bootstrapFirstAdminUser(firstAdminInput) {
  var data = firstAdminInput || {};
  var userBootstrap = bootstrapFirstAdminByEmail(data);
  if (normalizeString_(data.username) && normalizeString_(data.password)) {
    bootstrapFirstAdminCredentials({
      userId: userBootstrap && userBootstrap.data && userBootstrap.data.userId,
      email: data.email,
      username: data.username,
      password: data.password,
      fullName: data.fullName
    });
    userBootstrap.message = 'First administrator bootstrapped with local credentials.';
  }
  return userBootstrap;
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
    ensureSuperAdminAssigned_(updated['User ID']);

    return {
      success: true,
      message: 'Existing user upgraded to active administrator. Run bootstrapFirstAdminCredentials if credentials are not set.',
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
  ensureSuperAdminAssigned_(userId);

  return {
    success: true,
    message: 'Administrator bootstrapped by email. Next run bootstrapFirstAdminCredentials to set username/password.',
    data: {
      userId: userId,
      email: email
    }
  };
}

function bootstrapFirstAdminCredentials(firstAdminInput) {
  var data = firstAdminInput || {};
  var email = normalizeEmail_(data.email);
  var userId = normalizeString_(data.userId);
  var username = normalizeUsername_(data.username);
  var password = String(data.password || '');

  if (!username || !password) {
    throw new Error('username and password are required.');
  }

  var userRecord = null;
  if (userId) {
    userRecord = getUserRecordByUserId_(userId);
  }
  if (!userRecord && email) {
    userRecord = getUserRecordByEmail_(email);
  }
  if (!userRecord) {
    throw new Error('Admin user was not found. Run bootstrapFirstAdminByEmail first.');
  }

  var schema = resolveSchema_('USERS');
  var sheet = getSheetBySchema_(schema);
  var updated = Object.assign({}, userRecord);
  updated.Role = 'Administrator';
  updated['Account Status'] = 'Active';
  updated['Updated By'] = 'system-bootstrap';
  updated['Updated Date'] = new Date();
  if (!normalizeString_(updated['Full Name'])) {
    updated['Full Name'] = data.fullName || deriveNameFromUsername_(username);
  }
  if (email) {
    updated['Google Email'] = email;
  }
  updateSheetRecordByRow_(sheet, userRecord.__rowNumber, schema.columns, updated);
  setUserCredentialSafely_(updated['User ID'], username, password, 'system-bootstrap');

  return {
    success: true,
    message: 'Administrator local credentials are ready.',
    data: {
      userId: normalizeString_(updated['User ID']),
      username: username
    }
  };
}

function setUserCredentialSafely_(userId, username, password, actorId) {
  if (typeof setUserCredential_ === 'function') {
    return setUserCredential_(userId, username, password, actorId);
  }
  if (typeof setCredentialPassword_ === 'function') {
    return setCredentialPassword_(userId, username, password, actorId);
  }
  throw new Error(
    'Credential helper was not found. Copy the latest gscommon.gs file, save, and run again.'
  );
}

function recoverAdminAccess(firstAdminInput) {
  var data = firstAdminInput || {};
  var email = normalizeEmail_(data.email);
  var username = normalizeUsername_(data.username);
  var password = String(data.password || '');
  var disableOtherMatches = data.disableOtherMatches !== false;

  if (!email || !username || !password) {
    throw new Error('email, username, and password are required for admin recovery.');
  }

  bootstrapFirstAdminByEmail(data);

  var schema = resolveSchema_('USERS');
  var sheet = getSheetBySchema_(schema);
  var users = readSheetRecords_(schema);
  var matches = users.filter(function (record) {
    return normalizeEmail_(record['Google Email']) === email;
  });
  if (!matches.length) {
    throw new Error('No user matched the provided email during admin recovery.');
  }

  var credentialMatch = getUserCredentialRecordByUsername_(username);
  var targetUserId = normalizeString_(credentialMatch && credentialMatch['User ID']);
  var target = null;
  if (targetUserId) {
    target = users.find(function (record) {
      return normalizeString_(record['User ID']) === targetUserId;
    }) || null;
  }
  if (!target) {
    target = matches[0];
  }

  var now = new Date();
  var updatedTarget = Object.assign({}, target);
  updatedTarget['Google Email'] = email;
  updatedTarget['Email Verified'] = 'TRUE';
  updatedTarget['Full Name'] = data.fullName || updatedTarget['Full Name'] || email;
  updatedTarget['Employee ID'] = data.employeeId || updatedTarget['Employee ID'] || '';
  updatedTarget.Department = data.department || updatedTarget.Department || '';
  updatedTarget['Job Title'] = data.jobTitle || updatedTarget['Job Title'] || 'Administrator';
  updatedTarget.Role = 'Administrator';
  updatedTarget['Account Status'] = 'Active';
  updatedTarget['Updated By'] = 'system-recovery';
  updatedTarget['Updated Date'] = now;
  updatedTarget['Last Activity'] = now;
  updateSheetRecordByRow_(sheet, target.__rowNumber, schema.columns, updatedTarget);

  setUserCredentialSafely_(
    normalizeString_(updatedTarget['User ID']),
    username,
    password,
    'system-recovery'
  );

  var disabledUsers = [];
  if (disableOtherMatches) {
    matches.forEach(function (record) {
      var recordUserId = normalizeString_(record['User ID']);
      if (recordUserId === normalizeString_(updatedTarget['User ID'])) {
        return;
      }
      var duplicate = Object.assign({}, record);
      duplicate['Account Status'] = 'Disabled';
      duplicate['Updated By'] = 'system-recovery';
      duplicate['Updated Date'] = now;
      updateSheetRecordByRow_(sheet, record.__rowNumber, schema.columns, duplicate);
      disabledUsers.push(recordUserId);
    });
  }

  return {
    success: true,
    message:
      'Admin recovery complete. Sign out from all sessions, then sign in again with the recovered username.',
    data: {
      userId: normalizeString_(updatedTarget['User ID']),
      username: username,
      email: email,
      disabledDuplicateUserIds: disabledUsers
    }
  };
}

function runAdminSetup() {
  // Temporary bootstrap credentials. Change password after first successful login.
  return recoverAdminAccess({
    email: 'innovatehubke@gmail.com',
    fullName: 'System Administrator',
    employeeId: 'EMP-001',
    department: 'Engineering',
    jobTitle: 'Administrator',
    username: 'innovatehubke.admin',
    password: 'KslAdmin2026',
    disableOtherMatches: true
  });
}

function removeUserAccountByIdentity(identityInput) {
  var data = identityInput || {};
  var username = normalizeUsername_(data.username);
  var email = normalizeEmail_(data.email);
  var fullName = normalizeString_(data.fullName).toLowerCase();
  var role = normalizeString_(data.role).toLowerCase();

  if (!username && !email && !fullName) {
    throw new Error('Provide at least one identifier: username, email, or fullName.');
  }

  var usersSchema = resolveSchema_('USERS');
  var usersSheet = getSheetBySchema_(usersSchema);
  var users = readSheetRecords_(usersSchema);

  var credentialsSchema = resolveSchema_('USER_CREDENTIALS');
  var credentialsSheet = getSheetBySchema_(credentialsSchema);
  var credentials = readSheetRecords_(credentialsSchema);

  var userIdsByUsername = {};
  if (username) {
    credentials.forEach(function (record) {
      if (normalizeUsername_(record.Username) === username) {
        userIdsByUsername[normalizeString_(record['User ID'])] = true;
      }
    });
  }

  var usersToDelete = users.filter(function (record) {
    var userId = normalizeString_(record['User ID']);
    var matches = true;

    if (username) {
      matches = matches && Boolean(userIdsByUsername[userId]);
    }
    if (email) {
      matches = matches && normalizeEmail_(record['Google Email']) === email;
    }
    if (fullName) {
      matches = matches && normalizeString_(record['Full Name']).toLowerCase() === fullName;
    }
    if (role) {
      matches = matches && normalizeString_(record.Role).toLowerCase() === role;
    }

    return matches;
  });

  if (!usersToDelete.length) {
    throw new Error('No user matched the provided identity filters.');
  }

  var userIdsToDelete = {};
  usersToDelete.forEach(function (record) {
    userIdsToDelete[normalizeString_(record['User ID'])] = true;
  });

  var credentialsToDelete = credentials.filter(function (record) {
    var userId = normalizeString_(record['User ID']);
    if (userIdsToDelete[userId]) {
      return true;
    }
    if (username && normalizeUsername_(record.Username) === username) {
      return true;
    }
    return false;
  });

  deleteRowsByNumberDesc_(usersSheet, usersToDelete.map(function (record) {
    return record.__rowNumber;
  }));

  deleteRowsByNumberDesc_(credentialsSheet, credentialsToDelete.map(function (record) {
    return record.__rowNumber;
  }));

  EXECUTION_USERS_CACHE_ = null;
  EXECUTION_CREDENTIALS_CACHE_ = null;

  writeAuditLog_(
    { userId: 'system-recovery', fullName: 'System Recovery' },
    'DELETE',
    'Users',
    usersToDelete.map(function (record) {
      return normalizeString_(record['User ID']);
    }).join(','),
    'Recovery cleanup removed user accounts.',
    '',
    {
      usersRemoved: usersToDelete.length,
      credentialsRemoved: credentialsToDelete.length,
      username: username,
      email: email,
      fullName: fullName
    }
  );

  return {
    success: true,
    message: 'User account cleanup completed.',
    data: {
      usersRemoved: usersToDelete.length,
      credentialsRemoved: credentialsToDelete.length,
      removedUserIds: usersToDelete.map(function (record) {
        return normalizeString_(record['User ID']);
      })
    }
  };
}

function deleteRowsByNumberDesc_(sheet, rowNumbers) {
  var rows = (rowNumbers || [])
    .map(function (value) {
      return Number(value || 0);
    })
    .filter(function (value) {
      return value > 1;
    })
    .sort(function (left, right) {
      return right - left;
    });

  rows.forEach(function (rowNumber) {
    sheet.deleteRow(rowNumber);
  });
}

function runRemoveAccidentalHarryAccount() {
  return removeUserAccountByIdentity({
    username: 'innovatehubke.admin',
    fullName: 'Harry Mokaya',
    email: 'harry@gmail.com',
    role: 'Employee'
  });
}
