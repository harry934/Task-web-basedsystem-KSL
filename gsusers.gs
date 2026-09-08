function listUsers(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator'], 'users');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var roleFilter = normalizeString_(filters.role).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var pendingOnly = Boolean(filters.pendingOnly);
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var users = readSheetRecords_('USERS')
      .filter(function (record) {
        var status = normalizeString_(record['Account Status']).toLowerCase();
        var role = normalizeString_(record.Role).toLowerCase();
        var searchableText = [
          record['Full Name'],
          record['Google Email'],
          record['Employee ID'],
          record['Department'],
          record['Job Title']
        ]
          .join(' ')
          .toLowerCase();

        if (pendingOnly && status !== 'pending approval') {
          return false;
        }
        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (roleFilter && role !== roleFilter) {
          return false;
        }
        if (query && searchableText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapUserForListResponse_)
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    return successResponse_('Users loaded successfully.', buildPagedResult_(users, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load users.');
  }
}

function listPendingUsers(sessionToken) {
  return listUsers(sessionToken, {
    pendingOnly: true,
    page: 1,
    pageSize: 1000
  });
}

function approveUser(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    var input = payload || {};
    var userId = normalizeString_(input.userId);
    if (!userId) {
      throw new Error('userId is required.');
    }

    var schema = resolveSchema_('USERS');
    var usersSheet = getSheetBySchema_(schema);
    var users = readSheetRecords_(schema);
    var targetUser = users.find(function (record) {
      return normalizeString_(record['User ID']) === userId;
    });

    if (!targetUser) {
      throw new Error('User was not found.');
    }

    var role = normalizeString_(input.role);
    var employeeId = normalizeString_(input.employeeId);
    var department = normalizeString_(input.department);
    var jobTitle = normalizeString_(input.jobTitle);
    if (!employeeId) {
      throw new Error('Employee ID is required for approval.');
    }
    if (!department) {
      throw new Error('Department is required for approval.');
    }
    if (!jobTitle) {
      throw new Error('Job Title is required for approval.');
    }
    if (!role) {
      throw new Error('Role is required.');
    }

    var allowedRoles = getDimensionValues_('Roles');
    if (allowedRoles.length > 0 && allowedRoles.indexOf(role) === -1) {
      throw new Error('Role must match an active Dimensions value.');
    }

    var employeeIdInUse = users.some(function (record) {
      var sameEmployeeId = normalizeString_(record['Employee ID']) === employeeId;
      var sameUser = normalizeString_(record['User ID']) === userId;
      return sameEmployeeId && !sameUser;
    });
    if (employeeIdInUse) {
      throw new Error('Employee ID is already assigned to another user.');
    }

    var updated = Object.assign({}, targetUser);
    var previous = mapUserForListResponse_(targetUser);

    updated['Employee ID'] = employeeId;
    updated.Department = department;
    updated['Job Title'] = jobTitle;
    updated.Role = role;
    updated['Supervisor ID'] = normalizeString_(input.supervisorId);
    updated['Account Status'] = normalizeString_(input.accountStatus || 'Active');
    updated['Updated Date'] = new Date();
    updated['Updated By'] = authContext.user.userId;

    if (!updated['Account Status']) {
      updated['Account Status'] = 'Active';
    }
    if (!isActiveAccountStatus_(updated['Account Status'])) {
      throw new Error('Approval must set account status to Active.');
    }

    updateSheetRecordByRow_(usersSheet, targetUser.__rowNumber, schema.columns, updated);
    upsertEmployeeFromUser_(updated);

    writeAuditLog_(
      authContext.user,
      'APPROVE',
      'Users',
      userId,
      'Approved user account and assigned role metadata.',
      previous,
      mapUserForListResponse_(updated)
    );

    return successResponse_('User approved successfully.', {
      userId: userId,
      accountStatus: updated['Account Status']
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to approve user.');
  }
}

function updateUserAccountStatus(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    var input = payload || {};
    var userId = normalizeString_(input.userId);
    var newStatus = normalizeString_(input.accountStatus);
    if (!userId || !newStatus) {
      throw new Error('userId and accountStatus are required.');
    }

    var allowedStatuses = getDimensionValues_('Account Statuses');
    if (allowedStatuses.length > 0 && allowedStatuses.indexOf(newStatus) === -1) {
      throw new Error('Account status must match an active Dimensions value.');
    }
    if (normalizeString_(authContext.user.userId) === userId) {
      throw new Error('You cannot change your own account status.');
    }

    var schema = resolveSchema_('USERS');
    var usersSheet = getSheetBySchema_(schema);
    var users = readSheetRecords_(schema);
    var targetUser = users.find(function (record) {
      return normalizeString_(record['User ID']) === userId;
    });

    if (!targetUser) {
      throw new Error('User was not found.');
    }

    var previousStatus = normalizeString_(targetUser['Account Status']);
    if (previousStatus === newStatus) {
      return successResponse_('No status change was required.', {
        userId: userId,
        accountStatus: newStatus
      });
    }

    var updated = Object.assign({}, targetUser);
    updated['Account Status'] = newStatus;
    updated['Updated Date'] = new Date();
    updated['Updated By'] = authContext.user.userId;
    updateSheetRecordByRow_(usersSheet, targetUser.__rowNumber, schema.columns, updated);

    writeAuditLog_(
      authContext.user,
      'ACCOUNT_STATUS_CHANGE',
      'Users',
      userId,
      normalizeString_(input.reason) || 'Updated account status.',
      previousStatus,
      newStatus
    );

    return successResponse_('Account status updated successfully.', {
      userId: userId,
      accountStatus: newStatus
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update user account status.');
  }
}

function mapUserForListResponse_(record) {
  return {
    userId: normalizeString_(record['User ID']),
    fullName: normalizeString_(record['Full Name']),
    email: normalizeEmail_(record['Google Email']),
    employeeId: normalizeString_(record['Employee ID']),
    department: normalizeString_(record.Department),
    jobTitle: normalizeString_(record['Job Title']),
    role: normalizeString_(record.Role),
    supervisorId: normalizeString_(record['Supervisor ID']),
    accountStatus: normalizeString_(record['Account Status']),
    lastLogin: toClientDate_(record['Last Login']),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}
