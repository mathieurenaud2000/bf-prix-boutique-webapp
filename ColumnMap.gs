function buildColumnMap(headers) {
  if (!Array.isArray(headers)) {
    return createError("ERR_INVALID_HEADERS_INPUT", "Headers must be an array.", {
      receivedType: typeof headers
    });
  }

  var headerToCol = {};
  var colToHeader = {};
  var seenHeaders = {};
  var index;
  var rawHeader;
  var headerName;
  var missingHeaders;

  for (index = 0; index < headers.length; index += 1) {
    rawHeader = headers[index];

    if (rawHeader === null || typeof rawHeader === "undefined") {
      continue;
    }

    if (typeof rawHeader === "string") {
      headerName = rawHeader.trim();
    } else {
      headerName = String(rawHeader).trim();
    }

    if (headerName === "") {
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(seenHeaders, headerName)) {
      return createError("ERR_DUPLICATE_HEADERS", "Duplicate header detected.", {
        header: headerName
      });
    }

    seenHeaders[headerName] = true;
    headerToCol[headerName] = index + 1;
    colToHeader[String(index + 1)] = headerName;
  }

  if (Object.keys(headerToCol).length === 0) {
    return createError("ERR_EMPTY_HEADER_MAPPING", "No valid headers found.", {});
  }

  missingHeaders = REQUIRED_HEADERS.filter(function(header) {
    return !Object.prototype.hasOwnProperty.call(headerToCol, header);
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

  return {
    ok: true,
    data: {
      headerToCol: headerToCol,
      colToHeader: colToHeader
    }
  };
}
