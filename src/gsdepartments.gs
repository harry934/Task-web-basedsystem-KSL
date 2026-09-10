function listDepartments(sessionToken, options) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'departments');
    var filters = options || {};
    if (Boolean(filters.importMissing) || !readSheetRecords_('DEPARTMENTS').length) {
      syncDepartmentsFromDimensions_(authContext.user);
    }
    var query = normalizeString_(filters.query).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var headFilter = normalizeString_(filters.departmentHead).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var departments = readSheetRecords_('DEPARTMENTS')
      .filter(function (record) {
        var status = normalizeString_(record.Status).toLowerCase();
        var searchText = [
          record['Department ID'],
          record['Department Name'],
          record['Department Head'],
          record['Department Description']
        ]
          .join(' ')
          .toLowerCase();

        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (headFilter && normalizeString_(record['Department Head']).toLowerCase().indexOf(headFilter) === -1) {
          return false;
        }
        if (query && searchText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapDepartmentForResponse_)
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    return successResponse_('Departments loaded successfully.', buildPagedResult_(departments, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load departments.');
  }
}

function listActiveDepartments(sessionToken) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor', 'Team Leader'], 'tasks');
    var departments = readSheetRecords_('DEPARTMENTS')
      .filter(function (record) {
        return normalizeString_(record.Status).toLowerCase() === 'active';
      })
      .map(function (record) {
        return {
          departmentId: normalizeString_(record['Department ID']),
          departmentName: normalizeString_(record['Department Name'])
        };
      });

    return successResponse_('Active departments loaded.', {
      items: departments
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load active departments.');
  }
}

function createDepartment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'departments');
    var input = payload || {};
    var departmentName = normalizeString_(input.departmentName);
    var status = normalizeString_(input.status || 'Active');
    if (!departmentName) {
      throw new Error('Department name is required.');
    }
    if (!isValidDepartmentStatus_(status)) {
      throw new Error('Department status must be Active or Archived.');
    }

    var schema = resolveSchema_('DEPARTMENTS');
    var sheet = getSheetBySchema_(schema);
    var existing = readSheetRecords_(schema).find(function (record) {
      return (
        normalizeString_(record['Department Name']).toLowerCase() === departmentName.toLowerCase() &&
        normalizeString_(record.Status).toLowerCase() !== 'archived'
      );
    });
    if (existing) {
      throw new Error('An active department with the same name already exists.');
    }

    var now = new Date();
    var departmentId = generateSequenceId_('DEP');
    var record = {
      'Department ID': departmentId,
      'Department Name': departmentName,
      'Department Head': normalizeString_(input.departmentHead),
      'Department Description': normalizeString_(input.departmentDescription),
      Status: status,
      'Created Date': now,
      'Created By': authContext.user.userId,
      'Updated Date': now,
      'Updated By': authContext.user.userId
    };

    appendSheetRecord_(sheet, schema.columns, record);

    writeAuditLog_(
      authContext.user,
      'CREATE',
      'Departments',
      departmentId,
      'Created a new department.',
      '',
      mapDepartmentForResponse_(record)
    );

    return successResponse_('Department created successfully.', {
      departmentId: departmentId,
      department: mapDepartmentForResponse_(record)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to create department.');
  }
}

function updateDepartment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'departments');
    var input = payload || {};
    var departmentId = normalizeString_(input.departmentId);
    var departmentName = normalizeString_(input.departmentName);
    if (!departmentId || !departmentName) {
      throw new Error('departmentId and departmentName are required.');
    }

    var schema = resolveSchema_('DEPARTMENTS');
    var sheet = getSheetBySchema_(schema);
    var allDepartments = readSheetRecords_(schema);
    var target = allDepartments.find(function (record) {
      return normalizeString_(record['Department ID']) === departmentId;
    });
    if (!target) {
      throw new Error('Department was not found.');
    }

    var duplicate = allDepartments.find(function (record) {
      if (normalizeString_(record['Department ID']) === departmentId) {
        return false;
      }
      return (
        normalizeString_(record['Department Name']).toLowerCase() === departmentName.toLowerCase() &&
        normalizeString_(record.Status).toLowerCase() !== 'archived'
      );
    });
    if (duplicate) {
      throw new Error('Another department already uses the same name.');
    }

    var updated = Object.assign({}, target);
    var previous = mapDepartmentForResponse_(target);
    var nextStatus = normalizeString_(input.status || target.Status || 'Active');
    if (!isValidDepartmentStatus_(nextStatus)) {
      throw new Error('Department status must be Active or Archived.');
    }
    updated['Department Name'] = departmentName;
    updated['Department Head'] = normalizeString_(input.departmentHead);
    updated['Department Description'] = normalizeString_(input.departmentDescription);
    updated.Status = nextStatus;
    updated['Updated Date'] = new Date();
    updated['Updated By'] = authContext.user.userId;

    if (normalizeString_(updated.Status).toLowerCase() === 'archived') {
      assertDepartmentCanArchive_(departmentId);
    }

    updateSheetRecordByRow_(sheet, target.__rowNumber, schema.columns, updated);

    writeAuditLog_(
      authContext.user,
      'UPDATE',
      'Departments',
      departmentId,
      'Updated department details.',
      previous,
      mapDepartmentForResponse_(updated)
    );

    return successResponse_('Department updated successfully.', {
      departmentId: departmentId
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update department.');
  }
}

function archiveDepartment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'departments');
    var departmentId = normalizeString_(payload && payload.departmentId);
    if (!departmentId) {
      throw new Error('departmentId is required.');
    }

    assertDepartmentCanArchive_(departmentId);

    var schema = resolveSchema_('DEPARTMENTS');
    var sheet = getSheetBySchema_(schema);
    var records = readSheetRecords_(schema);
    var target = records.find(function (record) {
      return normalizeString_(record['Department ID']) === departmentId;
    });
    if (!target) {
      throw new Error('Department was not found.');
    }

    var previous = mapDepartmentForResponse_(target);
    var updated = Object.assign({}, target);
    updated.Status = 'Archived';
    updated['Updated Date'] = new Date();
    updated['Updated By'] = authContext.user.userId;
    updateSheetRecordByRow_(sheet, target.__rowNumber, schema.columns, updated);

    writeAuditLog_(
      authContext.user,
      'ARCHIVE',
      'Departments',
      departmentId,
      'Archived department.',
      previous,
      mapDepartmentForResponse_(updated)
    );

    return successResponse_('Department archived successfully.', {
      departmentId: departmentId
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to archive department.');
  }
}

function assertDepartmentCanArchive_(departmentId) {
  var departments = readSheetRecords_('DEPARTMENTS');
  var targetDepartment = departments.find(function (record) {
    return normalizeString_(record['Department ID']) === normalizeString_(departmentId);
  });
  var targetName = targetDepartment ? normalizeString_(targetDepartment['Department Name']) : '';

  var tasks = [];
  try {
    tasks = readSheetRecords_('TASKS');
  } catch (error) {
    tasks = [];
  }
  var activeTaskCount = tasks.filter(function (record) {
    var taskDepartment = normalizeString_(record.Department);
    var sameDepartment =
      taskDepartment === normalizeString_(departmentId) ||
      taskDepartment.toLowerCase() === normalizeString_(departmentId).toLowerCase() ||
      (targetName && taskDepartment.toLowerCase() === targetName.toLowerCase());
    var isActiveRecord = normalizeString_(record['Record Status'] || 'Active').toLowerCase() !== 'archived';
    return sameDepartment && isActiveRecord;
  }).length;
  if (activeTaskCount > 0) {
    throw new Error('Department has active task references and cannot be archived.');
  }
}

function deleteDepartment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'departments');
    var departmentId = normalizeString_(payload && payload.departmentId);
    if (!departmentId) {
      throw new Error('departmentId is required.');
    }
    return withScriptLock_(function () {
      var schema = resolveSchema_('DEPARTMENTS');
      var sheet = getSheetBySchema_(schema);
      var records = readSheetRecords_(schema);
      var target = records.find(function (record) {
        return normalizeString_(record['Department ID']) === departmentId;
      });
      if (!target) {
        throw new Error('Department was not found.');
      }
      assertDepartmentCanDelete_(departmentId);
      var previous = mapDepartmentForResponse_(target);
      deleteRowsByNumberDesc_(sheet, [target.__rowNumber]);
      writeAuditLog_(
        authContext.user,
        'DELETE',
        'Departments',
        departmentId,
        'Permanently deleted department.',
        previous,
        ''
      );
      return successResponse_('Department deleted permanently.', { departmentId: departmentId });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to delete department.');
  }
}

function assertDepartmentCanDelete_(departmentId) {
  assertDepartmentCanArchive_(departmentId);
  var departments = readSheetRecords_('DEPARTMENTS');
  var targetDepartment = departments.find(function (record) {
    return normalizeString_(record['Department ID']) === normalizeString_(departmentId);
  });
  var targetName = targetDepartment ? normalizeString_(targetDepartment['Department Name']) : '';
  var activeTeamCount = safeReadSheetRecords_('TEAMS').filter(function (record) {
    var teamDepartment = normalizeString_(record.Department);
    var sameDepartment =
      teamDepartment === normalizeString_(departmentId) ||
      (targetName && teamDepartment.toLowerCase() === targetName.toLowerCase());
    var isActive = normalizeString_(record.Status).toLowerCase() !== 'archived';
    return sameDepartment && isActive;
  }).length;
  if (activeTeamCount > 0) {
    throw new Error('Department has active team references and cannot be deleted.');
  }
}

function isValidDepartmentStatus_(status) {
  var normalized = normalizeString_(status).toLowerCase();
  return normalized === 'active' || normalized === 'archived';
}

function mapDepartmentForResponse_(record) {
  return {
    departmentId: normalizeString_(record['Department ID']),
    departmentName: normalizeString_(record['Department Name']),
    departmentHead: normalizeString_(record['Department Head']),
    departmentDescription: normalizeString_(record['Department Description']),
    status: normalizeString_(record.Status || 'Active'),
    createdDate: toClientDate_(record['Created Date']),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}

function importDepartmentsFromDimensions(sessionToken) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'departments');
    var created = syncDepartmentsFromDimensions_(authContext.user);
    return successResponse_(
      created.length
        ? 'Imported ' + created.length + ' department' + (created.length === 1 ? '' : 's') + ' from Dimensions.'
        : 'All Dimension department names already exist here.',
      { created: created }
    );
  } catch (error) {
    return errorResponse_(error.message || 'Failed to import departments.');
  }
}

function syncDepartmentsFromDimensions_(actor) {
  return withScriptLock_(function () {
    var names = getDimensionValues_('Departments') || [];
    if (!names.length) {
      return [];
    }
    var schema = resolveSchema_('DEPARTMENTS');
    var sheet = getSheetBySchema_(schema);
    var existing = readSheetRecords_(schema);
    var existingNames = {};
    existing.forEach(function (record) {
      existingNames[normalizeString_(record['Department Name']).toLowerCase()] = true;
    });
    var created = [];
    var now = new Date();
    var actorId = actor && actor.userId ? actor.userId : 'system';
    names.forEach(function (name) {
      var departmentName = normalizeString_(name);
      if (!departmentName || existingNames[departmentName.toLowerCase()]) {
        return;
      }
      var departmentId = generateSequenceIdUnlocked_('DEP');
      var record = {
        'Department ID': departmentId,
        'Department Name': departmentName,
        'Department Head': '',
        'Department Description': 'Imported from Settings → Dimensions.',
        Status: 'Active',
        'Created Date': now,
        'Created By': actorId,
        'Updated Date': now,
        'Updated By': actorId
      };
      appendSheetRecord_(sheet, schema.columns, record);
      existingNames[departmentName.toLowerCase()] = true;
      created.push(departmentName);
    });
    return created;
  });
}
