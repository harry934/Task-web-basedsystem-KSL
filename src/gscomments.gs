function listTaskCollaboration(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      payload && payload.page ? payload.page : 'tasks'
    );
    var taskId = normalizeString_(payload && payload.taskId);
    if (!taskId) {
      throw new Error('taskId is required.');
    }
    assertTaskVisible_(authContext.user, taskId);
    return successResponse_('Task collaboration loaded.', {
      comments: safeReadSheetRecords_('TASK_COMMENTS')
        .filter(function (record) {
          return normalizeString_(record['Task ID']) === taskId;
        })
        .map(mapComment_)
        .sort(function (a, b) {
          return new Date(a.createdTimestamp || 0).getTime() - new Date(b.createdTimestamp || 0).getTime();
        }),
      attachments: safeReadSheetRecords_('TASK_ATTACHMENTS')
        .filter(function (record) {
          return normalizeString_(record['Task ID']) === taskId && normalizeString_(record.Status).toLowerCase() !== 'removed';
        })
        .map(mapAttachment_),
      history: safeReadSheetRecords_('TASK_HISTORY')
        .filter(function (record) {
          return normalizeString_(record['Task ID']) === taskId;
        })
        .map(function (record) {
          return {
            historyId: normalizeString_(record['History ID']),
            actionType: normalizeString_(record['Action Type']),
            changedField: normalizeString_(record['Changed Field']),
            previousValue: normalizeString_(record['Previous Value']),
            newValue: normalizeString_(record['New Value']),
            changedByName: normalizeString_(record['Changed By Name']),
            changeDate: toClientDate_(record['Change Date']),
            remarks: normalizeString_(record.Remarks)
          };
        })
        .sort(function (a, b) {
          return new Date(b.changeDate || 0).getTime() - new Date(a.changeDate || 0).getTime();
        })
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load task collaboration.');
  }
}

function addTaskComment(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'tasks'
    );
    var input = payload || {};
    var taskId = normalizeString_(input.taskId);
    var comment = normalizeString_(input.comment);
    if (!taskId || !comment) {
      throw new Error('taskId and comment are required.');
    }
    assertTaskVisible_(authContext.user, taskId);
    return withScriptLock_(function () {
      var schema = resolveSchema_('TASK_COMMENTS');
      var sheet = getSheetBySchema_(schema);
      var record = {
        'Comment ID': generateSequenceIdUnlocked_('CMT'),
        'Task ID': taskId,
        'Employee ID': normalizeString_(authContext.user.employeeId),
        'Employee Name': normalizeString_(authContext.user.fullName),
        Comment: comment,
        'Comment Date': new Date(),
        'Comment Type': normalizeString_(input.commentType || 'Discussion'),
        'Parent Comment ID': normalizeString_(input.parentCommentId),
        'Created Timestamp': new Date()
      };
      appendSheetRecord_(sheet, schema.columns, record);
      writeTaskHistory_(authContext.user, taskId, 'COMMENT', 'Comment', '', comment, 'Task comment added.');
      writeAuditLog_(authContext.user, 'CREATE', 'TaskComments', record['Comment ID'], 'Added a task comment.', '', comment);
      return successResponse_('Comment saved.', { comment: mapComment_(record) });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to add comment.');
  }
}

function uploadTaskAttachment(sessionToken, payload) {
  try {
    var authContext = requireSession_(
      sessionToken,
      ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'],
      'tasks'
    );
    var input = payload || {};
    var taskId = normalizeString_(input.taskId);
    var fileName = normalizeString_(input.fileName);
    if (!taskId || !fileName || !input.base64) {
      throw new Error('taskId, fileName and file data are required.');
    }
    var mimeType = normalizeString_(input.mimeType || '').toLowerCase();
    if (mimeType !== 'application/pdf' && !/\.pdf$/i.test(fileName)) {
      throw new Error('Only PDF files are allowed.');
    }
    assertTaskVisible_(authContext.user, taskId);
    var maxMb = Math.max(1, normalizeNumber_(getSettingValue_('MAX_SUBTASK_PDF_MB', 2), 2));
    var attachmentCap = normalizeNumber_(getSettingValue_('MAX_ATTACHMENT_MB', maxMb), maxMb);
    if (attachmentCap > 0) {
      maxMb = Math.min(maxMb, attachmentCap);
    }
    var bytes = Utilities.base64Decode(String(input.base64));
    if (!bytes || bytes.length < 1024) {
      throw new Error('The PDF is too small or empty.');
    }
    if (bytes.length > maxMb * 1024 * 1024) {
      throw new Error('The PDF must be ' + maxMb + ' MB or smaller.');
    }
    return withScriptLock_(function () {
      var folder = getAttachmentsFolder_();
      var blob = Utilities.newBlob(bytes, 'application/pdf', fileName);
      var file = folder.createFile(blob);
      var schema = resolveSchema_('TASK_ATTACHMENTS');
      var sheet = getSheetBySchema_(schema);
      var record = {
        'Attachment ID': generateSequenceIdUnlocked_('ATT'),
        'Task ID': taskId,
        'Employee ID': normalizeString_(authContext.user.employeeId),
        'Employee Name': normalizeString_(authContext.user.fullName),
        'File Name': fileName,
        'File URL': file.getUrl(),
        'File ID': file.getId(),
        'MIME Type': blob.getContentType(),
        'File Size': bytes.length,
        'Attachment Type': normalizeString_(input.attachmentType || 'Supporting File'),
        'Uploaded Date': new Date(),
        'Uploaded By': authContext.user.userId,
        Status: 'Active'
      };
      appendSheetRecord_(sheet, schema.columns, record);
      writeTaskHistory_(authContext.user, taskId, 'ATTACHMENT', 'Attachment', '', fileName, 'Attachment uploaded.');
      writeAuditLog_(authContext.user, 'CREATE', 'TaskAttachments', record['Attachment ID'], 'Uploaded task attachment.', '', fileName);
      return successResponse_('Attachment uploaded.', { attachment: mapAttachment_(record) });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to upload attachment.');
  }
}

function removeTaskAttachment(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor', 'Team Leader'], 'tasks');
    var attachmentId = normalizeString_(payload && payload.attachmentId);
    if (!attachmentId) {
      throw new Error('attachmentId is required.');
    }
    var schema = resolveSchema_('TASK_ATTACHMENTS');
    var sheet = getSheetBySchema_(schema);
    var current = safeReadSheetRecords_(schema).find(function (record) {
      return normalizeString_(record['Attachment ID']) === attachmentId;
    });
    if (!current) {
      throw new Error('Attachment was not found.');
    }
    var updated = Object.assign({}, current);
    updated.Status = 'Removed';
    updateSheetRecordByRow_(sheet, current.__rowNumber, schema.columns, updated);
    writeTaskHistory_(authContext.user, current['Task ID'], 'ATTACHMENT', 'Attachment Status', 'Active', 'Removed', current['File Name']);
    writeAuditLog_(authContext.user, 'REMOVE', 'TaskAttachments', attachmentId, 'Removed attachment metadata.', 'Active', 'Removed');
    return successResponse_('Attachment removed.', { attachmentId: attachmentId });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to remove attachment.');
  }
}

function getAttachmentsFolder_() {
  var properties = PropertiesService.getScriptProperties();
  var folderId = normalizeString_(properties.getProperty('ATTACHMENTS_FOLDER_ID'));
  if (folderId) {
    return DriveApp.getFolderById(folderId);
  }
  var folder = DriveApp.createFolder('KSL Task Attachments');
  properties.setProperty('ATTACHMENTS_FOLDER_ID', folder.getId());
  return folder;
}

function assertTaskVisible_(user, taskId) {
  var tasks = applyTaskScopeForUser_(safeReadSheetRecords_('TASKS'), user);
  var found = tasks.some(function (record) {
    return normalizeString_(record['Task ID']) === normalizeString_(taskId);
  });
  if (!found && isStaffLikeRole_(user.role)) {
    throw new Error('You are not authorized to access this task.');
  }
}

function mapComment_(record) {
  return {
    commentId: normalizeString_(record['Comment ID']),
    taskId: normalizeString_(record['Task ID']),
    employeeName: normalizeString_(record['Employee Name']),
    comment: normalizeString_(record.Comment),
    commentType: normalizeString_(record['Comment Type']),
    parentCommentId: normalizeString_(record['Parent Comment ID']),
    createdTimestamp: toClientDate_(record['Created Timestamp'] || record['Comment Date'])
  };
}

function mapAttachment_(record) {
  return {
    attachmentId: normalizeString_(record['Attachment ID']),
    taskId: normalizeString_(record['Task ID']),
    fileName: normalizeString_(record['File Name']),
    fileUrl: normalizeString_(record['File URL']),
    mimeType: normalizeString_(record['MIME Type']),
    fileSize: normalizeNumber_(record['File Size'], 0),
    uploadedBy: normalizeString_(record['Uploaded By']),
    uploadedDate: toClientDate_(record['Uploaded Date']),
    status: normalizeString_(record.Status || 'Active')
  };
}
