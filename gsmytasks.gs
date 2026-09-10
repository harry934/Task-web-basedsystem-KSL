function getCurrentEmployeeId_(user) {
  return normalizeString_(user && user.employeeId);
}

function listMyTasks(sessionToken, options) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'mytasks'
    );
    var employeeId = getCurrentEmployeeId_(authContext.user);
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var view = normalizeString_(filters.view).toLowerCase() || 'all';
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var dueSoonDays = getDueSoonDays_();

    if (!employeeId && isStaffLikeRole_(authContext.user.role)) {
      return successResponse_('No employee ID is linked to this account yet.', buildPagedResult_([], page, pageSize));
    }

    var assignments = readSheetRecords_('TASK_ASSIGNMENTS').filter(function (record) {
      if (employeeId && normalizeString_(record['Employee ID']) !== employeeId) {
        return false;
      }
      if (!employeeId) {
        return true;
      }
      var status = normalizeString_(record['Assignment Status']).toLowerCase();
      return status !== 'reassigned' && status !== 'cancelled';
    });

    var tasksById = {};
    readSheetRecords_('TASKS').forEach(function (record) {
      tasksById[normalizeString_(record['Task ID'])] = record;
    });

    var items = assignments
      .map(function (record) {
        var task = tasksById[normalizeString_(record['Task ID'])] || {};
        var mapped = mapAssignmentForResponse_(record);
        mapped.taskTitle = normalizeString_(task['Task Title']);
        mapped.priority = normalizeString_(task.Priority);
        mapped.taskStatus = normalizeString_(task.Status);
        mapped.isOverdue = String(task['Is Overdue']).toLowerCase() === 'true';
        mapped.daysRemaining = normalizeString_(task['Days Remaining']);
        mapped.blocker = normalizeString_(task.Blocker);
        mapped.subtasks = getSubtasksForTask_(record['Task ID']).map(mapSubtask_);
        mapped.progress = mapped.subtasks.length
          ? Math.round(
              (mapped.subtasks.filter(function (item) {
                return String(item.status).toLowerCase() === 'completed';
              }).length /
                mapped.subtasks.length) *
                100
            )
          : normalizeNumber_(task['Progress %'] || record['Employee Progress %'], 0);
        return mapped;
      })
      .filter(function (item) {
        if (view === 'overdue' && !item.isOverdue) {
          return false;
        }
        if (view === 'duesoon') {
          var daysRemaining = normalizeNumber_(item.daysRemaining, 9999);
          if (item.isOverdue || daysRemaining > dueSoonDays) {
            return false;
          }
        }
        if (!query) {
          return true;
        }
        return (
          (item.taskTitle + ' ' + item.taskId + ' ' + item.assignmentStatus).toLowerCase().indexOf(query) > -1
        );
      })
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    return successResponse_('My tasks loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load my tasks.');
  }
}

function respondToAssignment(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'mytasks'
    );
    var assignmentId = normalizeString_(payload && payload.assignmentId);
    var decision = normalizeString_(payload && payload.decision).toLowerCase();
    if (!assignmentId || (decision !== 'accepted' && decision !== 'rejected')) {
      throw new Error('assignmentId and decision (Accepted or Rejected) are required.');
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

    var employeeId = getCurrentEmployeeId_(authContext.user);
    if (employeeId && normalizeString_(current['Employee ID']) !== employeeId && isStaffLikeRole_(authContext.user.role)) {
      throw new Error('You can only respond to your own assignments.');
    }

    var updated = Object.assign({}, current);
    var now = new Date();
    if (decision === 'accepted') {
      updated['Employee Acceptance'] = 'Accepted';
      updated['Assignment Status'] = 'Active';
      updated['Employee Status'] = 'In Progress';
    } else {
      updated['Employee Acceptance'] = 'Rejected';
      updated['Assignment Status'] = 'Rejected';
      updated['Employee Status'] = 'Rejected';
    }
    updated['Acceptance Date'] = now;
    updated['Updated Date'] = now;
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    refreshTaskAssigneeSummary_(current['Task ID']);

    writeTaskHistory_(
      authContext.user,
      current['Task ID'],
      decision === 'accepted' ? 'ACCEPT' : 'REJECT',
      'Employee Acceptance',
      current['Employee Acceptance'],
      updated['Employee Acceptance'],
      'Employee responded to assignment'
    );
    writeAuditLog_(
      authContext.user,
      decision === 'accepted' ? 'ACCEPT' : 'REJECT',
      'MyTasks',
      assignmentId,
      'Employee ' + decision + ' the assignment.',
      '',
      updated['Employee Acceptance']
    );

    return successResponse_('Assignment response saved.', {
      assignment: mapAssignmentForResponse_(updated)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update assignment response.');
  }
}

function submitMyProgress(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'mytasks'
    );
    var input = payload || {};
    var assignmentId = normalizeString_(input.assignmentId);
    if (!assignmentId) {
      throw new Error('assignmentId is required.');
    }

    var assignmentSchema = resolveSchema_('TASK_ASSIGNMENTS');
    var assignmentSheet = getSheetBySchema_(assignmentSchema);
    var assignments = readSheetRecords_(assignmentSchema);
    var assignment = assignments.find(function (record) {
      return normalizeString_(record['Assignment ID']) === assignmentId;
    });
    if (!assignment) {
      throw new Error('Assignment was not found.');
    }

    var employeeId = getCurrentEmployeeId_(authContext.user);
    if (
      isStaffLikeRole_(authContext.user.role) &&
      employeeId &&
      normalizeString_(assignment['Employee ID']) !== employeeId
    ) {
      throw new Error('You can only update your own assignments.');
    }

    var previousProgress = normalizeNumber_(assignment['Employee Progress %'], 0);
    var now = new Date();
    var storedFile = storeProgressPdfFromInput_(input);
    var subtasks = getSubtasksForTask_(assignment['Task ID']);
    var progress = computeSubtaskProgressPercent_(subtasks);
    var status = normalizeString_(input.status || assignment['Employee Status'] || 'In Progress');
    var allowBelow100 = Boolean(getSettingValue_('ALLOW_COMPLETION_BELOW_100', false));
    if (status.toLowerCase() === 'completed' && progress < 100 && !allowBelow100) {
      throw new Error('Completion requires 100% progress. Complete remaining subtasks first.');
    }

    var updateSchema = ensureTaskUpdatesSchema_();
    var updateSheet = getSheetBySchema_(updateSchema);
    var updateRecord = {
      'Update ID': generateSequenceId_('UPD'),
      'Task ID': assignment['Task ID'],
      'Employee ID': assignment['Employee ID'],
      'Employee Name': assignment['Employee Name'],
      'Update Date': now,
      'Progress %': progress,
      'Previous Progress %': previousProgress,
      Status: status,
      'Work Completed': normalizeString_(input.workCompleted),
      'Work Remaining': normalizeString_(input.workRemaining),
      Challenges: normalizeString_(input.challenges),
      Blockers: normalizeString_(input.blockers),
      'Next Action': normalizeString_(input.nextAction),
      'Hours Worked': normalizeNumber_(input.hoursWorked, 0),
      'Employee Remarks': normalizeString_(input.remarks),
      'Supervisor Review': 'Pending',
      'Supervisor Comment': '',
      'Supervisor Review Date': '',
      'Created Timestamp': now,
      'File Name': storedFile.fileName,
      'File URL': storedFile.fileUrl,
      'File ID': storedFile.fileId,
      'MIME Type': storedFile.mimeType,
      'File Size': storedFile.fileSize
    };
    appendSheetRecord_(updateSheet, updateSchema.columns, updateRecord);

    var updatedAssignment = Object.assign({}, assignment);
    updatedAssignment['Employee Progress %'] = progress;
    updatedAssignment['Employee Status'] = status;
    updatedAssignment['Last Progress Update'] = now;
    updatedAssignment['Employee Remarks'] = normalizeString_(input.remarks);
    updatedAssignment['Updated Date'] = now;
    if (status.toLowerCase() === 'completed' || progress >= 100) {
      updatedAssignment['Completion Date'] = now;
      updatedAssignment['Assignment Status'] = 'Completed';
    } else {
      updatedAssignment['Assignment Status'] = 'Active';
    }
    updateSheetRecordByRow_(
      assignmentSheet,
      assignment.__rowNumber,
      assignmentSchema.columns,
      updatedAssignment
    );

    var task = findTaskRecord_(assignment['Task ID']);
    if (task) {
      if (subtasks.length) {
        recalculateTaskProgressFromSubtasks_(assignment['Task ID'], authContext.user);
      } else {
        var taskSchema = resolveSchema_('TASKS');
        var taskSheet = getSheetBySchema_(taskSchema);
        var updatedTask = Object.assign({}, task);
        updatedTask['Progress %'] = progress;
        updatedTask.Status = status.toLowerCase() === 'completed' ? 'Completed' : updatedTask.Status;
        updatedTask['Updated Timestamp'] = now;
        updatedTask['Updated By'] = authContext.user.userId;
        applyTaskDerivedFields_(updatedTask);
        updateSheetRecordByRow_(taskSheet, task.__rowNumber, taskSchema.columns, updatedTask);
      }
    }

    writeTaskHistory_(
      authContext.user,
      assignment['Task ID'],
      'PROGRESS',
      'Progress %',
      previousProgress,
      progress,
      'Employee submitted a progress update'
    );

    var supervisorUser = findUserByEmployeeId_(normalizeString_(task && task['Supervisor ID']));
    if (supervisorUser) {
      createNotification_(
        supervisorUser['User ID'],
        supervisorUser['Employee ID'],
        'Progress Review',
        'Progress update submitted',
        authContext.user.fullName + ' submitted progress on ' + assignment['Task ID'] + '.',
        assignment['Task ID'],
        'Medium'
      );
    }

    writeAuditLog_(
      authContext.user,
      'PROGRESS',
      'MyTasks',
      updateRecord['Update ID'],
      'Submitted progress update.',
      previousProgress,
      progress
    );

    return successResponse_('Progress submitted for review.', {
      updateId: updateRecord['Update ID']
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to submit progress.');
  }
}
