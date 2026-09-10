var PAGE_TEMPLATES = {
  dashboard: 'index',
  mytasks: 'mytasks',
  tasks: 'tasks',
  assignments: 'assignments',
  employees: 'employees',
  teams: 'teams',
  departments: 'departments',
  progress: 'progress',
  monitoring: 'monitoring',
  dailyprogress: 'dailyprogress',
  weeklyprogress: 'weeklyprogress',
  monthlyprogress: 'monthlyprogress',
  reports: 'reports',
  performance: 'performance',
  notifications: 'notifications',
  audit: 'audit',
  users: 'users',
  settings: 'settings',
  login: 'login'
};

var PAGE_TITLES = {
  dashboard: 'Dashboard',
  mytasks: 'My Tasks',
  tasks: 'Task Management',
  assignments: 'Task Assignments',
  employees: 'Staff',
  teams: 'Teams',
  departments: 'Departments',
  progress: 'Progress Updates',
  monitoring: 'Task Monitoring',
  dailyprogress: 'Daily Progress',
  weeklyprogress: 'Weekly Progress',
  monthlyprogress: 'Monthly Progress',
  reports: 'Reports',
  performance: 'Performance',
  notifications: 'Notifications',
  audit: 'Audit Log',
  users: 'User Management',
  settings: 'System Settings',
  login: 'Sign in'
};

var NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', group: 'Work', svg: '<path d="M3 13h8V3H3v10zm10 8h8V11h-8v10zM3 21h8v-6H3v6zm10-18v6h8V3h-8z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'] },
  { id: 'mytasks', label: 'My Tasks', group: 'Work', svg: '<path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'] },
  { id: 'tasks', label: 'Tasks', group: 'Work', svg: '<path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'] },
  { id: 'assignments', label: 'Assignments', group: 'Work', svg: '<path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.9 2 2.1 2 3.4V19h7v-2.5c0-2.3-4.7-3.5-8-3.5z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'] },
  { id: 'progress', label: 'Progress', group: 'Work', svg: '<path d="M5 9h3v10H5V9zm6-4h3v14h-3V5zm6 8h3v6h-3v-6z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'] },
  { id: 'monitoring', label: 'Monitoring', group: 'Work', svg: '<path d="M12 4.5C7 4.5 2.7 7.6 1 12c1.7 4.4 6 7.5 11 7.5s9.3-3.1 11-7.5C21.3 7.6 17 4.5 12 4.5zM12 17a5 5 0 110-10 5 5 0 010 10zm0-8a3 3 0 100 6 3 3 0 000-6z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'] },
  { id: 'dailyprogress', label: 'Daily Progress', group: 'Reports', svg: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>', roles: ['Administrator', 'Manager', 'Supervisor'] },
  { id: 'weeklyprogress', label: 'Weekly Progress', group: 'Reports', svg: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h2v2H7zm4 0h2v2h-2zm4 0h2v2h-2z"/>', roles: ['Administrator', 'Manager', 'Supervisor'] },
  { id: 'monthlyprogress', label: 'Monthly Progress', group: 'Reports', svg: '<path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z"/>', roles: ['Administrator', 'Manager', 'Supervisor'] },
  { id: 'reports', label: 'Reports', group: 'Reports', svg: '<path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>', roles: ['Administrator', 'Manager', 'Supervisor'] },
  { id: 'performance', label: 'Performance', group: 'Reports', svg: '<path d="M12 17.3l6.2 3.7-1.7-7L22 9.2l-7.2-.6L12 2 9.2 8.6 2 9.2 7.5 14l-1.7 7z"/>', roles: ['Administrator', 'Manager', 'Supervisor'] },
  { id: 'teams', label: 'Teams', group: 'Organisation', svg: '<path d="M16 11c1.7 0 3-1.3 3-3s-1.3-3-3-3-3 1.3-3 3 1.3 3 3 3zM8 11c1.7 0 3-1.3 3-3S9.7 5 8 5 5 6.3 5 8s1.3 3 3 3zm0 2c-2.3 0-7 1.2-7 3.5V19h14v-2.5C15 14.2 10.3 13 8 13zm8 0c-.3 0-.6 0-1 .1 1.2.9 2 2.1 2 3.4V19h7v-2.5c0-2.3-4.7-3.5-8-3.5z"/>', roles: ['Administrator', 'Manager'] },
  { id: 'departments', label: 'Departments', group: 'Organisation', svg: '<path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>', roles: ['Administrator', 'Manager'] },
  { id: 'employees', label: 'Staff', group: 'Organisation', svg: '<path d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4z"/>', roles: ['Administrator', 'Manager'] },
  { id: 'notifications', label: 'Notifications', group: 'Admin', svg: '<path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.1-1.6-5.6-4.5-6.3V4c0-.8-.7-1.5-1.5-1.5S10.5 3.2 10.5 4v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2z"/>', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee', 'Staff'] },
  { id: 'audit', label: 'Audit Log', group: 'Admin', svg: '<path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2z"/>', roles: ['Administrator', 'Manager'] },
  { id: 'users', label: 'Users', group: 'Admin', svg: '<path d="M12 1L3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4zm0 10.2a2.5 2.5 0 110-5 2.5 2.5 0 010 5zm0 6.8c-2.1 0-4-.9-5.2-2.3.1-1.7 3.5-2.6 5.2-2.6s5.1.9 5.2 2.6C16 17.1 14.1 18 12 18z"/>', roles: ['Administrator'] },
  { id: 'settings', label: 'System Settings', group: 'Admin', svg: '<path d="M19.1 12.9c0-.3.1-.6.1-.9s0-.6-.1-.9l2.1-1.6c.2-.1.2-.4.1-.6l-2-3.5c-.1-.2-.4-.3-.6-.2l-2.5 1c-.5-.4-1.1-.7-1.7-.9l-.4-2.6c0-.2-.2-.4-.5-.4h-4c-.3 0-.5.2-.5.4l-.4 2.6c-.6.2-1.2.5-1.7.9l-2.5-1c-.2-.1-.5 0-.6.2l-2 3.5c-.1.2 0 .5.1.6L4.9 11c0 .3-.1.6-.1.9s0 .6.1.9l-2.1 1.6c-.2.1-.2.4-.1.6l2 3.5c.1.2.4.3.6.2l2.5-1c.5.4 1.1.7 1.7.9l.4 2.6c0 .2.2.4.5.4h4c.3 0 .5-.2.5-.4l.4-2.6c.6-.2 1.2-.5 1.7-.9l2.5 1c.2.1.5 0 .6-.2l2-3.5c.1-.2 0-.5-.1-.6l-2.1-1.6zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z"/>', roles: ['Administrator'] }
];

function buildNavGroups_(navItems) {
  var groups = [];
  var indexByName = {};
  (navItems || []).forEach(function (item) {
    var name = item.group || 'Menu';
    if (indexByName[name] === undefined) {
      indexByName[name] = groups.length;
      groups.push({ name: name, items: [] });
    }
    groups[indexByName[name]].items.push(item);
  });
  return groups;
}

function doGet(e) {
  var requestedPage = sanitizePageName_(e && e.parameter ? e.parameter.page : '');
  var activePage = PAGE_TEMPLATES[requestedPage] ? requestedPage : 'login';
  var isLoginPage = activePage === 'login';
  var contentTemplate = resolveTemplateOrFallback_(PAGE_TEMPLATES[activePage]);

  var template = HtmlService.createTemplateFromFile('template');
  template.activePage = activePage;
  template.contentTemplate = contentTemplate;
  template.pageTitle = PAGE_TITLES[activePage] || 'Tasks Management';
  template.appTitle = getAppTitle_();
  template.tabTitle = template.pageTitle + ' | KSL';
  template.scriptUrl = getScriptUrl();
  template.navItems = isLoginPage ? [] : NAV_ITEMS;
  template.navGroups = isLoginPage ? [] : buildNavGroups_(NAV_ITEMS);

  return template
    .evaluate()
    .setTitle(template.tabTitle)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getScriptUrl() {
  return toShareableWebAppUrl_(ScriptApp.getService().getUrl());
}

function resolveTemplateOrFallback_(filename) {
  try {
    HtmlService.createHtmlOutputFromFile(filename);
    return filename;
  } catch (error) {
    return 'comingsoon';
  }
}

function sanitizePageName_(input) {
  var page = String(input || '').toLowerCase().trim();
  if (!page) {
    return 'login';
  }

  if (!/^[a-z0-9]+$/.test(page)) {
    return 'login';
  }

  return page;
}

function getAppTitle_() {
  try {
    return getSettingValue_('APP_TITLE') || 'Kenya Shipyards Limited Tasks Management System';
  } catch (error) {
    return 'Kenya Shipyards Limited Tasks Management System';
  }
}
