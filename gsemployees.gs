var EMPLOYEE_ACCESS_ROLES = ['Administrator', 'Manager'];

function listEmployees(sessionToken, options) {
  try {
    requireSession_(sessionToken, EMPLOYEE_ACCESS_ROLES, 'employees');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var departmentFilter = normalizeString_(filters.department).toLowerCase();
    var supervisorFilter = normalizeString_(filters.supervisor).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var items = readSheetRecords_('EMPLOYEES')
      .filter(function (record) {
        var status = normalizeString_(record['Employment Status'] || 'Active').toLowerCase();
        var department = normalizeString_(record.Department).toLowerCase();
        var searchText = [
          record['Employee ID'],
          record['Employee Number'],
          record['Full Name'],
          record.Email,
          record['Job Title'],
          record.Department
        ]
          .join(' ')
          .toLowerCase();
        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (departmentFilter && department !== departmentFilter) {
          return false;
        }
        if (
          supervisorFilter &&
          (normalizeString_(record['Supervisor Name']) + ' ' + normalizeString_(record['Supervisor ID']))
            .toLowerCase()
            .indexOf(supervisorFilter) === -1
        ) {
          return false;
        }
        if (query && searchText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapEmployeeForResponse_)
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    return successResponse_('Employees loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load employees.');
  }
}

function getEmployeeFormMetadata(sessionToken) {
  try {
    requireSession_(sessionToken, EMPLOYEE_ACCESS_ROLES, 'employees');
    var dimensions = getDimensionValuesMap_();
    var departments = [];
    try {
      departments = readSheetRecords_('DEPARTMENTS')
        .filter(function (record) {
          return normalizeString_(record.Status).toLowerCase() === 'active';
        })
        .map(function (record) {
          return normalizeString_(record['Department Name']);
        });
    } catch (error) {
      departments = dimensions.Departments || [];
    }

    return successResponse_('Employee form metadata loaded.', {
      departments: departments,
      jobTitles: dimensions['Job Titles'] || [],
      employmentTypes: dimensions['Employment Types'] || [],
      workLocations: dimensions['Work Locations'] || [],
      sections: dimensions.Sections || []
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load employee form options.');
  }
}

function createEmployee(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, EMPLOYEE_ACCESS_ROLES, 'employees');
    var input = payload || {};
    var fullName = normalizeString_(input.fullName);
    var department = normalizeString_(input.department);
    if (!fullName) {
      throw new Error('Full name is required.');
    }
    if (!department) {
      throw new Error('Department is required.');
    }

    var schema = resolveSchema_('EMPLOYEES');
    var sheet = getSheetBySchema_(schema);
    var existing = readSheetRecords_(schema);
    var employeeId =
      normalizeString_(input.employeeId) ||
      normalizeString_(input.employeeNumber) ||
      generateSequenceId_('EMP');
    var duplicate = existing.find(function (record) {
      return normalizeString_(record['Employee ID']) === employeeId;
    });
    if (duplicate) {
      throw new Error('Employee ID already exists.');
    }

    var email = normalizeEmail_(input.email);
    if (email) {
      var emailTaken = existing.find(function (record) {
        return normalizeEmail_(record.Email) === email;
      });
      if (emailTaken) {
        throw new Error('An employee with this email already exists.');
      }
    }

    var now = new Date();
    var nameParts = fullName.split(/\s+/);
    var record = {
      'Employee ID': employeeId,
      'Employee Number': normalizeString_(input.employeeNumber) || employeeId,
      'Full Name': fullName,
      'First Name': normalizeString_(input.firstName) || nameParts[0] || '',
      'Last Name': normalizeString_(input.lastName) || nameParts.slice(1).join(' '),
      Email: email,
      Phone: normalizeString_(input.phone),
      Department: department,
      Section: normalizeString_(input.section),
      'Job Title': normalizeString_(input.jobTitle),
      'Employment Type': normalizeString_(input.employmentType || 'Permanent'),
      'Supervisor ID': normalizeString_(input.supervisorId),
      'Supervisor Name': normalizeString_(input.supervisorName),
      Team: normalizeString_(input.team),
      'Employment Status': normalizeString_(input.employmentStatus || 'Active'),
      'Date Joined': input.dateJoined ? safeDateFromInput_(input.dateJoined, 'Date Joined') : now,
      'Work Location': normalizeString_(input.workLocation),
      'Profile Photo': '',
      'Active Tasks': 0,
      'Completed Tasks': 0,
      'Overdue Tasks': 0,
      'Completion Rate': 0,
      'Performance Score': '',
      'Created Date': now,
      'Updated Date': now
    };

    if (normalizeString_(record['Employment Status']).toLowerCase() === 'inactive') {
      record['Employment Status'] = 'Inactive';
    } else {
      record['Employment Status'] = 'Active';
    }

    appendSheetRecord_(sheet, schema.columns, record);
    writeAuditLog_(
      authContext.user,
      'CREATE',
      'Employees',
      employeeId,
      'Created employee master record.',
      '',
      mapEmployeeForResponse_(record)
    );

    return successResponse_('Employee created.', {
      employeeId: employeeId,
      employee: mapEmployeeForResponse_(record)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to create employee.');
  }
}

function updateEmployee(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, EMPLOYEE_ACCESS_ROLES, 'employees');
    var input = payload || {};
    var employeeId = normalizeString_(input.employeeId);
    var fullName = normalizeString_(input.fullName);
    if (!employeeId || !fullName) {
      throw new Error('employeeId and fullName are required.');
    }

    var schema = resolveSchema_('EMPLOYEES');
    var sheet = getSheetBySchema_(schema);
    var records = readSheetRecords_(schema);
    var current = records.find(function (record) {
      return normalizeString_(record['Employee ID']) === employeeId;
    });
    if (!current) {
      throw new Error('Employee was not found.');
    }

    var email = normalizeEmail_(input.email);
    if (email) {
      var emailTaken = records.find(function (record) {
        return (
          normalizeEmail_(record.Email) === email &&
          normalizeString_(record['Employee ID']) !== employeeId
        );
      });
      if (emailTaken) {
        throw new Error('Another employee already uses this email.');
      }
    }

    var previous = mapEmployeeForResponse_(current);
    var updated = Object.assign({}, current);
    var nameParts = fullName.split(/\s+/);
    updated['Full Name'] = fullName;
    updated['First Name'] = normalizeString_(input.firstName) || nameParts[0] || updated['First Name'];
    updated['Last Name'] = normalizeString_(input.lastName) || nameParts.slice(1).join(' ');
    updated['Employee Number'] = normalizeString_(input.employeeNumber) || updated['Employee Number'];
    updated.Email = email;
    updated.Phone = normalizeString_(input.phone);
    updated.Department = normalizeString_(input.department);
    updated.Section = normalizeString_(input.section);
    updated['Job Title'] = normalizeString_(input.jobTitle);
    updated['Employment Type'] = normalizeString_(input.employmentType);
    updated['Supervisor ID'] = normalizeString_(input.supervisorId);
    updated['Supervisor Name'] = normalizeString_(input.supervisorName);
    updated.Team = normalizeString_(input.team);
    updated['Employment Status'] =
      normalizeString_(input.employmentStatus).toLowerCase() === 'inactive' ? 'Inactive' : 'Active';
    if (input.dateJoined) {
      updated['Date Joined'] = safeDateFromInput_(input.dateJoined, 'Date Joined');
    }
    updated['Work Location'] = normalizeString_(input.workLocation);
    updated['Updated Date'] = new Date();
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);

    writeAuditLog_(
      authContext.user,
      'UPDATE',
      'Employees',
      employeeId,
      'Updated employee master record.',
      previous,
      mapEmployeeForResponse_(updated)
    );

    return successResponse_('Employee updated.', {
      employee: mapEmployeeForResponse_(updated)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update employee.');
  }
}

function deactivateEmployee(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, EMPLOYEE_ACCESS_ROLES, 'employees');
    var employeeId = normalizeString_(payload && payload.employeeId);
    if (!employeeId) {
      throw new Error('employeeId is required.');
    }
    var schema = resolveSchema_('EMPLOYEES');
    var sheet = getSheetBySchema_(schema);
    var records = readSheetRecords_(schema);
    var current = records.find(function (record) {
      return normalizeString_(record['Employee ID']) === employeeId;
    });
    if (!current) {
      throw new Error('Employee was not found.');
    }
    var updated = Object.assign({}, current);
    updated['Employment Status'] = 'Inactive';
    updated['Updated Date'] = new Date();
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    writeAuditLog_(
      authContext.user,
      'DEACTIVATE',
      'Employees',
      employeeId,
      'Set employee status to Inactive.',
      'Active',
      'Inactive'
    );
    return successResponse_('Employee deactivated.', {
      employee: mapEmployeeForResponse_(updated)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to deactivate employee.');
  }
}

function deleteEmployee(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'employees');
    var employeeId = normalizeString_(payload && payload.employeeId);
    if (!employeeId) {
      throw new Error('employeeId is required.');
    }
    return withScriptLock_(function () {
      var schema = resolveSchema_('EMPLOYEES');
      var sheet = getSheetBySchema_(schema);
      var records = readSheetRecords_(schema);
      var current = records.find(function (record) {
        return normalizeString_(record['Employee ID']) === employeeId;
      });
      if (!current) {
        throw new Error('Employee was not found.');
      }
      var activeAssignments = safeReadSheetRecords_('TASK_ASSIGNMENTS').filter(function (record) {
        if (normalizeString_(record['Employee ID']) !== employeeId) {
          return false;
        }
        var status = normalizeString_(record['Assignment Status']).toLowerCase();
        return status !== 'rejected' && status !== 'reassigned' && status !== 'cancelled';
      });
      if (activeAssignments.length) {
        throw new Error('Employee has active assignments and cannot be deleted.');
      }
      var previous = mapEmployeeForResponse_(current);
      deleteRowsByNumberDesc_(sheet, [current.__rowNumber]);
      writeAuditLog_(
        authContext.user,
        'DELETE',
        'Employees',
        employeeId,
        'Permanently deleted employee.',
        previous,
        ''
      );
      return successResponse_('Employee deleted permanently.', { employeeId: employeeId });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to delete employee.');
  }
}

function recalculateEmployeeMetrics(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, EMPLOYEE_ACCESS_ROLES, 'employees');
    var employeeId = normalizeString_(payload && payload.employeeId);
    var schema = resolveSchema_('EMPLOYEES');
    var sheet = getSheetBySchema_(schema);
    var records = safeReadSheetRecords_(schema);
    var targets = records.filter(function (record) {
      return !employeeId || normalizeString_(record['Employee ID']) === employeeId;
    });
    targets.forEach(function (record) {
      var metrics = buildEmployeePeriodMetrics_(record, new Date(2000, 0, 1), new Date());
      var updated = Object.assign({}, record);
      updated['Active Tasks'] = metrics.inProgress + Math.max(0, metrics.assigned - metrics.completed);
      updated['Completed Tasks'] = metrics.completed;
      updated['Overdue Tasks'] = metrics.overdue;
      updated['Completion Rate'] = metrics.scores.completionRate;
      updated['Performance Score'] = metrics.scores.overall;
      updated['Updated Date'] = new Date();
      updateSheetRecordByRow_(sheet, record.__rowNumber, schema.columns, updated);
    });
    writeAuditLog_(authContext.user, 'RECALC', 'Employees', employeeId || 'ALL', 'Recalculated employee metrics.', '', { count: targets.length });
    return successResponse_('Employee metrics recalculated.', { count: targets.length });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to recalculate employee metrics.');
  }
}

function exportEmployees(sessionToken, options) {
  try {
    var list = listEmployees(sessionToken, options || {});
    if (!list.success) {
      return list;
    }
    var headers = ['Employee ID', 'Name', 'Department', 'Supervisor', 'Status', 'Active Tasks', 'Completed', 'Overdue'];
    var rows = ((list.data && list.data.items) || []).map(function (item) {
      return [item.employeeId, item.fullName, item.department, item.supervisorName, item.employmentStatus, item.activeTasks, item.completedTasks, item.overdueTasks];
    });
    if (normalizeString_(options && options.format).toLowerCase() === 'pdf') {
      return successResponse_('Report generated.', createPdfFromTable_('Employees', headers, rows));
    }
    return successResponse_('Export ready.', downloadPayload_('employees.csv', 'text/csv', buildCsvText_(headers, rows)));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export employees.');
  }
}

function mapEmployeeForResponse_(record) {
  return {
    employeeId: normalizeString_(record['Employee ID']),
    employeeNumber: normalizeString_(record['Employee Number']),
    fullName: normalizeString_(record['Full Name']),
    firstName: normalizeString_(record['First Name']),
    lastName: normalizeString_(record['Last Name']),
    email: normalizeEmail_(record.Email),
    phone: normalizeString_(record.Phone),
    department: normalizeString_(record.Department),
    section: normalizeString_(record.Section),
    jobTitle: normalizeString_(record['Job Title']),
    employmentType: normalizeString_(record['Employment Type']),
    supervisorId: normalizeString_(record['Supervisor ID']),
    supervisorName: normalizeString_(record['Supervisor Name']),
    team: normalizeString_(record.Team),
    employmentStatus: normalizeString_(record['Employment Status'] || 'Active'),
    dateJoined: toClientDate_(record['Date Joined']),
    workLocation: normalizeString_(record['Work Location']),
    activeTasks: normalizeNumber_(record['Active Tasks'], 0),
    completedTasks: normalizeNumber_(record['Completed Tasks'], 0),
    overdueTasks: normalizeNumber_(record['Overdue Tasks'], 0),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}
