var DEPLOYMENT_ACCESS_ROLES = [
  'Administrator',
  'Manager',
  'Supervisor',
  'Team Leader',
  'Employee',
  'Staff'
];
var DEPLOYMENT_EDIT_ROLES = ['Administrator', 'Manager', 'Supervisor', 'Team Leader'];
var DEPLOYMENT_DUTY_STATUSES = ['On Duty', 'Off Duty', 'On Leave', 'Absent', 'Other'];

function ensureStaffDeploymentSchema_() {
  try {
    ensureRequiredDimensionValues_();
  } catch (ignore) {
    // Dimension ensure is best-effort for existing workbooks.
  }
  var spreadsheet = getDatabaseSpreadsheet_();
  ensureSheetSchema_(spreadsheet, resolveSchema_('STAFF_DEPLOYMENT_BATCHES'));
  ensureSheetSchema_(spreadsheet, resolveSchema_('STAFF_DEPLOYMENT_ENTRIES'));
}

function getDeploymentFormMetadata(sessionToken) {
  try {
    var authContext = requireSession_(sessionToken, DEPLOYMENT_ACCESS_ROLES, 'deployment');
    ensureStaffDeploymentSchema_();
    var dimensions = getDimensionValuesMap_();
    var dutyStatuses = dimensions['Duty Statuses'] || [];
    if (!dutyStatuses.length) {
      dutyStatuses = DEPLOYMENT_DUTY_STATUSES.slice();
    }
    var staff = listScopedActiveEmployees_(authContext.user).map(function (record) {
      return {
        employeeId: normalizeString_(record['Employee ID']),
        fullName: normalizeString_(record['Full Name']),
        department: normalizeString_(record.Department),
        section: normalizeString_(record.Section),
        workLocation: normalizeString_(record['Work Location']),
        employmentType: normalizeString_(record['Employment Type'])
      };
    });
    return successResponse_('Deployment form metadata loaded.', {
      dutyStatuses: dutyStatuses,
      workLocations: dimensions['Work Locations'] || [],
      departments: dimensions.Departments || [],
      sections: dimensions.Sections || [],
      staff: staff,
      capabilities: getDeploymentCapabilities_(authContext.user),
      scope: {
        department: authContext.user.department || '',
        location: authContext.user.workLocation || '',
        section: authContext.user.section || ''
      }
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load deployment options.');
  }
}

function listDeploymentBatches(sessionToken, options) {
  try {
    var authContext = requireSession_(sessionToken, DEPLOYMENT_ACCESS_ROLES, 'deployment');
    ensureStaffDeploymentSchema_();
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var start = filters.startDate ? nairobiDateKey_(filters.startDate) : '';
    var end = filters.endDate ? nairobiDateKey_(filters.endDate) : '';
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var user = authContext.user;

    var items = safeReadSheetRecords_('STAFF_DEPLOYMENT_BATCHES')
      .map(mapDeploymentBatch_)
      .filter(function (item) {
        if (!userCanAccessDeploymentBatch_(user, item)) {
          return false;
        }
        if (statusFilter && item.workflowStatus.toLowerCase() !== statusFilter) {
          return false;
        }
        if (start || end) {
          var key = item.operationalDate ? nairobiDateKey_(item.operationalDate) : '';
          if (start && key < start) {
            return false;
          }
          if (end && key > end) {
            return false;
          }
        }
        if (query) {
          var haystack = [
            item.batchId,
            item.department,
            item.section,
            item.location,
            item.workflowStatus,
            item.submittedByName
          ]
            .join(' ')
            .toLowerCase();
          if (haystack.indexOf(query) === -1) {
            return false;
          }
        }
        return true;
      })
      .sort(function (a, b) {
        return new Date(b.updatedDate || b.operationalDate || 0).getTime() - new Date(a.updatedDate || a.operationalDate || 0).getTime();
      });

    return successResponse_('Deployment batches loaded.', buildPagedResult_(items, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load deployment batches.');
  }
}

function getDeploymentBatch(sessionToken, batchId) {
  try {
    var authContext = requireSession_(sessionToken, DEPLOYMENT_ACCESS_ROLES, 'deployment');
    ensureStaffDeploymentSchema_();
    var batchRecord = findDeploymentBatchRecord_(batchId);
    if (!batchRecord) {
      throw new Error('Deployment batch not found.');
    }
    var batch = mapDeploymentBatch_(batchRecord);
    if (!userCanAccessDeploymentBatch_(authContext.user, batch)) {
      throw new Error('You do not have access to this deployment batch.');
    }
    var entries = listDeploymentEntriesForBatch_(batch.batchId).map(mapDeploymentEntry_);
    if (isStaffLikeRole_(authContext.user.role)) {
      entries = entries.filter(function (entry) {
        return normalizeString_(entry.employeeId) === normalizeString_(authContext.user.employeeId);
      });
    }
    return successResponse_('Deployment batch loaded.', {
      batch: batch,
      entries: entries,
      capabilities: getDeploymentCapabilities_(authContext.user)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load deployment batch.');
  }
}

function saveDeploymentDraft(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, DEPLOYMENT_EDIT_ROLES, 'deployment');
    ensureStaffDeploymentSchema_();
    if (!isSectionHeadRole_(authContext.user.role)) {
      throw new Error('Only section heads can edit deployment drafts.');
    }
    return withScriptLock_(function () {
      var input = payload || {};
      var operationalDate = safeDateFromInput_(input.operationalDate, 'Operational date');
      var department = normalizeString_(input.department) || normalizeString_(authContext.user.department);
      var section = normalizeString_(input.section) || normalizeString_(authContext.user.section);
      var location = normalizeString_(input.location) || normalizeString_(authContext.user.workLocation);
      var entries = Array.isArray(input.entries) ? input.entries : [];
      if (!department) {
        throw new Error('Department is required.');
      }
      if (!location) {
        throw new Error('Location is required.');
      }
      if (!entries.length) {
        throw new Error('Add at least one staff deployment entry.');
      }

      var batchId = normalizeString_(input.batchId);
      var batchSchema = resolveSchema_('STAFF_DEPLOYMENT_BATCHES');
      var batchSheet = getSheetBySchema_(batchSchema);
      var now = new Date();
      var existing = batchId ? findDeploymentBatchRecord_(batchId) : null;

      if (existing) {
        var existingMapped = mapDeploymentBatch_(existing);
        if (!userCanAccessDeploymentBatch_(authContext.user, existingMapped)) {
          throw new Error('You do not have access to this deployment batch.');
        }
        if (!isEditableDeploymentStatus_(existingMapped.workflowStatus)) {
          throw new Error('This batch is locked. Wait for it to be returned, or create a new draft.');
        }
        existing['Operational Date'] = operationalDate;
        existing.Department = department;
        existing.Section = section;
        existing.Location = location;
        existing['Updated Date'] = now;
        existing['Updated By'] = authContext.user.userId;
        updateSheetRecordByRow_(batchSheet, existing.__rowNumber, batchSchema.columns, existing);
        batchId = normalizeString_(existing['Batch ID']);
        replaceDeploymentEntries_(batchId, operationalDate, department, section, location, entries, authContext.user);
        writeAuditLog_(
          authContext.user,
          'UPDATE',
          'Staff Deployment',
          batchId,
          'Updated deployment draft.',
          null,
          { department: department, location: location, entryCount: entries.length }
        );
      } else {
        batchId = generateSequenceId_('DEP');
        var record = {
          'Batch ID': batchId,
          'Operational Date': operationalDate,
          Department: department,
          Section: section,
          Location: location,
          'Workflow Status': 'Draft',
          'Submitted By': '',
          'Submitted By Name': '',
          'Submitted At': '',
          'RSM By': '',
          'RSM By Name': '',
          'RSM At': '',
          'RSM Comment': '',
          'Approval File Name': '',
          'Approval File URL': '',
          'Approval File ID': '',
          'Admin By': '',
          'Admin By Name': '',
          'Admin At': '',
          'Admin Comment': '',
          'Created Date': now,
          'Created By': authContext.user.userId,
          'Updated Date': now,
          'Updated By': authContext.user.userId
        };
        appendSheetRecord_(batchSheet, batchSchema.columns, record);
        replaceDeploymentEntries_(batchId, operationalDate, department, section, location, entries, authContext.user);
        writeAuditLog_(
          authContext.user,
          'CREATE',
          'Staff Deployment',
          batchId,
          'Created deployment draft.',
          null,
          { department: department, location: location, entryCount: entries.length }
        );
      }

      return successResponse_('Deployment draft saved.', {
        batchId: batchId,
        workflowStatus: 'Draft'
      });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to save deployment draft.');
  }
}

function submitDeploymentBatch(sessionToken, batchId) {
  try {
    var authContext = requireSession_(sessionToken, DEPLOYMENT_EDIT_ROLES, 'deployment');
    ensureStaffDeploymentSchema_();
    if (!isSectionHeadRole_(authContext.user.role)) {
      throw new Error('Only section heads can submit deployment for approval.');
    }
    return withScriptLock_(function () {
      var batch = findDeploymentBatchRecord_(batchId);
      if (!batch) {
        throw new Error('Deployment batch not found.');
      }
      var mapped = mapDeploymentBatch_(batch);
      if (!userCanAccessDeploymentBatch_(authContext.user, mapped)) {
        throw new Error('You do not have access to this deployment batch.');
      }
      if (!isEditableDeploymentStatus_(mapped.workflowStatus)) {
        throw new Error('Only draft or returned batches can be submitted.');
      }
      var entries = listDeploymentEntriesForBatch_(mapped.batchId);
      if (!entries.length) {
        throw new Error('Add at least one staff entry before submitting.');
      }
      var schema = resolveSchema_('STAFF_DEPLOYMENT_BATCHES');
      var sheet = getSheetBySchema_(schema);
      var now = new Date();
      var previous = mapped.workflowStatus;
      batch['Workflow Status'] = 'Submitted';
      batch['Submitted By'] = authContext.user.userId;
      batch['Submitted By Name'] = authContext.user.fullName;
      batch['Submitted At'] = now;
      batch['Updated Date'] = now;
      batch['Updated By'] = authContext.user.userId;
      updateSheetRecordByRow_(sheet, batch.__rowNumber, schema.columns, batch);
      writeAuditLog_(
        authContext.user,
        'SUBMIT',
        'Staff Deployment',
        mapped.batchId,
        'Submitted deployment for RSM review.',
        previous,
        'Submitted'
      );
      notifyDeploymentRoleUsers_('Manager', 'Deployment awaiting RSM review', mapped.batchId + ' · ' + mapped.department + ' · ' + mapped.location);
      return successResponse_('Deployment submitted for RSM review.', { batchId: mapped.batchId, workflowStatus: 'Submitted' });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to submit deployment.');
  }
}

function reviewDeploymentBatch(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'deployment');
    ensureStaffDeploymentSchema_();
    if (!isRsmRole_(authContext.user.role)) {
      throw new Error('Only RSM (Manager) or Admin can review deployments.');
    }
    return withScriptLock_(function () {
      var input = payload || {};
      var batchId = normalizeString_(input.batchId);
      var decision = normalizeString_(input.decision).toLowerCase();
      var comment = normalizeString_(input.comment);
      var batch = findDeploymentBatchRecord_(batchId);
      if (!batch) {
        throw new Error('Deployment batch not found.');
      }
      var mapped = mapDeploymentBatch_(batch);
      if (!userCanAccessDeploymentBatch_(authContext.user, mapped)) {
        throw new Error('You do not have access to this deployment batch.');
      }
      if (mapped.workflowStatus.toLowerCase() !== 'submitted') {
        throw new Error('Only submitted deployments can be reviewed by RSM.');
      }
      if (decision !== 'approve' && decision !== 'return') {
        throw new Error('Decision must be approve or return.');
      }
      var schema = resolveSchema_('STAFF_DEPLOYMENT_BATCHES');
      var sheet = getSheetBySchema_(schema);
      var now = new Date();
      var previous = mapped.workflowStatus;
      var nextStatus = decision === 'approve' ? 'Approved' : 'Returned';
      batch['Workflow Status'] = nextStatus;
      batch['RSM By'] = authContext.user.userId;
      batch['RSM By Name'] = authContext.user.fullName;
      batch['RSM At'] = now;
      batch['RSM Comment'] = comment;
      if (decision === 'approve' && input.approvalFile) {
        var fileMeta = storeDeploymentApprovalFile_(input.approvalFile);
        batch['Approval File Name'] = fileMeta.fileName;
        batch['Approval File URL'] = fileMeta.fileUrl;
        batch['Approval File ID'] = fileMeta.fileId;
      }
      batch['Updated Date'] = now;
      batch['Updated By'] = authContext.user.userId;
      updateSheetRecordByRow_(sheet, batch.__rowNumber, schema.columns, batch);
      writeAuditLog_(
        authContext.user,
        decision === 'approve' ? 'APPROVE' : 'RETURN',
        'Staff Deployment',
        batchId,
        decision === 'approve' ? 'RSM approved deployment.' : 'RSM returned deployment.',
        previous,
        { status: nextStatus, comment: comment }
      );
      if (decision === 'approve') {
        notifyDeploymentRoleUsers_('Administrator', 'Deployment awaiting Admin finalization', batchId + ' · ' + mapped.department);
      } else {
        createNotification_(
          mapped.submittedBy,
          '',
          'Deployment',
          'Deployment returned',
          batchId + ' was returned by RSM. ' + comment,
          '',
          'High'
        );
      }
      return successResponse_('Deployment review saved.', { batchId: batchId, workflowStatus: nextStatus });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to review deployment.');
  }
}

function finalizeDeploymentBatch(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'deployment');
    ensureStaffDeploymentSchema_();
    return withScriptLock_(function () {
      var input = payload || {};
      var batchId = normalizeString_(input.batchId);
      var comment = normalizeString_(input.comment);
      var batch = findDeploymentBatchRecord_(batchId);
      if (!batch) {
        throw new Error('Deployment batch not found.');
      }
      var mapped = mapDeploymentBatch_(batch);
      if (mapped.workflowStatus.toLowerCase() !== 'approved') {
        throw new Error('Only RSM-approved deployments can be finalized.');
      }
      var schema = resolveSchema_('STAFF_DEPLOYMENT_BATCHES');
      var sheet = getSheetBySchema_(schema);
      var now = new Date();
      var previous = mapped.workflowStatus;
      batch['Workflow Status'] = 'Finalized';
      batch['Admin By'] = authContext.user.userId;
      batch['Admin By Name'] = authContext.user.fullName;
      batch['Admin At'] = now;
      batch['Admin Comment'] = comment;
      batch['Updated Date'] = now;
      batch['Updated By'] = authContext.user.userId;
      updateSheetRecordByRow_(sheet, batch.__rowNumber, schema.columns, batch);
      writeAuditLog_(
        authContext.user,
        'FINALIZE',
        'Staff Deployment',
        batchId,
        'Admin Officer finalized deployment.',
        previous,
        { status: 'Finalized', comment: comment }
      );
      return successResponse_('Deployment finalized.', { batchId: batchId, workflowStatus: 'Finalized' });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to finalize deployment.');
  }
}

function exportDeploymentBatch(sessionToken, batchId, options) {
  try {
    var detail = getDeploymentBatch(sessionToken, batchId);
    if (!detail.success) {
      return detail;
    }
    var batch = detail.data.batch;
    var entries = detail.data.entries || [];
    var headers = ['Employee ID', 'Employee Name', 'Duty Status', 'Destination', 'Notes', 'Department', 'Location'];
    var rows = entries.map(function (entry) {
      return [
        entry.employeeId,
        entry.employeeName,
        entry.dutyStatus,
        entry.destination,
        entry.notes,
        entry.department,
        entry.location
      ];
    });
    var title =
      'Staff Deployment · ' +
      (batch.operationalDate || '') +
      ' · ' +
      (batch.department || '') +
      ' · ' +
      (batch.location || '') +
      ' · ' +
      (batch.workflowStatus || '');
    if (normalizeString_(options && options.format).toLowerCase() === 'csv') {
      return successResponse_('Export ready.', downloadPayload_('deployment_' + batch.batchId + '.csv', 'text/csv', buildCsvText_(headers, rows)));
    }
    return successResponse_('Report generated.', createPdfFromTable_(title, headers, rows));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to export deployment.');
  }
}

function getDeploymentCapabilities_(user) {
  var role = normalizeString_(user && user.role);
  return {
    canEditDraft: isSectionHeadRole_(role) && !isStaffLikeRole_(role),
    canSubmit: isSectionHeadRole_(role) && !isStaffLikeRole_(role),
    canReview: isRsmRole_(role),
    canFinalize: isAdminOfficerRole_(role),
    canViewAll: canManageAllLocations_(role),
    viewOwnOnly: isStaffLikeRole_(role)
  };
}

function userCanAccessDeploymentBatch_(user, batch) {
  if (!user || !batch) {
    return false;
  }
  if (canManageAllLocations_(user.role)) {
    return true;
  }
  if (isStaffLikeRole_(user.role)) {
    return listDeploymentEntriesForBatch_(batch.batchId).some(function (record) {
      return normalizeString_(record['Employee ID']) === normalizeString_(user.employeeId);
    });
  }
  var userDept = normalizeString_(user.department).toLowerCase();
  var userLoc = normalizeString_(user.workLocation).toLowerCase();
  if (userDept && normalizeString_(batch.department).toLowerCase() !== userDept) {
    return false;
  }
  if (userLoc && normalizeString_(batch.location).toLowerCase() !== userLoc) {
    return false;
  }
  return true;
}

function isEditableDeploymentStatus_(status) {
  var value = normalizeString_(status).toLowerCase();
  return value === 'draft' || value === 'returned' || !value;
}

function listScopedActiveEmployees_(user) {
  return safeReadSheetRecords_('EMPLOYEES').filter(function (record) {
    if (normalizeString_(record['Employment Status']).toLowerCase() === 'inactive') {
      return false;
    }
    return userCanAccessStaffRecord_(user, record);
  });
}

function findDeploymentBatchRecord_(batchId) {
  var id = normalizeString_(batchId);
  if (!id) {
    return null;
  }
  return (
    safeReadSheetRecords_('STAFF_DEPLOYMENT_BATCHES').find(function (record) {
      return normalizeString_(record['Batch ID']) === id;
    }) || null
  );
}

function listDeploymentEntriesForBatch_(batchId) {
  var id = normalizeString_(batchId);
  return safeReadSheetRecords_('STAFF_DEPLOYMENT_ENTRIES').filter(function (record) {
    return normalizeString_(record['Batch ID']) === id;
  });
}

function replaceDeploymentEntries_(batchId, operationalDate, department, section, location, entries, user) {
  var schema = resolveSchema_('STAFF_DEPLOYMENT_ENTRIES');
  var sheet = getSheetBySchema_(schema);
  var existing = listDeploymentEntriesForBatch_(batchId).slice().sort(function (a, b) {
    return Number(b.__rowNumber || 0) - Number(a.__rowNumber || 0);
  });
  existing.forEach(function (record) {
    if (record.__rowNumber) {
      sheet.deleteRow(record.__rowNumber);
    }
  });

  var seen = {};
  var now = new Date();
  entries.forEach(function (entry) {
    var employeeId = normalizeString_(entry.employeeId);
    if (!employeeId) {
      throw new Error('Each deployment entry needs a staff member.');
    }
    if (seen[employeeId]) {
      throw new Error('Duplicate deployment entry for the same staff member on this date.');
    }
    seen[employeeId] = true;
    var person = findEmployeeRecord_(employeeId);
    if (!person) {
      throw new Error('Staff member not found: ' + employeeId);
    }
    if (!userCanAccessStaffRecord_(user, person)) {
      throw new Error('You cannot deploy staff outside your section/location: ' + normalizeString_(person['Full Name']));
    }
    if (normalizeString_(person['Employment Status']).toLowerCase() === 'inactive') {
      throw new Error('Inactive staff cannot be deployed: ' + normalizeString_(person['Full Name']));
    }
    var dutyStatus = normalizeString_(entry.dutyStatus) || 'On Duty';
    if (DEPLOYMENT_DUTY_STATUSES.indexOf(dutyStatus) === -1) {
      var allowed = getDimensionValues_('Duty Statuses');
      if (allowed.length && allowed.indexOf(dutyStatus) === -1) {
        throw new Error('Invalid duty status: ' + dutyStatus);
      }
    }
    var notes = normalizeString_(entry.notes);
    if (dutyStatus !== 'On Duty' && !notes) {
      throw new Error('Notes are required when duty status is not On Duty (' + normalizeString_(person['Full Name']) + ').');
    }
    var payload = {
      'Entry ID': generateSequenceId_('DPE'),
      'Batch ID': batchId,
      'Operational Date': operationalDate,
      'Employee ID': employeeId,
      'Employee Name': normalizeString_(person['Full Name']),
      Department: department || normalizeString_(person.Department),
      Section: section || normalizeString_(person.Section),
      Location: location || normalizeString_(person['Work Location']),
      'Duty Status': dutyStatus,
      Destination: normalizeString_(entry.destination),
      Notes: notes,
      'Created Date': now,
      'Created By': user.userId,
      'Updated Date': now,
      'Updated By': user.userId
    };
    appendSheetRecord_(sheet, schema.columns, payload);
  });
}

function findEmployeeRecord_(employeeId) {
  var id = normalizeString_(employeeId);
  return (
    safeReadSheetRecords_('EMPLOYEES').find(function (record) {
      return normalizeString_(record['Employee ID']) === id;
    }) || null
  );
}

function storeDeploymentApprovalFile_(input) {
  var fileName = normalizeString_(input && input.fileName);
  if (!fileName || !(input && input.base64)) {
    return { fileName: '', fileUrl: '', fileId: '' };
  }
  var mimeType = normalizeString_(input.mimeType || '').toLowerCase();
  var allowed =
    mimeType === 'application/pdf' ||
    mimeType.indexOf('image/') === 0 ||
    /\.(pdf|png|jpe?g)$/i.test(fileName);
  if (!allowed) {
    throw new Error('Approval evidence must be a PDF or image.');
  }
  var bytes = Utilities.base64Decode(String(input.base64));
  if (!bytes || bytes.length < 64) {
    throw new Error('The approval file is empty or invalid.');
  }
  var maxMb = Math.max(1, normalizeNumber_(getSettingValue_('MAX_ATTACHMENT_MB', 5), 5));
  if (bytes.length > maxMb * 1024 * 1024) {
    throw new Error('The approval file must be ' + maxMb + ' MB or smaller.');
  }
  var folder = getAttachmentsFolder_();
  var blob = Utilities.newBlob(bytes, mimeType || 'application/octet-stream', fileName);
  var file = folder.createFile(blob);
  return {
    fileName: fileName,
    fileUrl: file.getUrl(),
    fileId: file.getId()
  };
}

function notifyDeploymentRoleUsers_(role, title, message) {
  try {
    safeReadSheetRecords_('USERS').forEach(function (record) {
      if (!isActiveAccountStatus_(record['Account Status'])) {
        return;
      }
      if (normalizeString_(record.Role) !== normalizeString_(role)) {
        return;
      }
      createNotification_(normalizeString_(record['User ID']), '', 'Deployment', title, message, '', 'Normal');
    });
  } catch (error) {
    // Best-effort notifications.
  }
}

function mapDeploymentBatch_(record) {
  return {
    batchId: normalizeString_(record['Batch ID']),
    operationalDate: toClientDate_(record['Operational Date']),
    department: normalizeString_(record.Department),
    section: normalizeString_(record.Section),
    location: normalizeString_(record.Location),
    workflowStatus: normalizeString_(record['Workflow Status']) || 'Draft',
    submittedBy: normalizeString_(record['Submitted By']),
    submittedByName: normalizeString_(record['Submitted By Name']),
    submittedAt: toClientDate_(record['Submitted At']),
    rsmBy: normalizeString_(record['RSM By']),
    rsmByName: normalizeString_(record['RSM By Name']),
    rsmAt: toClientDate_(record['RSM At']),
    rsmComment: normalizeString_(record['RSM Comment']),
    approvalFileName: normalizeString_(record['Approval File Name']),
    approvalFileUrl: normalizeString_(record['Approval File URL']),
    approvalFileId: normalizeString_(record['Approval File ID']),
    adminBy: normalizeString_(record['Admin By']),
    adminByName: normalizeString_(record['Admin By Name']),
    adminAt: toClientDate_(record['Admin At']),
    adminComment: normalizeString_(record['Admin Comment']),
    createdDate: toClientDate_(record['Created Date']),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}

function mapDeploymentEntry_(record) {
  return {
    entryId: normalizeString_(record['Entry ID']),
    batchId: normalizeString_(record['Batch ID']),
    operationalDate: toClientDate_(record['Operational Date']),
    employeeId: normalizeString_(record['Employee ID']),
    employeeName: normalizeString_(record['Employee Name']),
    department: normalizeString_(record.Department),
    section: normalizeString_(record.Section),
    location: normalizeString_(record.Location),
    dutyStatus: normalizeString_(record['Duty Status']),
    destination: normalizeString_(record.Destination),
    notes: normalizeString_(record.Notes)
  };
}
