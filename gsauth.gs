function loginWithGoogle(idToken) {
  try {
    var claims = verifyGoogleIdToken_(idToken);
    var userRecord = upsertUserFromGoogleClaims_(claims);
    var user = mapUserRecordToSessionUser_(userRecord);

    if (!isActiveAccountStatus_(user.accountStatus)) {
      return successResponse_('Your account is pending administrator approval.', {
        accountStatus: user.accountStatus,
        requiresApproval: true,
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
      'User signed in successfully.',
      '',
      {
        role: activeUser.role,
        accountStatus: activeUser.accountStatus
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

function loginWithWorkspaceSession() {
  try {
    var sessionEmail = getWorkspaceSessionEmail_();
    if (!sessionEmail) {
      throw new Error(
        'Unable to detect your Google email from Apps Script session. Redeploy as "Execute as: User accessing the web app" and access: your organization or Google-account users.'
      );
    }

    var userRecord = upsertUserFromSessionEmail_(sessionEmail);
    var user = mapUserRecordToSessionUser_(userRecord);

    if (!isActiveAccountStatus_(user.accountStatus)) {
      return successResponse_('Your account is pending administrator approval.', {
        accountStatus: user.accountStatus,
        requiresApproval: true,
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
      'User signed in successfully through Apps Script session.',
      '',
      {
        role: activeUser.role,
        accountStatus: activeUser.accountStatus
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

    var authContext = requireSession_(sessionToken, [], pageName);
    var user = authContext.user;
    var settings = getSettingsMap_();

    return successResponse_('Bootstrap loaded.', {
      user: user,
      settings: settings,
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

function verifyGoogleIdToken_(idToken) {
  var token = normalizeString_(idToken);
  if (!token) {
    throw new Error('Missing Google ID token.');
  }

  var clientId = getGoogleClientId_();
  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is not configured in Settings or Script Properties.');
  }

  var endpoint = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(token);
  var response = UrlFetchApp.fetch(endpoint, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error('Google token verification failed.');
  }

  var claims = JSON.parse(response.getContentText());
  validateGoogleTokenClaims_(claims, clientId);
  return claims;
}

function getWorkspaceSessionEmail_() {
  var activeUserEmail = normalizeEmail_(Session.getActiveUser().getEmail());
  if (activeUserEmail) {
    return activeUserEmail;
  }

  var allowEffectiveFallback = normalizeBoolean_(
    getSettingValue_('ALLOW_EFFECTIVE_USER_FALLBACK', true)
  );
  if (!allowEffectiveFallback) {
    return '';
  }

  var effectiveUserEmail = normalizeEmail_(Session.getEffectiveUser().getEmail());
  return effectiveUserEmail;
}

function validateGoogleTokenClaims_(claims, expectedClientId) {
  if (!claims || typeof claims !== 'object') {
    throw new Error('Invalid Google token response.');
  }

  var issuer = normalizeString_(claims.iss);
  var audience = normalizeString_(claims.aud);
  var subject = normalizeString_(claims.sub);
  var expiresAt = normalizeNumber_(claims.exp, 0);
  var nowEpochSeconds = Math.floor(Date.now() / 1000);

  if (!subject) {
    throw new Error('Google token subject is missing.');
  }
  if (audience !== expectedClientId) {
    throw new Error('Google token audience does not match configured client ID.');
  }
  if (issuer !== 'https://accounts.google.com' && issuer !== 'accounts.google.com') {
    throw new Error('Google token issuer is invalid.');
  }
  if (expiresAt <= nowEpochSeconds) {
    throw new Error('Google token is expired.');
  }
}

function upsertUserFromSessionEmail_(email) {
  var schema = resolveSchema_('USERS');
  var usersSheet = getSheetBySchema_(schema);
  var existingRecord = getUserRecordByEmail_(email);
  var now = new Date();

  if (existingRecord) {
    var updatedRecord = Object.assign({}, existingRecord);
    updatedRecord['Google Email'] = normalizeEmail_(email);
    updatedRecord['Email Verified'] = 'TRUE';
    if (!normalizeString_(updatedRecord['Full Name'])) {
      updatedRecord['Full Name'] = deriveNameFromEmail_(email);
    }
    updatedRecord['Updated Date'] = now;
    updatedRecord['Updated By'] = normalizeString_(updatedRecord['User ID']);
    updateSheetRecordByRow_(usersSheet, existingRecord.__rowNumber, schema.columns, updatedRecord);
    updatedRecord.__rowNumber = existingRecord.__rowNumber;
    return updatedRecord;
  }

  var fullName = deriveNameFromEmail_(email);
  var record = {
    'User ID': generateSequenceId_('USR'),
    'Google Subject ID': '',
    'Google Email': normalizeEmail_(email),
    'Email Verified': 'TRUE',
    'Full Name': fullName,
    'Given Name': '',
    'Family Name': '',
    'Profile Photo': '',
    'Hosted Domain': '',
    'Employee ID': '',
    Department: '',
    'Job Title': '',
    Role: 'Employee',
    'Supervisor ID': '',
    'Account Status': 'Pending Approval',
    'First Login': now,
    'Last Login': now,
    'Last Activity': now,
    'Created By': normalizeEmail_(email),
    'Created Date': now,
    'Updated By': normalizeEmail_(email),
    'Updated Date': now
  };

  appendSheetRecord_(usersSheet, schema.columns, record);
  record.__rowNumber = usersSheet.getLastRow();

  writeAuditLog_(
    {
      userId: record['User ID'],
      fullName: fullName
    },
    'REGISTER',
    'Authentication',
    record['User ID'],
    'First-time session login created pending account.',
    '',
    {
      accountStatus: record['Account Status'],
      role: record.Role
    }
  );

  return record;
}

function deriveNameFromEmail_(email) {
  var localPart = normalizeEmail_(email).split('@')[0] || '';
  if (!localPart) {
    return 'User';
  }
  var parts = localPart.split(/[._-]+/).filter(Boolean);
  if (!parts.length) {
    return localPart;
  }
  return parts
    .map(function (part) {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function upsertUserFromGoogleClaims_(claims) {
  var schema = resolveSchema_('USERS');
  var usersSheet = getSheetBySchema_(schema);
  var existingRecord = getUserRecordByGoogleSubject_(claims.sub);
  var emailMatchRecord = null;
  if (!existingRecord) {
    emailMatchRecord = getUserRecordByEmail_(claims.email);
  }
  var now = new Date();

  if (existingRecord) {
    var updatedRecord = Object.assign({}, existingRecord);
    updatedRecord['Google Email'] = normalizeEmail_(claims.email);
    updatedRecord['Email Verified'] = claims.email_verified ? 'TRUE' : 'FALSE';
    updatedRecord['Full Name'] = normalizeString_(claims.name || updatedRecord['Full Name']);
    updatedRecord['Given Name'] = normalizeString_(claims.given_name || updatedRecord['Given Name']);
    updatedRecord['Family Name'] = normalizeString_(claims.family_name || updatedRecord['Family Name']);
    updatedRecord['Profile Photo'] = normalizeString_(claims.picture || updatedRecord['Profile Photo']);
    updatedRecord['Hosted Domain'] = normalizeString_(claims.hd || updatedRecord['Hosted Domain']);
    updatedRecord['Updated Date'] = now;
    updatedRecord['Updated By'] = normalizeString_(existingRecord['User ID']);

    updateSheetRecordByRow_(usersSheet, existingRecord.__rowNumber, schema.columns, updatedRecord);
    updatedRecord.__rowNumber = existingRecord.__rowNumber;
    return updatedRecord;
  }

  if (emailMatchRecord) {
    var linkedRecord = Object.assign({}, emailMatchRecord);
    linkedRecord['Google Subject ID'] = normalizeString_(claims.sub);
    linkedRecord['Google Email'] = normalizeEmail_(claims.email);
    linkedRecord['Email Verified'] = claims.email_verified ? 'TRUE' : 'FALSE';
    linkedRecord['Full Name'] = normalizeString_(claims.name || linkedRecord['Full Name']);
    linkedRecord['Given Name'] = normalizeString_(claims.given_name || linkedRecord['Given Name']);
    linkedRecord['Family Name'] = normalizeString_(claims.family_name || linkedRecord['Family Name']);
    linkedRecord['Profile Photo'] = normalizeString_(claims.picture || linkedRecord['Profile Photo']);
    linkedRecord['Hosted Domain'] = normalizeString_(claims.hd || linkedRecord['Hosted Domain']);
    linkedRecord['Updated Date'] = now;
    linkedRecord['Updated By'] = normalizeString_(linkedRecord['User ID']);
    updateSheetRecordByRow_(usersSheet, emailMatchRecord.__rowNumber, schema.columns, linkedRecord);
    linkedRecord.__rowNumber = emailMatchRecord.__rowNumber;

    writeAuditLog_(
      {
        userId: normalizeString_(linkedRecord['User ID']),
        fullName: normalizeString_(linkedRecord['Full Name'])
      },
      'ACCOUNT_LINK',
      'Authentication',
      normalizeString_(linkedRecord['User ID']),
      'Linked Google subject to existing email-based account.',
      '',
      {
        email: normalizeEmail_(claims.email),
        role: normalizeString_(linkedRecord.Role),
        accountStatus: normalizeString_(linkedRecord['Account Status'])
      }
    );

    return linkedRecord;
  }

  var newUserRecord = {
    'User ID': generateSequenceId_('USR'),
    'Google Subject ID': normalizeString_(claims.sub),
    'Google Email': normalizeEmail_(claims.email),
    'Email Verified': claims.email_verified ? 'TRUE' : 'FALSE',
    'Full Name': normalizeString_(claims.name),
    'Given Name': normalizeString_(claims.given_name),
    'Family Name': normalizeString_(claims.family_name),
    'Profile Photo': normalizeString_(claims.picture),
    'Hosted Domain': normalizeString_(claims.hd),
    'Employee ID': '',
    Department: '',
    'Job Title': '',
    Role: 'Employee',
    'Supervisor ID': '',
    'Account Status': 'Pending Approval',
    'First Login': now,
    'Last Login': now,
    'Last Activity': now,
    'Created By': normalizeString_(claims.sub),
    'Created Date': now,
    'Updated By': normalizeString_(claims.sub),
    'Updated Date': now
  };

  appendSheetRecord_(usersSheet, schema.columns, newUserRecord);
  var insertedRow = usersSheet.getLastRow();
  newUserRecord.__rowNumber = insertedRow;

  writeAuditLog_(
    {
      userId: newUserRecord['User ID'],
      fullName: newUserRecord['Full Name']
    },
    'REGISTER',
    'Authentication',
    newUserRecord['User ID'],
    'First-time Google sign-in created pending account.',
    '',
    {
      accountStatus: newUserRecord['Account Status'],
      role: newUserRecord.Role
    }
  );

  return newUserRecord;
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
