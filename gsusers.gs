function createUserAccount(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'users');
    var input = payload || {};
    var username = normalizeUsername_(input.username);
    var fullName = normalizeString_(input.fullName);
    var email = normalizeEmail_(input.email);
    var password = String(input.password || '');
    var role = normalizeString_(input.role || 'Employee');
    if (!username || !fullName || !password) {
      throw new Error('Username, full name and password are required.');
    }
    assertValidUsername_(username);
    assertPasswordStrength_(password);
    if (getUserCredentialRecordByUsername_(username)) {
      throw new Error('Username is already in use.');
    }
    if (email && getUserRecordByEmail_(email)) {
      throw new Error('A user with this email already exists.');
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
      'Employee ID': normalizeString_(input.employeeId),
      Department: normalizeString_(input.department),
      'Job Title': normalizeString_(input.jobTitle),
      Role: role,
      'Supervisor ID': normalizeString_(input.supervisorId),
      'Account Status': normalizeString_(input.accountStatus || 'Active'),
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
    if (userRecord['Employee ID']) {
      upsertEmployeeFromUser_(userRecord);
    }
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
    requireSession_(sessionToken, ['Administrator'], 'users');
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
        return mapUserForListResponse_(record, credentialsByUserId[userId] || {});
      })
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
    if (!password) {
      throw new Error('newPassword is required.');
    }

    var userRecord = getUserRecordByUserId_(userId);
    if (!userRecord) {
      throw new Error('User was not found.');
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
      var previous = mapUserForListResponse_(targetUser, getCredentialIndexByUserId_()[userId] || {});
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

function mapUserForListResponse_(record, credential) {
  var entry = credential || {};
  return {
    userId: normalizeString_(record['User ID']),
    username: normalizeString_(entry.username),
    fullName: normalizeString_(record['Full Name']),
    email: normalizeEmail_(record['Google Email']),
    employeeId: normalizeString_(record['Employee ID']),
    department: normalizeString_(record.Department),
    jobTitle: normalizeString_(record['Job Title']),
    role: normalizeString_(record.Role),
    supervisorId: normalizeString_(record['Supervisor ID']),
    accountStatus: normalizeString_(record['Account Status']),
    credentialStatus: normalizeString_(entry.username ? entry.credentialStatus || 'Active' : 'Not Set'),
    lockoutUntil: normalizeString_(entry.lockoutUntil),
    lastLogin: toClientDate_(record['Last Login']),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}
