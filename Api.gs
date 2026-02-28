function api_loadAll() {
  var readDataRowsResult = readDataRows();
  var rows;
  var computeStatusesResult;

  if (!readDataRowsResult.ok) {
    return readDataRowsResult;
  }

  rows = readDataRowsResult.data.rows;
  computeStatusesResult = computeStatuses(rows);

  if (!computeStatusesResult.ok) {
    return computeStatusesResult;
  }

  return {
    ok: true,
    data: {
      rows: rows,
      statuses: computeStatusesResult.data
    }
  };
}
