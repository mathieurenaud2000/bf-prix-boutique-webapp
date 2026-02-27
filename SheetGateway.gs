function getSheet() {
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return createError(
      "ERR_SHEET_NOT_FOUND",
      "Configured sheet was not found.",
      {
        sheetName: SHEET_NAME
      }
    );
  }

  return sheet;
}

function readHeaderRow() {
  var sheet = getSheet();
  if (sheet && sheet.ok === false) {
    return sheet;
  }

  var lastColumn = sheet.getLastColumn();
  if (lastColumn < 1) {
    return [];
  }

  return sheet.getRange(HEADER_ROW, 1, 1, lastColumn).getValues()[0].map(function(value) {
    return value === "" ? null : value;
  });
}

function readDataRows() {
  var sheet = getSheet();
  if (sheet && sheet.ok === false) {
    return sheet;
  }

  var headers = readHeaderRow();
  if (headers && headers.ok === false) {
    return headers;
  }

  var columnMap = buildColumnMap(headers);
  if (columnMap && columnMap.ok === false) {
    return columnMap;
  }

  var lastRow = sheet.getLastRow();
  if (lastRow < DATA_START_ROW) {
    return [];
  }

  var rowCount = lastRow - DATA_START_ROW + 1;
  var lastColumn = sheet.getLastColumn();
  var range = sheet.getRange(DATA_START_ROW, 1, rowCount, lastColumn);
  var values = range.getValues();
  var formulas = range.getFormulas();
  var okColumnIndex = columnMap.headerToCol.ok - 1;

  return values.map(function(rowValues, rowIndex) {
    var rowObject = {};

    headers.forEach(function(header, columnIndex) {
      if (header === null) {
        return;
      }

      var rawValue = rowValues[columnIndex];
      var formula = formulas[rowIndex][columnIndex];
      var isPhysicallyEmpty = rawValue === "" && formula === "";
      var normalizedValue;

      if (columnIndex === okColumnIndex) {
        normalizedValue = rawValue === true ? true : null;
      } else if (isPhysicallyEmpty) {
        normalizedValue = null;
      } else {
        normalizedValue = rawValue;
      }

      rowObject[header] = normalizedValue;
    });

    return rowObject;
  });
}
