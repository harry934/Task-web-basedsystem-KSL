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
  employees: 'Employees',
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
  settings: 'Settings',
  login: 'Authentication And Login'
};

var NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fa-chart-line', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader', 'Employee'] },
  { id: 'tasks', label: 'Tasks', icon: 'fa-list-check', roles: ['Administrator', 'Manager', 'Supervisor', 'Team Leader'] },
  { id: 'departments', label: 'Departments', icon: 'fa-building', roles: ['Administrator', 'Manager'] },
  { id: 'users', label: 'Users', icon: 'fa-user-shield', roles: ['Administrator'] },
  { id: 'settings', label: 'Settings', icon: 'fa-gear', roles: ['Administrator'] }
];

function doGet(e) {
  var requestedPage = sanitizePageName_(e && e.parameter ? e.parameter.page : '');
  var activePage = PAGE_TEMPLATES[requestedPage] ? requestedPage : 'dashboard';
  var contentTemplate = resolveTemplateOrFallback_(PAGE_TEMPLATES[activePage]);

  var template = HtmlService.createTemplateFromFile('template');
  template.activePage = activePage;
  template.contentTemplate = contentTemplate;
  template.pageTitle = PAGE_TITLES[activePage] || 'Tasks Management';
  template.appTitle = getAppTitle_();
  template.scriptUrl = getScriptUrl();
  template.navItems = NAV_ITEMS;
  template.googleClientId = getGoogleClientId_();
  template.logoUrl = KSL_OFFICIAL_LOGO_URL;

  return template
    .evaluate()
    .setTitle(template.pageTitle + ' | ' + template.appTitle)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getScriptUrl() {
  return ScriptApp.getService().getUrl();
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
    return 'dashboard';
  }

  if (!/^[a-z0-9]+$/.test(page)) {
    return 'dashboard';
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
