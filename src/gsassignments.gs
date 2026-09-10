var ASSIGNMENT_ROLES = ['Administrator', 'Manager', 'Supervisor', 'Team Leader'];

function listAssignablePeople(sessionToken) {
  try {
    requireSession_(sessionToken, ASSIGNMENT_ROLES, 'assignments');
    return successResponse_('Assignable people loaded.', {
      items: getAssignablePeople_(),
      tasks: readSheetRecords_('TASKS')
        .filter(function (record) {
          return normalizeString_(record['Record Status'] || 'Active').toLowerCase() !== 'archived';
        })
        .map(function (record) {
          return {
            taskId: normalizeString_(record['Task ID']),
            taskTitle: normalizeString_(record['Task Title']),
            department: normalizeString_(record.Department),
            dueDate: toClientDate_(record['Due Date']),
            status: normalizeString_(record.Status)
          };
        })
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load assignment options.');
  }
}

function listAssignments(sessionToken, options) {
  try {
    requireSession_(sessionToken, ASSIGNMENT_ROLES, 'assignments');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var items = readSheetRecords_('TASK_ASSIGNMENTS')
      .filter(function (record) {
        var status = normalizeString_(record['Assignment Status']).toLowerCase();
        var searchText = [
          record['Assignment ID'],
          record['Task ID'],
          record['Employee ID'],
          record['Employee Name'],
          record.Department
        ]
          .join(' ')
          .toLowerCase();
        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (query && searchText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapAssignmentForResponse_)
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    return successResponse_('Assignments loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load assignments.');
  }
}

function createAssignment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ASSIGNMENT_ROLES, 'assignments');
    var input = payload || {};
    var taskId = normalizeString_(input.taskId);
    var employeeIds = Array.isArray(input.employeeIds) ? input.employeeIds : [];
    var employeeId = normalizeString_(input.employeeId);
    if (employeeId) {
      employeeIds.push(employeeId);
    }
    employeeIds = employeeIds
      .map(function (value) {
        return normalizeString_(value);
      })
      .filter(Boolean)
      .filter(function (value, index, all) {
        return all.indexOf(value) === index;
      });
    var isPrimary = Boolean(input.isPrimary);
    if (!taskId || !employeeIds.length) {
      throw new Error('Task and at least one employee are required.');
    }
    var created = [];
    employeeIds.forEach(function (id, index) {
      var result = createSingleAssignment_(authContext.user, {
        taskId: taskId,
        employeeId: id,
        isPrimary: isPrimary || index === 0
      });
      created.push(result);
    });
    return successResponse_('Assignment saved.', {
      assignmentId: created[0] && created[0].assignmentId,
      createdCount: created.length,
      assignments: created
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to create assignment.');
  }
}

function createSingleAssignment_(actor, input) {
    var taskId = normalizeString_(input.taskId);
    var employeeId = normalizeString_(input.employeeId);
    var isPrimary = Boolean(input.isPrimary);

    var task = findTaskRecord_(taskId);
    if (!task) {
      throw new Error('Task was not found.');
    }
    if (normalizeString_(task['Record Status']).toLowerCase() === 'archived') {
      throw new Error('Archived tasks cannot be assigned.');
    }

    var people = getAssignablePeople_();
    var person = people.find(function (item) {
      return item.employeeId === employeeId;
    });
    if (!person) {
      throw new Error('Employee is not available for assignment.');
    }

    var existing = readSheetRecords_('TASK_ASSIGNMENTS').find(function (record) {
      return (
        normalizeString_(record['Task ID']) === taskId &&
        normalizeString_(record['Employee ID']) === employeeId &&
        ['rejected', 'reassigned', 'cancelled'].indexOf(
          normalizeString_(record['Assignment Status']).toLowerCase()
        ) === -1
      );
    });
    if (existing) {
      throw new Error('This employee is already assigned to the task.');
    }

    var now = new Date();
    var acceptanceRequired = assignmentAcceptanceRequired_();
    var schema = resolveSchema_('TASK_ASSIGNMENTS');
    var sheet = getSheetBySchema_(schema);
    var assignmentId = generateSequenceId_('ASN');
    var record = {
      'Assignment ID': assignmentId,
      'Task ID': taskId,
      'Employee ID': employeeId,
      'Employee Name': person.fullName,
      Department: person.department || normalizeString_(task.Department),
      Team: normalizeString_(task.Team),
      'Assigned By': actor.userId,
      'Assignment Date': now,
      'Start Date': task['Start Date'] || now,
      'Due Date': task['Due Date'],
      'Assignment Status': acceptanceRequired ? 'Pending' : 'Active',
      'Employee Acceptance': acceptanceRequired ? 'Pending' : 'Accepted',
      'Acceptance Date': acceptanceRequired ? '' : now,
      'Employee Progress %': 0,
      'Employee Status': 'Assigned',
      'Last Progress Update': '',
      'Completion Date': '',
      'Employee Remarks': '',
      'Created Date': now,
      'Updated Date': now
    };
    appendSheetRecord_(sheet, schema.columns, record);

    if (isPrimary || !normalizeString_(task['Primary Assignee'])) {
      var taskSchema = resolveSchema_('TASKS');
      var taskSheet = getSheetBySchema_(taskSchema);
      var updatedTask = Object.assign({}, task);
      updatedTask['Primary Assignee'] = employeeId;
      updatedTask['Primary Assignee Name'] = person.fullName;
      updatedTask['Assigned By'] = actor.userId;
      updatedTask['Assigned Date'] = now;
      updatedTask.Status =
        normalizeString_(updatedTask.Status).toLowerCase() === 'draft' ? 'Assigned' : updatedTask.Status;
      updatedTask['Updated Timestamp'] = now;
      updatedTask['Updated By'] = actor.userId;
      applyTaskDerivedFields_(updatedTask);
      updateSheetRecordByRow_(taskSheet, task.__rowNumber, taskSchema.columns, updatedTask);
    }

    refreshTaskAssigneeSummary_(taskId);
    writeTaskHistory_(
      actor,
      taskId,
      'ASSIGN',
      'Primary Assignee',
      '',
      employeeId,
      'Assigned to ' + person.fullName
    );

    var targetUser = findUserByEmployeeId_(employeeId);
    createNotification_(
      targetUser ? targetUser['User ID'] : '',
      employeeId,
      'Assignment',
      'New task assignment',
      'You were assigned to ' + normalizeString_(task['Task Title']) + ' (' + taskId + ').',
      taskId,
      'High'
    );

    writeAuditLog_(
      actor,
      'ASSIGN',
      'Assignments',
      assignmentId,
      'Assigned task to employee.',
      '',
      mapAssignmentForResponse_(record)
    );

    return {
      assignmentId: assignmentId,
      assignment: mapAssignmentForResponse_(record)
    };
}

function reassignTask(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ASSIGNMENT_ROLES, 'assignments');
    var assignmentId = normalizeString_(payload && payload.assignmentId);
    var employeeId = normalizeString_(payload && payload.employeeId);
    if (!assignmentId || !employeeId) {
      throw new Error('assignmentId and employeeId are required.');
    }

    var schema = resolveSchema_('TASK_ASSIGNMENTS');
    var sheet = getSheetBySchema_(schema);
    var records = readSheetRecords_(schema);
    var current = records.find(function (record) {
      return normalizeString_(record['Assignment ID']) === assignmentId;
    });
    if (!current) {
      throw new Error('Assignment was not found.');
    }

    var person = getAssignablePeople_().find(function (item) {
      return item.employeeId === employeeId;
    });
    if (!person) {
      throw new Error('Employee is not available for assignment.');
    }

    var previous = mapAssignmentForResponse_(current);
    var updated = Object.assign({}, current);
    updated['Employee ID'] = employeeId;
    updated['Employee Name'] = person.fullName;
    updated.Department = person.department || updated.Department;
    updated['Assignment Status'] = assignmentAcceptanceRequired_() ? 'Pending' : 'Active';
    updated['Employee Acceptance'] = assignmentAcceptanceRequired_() ? 'Pending' : 'Accepted';
    updated['Acceptance Date'] = assignmentAcceptanceRequired_() ? '' : new Date();
    updated['Employee Progress %'] = 0;
    updated['Employee Status'] = 'Assigned';
    updated['Updated Date'] = new Date();
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);

    writeTaskHistory_(
      authContext.user,
      current['Task ID'],
      'REASSIGN',
      'Employee ID',
      previous.employeeId,
      employeeId,
      'Reassigned assignment'
    );
    var targetUser = findUserByEmployeeId_(employeeId);
    createNotification_(
      targetUser ? targetUser['User ID'] : '',
      employeeId,
      'Assignment',
      'Task reassigned to you',
      'You were reassigned to task ' + normalizeString_(current['Task ID']) + '.',
      current['Task ID'],
      'High'
    );
    writeAuditLog_(
      authContext.user,
      'REASSIGN',
      'Assignments',
      assignmentId,
      'Reassigned task.',
      previous,
      mapAssignmentForResponse_(updated)
    );

    return successResponse_('Assignment reassigned.', {
      assignment: mapAssignmentForResponse_(updated)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to reassign task.');
  }
}

function deleteAssignment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'assignments');
    var assignmentId = normalizeString_(payload && payload.assignmentId);
    if (!assignmentId) {
      throw new Error('assignmentId is required.');
    }
    return withScriptLock_(function () {
      var schema = resolveSchema_('TASK_ASSIGNMENTS');
      var sheet = getSheetBySchema_(schema);
      var records = readSheetRecords_(schema);
      var current = records.find(function (record) {
        return normalizeString_(record['Assignment ID']) === assignmentId;
      });
      if (!current) {
        throw new Error('Assignment was not found.');
      }
      var previous = mapAssignmentForResponse_(current);
      var taskId = normalizeString_(current['Task ID']);
      deleteRowsByNumberDesc_(sheet, [current.__rowNumber]);
      refreshTaskAssigneeSummary_(taskId);
      writeAuditLog_(
        authContext.user,
        'DELETE',
        'Assignments',
        assignmentId,
        'Permanently deleted assignment.',
        previous,
        ''
      );
      return successResponse_('Assignment deleted permanently.', { assignmentId: assignmentId, taskId: taskId });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to delete assignment.');
  }
}

function mapAssignmentForResponse_(record) {
  return {
    assignmentId: normalizeString_(record['Assignment ID']),
    taskId: normalizeString_(record['Task ID']),
    employeeId: normalizeString_(record['Employee ID']),
    employeeName: normalizeString_(record['Employee Name']),
    department: normalizeString_(record.Department),
    team: normalizeString_(record.Team),
    assignmentStatus: normalizeString_(record['Assignment Status']),
    employeeAcceptance: normalizeString_(record['Employee Acceptance']),
    employeeProgress: normalizeNumber_(record['Employee Progress %'], 0),
    employeeStatus: normalizeString_(record['Employee Status']),
    startDate: toClientDate_(record['Start Date']),
    dueDate: toClientDate_(record['Due Date']),
    lastProgressUpdate: toClientDate_(record['Last Progress Update']),
    remarks: normalizeString_(record['Employee Remarks']),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}
