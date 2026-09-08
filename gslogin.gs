function getLoginConfiguration() {
  return successResponse_('Login configuration loaded.', {
    appTitle: getAppTitle_(),
    scriptUrl: getScriptUrl(),
    googleClientId: getGoogleClientId_()
  });
}
