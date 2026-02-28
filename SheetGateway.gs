function getSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createError("ERR_SHEET_NOT_FOUND", "Configured sheet was not found.", {
      sheetName: SHEET_NAME
    });
  }

  return {
    ok: true,
    data: {
      sheet: sheet,
      name: SHEET_NAME
    }
  };
}

function readHeaderRow() {
  var sheetRes = getSheet();
  var sheet;
  var lastColumn;
  var headers;
  var columnMapRes;

  if (!sheetRes.ok) {
    return sheetRes;
  }

  sheet = sheetRes.data.sheet;
  lastColumn = sheet.getLastColumn();

  if (lastColumn < 1) {
    headers = [];
  } else {
    headers = sheet.getRange(HEADER_ROW, 1, 1, lastColumn).getValues()[0].map(function(value) {
      var normalizedValue;

      if (value === null || typeof value === "undefined") {
        return null;
      }

      normalizedValue = String(value).trim();
      return normalizedValue === "" ? null : normalizedValue;
    });
  }

  columnMapRes = buildColumnMap(headers);
  if (!columnMapRes.ok) {
    return columnMapRes;
  }

  return {
    ok: true,
    data: {
      headers: headers
    }
  };
}

function readDataRows() {
  var sheetRes = getSheet();
  var headerRes;
  var headers;
  var columnMapRes;
  var colToHeader;
  var sheet;
  var lastRow;
  var lastColumn;
  var rowCount;
  var values;
  var rows;

  if (!sheetRes.ok) {
    return sheetRes;
  }

  headerRes = readHeaderRow();
  if (!headerRes.ok) {
    return headerRes;
  }

  headers = headerRes.data.headers;
  columnMapRes = buildColumnMap(headers);
  if (!columnMapRes.ok) {
    return columnMapRes;
  }

  colToHeader = columnMapRes.data.colToHeader;
  sheet = sheetRes.data.sheet;
  lastRow = sheet.getLastRow();

  if (lastRow < DATA_START_ROW) {
    return {
      ok: true,
      data: {
        rows: []
      }
    };
  }

  lastColumn = sheet.getLastColumn();
  rowCount = lastRow - DATA_START_ROW + 1;
  values = sheet.getRange(DATA_START_ROW, 1, rowCount, lastColumn).getValues();

  rows = values.map(function(rowValues) {
    var rowObject = {};
    var colIndex;
    var header;
    var rawValue;
    var normalizedValue;

    for (colIndex = 1; colIndex <= lastColumn; colIndex += 1) {
      header = colToHeader[String(colIndex)];

      if (header === null || typeof header === "undefined") {
        continue;
      }

      rawValue = rowValues[colIndex - 1];

      if (header === "ok") {
        normalizedValue = rawValue === true ? true : null;
      } else {
        normalizedValue = rawValue === "" ? null : rawValue;
      }

      rowObject[header] = normalizedValue;
    }

    return rowObject;
  });

  return {
    ok: true,
    data: {
      rows: rows
    }
  };
}
