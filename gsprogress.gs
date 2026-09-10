function listProgressUpdates(sessionToken, options) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
      'progress'
    );
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var reviewFilter = normalizeString_(filters.review).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var employeeId = normalizeString_(authContext.user.employeeId);
    var isEmployeeOnly = authContext.user.role === 'Employee';

    var items = readSheetRecords_('TASK_UPDATES')
      .filter(function (record) {
        if (isEmployeeOnly && employeeId && normalizeString_(record['Employee ID']) !== employeeId) {
          return false;
        }
        var review = normalizeString_(record['Supervisor Review']).toLowerCase();
        var searchText = [
          record['Update ID'],
          record['Task ID'],
          record['Employee Name'],
          record.Status
        ]
          .join(' ')
          .toLowerCase();
        if (reviewFilter && review !== reviewFilter) {
          return false;
        }
        if (query && searchText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapProgressForResponse_)
      .sort(function (a, b) {
        return new Date(b.createdTimestamp || 0).getTime() - new Date(a.createdTimestamp || 0).getTime();
      });

    return successResponse_('Progress updates loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load progress updates.');
  }
}

function createProgressUpdate(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'],
      'progress'
    );
    var input = payload || {};
    var taskId = normalizeString_(input.taskId);
    var progress = normalizeNumber_(input.progress, 0);
    if (!taskId) {
      throw new Error('Task ID is required.');
    }
    if (progress < 0 || progress > 100) {
      throw new Error('Progress must be between 0 and 100.');
    }
    var employeeId = normalizeString_(input.employeeId || authContext.user.employeeId);
    if (!employeeId) {
      throw new Error('Employee ID is required for a progress update.');
    }
    var task = findTaskRecord_(taskId);
    if (!task) {
      throw new Error('Task was not found.');
    }
    var assignment = safeReadSheetRecords_('TASK_ASSIGNMENTS').find(function (record) {
      return (
        normalizeString_(record['Task ID']) === taskId &&
        normalizeString_(record['Employee ID']) === employeeId &&
        ['rejected', 'reassigned', 'cancelled'].indexOf(normalizeString_(record['Assignment Status']).toLowerCase()) === -1
      );
    });
    if (assignment) {
      return submitMyProgress(sessionToken, {
        assignmentId: assignment['Assignment ID'],
        progress: progress,
        status: input.status,
        hoursWorked: input.hoursWorked,
        workCompleted: input.workCompleted,
        workRemaining: input.workRemaining,
        challenges: input.challenges,
        blockers: input.blockers,
        nextAction: input.nextAction,
        remarks: input.remarks
      });
    }
    throw new Error('No active assignment was found for this task and employee.');
  } catch (error) {
    return errorResponse_(error.message || 'Failed to submit progress update.');
  }
}

function reviewProgressUpdate(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader'],
      'progress'
    );
    var updateId = normalizeString_(payload && payload.updateId);
    var decision = normalizeString_(payload && payload.decision);
    var comment = normalizeString_(payload && payload.comment);
    if (!updateId || !decision) {
      throw new Error('updateId and decision are required.');
    }
    var normalizedDecision = decision.toLowerCase();
    if (normalizedDecision !== 'approved' && normalizedDecision !== 'rejected') {
      throw new Error('Decision must be Approved or Rejected.');
    }

    var schema = resolveSchema_('TASK_UPDATES');
    var sheet = getSheetBySchema_(schema);
    var records = readSheetRecords_(schema);
    var current = records.find(function (record) {
      return normalizeString_(record['Update ID']) === updateId;
    });
    if (!current) {
      throw new Error('Progress update was not found.');
    }

    var updated = Object.assign({}, current);
    updated['Supervisor Review'] = normalizedDecision === 'approved' ? 'Approved' : 'Rejected';
    updated['Supervisor Comment'] = comment;
    updated['Supervisor Review Date'] = new Date();
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);

    if (normalizedDecision === 'approved') {
      refreshTaskAssigneeSummary_(current['Task ID']);
    }

    var targetUser = findUserByEmployeeId_(current['Employee ID']);
    createNotification_(
      targetUser ? targetUser['User ID'] : '',
      current['Employee ID'],
      'Progress Review',
      'Progress ' + updated['Supervisor Review'].toLowerCase(),
      'Your progress update on ' + current['Task ID'] + ' was ' + updated['Supervisor Review'].toLowerCase() + '.',
      current['Task ID'],
      'Medium'
    );

    writeTaskHistory_(
      authContext.user,
      current['Task ID'],
      'REVIEW',
      'Supervisor Review',
      current['Supervisor Review'],
      updated['Supervisor Review'],
      comment
    );
    writeAuditLog_(
      authContext.user,
      'REVIEW',
      'Progress',
      updateId,
      'Reviewed progress update.',
      current['Supervisor Review'],
      updated['Supervisor Review']
    );

    return successResponse_('Review saved.', {
      update: mapProgressForResponse_(updated)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to review progress update.');
  }
}

function mapProgressForResponse_(record) {
  return {
    updateId: normalizeString_(record['Update ID']),
    taskId: normalizeString_(record['Task ID']),
    employeeId: normalizeString_(record['Employee ID']),
    employeeName: normalizeString_(record['Employee Name']),
    progress: normalizeNumber_(record['Progress %'], 0),
    previousProgress: normalizeNumber_(record['Previous Progress %'], 0),
    status: normalizeString_(record.Status),
    workCompleted: normalizeString_(record['Work Completed']),
    workRemaining: normalizeString_(record['Work Remaining']),
    challenges: normalizeString_(record.Challenges),
    blockers: normalizeString_(record.Blockers),
    nextAction: normalizeString_(record['Next Action']),
    hoursWorked: normalizeNumber_(record['Hours Worked'], 0),
    remarks: normalizeString_(record['Employee Remarks']),
    supervisorReview: normalizeString_(record['Supervisor Review'] || 'Pending'),
    supervisorComment: normalizeString_(record['Supervisor Comment']),
    updateDate: toClientDate_(record['Update Date']),
    createdTimestamp: toClientDate_(record['Created Timestamp'])
  };
}
