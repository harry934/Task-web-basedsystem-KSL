function getLogoUrl_() {
  return getLogoDataUri();
}

function getLogoDataUri() {
  return HtmlService.createHtmlOutputFromFile('logo-data').getContent().replace(/^\s+|\s+$/g, '');
}
