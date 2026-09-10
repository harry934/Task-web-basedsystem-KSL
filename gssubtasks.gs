function ensureTaskSubtasksSchema_() {
  var schema = resolveSchema_('TASK_SUBTASKS');
  ensureSheetSchema_(getDatabaseSpreadsheet_(), schema);
  return schema;
}

function getSubtasksForTask_(taskId) {
  var id = normalizeString_(taskId);
  if (!id) {
    return [];
  }
  try {
    ensureTaskSubtasksSchema_();
    return readSheetRecords_('TASK_SUBTASKS').filter(function (record) {
      return (
        normalizeString_(record['Task ID']) === id &&
        normalizeString_(record['Record Status'] || 'Active').toLowerCase() !== 'removed'
      );
    });
  } catch (error) {
    return [];
  }
}

function mapSubtask_(record) {
  return {
    subtaskId: normalizeString_(record['Subtask ID']),
    taskId: normalizeString_(record['Task ID']),
    title: normalizeString_(record.Title),
    status: normalizeString_(record.Status || 'Pending'),
    assignedStaffId: normalizeString_(record['Assigned Staff ID']),
    assignedStaffName: normalizeString_(record['Assigned Staff Name']),
    summary: normalizeString_(record.Summary),
    fileName: normalizeString_(record['File Name']),
    fileUrl: normalizeString_(record['File URL']),
    fileSize: normalizeNumber_(record['File Size'], 0),
    completedDate: toClientDate_(record['Completed Date']),
    recordStatus: normalizeString_(record['Record Status'] || 'Active')
  };
}

function findStaffPerson_(staffId) {
  var id = normalizeString_(staffId);
  if (!id) {
    return null;
  }
  return getAssignablePeople_().find(function (person) {
    return normalizeString_(person.employeeId) === id;
  }) || null;
}

function recalculateTaskProgressFromSubtasks_(taskId, user) {
  var task = findTaskRecord_(taskId);
  if (!task) {
    return 0;
  }
  var subtasks = getSubtasksForTask_(taskId);
  var total = subtasks.length;
  var completed = subtasks.filter(function (record) {
    return normalizeString_(record.Status).toLowerCase() === 'completed';
  }).length;
  var progress = total ? Math.round((completed / total) * 100) : 0;
  var schema = resolveSchema_('TASKS');
  var sheet = getSheetBySchema_(schema);
  var updated = Object.assign({}, task);
  updated['Progress %'] = progress;
  if (progress >= 100) {
    updated.Status = 'Completed';
    updated['Completed Date'] = updated['Completed Date'] || new Date();
  } else if (progress > 0 && normalizeString_(updated.Status).toLowerCase() === 'completed') {
    updated.Status = 'In Progress';
    updated['Completed Date'] = '';
  } else if (progress > 0 && normalizeString_(updated.Status).toLowerCase() !== 'blocked') {
    updated.Status = 'In Progress';
  }
  updated['Updated Timestamp'] = new Date();
  if (user && user.userId) {
    updated['Updated By'] = user.userId;
  }
  applyTaskDerivedFields_(updated);
  updateSheetRecordByRow_(sheet, task.__rowNumber, schema.columns, updated);
  return progress;
}

function replaceTaskSubtasks_(taskId, subtasks, user) {
  var schema = ensureTaskSubtasksSchema_();
  var sheet = getSheetBySchema_(schema);
  var existing = readSheetRecords_(schema).filter(function (record) {
    return normalizeString_(record['Task ID']) === normalizeString_(taskId);
  });
  var keepIds = {};
  var now = new Date();
  (subtasks || []).forEach(function (item, index) {
    var title = normalizeString_(item && item.title);
    if (!title) {
      return;
    }
    var assignedId = normalizeString_(item.assignedStaffId || item.employeeId);
    var person = findStaffPerson_(assignedId);
    var subtaskId = normalizeString_(item.subtaskId) || generateSequenceIdUnlocked_('SUB');
    keepIds[subtaskId] = true;
    var current = existing.find(function (record) {
      return normalizeString_(record['Subtask ID']) === subtaskId;
    });
    var record = current ? Object.assign({}, current) : {
      'Subtask ID': subtaskId,
      'Task ID': normalizeString_(taskId),
      Status: 'Pending',
      Summary: '',
      'File Name': '',
      'File URL': '',
      'File ID': '',
      'MIME Type': '',
      'File Size': 0,
      'Completed Date': '',
      'Created Date': now,
      'Created By': user && user.userId ? user.userId : '',
      'Record Status': 'Active'
    };
    record.Title = title;
    record['Assigned Staff ID'] = assignedId;
    record['Assigned Staff Name'] = person ? person.fullName : normalizeString_(item.assignedStaffName);
    record['Updated Date'] = now;
    record['Updated By'] = user && user.userId ? user.userId : '';
    record['Record Status'] = 'Active';
    if (current) {
      updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, record);
    } else {
      appendSheetRecord_(sheet, schema.columns, record);
    }
  });
  existing.forEach(function (record) {
    var id = normalizeString_(record['Subtask ID']);
    if (keepIds[id]) {
      return;
    }
    if (normalizeString_(record.Status).toLowerCase() === 'completed') {
      return;
    }
    var updated = Object.assign({}, record);
    updated['Record Status'] = 'Removed';
    updated['Updated Date'] = now;
    updateSheetRecordByRow_(sheet, record.__rowNumber, schema.columns, updated);
  });
}

function listTaskSubtasks(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, [
      'Administrator',
      'Manager',
      'Supervisor',
      'Team Leader',
      'Employee',
      'Staff'
    ]);
    var taskId = normalizeString_(payload && payload.taskId);
    if (!taskId) {
      throw new Error('taskId is required.');
    }
    assertTaskVisible_(authContext.user, taskId);
    return successResponse_('Subtasks loaded.', {
      items: getSubtasksForTask_(taskId).map(mapSubtask_),
      progress: recalculateTaskProgressFromSubtasks_(taskId, authContext.user)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load subtasks.');
  }
}

function saveTaskSubtasks(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
      'tasks'
    );
    var input = payload || {};
    var taskId = normalizeString_(input.taskId);
    if (!taskId) {
      throw new Error('taskId is required.');
    }
    if (!findTaskRecord_(taskId)) {
      throw new Error('Task was not found.');
    }
    return withScriptLock_(function () {
      replaceTaskSubtasks_(taskId, input.subtasks || [], authContext.user);
      var progress = recalculateTaskProgressFromSubtasks_(taskId, authContext.user);
      writeAuditLog_(authContext.user, 'UPDATE', 'TaskSubtasks', taskId, 'Saved task subtasks.', '', progress);
      return successResponse_('Subtasks saved.', {
        progress: progress,
        items: getSubtasksForTask_(taskId).map(mapSubtask_)
      });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to save subtasks.');
  }
}

function completeSubtask(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'mytasks'
    );
    var input = payload || {};
    var subtaskId = normalizeString_(input.subtaskId);
    var summary = normalizeString_(input.summary);
    var fileName = normalizeString_(input.fileName);
    if (!subtaskId) {
      throw new Error('subtaskId is required.');
    }
    if (!summary) {
      throw new Error('A short summary is required.');
    }
    if (!fileName || !input.base64) {
      throw new Error('A PDF file is required to complete this subtask.');
    }
    var mimeType = normalizeString_(input.mimeType || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !/\.pdf$/i.test(fileName)) {
      throw new Error('Only PDF files are allowed.');
    }
    var bytes = Utilities.base64Decode(String(input.base64));
    if (!bytes || bytes.length < 1024) {
      throw new Error('The PDF is too small or empty.');
    }
    var maxMb = Math.max(1, normalizeNumber_(getSettingValue_('MAX_SUBTASK_PDF_MB', 2), 2));
    var attachmentCap = normalizeNumber_(getSettingValue_('MAX_ATTACHMENT_MB', maxMb), maxMb);
    if (attachmentCap > 0) {
      maxMb = Math.min(maxMb, attachmentCap);
    }
    if (bytes.length > maxMb * 1024 * 1024) {
      throw new Error('The PDF must be ' + maxMb + ' MB or smaller.');
    }

    return withScriptLock_(function () {
      var schema = ensureTaskSubtasksSchema_();
      var sheet = getSheetBySchema_(schema);
      var current = readSheetRecords_(schema).find(function (record) {
        return normalizeString_(record['Subtask ID']) === subtaskId;
      });
      if (!current || normalizeString_(current['Record Status'] || 'Active').toLowerCase() === 'removed') {
        throw new Error('Subtask was not found.');
      }
      var staffId = getCurrentEmployeeId_(authContext.user);
      if (
        isStaffLikeRole_(authContext.user.role) &&
        staffId &&
        normalizeString_(current['Assigned Staff ID']) &&
        normalizeString_(current['Assigned Staff ID']) !== staffId
      ) {
        throw new Error('You can only complete subtasks assigned to you.');
      }
      var folder = getAttachmentsFolder_();
      var blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
      var file = folder.createFile(blob);
      var updated = Object.assign({}, current);
      updated.Status = 'Completed';
      updated.Summary = summary;
      updated['File Name'] = fileName;
      updated['File URL'] = file.getUrl();
      updated['File ID'] = file.getId();
      updated['MIME Type'] = 'application/pdf';
      updated['File Size'] = bytes.length;
      updated['Completed Date'] = new Date();
      updated['Updated Date'] = new Date();
      updated['Updated By'] = authContext.user.userId;
      updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
      var progress = recalculateTaskProgressFromSubtasks_(current['Task ID'], authContext.user);
      writeTaskHistory_(
        authContext.user,
        current['Task ID'],
        'SUBTASK',
        'Subtask',
        'Pending',
        'Completed',
        titleOrId_(updated)
      );
      writeAuditLog_(
        authContext.user,
        'COMPLETE',
        'TaskSubtasks',
        subtaskId,
        'Completed a subtask with PDF evidence.',
        '',
        fileName
      );
      return successResponse_('Subtask completed.', {
        subtask: mapSubtask_(updated),
        progress: progress
      });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to complete subtask.');
  }
}

function titleOrId_(record) {
  return normalizeString_(record.Title) || normalizeString_(record['Subtask ID']);
}

function searchStaffWork(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor']);
    var query = normalizeString_(payload && payload.query).toLowerCase();
    if (query.length < 2) {
      return successResponse_('Enter at least 2 characters to search staff.', { staff: null, tasks: [] });
    }
    var people = getAssignablePeople_().filter(function (person) {
      var haystack = [
        person.fullName,
        person.employeeId,
        person.username,
        person.email,
        person.department
      ]
        .join(' ')
        .toLowerCase();
      return haystack.indexOf(query) > -1;
    });
    if (!people.length) {
      return successResponse_('No matching staff found.', { staff: null, tasks: [] });
    }
    var staff =
      people.find(function (person) {
        return (
          normalizeString_(person.employeeId).toLowerCase() === query ||
          normalizeString_(person.username).toLowerCase() === query ||
          normalizeString_(person.fullName).toLowerCase() === query
        );
      }) || people[0];
    var staffId = normalizeString_(staff.employeeId);
    var scopedTasks = applyTaskScopeForUser_(safeReadSheetRecords_('TASKS'), authContext.user);
    var assignmentTaskIds = {};
    safeReadSheetRecords_('TASK_ASSIGNMENTS').forEach(function (record) {
      if (normalizeString_(record['Employee ID']) === staffId) {
        assignmentTaskIds[normalizeString_(record['Task ID'])] = true;
      }
    });
    var tasks = scopedTasks
      .filter(function (record) {
        if (normalizeString_(record['Record Status'] || 'Active').toLowerCase() === 'archived') {
          return false;
        }
        return (
          normalizeString_(record['Primary Assignee']) === staffId ||
          assignmentTaskIds[normalizeString_(record['Task ID'])]
        );
      })
      .map(function (record) {
        var mapped = mapTaskForResponse_(record);
        mapped.subtasks = getSubtasksForTask_(record['Task ID']).map(mapSubtask_);
        mapped.progress = mapped.subtasks.length
          ? Math.round(
              (mapped.subtasks.filter(function (item) {
                return String(item.status).toLowerCase() === 'completed';
              }).length /
                mapped.subtasks.length) *
                100
            )
          : normalizeNumber_(record['Progress %'], 0);
        return mapped;
      });
    return successResponse_('Staff work loaded.', {
      staff: {
        staffId: staff.employeeId,
        fullName: staff.fullName,
        department: staff.department,
        jobTitle: staff.jobTitle,
        username: staff.username || ''
      },
      tasks: tasks
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to search staff work.');
  }
}
