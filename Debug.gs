function debug_readSheetStructure() {
  var headers = readHeaderRow();
  if (headers && headers.ok === false) {
    return headers;
  }

  var columnMap = buildColumnMap(headers);
  if (columnMap && columnMap.ok === false) {
    return columnMap;
  }

  return {
    sheetName: SHEET_NAME,
    headerRow: HEADER_ROW,
    dataStartRow: DATA_START_ROW,
    columnMap: columnMap,
    headersValidated: true
  };
}
