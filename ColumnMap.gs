function buildColumnMap(headers) {
  var missingHeaders = REQUIRED_HEADERS.filter(function(requiredHeader) {
    return headers.indexOf(requiredHeader) === -1;
  });

  if (missingHeaders.length > 0) {
    return createError(
      "ERR_MISSING_REQUIRED_HEADERS",
      "One or more required headers are missing.",
      {
        missingHeaders: missingHeaders
      }
    );
  }

  var headerToCol = {};
  var colToHeader = {};

  headers.forEach(function(header, index) {
    if (header === null) {
      return;
    }

    headerToCol[header] = index + 1;
    colToHeader[String(index + 1)] = header;
  });

  return {
    headerToCol: headerToCol,
    colToHeader: colToHeader
  };
}
