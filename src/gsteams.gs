function listTeams(sessionToken, options) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager'], 'teams');
    var filters = options || {};
    var query = normalizeString_(filters.query).toLowerCase();
    var departmentFilter = normalizeString_(filters.department).toLowerCase();
    var leaderFilter = normalizeString_(filters.teamLeader).toLowerCase();
    var statusFilter = normalizeString_(filters.status).toLowerCase();
    var page = normalizeNumber_(filters.page, 1);
    var pageSize = normalizeNumber_(filters.pageSize, 25);

    var teams = safeReadSheetRecords_('TEAMS')
      .filter(function (record) {
        var status = normalizeString_(record.Status).toLowerCase();
        var department = normalizeString_(record.Department).toLowerCase();
        var leader = normalizeString_(record['Team Leader']).toLowerCase();
        var searchText = [
          record['Team ID'],
          record['Team Name'],
          record.Department,
          record['Team Leader'],
          record['Team Description']
        ]
          .join(' ')
          .toLowerCase();
        if (statusFilter && status !== statusFilter) {
          return false;
        }
        if (departmentFilter && department !== departmentFilter) {
          return false;
        }
        if (leaderFilter && leader.indexOf(leaderFilter) === -1) {
          return false;
        }
        if (query && searchText.indexOf(query) === -1) {
          return false;
        }
        return true;
      })
      .map(mapTeamForResponse_)
      .sort(function (a, b) {
        return new Date(b.updatedDate || 0).getTime() - new Date(a.updatedDate || 0).getTime();
      });

    return successResponse_('Teams loaded successfully.', buildPagedResult_(teams, page, pageSize));
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load teams.');
  }
}

function listActiveTeams(sessionToken) {
  try {
    requireSession_(sessionToken, ['Administrator', 'Manager', 'Supervisor', 'Team Leader'], 'tasks');
    var teams = safeReadSheetRecords_('TEAMS')
      .filter(function (record) {
        return normalizeString_(record.Status).toLowerCase() === 'active';
      })
      .map(function (record) {
        return {
          teamId: normalizeString_(record['Team ID']),
          teamName: normalizeString_(record['Team Name']),
          department: normalizeString_(record.Department)
        };
      });
    return successResponse_('Active teams loaded.', { items: teams });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to load active teams.');
  }
}

function createTeam(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'teams');
    var input = payload || {};
    var teamName = normalizeString_(input.teamName);
    var department = normalizeString_(input.department);
    var status = normalizeString_(input.status || 'Active');
    if (!teamName) {
      throw new Error('Team name is required.');
    }
    if (!department) {
      throw new Error('Department is required.');
    }
    if (!isValidTeamStatus_(status)) {
      throw new Error('Team status must be Active or Archived.');
    }

    return withScriptLock_(function () {
      var schema = resolveSchema_('TEAMS');
      var sheet = getSheetBySchema_(schema);
      var existing = safeReadSheetRecords_(schema).find(function (record) {
        return (
          normalizeString_(record['Team Name']).toLowerCase() === teamName.toLowerCase() &&
          normalizeString_(record.Status).toLowerCase() !== 'archived'
        );
      });
      if (existing) {
        throw new Error('An active team with the same name already exists.');
      }

      var now = new Date();
      var teamId = generateSequenceIdUnlocked_('TEM');
      var record = {
        'Team ID': teamId,
        'Team Name': teamName,
        Department: department,
        'Team Leader': normalizeString_(input.teamLeader),
        'Team Description': normalizeString_(input.teamDescription),
        Status: status,
        'Created Date': now,
        'Created By': authContext.user.userId,
        'Updated Date': now,
        'Updated By': authContext.user.userId
      };
      appendSheetRecord_(sheet, schema.columns, record);
      writeAuditLog_(
        authContext.user,
        'CREATE',
        'Teams',
        teamId,
        'Created a new team.',
        '',
        mapTeamForResponse_(record)
      );
      return successResponse_('New team created.', {
        teamId: teamId,
        team: mapTeamForResponse_(record)
      });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to create team.');
  }
}

function updateTeam(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'teams');
    var input = payload || {};
    var teamId = normalizeString_(input.teamId);
    var teamName = normalizeString_(input.teamName);
    if (!teamId || !teamName) {
      throw new Error('teamId and teamName are required.');
    }

    return withScriptLock_(function () {
      var schema = resolveSchema_('TEAMS');
      var sheet = getSheetBySchema_(schema);
      var allTeams = safeReadSheetRecords_(schema);
      var target = allTeams.find(function (record) {
        return normalizeString_(record['Team ID']) === teamId;
      });
      if (!target) {
        throw new Error('Team was not found.');
      }
      var duplicate = allTeams.find(function (record) {
        if (normalizeString_(record['Team ID']) === teamId) {
          return false;
        }
        return (
          normalizeString_(record['Team Name']).toLowerCase() === teamName.toLowerCase() &&
          normalizeString_(record.Status).toLowerCase() !== 'archived'
        );
      });
      if (duplicate) {
        throw new Error('Another team already uses the same name.');
      }

      var updated = Object.assign({}, target);
      var previous = mapTeamForResponse_(target);
      var nextStatus = normalizeString_(input.status || target.Status || 'Active');
      if (!isValidTeamStatus_(nextStatus)) {
        throw new Error('Team status must be Active or Archived.');
      }
      updated['Team Name'] = teamName;
      updated.Department = normalizeString_(input.department);
      updated['Team Leader'] = normalizeString_(input.teamLeader);
      updated['Team Description'] = normalizeString_(input.teamDescription);
      updated.Status = nextStatus;
      updated['Updated Date'] = new Date();
      updated['Updated By'] = authContext.user.userId;
      if (normalizeString_(updated.Status).toLowerCase() === 'archived') {
        assertTeamCanArchive_(teamId, teamName);
      }
      updateSheetRecordByRow_(sheet, target.__rowNumber, schema.columns, updated);
      writeAuditLog_(
        authContext.user,
        'UPDATE',
        'Teams',
        teamId,
        'Updated team details.',
        previous,
        mapTeamForResponse_(updated)
      );
      return successResponse_('Team updated.', { teamId: teamId, team: mapTeamForResponse_(updated) });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to update team.');
  }
}

function archiveTeam(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator', 'Manager'], 'teams');
    var teamId = normalizeString_(payload && payload.teamId);
    if (!teamId) {
      throw new Error('teamId is required.');
    }
    return withScriptLock_(function () {
      var schema = resolveSchema_('TEAMS');
      var sheet = getSheetBySchema_(schema);
      var records = safeReadSheetRecords_(schema);
      var target = records.find(function (record) {
        return normalizeString_(record['Team ID']) === teamId;
      });
      if (!target) {
        throw new Error('Team was not found.');
      }
      assertTeamCanArchive_(teamId, target['Team Name']);
      var previous = mapTeamForResponse_(target);
      var updated = Object.assign({}, target);
      updated.Status = 'Archived';
      updated['Updated Date'] = new Date();
      updated['Updated By'] = authContext.user.userId;
      updateSheetRecordByRow_(sheet, target.__rowNumber, schema.columns, updated);
      writeAuditLog_(
        authContext.user,
        'ARCHIVE',
        'Teams',
        teamId,
        'Archived team.',
        previous,
        mapTeamForResponse_(updated)
      );
      return successResponse_('Team archived.', { teamId: teamId });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to archive team.');
  }
}

function assertTeamCanArchive_(teamId, teamName) {
  var activeTaskCount = safeReadSheetRecords_('TASKS').filter(function (record) {
    var team = normalizeString_(record.Team);
    var sameTeam =
      team === normalizeString_(teamId) ||
      team.toLowerCase() === normalizeString_(teamName).toLowerCase();
    var isActive = normalizeString_(record['Record Status'] || 'Active').toLowerCase() !== 'archived';
    return sameTeam && isActive;
  }).length;
  if (activeTaskCount > 0) {
    throw new Error('Team has active task references and cannot be archived.');
  }
}

function deleteTeam(sessionToken, payload) {
  try {
    var authContext = requireSession_(sessionToken, ['Administrator'], 'teams');
    var teamId = normalizeString_(payload && payload.teamId);
    if (!teamId) {
      throw new Error('teamId is required.');
    }
    return withScriptLock_(function () {
      var schema = resolveSchema_('TEAMS');
      var sheet = getSheetBySchema_(schema);
      var records = safeReadSheetRecords_(schema);
      var target = records.find(function (record) {
        return normalizeString_(record['Team ID']) === teamId;
      });
      if (!target) {
        throw new Error('Team was not found.');
      }
      assertTeamCanArchive_(teamId, target['Team Name']);
      var previous = mapTeamForResponse_(target);
      deleteRowsByNumberDesc_(sheet, [target.__rowNumber]);
      writeAuditLog_(authContext.user, 'DELETE', 'Teams', teamId, 'Permanently deleted team.', previous, '');
      return successResponse_('Team deleted permanently.', { teamId: teamId });
    });
  } catch (error) {
    return errorResponse_(error.message || 'Failed to delete team.');
  }
}

function isValidTeamStatus_(status) {
  var normalized = normalizeString_(status).toLowerCase();
  return normalized === 'active' || normalized === 'archived';
}

function mapTeamForResponse_(record) {
  return {
    teamId: normalizeString_(record['Team ID']),
    teamName: normalizeString_(record['Team Name']),
    department: normalizeString_(record.Department),
    teamLeader: normalizeString_(record['Team Leader']),
    teamDescription: normalizeString_(record['Team Description']),
    status: normalizeString_(record.Status || 'Active'),
    createdDate: toClientDate_(record['Created Date']),
    updatedDate: toClientDate_(record['Updated Date'])
  };
}
