function registerWithPassword() {
  return errorResponse_('Self-registration is disabled. Ask an administrator to create your account.');
}

function assertLoginRateLimit_() {
  var cache = CacheService.getScriptCache();
  var count = normalizeNumber_(cache.get('GLOBAL_LOGIN_FAIL'), 0);
  if (count >= 25) {
    throw new Error('Too many sign-in attempts. Wait a few minutes and try again.');
  }
}

function bumpLoginFailure_() {
  var cache = CacheService.getScriptCache();
  var count = normalizeNumber_(cache.get('GLOBAL_LOGIN_FAIL'), 0) + 1;
  cache.put('GLOBAL_LOGIN_FAIL', String(count), 300);
}

function loginWithPassword(payload) {
  try {
    assertLoginRateLimit_();
    var input = payload || {};
    var username = normalizeUsername_(input.username);
    var password = String(input.password || '');
    if (!username || !password) {
      throw new Error('Username and password are required.');
    }

    var credential = getUserCredentialRecordByUsername_(username);
    if (!credential) {
      bumpLoginFailure_();
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
      bumpLoginFailure_();
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
    if (!PAGE_TEMPLATES[pageName] || pageName === 'login') {
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
      ALLOW_COMPLETION_BELOW_100: settings.ALLOW_COMPLETION_BELOW_100,
      MAX_SUBTASK_PDF_MB: settings.MAX_SUBTASK_PDF_MB || '2'
    };

    return successResponse_('Bootstrap loaded.', {
      user: user,
      settings: compactSettings,
      unreadNotifications: getUnreadNotificationsCount_(user.userId, user.employeeId),
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
  return Object.keys(PAGE_ROLE_ACCESS).filter(function (page) {
    return isRoleAllowedForPage_(role, page);
  });
}
