function getLoginConfiguration() {
  return successResponse_('Login configuration loaded.', {
    appTitle: getAppTitle_(),
    scriptUrl: getScriptUrl(),
    authMode: getSettingValue_('AUTH_MODE', 'PASSWORD'),
    minPasswordLength: getPasswordMinLength_()
  });
}
