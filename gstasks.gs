var TASK_ACCESS_ROLES = ['Administrator', 'Manager', 'Supervisor', 'Team Leader'];

function listTasks(sessionToken, options) {
  try {
    var authContext = requireSession_(sessionToken, TASK_ACCESS_ROLES, 'tasks');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var priorityFilter = normalizeString_(filters.priority).toLowerCase();
    var departmentFilter = normalizeString_(filters.department).toLowerCase();
    var recordStatusFilter = normalizeString_(filters.recordStatus).toLowerCase() || 'active';
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var tasks = applyTaskScopeForUser_(readSheetRecords_('TASKS'), authContext.user)
      .filter(function (record) {
        var recordStatus = normalizeString_(record['Record Status'] || 'Active').toLowerCase();
        var status = normalizeString_(record.Status).toLowerCase();
        var priority = normalizeString_(record.Priority).toLowerCase();
        var department = normalizeString_(record.Department).toLowerCase();
        var searchableText = [
          record['Task ID'],
          record['Task Title'],
          record['Task Description'],
          record.Department,
          record.Priority,
          record.Status,
          record['Primary Assignee Name']
        ]
          .join(' ')
          .toLowerCase();

        if (recordStatusFilter && recordStatus !== recordStatusFilter) {
          return false;
        }
        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (priorityFilter && priority !== priorityFilter) {
          return false;
        }
        if (departmentFilter && department !== departmentFilter) {
          return false;
        }
        if (query && searchableText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapTaskForResponse_)
      .sort(function (a, b) {
        return new Date(b.updatedTimestamp || 0).getTime() - new Date(a.updatedTimestamp || 0).getTime();
      });

    return successResponse_('Tasks loaded successfully.', buildPagedResult_(tasks, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load tasks.');
  }
}

function getTaskFormMetadata(sessionToken) {
  try {
    requireSession_(sessionToken, TASK_ACCESS_ROLES, 'tasks');
    var dimensions = getDimensionValuesMap_();
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

    return successResponse_('Task form metadata loaded.', {
      priorities: dimensions.Priorities || [],
      statuses: dimensions['Task Statuses'] || [],
      categories: dimensions['Task Categories'] || [],
      taskTypes: dimensions['Task Types'] || [],
      departments: departments
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load task form metadata.');
  }
}

function createTask(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, TASK_ACCESS_ROLES, 'tasks');
    var schema = resolveSchema_('TASKS');
    var sheet = getSheetBySchema_(schema);
    var input = payload || {};
    var now = new Date();

    validateTaskInput_(input);
    var departmentName = resolveDepartmentName_(input.department);
    var taskId = generateSequenceId_('TSK');
    var startDate = safeDateFromInput_(input.startDate, 'Start Date');
    var dueDate = safeDateFromInput_(input.dueDate, 'Due Date');
    var progress = normalizeNumber_(input.progress, 0);
    var estimatedHours = normalizeNumber_(input.estimatedHours, 0);
    var actualHours = normalizeNumber_(input.actualHours, 0);
    validateTaskDates_(startDate, dueDate);
    validateTaskNumbers_(progress, estimatedHours, actualHours);
    validateTaskDimensionValues_(input);

    var normalizedStatus = normalizeString_(input.status || 'Assigned');
    if (progress >= 100) {
      normalizedStatus = 'Completed';
    }

    var record = {
      'Task ID': taskId,
      'Parent Task ID': normalizeString_(input.parentTaskId),
      'Task Title': normalizeString_(input.taskTitle),
      'Task Description': normalizeString_(input.taskDescription),
      Department: departmentName,
      Section: normalizeString_(input.section),
      Team: normalizeString_(input.team),
      'Task Category': normalizeString_(input.taskCategory),
      'Task Type': normalizeString_(input.taskType),
      Priority: normalizeString_(input.priority || 'Medium'),
      Status: normalizedStatus,
      'Progress %': progress,
      'Created Date': now,
      'Created By': authContext.user.userId,
      'Assigned Date': now,
      'Start Date': startDate,
      'Due Date': dueDate,
      'Completed Date': progress >= 100 ? now : null,
      'Estimated Hours': estimatedHours,
      'Actual Hours': actualHours,
      'Assigned By': authContext.user.userId,
      'Primary Assignee': normalizeString_(input.primaryAssignee),
      'Primary Assignee Name': normalizeString_(input.primaryAssigneeName),
      'Supervisor ID': normalizeString_(input.supervisorId),
      'Supervisor Name': normalizeString_(input.supervisorName),
      'Number of Assignees': normalizeString_(input.primaryAssignee) ? 1 : 0,
      'Delay Reason': normalizeString_(input.delayReason),
      Blocker: normalizeString_(input.blocker),
      'Blocker Description': normalizeString_(input.blockerDescription),
      'Completion Notes': normalizeString_(input.completionNotes),
      'Supervisor Review Status': 'Pending',
      'Supervisor Review Date': null,
      'Supervisor Review By': '',
      'Management Review Status': '',
      'Management Review Date': null,
      'Task Score': '',
      'Is Overdue': false,
      'Days Remaining': '',
      'Days Overdue': '',
      'Created Timestamp': now,
      'Updated Timestamp': now,
      'Updated By': authContext.user.userId,
      'Record Status': 'Active'
    };

    applyTaskDerivedFields_(record);
    appendSheetRecord_(sheet, schema.columns, record);

    writeAuditLog_(
      authContext.user,
      'CREATE',
      'Tasks',
      taskId,
      'Created a task.',
      '',
      mapTaskForResponse_(record)
    );

    return successResponse_('Task created successfully.', {
      taskId: taskId
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to create task.');
  }
}

function updateTask(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, TASK_ACCESS_ROLES, 'tasks');
    var schema = resolveSchema_('TASKS');
    var sheet = getSheetBySchema_(schema);
    var input = payload || {};
    var taskId = normalizeString_(input.taskId);
    if (!taskId) {
      throw new Error('taskId is required.');
    }

    var tasks = readSheetRecords_(schema);
    var currentRecord = tasks.find(function (record) {
      return normalizeString_(record['Task ID']) === taskId;
    });
    if (!currentRecord) {
      throw new Error('Task was not found.');
    }
    if (normalizeString_(currentRecord['Record Status']).toLowerCase() === 'archived') {
      throw new Error('Archived tasks must be reopened before editing.');
    }

    validateTaskInput_(input, true);
    validateTaskDimensionValues_(input, true);
    var updated = Object.assign({}, currentRecord);
    var previous = mapTaskForResponse_(currentRecord);

    var departmentInput = normalizeString_(input.department);
    if (departmentInput) {
      updated.Department = resolveDepartmentName_(departmentInput);
    }

    var startDate = input.startDate ? safeDateFromInput_(input.startDate, 'Start Date') : updated['Start Date'];
    var dueDate = input.dueDate ? safeDateFromInput_(input.dueDate, 'Due Date') : updated['Due Date'];
    validateTaskDates_(startDate, dueDate);

    var progress = input.progress !== undefined && input.progress !== null ? normalizeNumber_(input.progress, 0) : normalizeNumber_(updated['Progress %'], 0);
    var estimatedHours =
      input.estimatedHours !== undefined && input.estimatedHours !== null
        ? normalizeNumber_(input.estimatedHours, 0)
        : normalizeNumber_(updated['Estimated Hours'], 0);
    var actualHours =
      input.actualHours !== undefined && input.actualHours !== null
        ? normalizeNumber_(input.actualHours, 0)
        : normalizeNumber_(updated['Actual Hours'], 0);
    validateTaskNumbers_(progress, estimatedHours, actualHours);

    if (input.taskTitle !== undefined) {
      updated['Task Title'] = normalizeString_(input.taskTitle);
    }
    if (input.taskDescription !== undefined) {
      updated['Task Description'] = normalizeString_(input.taskDescription);
    }
    if (input.section !== undefined) {
      updated.Section = normalizeString_(input.section);
    }
    if (input.team !== undefined) {
      updated.Team = normalizeString_(input.team);
    }
    if (input.taskCategory !== undefined) {
      updated['Task Category'] = normalizeString_(input.taskCategory);
    }
    if (input.taskType !== undefined) {
      updated['Task Type'] = normalizeString_(input.taskType);
    }
    if (input.priority !== undefined) {
      updated.Priority = normalizeString_(input.priority);
    }
    if (input.status !== undefined) {
      updated.Status = normalizeString_(input.status);
    }
    if (input.primaryAssignee !== undefined) {
      updated['Primary Assignee'] = normalizeString_(input.primaryAssignee);
    }
    if (input.primaryAssigneeName !== undefined) {
      updated['Primary Assignee Name'] = normalizeString_(input.primaryAssigneeName);
    }
    if (input.supervisorId !== undefined) {
      updated['Supervisor ID'] = normalizeString_(input.supervisorId);
    }
    if (input.supervisorName !== undefined) {
      updated['Supervisor Name'] = normalizeString_(input.supervisorName);
    }
    if (input.delayReason !== undefined) {
      updated['Delay Reason'] = normalizeString_(input.delayReason);
    }
    if (input.blocker !== undefined) {
      updated.Blocker = normalizeString_(input.blocker);
    }
    if (input.blockerDescription !== undefined) {
      updated['Blocker Description'] = normalizeString_(input.blockerDescription);
    }
    if (input.completionNotes !== undefined) {
      updated['Completion Notes'] = normalizeString_(input.completionNotes);
    }
    if (input.parentTaskId !== undefined) {
      updated['Parent Task ID'] = normalizeString_(input.parentTaskId);
    }

    updated['Start Date'] = startDate;
    updated['Due Date'] = dueDate;
    updated['Progress %'] = progress;
    updated['Estimated Hours'] = estimatedHours;
    updated['Actual Hours'] = actualHours;
    updated['Number of Assignees'] = normalizeString_(updated['Primary Assignee']) ? 1 : 0;
    updated['Updated Timestamp'] = new Date();
    updated['Updated By'] = authContext.user.userId;

    if (normalizeString_(updated.Status).toLowerCase() === 'completed' || progress >= 100) {
      updated.Status = 'Completed';
      updated['Completed Date'] = updated['Completed Date'] || new Date();
    } else if (
      normalizeString_(updated.Status).toLowerCase() !== 'completed' &&
      normalizeString_(currentRecord.Status).toLowerCase() === 'completed'
    ) {
      updated['Completed Date'] = null;
    }

    applyTaskDerivedFields_(updated);
    updateSheetRecordByRow_(sheet, currentRecord.__rowNumber, schema.columns, updated);

    writeAuditLog_(
      authContext.user,
      'UPDATE',
      'Tasks',
      taskId,
      'Updated task details.',
      previous,
      mapTaskForResponse_(updated)
    );

    return successResponse_('Task updated successfully.', {
      taskId: taskId
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update task.');
  }
}

function archiveTask(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, TASK_ACCESS_ROLES, 'tasks');
    var taskId = normalizeString_(payload && payload.taskId);
    if (!taskId) {
      throw new Error('taskId is required.');
    }
    return setTaskRecordStatus_(authContext.user, taskId, 'Archived', 'Archived', 'ARCHIVE');
  } catch (error) {
    return errorResponse_(error.message || 'Failed to archive task.');
  }
}

function reopenTask(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, TASK_ACCESS_ROLES, 'tasks');
    var taskId = normalizeString_(payload && payload.taskId);
    if (!taskId) {
      throw new Error('taskId is required.');
    }
    return setTaskRecordStatus_(authContext.user, taskId, 'Active', 'Assigned', 'REOPEN');
  } catch (error) {
    return errorResponse_(error.message || 'Failed to reopen task.');
  }
}

function setTaskRecordStatus_(actor, taskId, recordStatus, taskStatus, auditAction) {
  var schema = resolveSchema_('TASKS');
  var sheet = getSheetBySchema_(schema);
  var tasks = readSheetRecords_(schema);
  var target = tasks.find(function (record) {
    return normalizeString_(record['Task ID']) === taskId;
  });
  if (!target) {
    throw new Error('Task was not found.');
  }

  var previous = mapTaskForResponse_(target);
  var updated = Object.assign({}, target);
  updated['Record Status'] = recordStatus;
  updated.Status = taskStatus;
  updated['Updated Timestamp'] = new Date();
  updated['Updated By'] = actor.userId;
  if (recordStatus === 'Archived') {
    updated['Completed Date'] = updated['Completed Date'] || new Date();
  }
  applyTaskDerivedFields_(updated);
  updateSheetRecordByRow_(sheet, target.__rowNumber, schema.columns, updated);

  writeAuditLog_(
    actor,
    auditAction,
    'Tasks',
    taskId,
    auditAction === 'ARCHIVE' ? 'Archived task.' : 'Reopened task.',
    previous,
    mapTaskForResponse_(updated)
  );

  return successResponse_(
    auditAction === 'ARCHIVE' ? 'Task archived successfully.' : 'Task reopened successfully.',
    {
      taskId: taskId,
      recordStatus: recordStatus
    }
  );
}

function getDashboardSummary(sessionToken) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
      'dashboard'
    );
    var scopedTasks = applyTaskScopeForUser_(readSheetRecords_('TASKS'), authContext.user);
    var activeTasks = scopedTasks.filter(function (record) {
      return normalizeString_(record['Record Status'] || 'Active').toLowerCase() !== 'archived';
    });

    var summary = {
      totalTasks: scopedTasks.length,
      assignedTasks: 0,
      inProgressTasks: 0,
      completedTasks: 0,
      overdueTasks: 0,
      archivedTasks: scopedTasks.length - activeTasks.length
    };

    activeTasks.forEach(function (record) {
      var status = normalizeString_(record.Status).toLowerCase();
      if (status === 'assigned') {
        summary.assignedTasks += 1;
      }
      if (status === 'in progress') {
        summary.inProgressTasks += 1;
      }
      if (status === 'completed') {
        summary.completedTasks += 1;
      }
      if (String(record['Is Overdue']).toLowerCase() === 'true') {
        summary.overdueTasks += 1;
      }
    });

    return successResponse_('Dashboard summary loaded.', summary);
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load dashboard summary.');
  }
}

function validateTaskInput_(input, isUpdate) {
  var updating = Boolean(isUpdate);
  if (!updating || input.taskTitle !== undefined) {
    if (!normalizeString_(input.taskTitle)) {
      throw new Error('Task title is required.');
    }
  }
  if (!updating || input.department !== undefined) {
    if (!normalizeString_(input.department)) {
      throw new Error('Department is required.');
    }
  }
  if (!updating || input.priority !== undefined) {
    if (!normalizeString_(input.priority)) {
      throw new Error('Priority is required.');
    }
  }
  if (!updating || input.status !== undefined) {
    if (!normalizeString_(input.status)) {
      throw new Error('Status is required.');
    }
  }
}

function validateTaskDimensionValues_(input, isUpdate) {
  var updating = Boolean(isUpdate);
  if (!updating || input.priority !== undefined) {
    var allowedPriorities = getDimensionValues_('Priorities');
    if (
      allowedPriorities.length > 0 &&
      allowedPriorities.indexOf(normalizeString_(input.priority)) === -1
    ) {
      throw new Error('Priority must match an active Dimensions value.');
    }
  }

  if (!updating || input.status !== undefined) {
    var allowedStatuses = getDimensionValues_('Task Statuses');
    if (
      allowedStatuses.length > 0 &&
      allowedStatuses.indexOf(normalizeString_(input.status)) === -1
    ) {
      throw new Error('Status must match an active Dimensions value.');
    }
  }

  if (input.taskCategory !== undefined && normalizeString_(input.taskCategory)) {
    var allowedCategories = getDimensionValues_('Task Categories');
    if (
      allowedCategories.length > 0 &&
      allowedCategories.indexOf(normalizeString_(input.taskCategory)) === -1
    ) {
      throw new Error('Task category must match an active Dimensions value.');
    }
  }

  if (input.taskType !== undefined && normalizeString_(input.taskType)) {
    var allowedTaskTypes = getDimensionValues_('Task Types');
    if (
      allowedTaskTypes.length > 0 &&
      allowedTaskTypes.indexOf(normalizeString_(input.taskType)) === -1
    ) {
      throw new Error('Task type must match an active Dimensions value.');
    }
  }
}

function validateTaskDates_(startDate, dueDate) {
  if (!(startDate instanceof Date) || !(dueDate instanceof Date)) {
    throw new Error('Start date and due date are required.');
  }
  if (dueDate.getTime() < startDate.getTime()) {
    throw new Error('Due date cannot be earlier than start date.');
  }
}

function validateTaskNumbers_(progress, estimatedHours, actualHours) {
  if (progress < 0 || progress > 100) {
    throw new Error('Progress must be between 0 and 100.');
  }
  if (estimatedHours < 0 || actualHours < 0) {
    throw new Error('Estimated and actual hours cannot be negative.');
  }
}

function resolveDepartmentName_(departmentValue) {
  var rawValue = normalizeString_(departmentValue);
  var departments = readSheetRecords_('DEPARTMENTS').filter(function (record) {
    return normalizeString_(record.Status).toLowerCase() === 'active';
  });

  var byId = departments.find(function (record) {
    return normalizeString_(record['Department ID']) === rawValue;
  });
  if (byId) {
    return normalizeString_(byId['Department Name']);
  }

  var byName = departments.find(function (record) {
    return normalizeString_(record['Department Name']).toLowerCase() === rawValue.toLowerCase();
  });
  if (byName) {
    return normalizeString_(byName['Department Name']);
  }

  throw new Error('Department must reference an active department record.');
}

function applyTaskDerivedFields_(record) {
  var dueDate = safeDateFromInput_(record['Due Date'], 'Due Date');
  var today = new Date();
  var oneDayMilliseconds = 24 * 60 * 60 * 1000;
  var daysDifference = Math.floor(
    (new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime() -
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) /
      oneDayMilliseconds
  );
  var recordStatus = normalizeString_(record['Record Status'] || 'Active').toLowerCase();
  var status = normalizeString_(record.Status).toLowerCase();
  var isCompleted = status === 'completed' || normalizeNumber_(record['Progress %'], 0) >= 100;
  var isOverdue = daysDifference < 0 && !isCompleted && recordStatus !== 'archived';

  record['Is Overdue'] = isOverdue;
  record['Days Remaining'] = daysDifference >= 0 ? daysDifference : '';
  record['Days Overdue'] = daysDifference < 0 ? Math.abs(daysDifference) : '';
}

function mapTaskForResponse_(record) {
  return {
    taskId: normalizeString_(record['Task ID']),
    parentTaskId: normalizeString_(record['Parent Task ID']),
    taskTitle: normalizeString_(record['Task Title']),
    taskDescription: normalizeString_(record['Task Description']),
    department: normalizeString_(record.Department),
    section: normalizeString_(record.Section),
    team: normalizeString_(record.Team),
    taskCategory: normalizeString_(record['Task Category']),
    taskType: normalizeString_(record['Task Type']),
    priority: normalizeString_(record.Priority),
    status: normalizeString_(record.Status),
    progress: normalizeNumber_(record['Progress %'], 0),
    startDate: toClientDate_(record['Start Date']),
    dueDate: toClientDate_(record['Due Date']),
    completedDate: toClientDate_(record['Completed Date']),
    estimatedHours: normalizeNumber_(record['Estimated Hours'], 0),
    actualHours: normalizeNumber_(record['Actual Hours'], 0),
    primaryAssignee: normalizeString_(record['Primary Assignee']),
    primaryAssigneeName: normalizeString_(record['Primary Assignee Name']),
    supervisorId: normalizeString_(record['Supervisor ID']),
    supervisorName: normalizeString_(record['Supervisor Name']),
    blocker: normalizeString_(record.Blocker),
    blockerDescription: normalizeString_(record['Blocker Description']),
    delayReason: normalizeString_(record['Delay Reason']),
    completionNotes: normalizeString_(record['Completion Notes']),
    recordStatus: normalizeString_(record['Record Status'] || 'Active'),
    isOverdue: String(record['Is Overdue']).toLowerCase() === 'true',
    daysRemaining: normalizeString_(record['Days Remaining']),
    daysOverdue: normalizeString_(record['Days Overdue']),
    updatedTimestamp: toClientDate_(record['Updated Timestamp'])
  };
}

function applyTaskScopeForUser_(taskRecords, user) {
  var safeRecords = Array.isArray(taskRecords) ? taskRecords : [];
  if (!user) {
    return [];
  }
  var role = normalizeString_(user.role);
  if (role === 'Employee') {
    return safeRecords.filter(function (record) {
      return (
        normalizeString_(record['Primary Assignee']) === normalizeString_(user.employeeId) ||
        normalizeString_(record['Created By']) === normalizeString_(user.userId)
      );
    });
  }
  return safeRecords;
}
