function registerWithPassword(payload) {
  try {
    var input = payload || {};
    var username = normalizeUsername_(input.username);
    var fullName = normalizeString_(input.fullName) || deriveNameFromUsername_(username);
    var email = normalizeEmail_(input.email);
    var password = String(input.password || '');
    var confirmPassword = String(input.confirmPassword || '');

    if (!username) {
      throw new Error('Username is required.');
    }
    if (!fullName) {
      throw new Error('Full name is required.');
    }
    if (!password) {
      throw new Error('Password is required.');
    }
    assertValidUsername_(username);
    assertPasswordStrength_(password);
    if (confirmPassword && confirmPassword !== password) {
      throw new Error('Password and confirmation do not match.');
    }

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
      'Employee ID': '',
      Department: '',
      'Job Title': '',
      Role: 'Employee',
      'Supervisor ID': '',
      'Account Status': 'Pending Approval',
      'First Login': '',
      'Last Login': '',
      'Last Activity': '',
      'Created By': username,
      'Created Date': now,
      'Updated By': username,
      'Updated Date': now
    };

    applyEmployeeDirectoryToUser_(userRecord);
    appendSheetRecord_(sheet, schema.columns, userRecord);
    userRecord.__rowNumber = Math.max(getLastPopulatedRow_(sheet), 2);
    setUserCredential_(userId, username, password, userId);

    writeAuditLog_(
      {
        userId: userId,
        fullName: fullName
      },
      'REGISTER',
      'Authentication',
      userId,
      'Username/password account registered with pending approval.',
      '',
      {
        username: username,
        accountStatus: userRecord['Account Status']
      }
    );

    return successResponse_('Registration submitted. Wait for administrator approval.', {
      requiresApproval: true,
      accountStatus: 'Pending Approval',
      user: mapUserRecordToSessionUser_(userRecord)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Registration failed.');
  }
}

function loginWithPassword(payload) {
  try {
    var input = payload || {};
    var username = normalizeUsername_(input.username);
    var password = String(input.password || '');
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    var credential = getUserCredentialRecordByUsername_(username);
    if (!credential) {
      throw new Error('Invalid username or password.');
    }
    if (!isCredentialActive_(credential)) {
      throw new Error('This login account is disabled. Contact an administrator.');
    }
    if (isCredentialCurrentlyLocked_(credential)) {
      var lockoutUntil = getCredentialLockoutUntilDate_(credential);
      throw new Error(
        'Too many failed attempts. Try again after ' + formatDateInTimezone_(lockoutUntil, 'dd/MM/yyyy HH:mm')
      );
    }

    if (!verifyCredentialPassword_(credential, password)) {
      var failureState = registerCredentialFailedAttempt_(credential);
      if (failureState.locked) {
        throw new Error(
          'Too many failed attempts. Try again after ' +
            formatDateInTimezone_(failureState.lockoutUntil, 'dd/MM/yyyy HH:mm')
        );
      }
      throw new Error('Invalid username or password.');
    }

    credential = clearCredentialFailureState_(credential, credential['User ID']);
    touchCredentialLastLogin_(credential, credential['User ID']);

    var userRecord = getUserRecordByUserId_(credential['User ID']);
    if (!userRecord) {
      throw new Error('User account no longer exists.');
    }
    var user = mapUserRecordToSessionUser_(userRecord);

    if (!isActiveAccountStatus_(user.accountStatus)) {
      return successResponse_(buildInactiveStatusMessage_(user.accountStatus), {
        requiresApproval: true,
        accountStatus: user.accountStatus,
        user: user
      });
    }

    var updatedRecord = refreshUserLoginState_(userRecord);
    var activeUser = mapUserRecordToSessionUser_(updatedRecord);
    var session = createSession_(activeUser);

    writeAuditLog_(
      activeUser,
      'LOGIN',
      'Authentication',
      activeUser.userId,
      'User signed in successfully with username/password.',
      '',
      {
        role: activeUser.role,
        accountStatus: activeUser.accountStatus,
        username: activeUser.username
      }
    );

    return successResponse_('Login successful.', {
      sessionToken: session.sessionToken,
      sessionTtlSeconds: session.ttlSeconds,
      user: activeUser
    });
  } catch (error) {
    return errorResponse_(error.message || 'Login failed.');
  }
}

function getAppBootstrap(sessionToken, activePage) {
  try {
    var pageName = normalizeString_(activePage || '').toLowerCase();
    if (!PAGE_TEMPLATES[pageName]) {
      pageName = 'dashboard';
    }

    var authContext = requireSession_(sessionToken, [], pageName, { skipActivity: true });
    var user = authContext.user;
    var settings = getSettingsMap_();
    var compactSettings = {
      APP_TITLE: settings.APP_TITLE || getAppTitle_(),
      DUE_SOON_DAYS: settings.DUE_SOON_DAYS,
      DEFAULT_PAGE_SIZE: settings.DEFAULT_PAGE_SIZE,
      REQUIRE_ASSIGNMENT_ACCEPTANCE: settings.REQUIRE_ASSIGNMENT_ACCEPTANCE,
      REQUIRE_COMPLETION_NOTES: settings.REQUIRE_COMPLETION_NOTES,
      ALLOW_COMPLETION_BELOW_100: settings.ALLOW_COMPLETION_BELOW_100
    };

    return successResponse_('Bootstrap loaded.', {
      user: user,
      settings: compactSettings,
      dimensions: getDimensionValuesMap_(),
      unreadNotifications: getUnreadNotificationsCount_(user.userId),
      allowedPages: getAllowedPagesForRole_(user.role)
    });
  } catch (error) {
    return errorResponse_(error.message || 'Unable to load session bootstrap.');
  }
}

function logoutSession(sessionToken) {
  try {
    var context = null;
    try {
      context = requireSession_(sessionToken);
    } catch (ignore) {
      context = null;
    }
    deleteSession_(sessionToken);
    if (context && context.user) {
      writeAuditLog_(
        context.user,
        'LOGOUT',
        'Authentication',
        context.user.userId,
        'User logged out.',
        '',
        ''
      );
    }
    return successResponse_('Logged out successfully.');
  } catch (error) {
    return errorResponse_(error.message || 'Logout failed.');
  }
}

function splitNameParts_(fullName) {
  var normalized = normalizeString_(fullName);
  var tokens = normalized.split(/\s+/).filter(Boolean);
  return {
    givenName: tokens[0] || normalized,
    familyName: tokens.slice(1).join(' ')
  };
}

function buildInactiveStatusMessage_(accountStatus) {
  var status = normalizeString_(accountStatus).toLowerCase();
  if (status === 'pending approval') {
    return 'Your account is pending administrator approval.';
  }
  if (status === 'suspended') {
    return 'Your account is suspended. Contact an administrator.';
  }
  if (status === 'disabled') {
    return 'Your account is disabled. Contact an administrator.';
  }
  return 'Your account is not active. Contact an administrator.';
}

function touchCredentialLastLogin_(credentialRecord, actorId) {
  if (!credentialRecord || !credentialRecord.__rowNumber) {
    return;
  }
  var schema = resolveSchema_('USER_CREDENTIALS');
  var sheet = getSheetBySchema_(schema);
  var updated = Object.assign({}, credentialRecord);
  updated['Last Login'] = new Date();
  updated['Updated Date'] = new Date();
  updated['Updated By'] = normalizeString_(actorId || credentialRecord['User ID'] || 'system');
  updateSheetRecordByRow_(sheet, credentialRecord.__rowNumber, schema.columns, updated);
  EXECUTION_CREDENTIALS_CACHE_ = null;
}

function refreshUserLoginState_(userRecord) {
  var schema = resolveSchema_('USERS');
  var usersSheet = getSheetBySchema_(schema);
  var now = new Date();
  var updatedRecord = Object.assign({}, userRecord);

  if (!updatedRecord['First Login']) {
    updatedRecord['First Login'] = now;
  }
  updatedRecord['Last Login'] = now;
  updatedRecord['Last Activity'] = now;
  updatedRecord['Updated Date'] = now;
  updatedRecord['Updated By'] = normalizeString_(updatedRecord['User ID']);

  updateSheetRecordByRow_(usersSheet, userRecord.__rowNumber, schema.columns, updatedRecord);
  updatedRecord.__rowNumber = userRecord.__rowNumber;
  return updatedRecord;
}

function getAllowedPagesForRole_(role) {
  var normalizedRole = normalizeString_(role);
  return Object.keys(PAGE_ROLE_ACCESS).filter(function (page) {
    return PAGE_ROLE_ACCESS[page].indexOf(normalizedRole) > -1;
  });
}
