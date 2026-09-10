function createUserAccount(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    var input = payload || {};
    var username = normalizeUsername_(input.username);
    var fullName = normalizeString_(input.fullName);
    var email = normalizeEmail_(input.email);
    var password = String(input.password || '');
    var role = normalizeStoredRole_(input.role || 'Staff');
    var employeeId = normalizeString_(input.employeeId);
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }
    if (role === 'Administrator' && !isSuperAdminUser_(authContext.user.userId)) {
      throw new Error('Only the Super Admin can create another administrator.');
    }
    if (role !== 'Administrator' && !employeeId) {
      throw new Error('Select the staff member this login belongs to. Create them on the Staff page first.');
    }
    var staffRecord = null;
    if (employeeId) {
      staffRecord = findEmployeeRecordById_(employeeId);
      if (!staffRecord) {
        throw new Error('That staff member was not found. Create them on the Staff page first.');
      }
      var linkedUser = findUserByEmployeeId_(employeeId);
      if (linkedUser) {
        throw new Error('That staff member already has a login account.');
      }
      if (!fullName) {
        fullName = normalizeString_(staffRecord['Full Name']);
      }
      if (!email) {
        email = normalizeEmail_(staffRecord.Email);
      }
    }
    if (!fullName) {
      throw new Error('Full name is required.');
    }
    assertValidUsername_(username);
    assertPasswordStrength_(password);
    if (getUserCredentialRecordByUsername_(username)) {
      throw new Error('Username is already in use.');
    }
    if (email && getUserRecordByEmail_(email)) {
      throw new Error('A user with this email already exists.');
    }
    var department = normalizeString_(input.department);
    var jobTitle = normalizeString_(input.jobTitle);
    var supervisorId = normalizeString_(input.supervisorId);
    if (staffRecord) {
      if (!department) {
        department = normalizeString_(staffRecord.Department);
      }
      if (!jobTitle) {
        jobTitle = normalizeString_(staffRecord['Job Title']);
      }
      if (!supervisorId) {
        supervisorId = normalizeString_(staffRecord['Supervisor ID']);
      }
    }
    var schema = resolveSchema_('USERS');
    var sheet = getSheetBySchema_(schema);
    var now = new Date();
    var names = splitNameParts_(fullName);
    var userId = generateSequenceId_('USR');
    var userRecord = {
      'User ID': userId,
      'Google Subject ID': '',
      'Google Email': email,
      'Email Verified': email ? 'FALSE' : '',
      'Full Name': fullName,
      'Given Name': names.givenName,
      'Family Name': names.familyName,
      'Profile Photo': '',
      'Hosted Domain': '',
      'Employee ID': employeeId,
      Department: department,
      'Job Title': jobTitle,
      Role: role,
      'Supervisor ID': supervisorId,
      'Account Status': 'Active',
      'First Login': '',
      'Last Login': '',
      'Last Activity': '',
      'Created By': authContext.user.userId,
      'Created Date': now,
      'Updated By': authContext.user.userId,
      'Updated Date': now
    };
    appendSheetRecord_(sheet, schema.columns, userRecord);
    setUserCredential_(userId, username, password, authContext.user.userId);
    EXECUTION_USERS_CACHE_ = null;
    EXECUTION_CREDENTIALS_CACHE_ = null;
    writeAuditLog_(authContext.user, 'CREATE', 'Users', userId, 'Administrator created a user account.', '', {
      username: username,
      role: role,
      accountStatus: userRecord['Account Status']
    });
    return successResponse_('New user created.', { userId: userId, username: username });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to create user.');
  }
}

function listUsers(sessionToken, options) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    ensureSuperAdminAssigned_(authContext.user.userId);
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var roleFilter = normalizeString_(filters.role).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var departmentFilter = normalizeString_(filters.department).toLowerCase();
    var pendingOnly = Boolean(filters.pendingOnly);
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);
    var credentialsByUserId = getCredentialIndexByUserId_();

    var users = readSheetRecords_('USERS')
      .filter(function (record) {
        var userId = normalizeString_(record['User ID']);
        var credential = credentialsByUserId[userId] || {};
        var status = normalizeString_(record['Account Status']).toLowerCase();
        var role = normalizeString_(record.Role).toLowerCase();
        var searchableText = [
          record['Full Name'],
          credential.username || '',
          record['Google Email'],
          record['Employee ID'],
          record['Department'],
          record['Job Title'],
          record.Role,
          isSuperAdminUser_(userId) ? 'super admin' : ''
        ]
          .join(' ')
          .toLowerCase();

        if (pendingOnly && status !== 'pending approval') {
          return false;
        }
        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (roleFilter === 'super admin') {
          if (!isSuperAdminUser_(userId)) {
            return false;
          }
        } else if (roleFilter && role !== roleFilter) {
          return false;
        }
        if (departmentFilter && normalizeString_(record.Department).toLowerCase() !== departmentFilter) {
          return false;
        }
        if (query && searchableText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(function (record) {
        var userId = normalizeString_(record['User ID']);
        return mapUserForListResponse_(record, credentialsByUserId[userId] || {}, authContext.user);
      })
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    var result = buildPagedResult_(users, page, pageSize);
    result.viewerIsSuperAdmin = isSuperAdminUser_(authContext.user.userId);
    result.viewerUserId = authContext.user.userId;
    return successResponse_('Users loaded successfully.', result);
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
  return updateUserAccountStatus(sessionToken, {
    userId: payload && payload.userId,
    accountStatus: 'Active',
    reason: 'Account activated by administrator.'
  });
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
    if (isSuperAdminUser_(userId)) {
      throw new Error('The Super Admin account is permanent and cannot be suspended or disabled.');
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
    if (
      normalizeString_(targetUser.Role) === 'Administrator' &&
      !isSuperAdminUser_(authContext.user.userId)
    ) {
      throw new Error('Only the Super Admin can change another administrator’s status.');
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

function bulkUpdateUserAccountStatus(sessionToken, payload) {
  try {
    requireSession_(sessionToken, ['Administrator'], 'users');
    var userIds = (payload && payload.userIds) || [];
    var status = normalizeString_(payload && payload.accountStatus);
    if (!userIds.length || !status) {
      throw new Error('Select at least one user and a status.');
    }
    var updated = [];
    var failed = [];
    userIds.forEach(function (userId) {
      var result = updateUserAccountStatus(sessionToken, {
        userId: userId,
        accountStatus: status
      });
      if (result && result.success) {
        updated.push(normalizeString_(userId));
      } else {
        failed.push({
          userId: normalizeString_(userId),
          message: (result && result.message) || 'Update failed.'
        });
      }
    });
    var message = updated.length
      ? 'Updated ' + updated.length + ' account' + (updated.length === 1 ? '' : 's') + '.'
      : 'No accounts were updated.';
    if (failed.length) {
      message += ' ' + failed.length + ' skipped.';
    }
    return successResponse_(message, { updated: updated, failed: failed });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update selected accounts.');
  }
}

function adminResetUserPassword(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    var input = payload || {};
    var userId = normalizeString_(input.userId);
    var password = String(input.newPassword || '');
    var usernameInput = normalizeUsername_(input.username);

    if (!userId) {
      throw new Error('userId is required.');
    }
    if (normalizeString_(authContext.user.userId) === userId) {
      throw new Error('You cannot change your own password from this page.');
    }
    if (isSuperAdminUser_(userId) && !isSuperAdminUser_(authContext.user.userId)) {
      throw new Error('Only the Super Admin can change that account.');
    }
    if (!password) {
      throw new Error('newPassword is required.');
    }

    var userRecord = getUserRecordByUserId_(userId);
    if (!userRecord) {
      throw new Error('User was not found.');
    }
    if (
      normalizeString_(userRecord.Role) === 'Administrator' &&
      !isSuperAdminUser_(authContext.user.userId)
    ) {
      throw new Error('Only the Super Admin can reset another administrator’s password.');
    }

    var existingCredential = getUserCredentialRecordByUserId_(userId);
    var resolvedUsername =
      usernameInput || normalizeUsername_(existingCredential ? existingCredential.Username : '');
    if (!resolvedUsername) {
      throw new Error('Username is required to create or reset credentials.');
    }

    setUserCredential_(userId, resolvedUsername, password, authContext.user.userId);

    writeAuditLog_(
      authContext.user,
      'PASSWORD_RESET',
      'Users',
      userId,
      'Administrator reset user credentials.',
      '',
      {
        username: resolvedUsername
      }
    );

    return successResponse_('User credentials updated successfully.', {
      userId: userId,
      username: resolvedUsername
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to reset password.');
  }
}

function deleteUserAccount(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    var userId = normalizeString_(payload && payload.userId);
    if (!userId) {
      throw new Error('userId is required.');
    }
    if (normalizeString_(authContext.user.userId) === userId) {
      throw new Error('You cannot delete your own account.');
    }
    if (isSuperAdminUser_(userId)) {
      throw new Error('The Super Admin account is permanent and cannot be deleted.');
    }
    return withScriptLock_(function () {
      var userSchema = resolveSchema_('USERS');
      var usersSheet = getSheetBySchema_(userSchema);
      var users = readSheetRecords_(userSchema);
      var targetUser = users.find(function (record) {
        return normalizeString_(record['User ID']) === userId;
      });
      if (!targetUser) {
        throw new Error('User was not found.');
      }
      if (
        normalizeString_(targetUser.Role) === 'Administrator' &&
        !isSuperAdminUser_(authContext.user.userId)
      ) {
        throw new Error('Only the Super Admin can delete another administrator.');
      }
      var previous = mapUserForListResponse_(targetUser, getCredentialIndexByUserId_()[userId] || {}, authContext.user);
      var credential = getUserCredentialRecordByUserId_(userId);
      var credentialRows = [];
      if (credential && credential.__rowNumber) {
        credentialRows.push(credential.__rowNumber);
      }
      var credentialSchema = resolveSchema_('USER_CREDENTIALS');
      var credentialsSheet = getSheetBySchema_(credentialSchema);
      deleteRowsByNumberDesc_(credentialsSheet, credentialRows);
      deleteRowsByNumberDesc_(usersSheet, [targetUser.__rowNumber]);
      EXECUTION_CREDENTIALS_CACHE_ = null;
      if (typeof EXECUTION_USERS_CACHE_ !== 'undefined') {
        EXECUTION_USERS_CACHE_ = null;
      }
      writeAuditLog_(
        authContext.user,
        'DELETE',
        'Users',
        userId,
        'Permanently deleted user account and credentials.',
        previous,
        ''
      );
      return successResponse_('User deleted permanently.', { userId: userId });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to delete user.');
  }
}

function updateUserRole(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    if (!isSuperAdminUser_(authContext.user.userId)) {
      throw new Error('Only the Super Admin can change a user’s role.');
    }
    var input = payload || {};
    var userId = normalizeString_(input.userId);
    var newRole = normalizeStoredRole_(input.role);
    if (!userId || !newRole) {
      throw new Error('userId and role are required.');
    }
    if (normalizeString_(authContext.user.userId) === userId) {
      throw new Error('You cannot change your own role.');
    }
    if (isSuperAdminUser_(userId)) {
      throw new Error('Transfer ownership instead of changing the Super Admin role.');
    }
    var allowedRoles = ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Staff', 'Employee'];
    if (allowedRoles.indexOf(newRole) === -1) {
      throw new Error('That role is not allowed.');
    }
    var schema = resolveSchema_('USERS');
    var sheet = getSheetBySchema_(schema);
    var users = readSheetRecords_(schema);
    var targetUser = users.find(function (record) {
      return normalizeString_(record['User ID']) === userId;
    });
    if (!targetUser) {
      throw new Error('User was not found.');
    }
    var previousRole = normalizeString_(targetUser.Role);
    if (previousRole === newRole) {
      return successResponse_('No role change was required.', { userId: userId, role: newRole });
    }
    var updated = Object.assign({}, targetUser);
    updated.Role = newRole === 'Employee' ? 'Staff' : newRole;
    updated['Updated Date'] = new Date();
    updated['Updated By'] = authContext.user.userId;
    updateSheetRecordByRow_(sheet, targetUser.__rowNumber, schema.columns, updated);
    writeAuditLog_(
      authContext.user,
      'ROLE_CHANGE',
      'Users',
      userId,
      'Updated user role.',
      previousRole,
      updated.Role
    );
    return successResponse_('User role updated.', { userId: userId, role: updated.Role });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update user role.');
  }
}

function transferSuperAdminOwnership(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    if (!isSuperAdminUser_(authContext.user.userId)) {
      throw new Error('Only the Super Admin can transfer ownership.');
    }
    var userId = normalizeString_(payload && payload.userId);
    if (!userId) {
      throw new Error('userId is required.');
    }
    if (normalizeString_(authContext.user.userId) === userId) {
      throw new Error('You already own this system.');
    }
    var targetUser = getUserRecordByUserId_(userId);
    if (!targetUser) {
      throw new Error('User was not found.');
    }
    if (normalizeString_(targetUser.Role) !== 'Administrator') {
      throw new Error('Promote that person to Administrator first, then transfer ownership.');
    }
    if (!isActiveAccountStatus_(targetUser['Account Status'])) {
      throw new Error('The new Super Admin must have an active account.');
    }
    var previousOwner = getSuperAdminUserId_();
    setSettingValue_('SUPER_ADMIN_USER_ID', userId, authContext.user.userId);
    writeAuditLog_(
      authContext.user,
      'OWNERSHIP_TRANSFER',
      'Users',
      userId,
      'Transferred Super Admin ownership.',
      previousOwner,
      userId
    );
    return successResponse_('Ownership transferred. That user is now the Super Admin.', {
      superAdminUserId: userId
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to transfer ownership.');
  }
}

function mapUserForListResponse_(record, credential, actor) {
  var entry = credential || {};
  var userId = normalizeString_(record['User ID']);
  var role = normalizeString_(record.Role);
  var isSuperAdmin = isSuperAdminUser_(userId);
  var isSelf = Boolean(actor && normalizeString_(actor.userId) === userId);
  var actorIsSuperAdmin = Boolean(actor && isSuperAdminUser_(actor.userId));
  var isAdminRole = role === 'Administrator';
  return {
    userId: userId,
    username: normalizeString_(entry.username),
    fullName: normalizeString_(record['Full Name']),
    email: normalizeEmail_(record['Google Email']),
    employeeId: normalizeString_(record['Employee ID']),
    department: normalizeString_(record.Department),
    jobTitle: normalizeString_(record['Job Title']),
    role: role,
    displayRole: isSuperAdmin ? 'Super Admin' : isStaffLikeRole_(role) ? 'Staff' : role,
    isSuperAdmin: isSuperAdmin,
    isSelf: isSelf,
    supervisorId: normalizeString_(record['Supervisor ID']),
    accountStatus: normalizeString_(record['Account Status']),
    credentialStatus: normalizeString_(entry.username ? entry.credentialStatus || 'Active' : 'Not Set'),
    lockoutUntil: normalizeString_(entry.lockoutUntil),
    lastLogin: toClientDate_(record['Last Login']),
    updatedDate: toClientDate_(record['Updated Date']),
    canSetPassword: !isSelf && (actorIsSuperAdmin || !isAdminRole),
    canChangeStatus: !isSelf && !isSuperAdmin && (actorIsSuperAdmin || !isAdminRole),
    canDelete: !isSelf && !isSuperAdmin && (actorIsSuperAdmin || !isAdminRole),
    canPromoteAdmin: actorIsSuperAdmin && !isSelf && !isSuperAdmin && !isAdminRole,
    canDemoteAdmin: actorIsSuperAdmin && !isSelf && !isSuperAdmin && isAdminRole,
    canTransferOwnership: actorIsSuperAdmin && !isSelf && isAdminRole && !isSuperAdmin
  };
}
