function api_loadMaster(id_master) {
  var convertedIdMaster = Number(id_master);

  if (
    id_master === null ||
    typeof id_master === "undefined" ||
    isNaN(convertedIdMaster) ||
    !isFinite(convertedIdMaster) ||
    convertedIdMaster <= 0
  ) {
    return createError(
      "ERR_INVALID_ID_MASTER",
      "Invalid id_master.",
      {
        id_master: id_master
      }
    );
  }

  var headers = readHeaderRow();
  if (headers && headers.ok === false) {
    return headers;
  }

  var columnMap = buildColumnMap(headers);
  if (columnMap && columnMap.ok === false) {
    return columnMap;
  }

  var rows = readDataRows();
  if (rows && rows.ok === false) {
    return rows;
  }

  var rowsForMaster = rows.filter(function(row) {
    return row.id_master === convertedIdMaster;
  });

  if (rowsForMaster.length === 0) {
    return createError(
      "ERR_NOT_FOUND",
      "No variants found for id_master.",
      {
        id_master: convertedIdMaster
      }
    );
  }

  var structureDE = validateStructureDE(rowsForMaster);
  if (structureDE && structureDE.ok === false) {
    return structureDE;
  }

  return {
    ok: true,
    data: {
      id_master: convertedIdMaster,
      structureDE: structureDE,
      variants: rowsForMaster
    }
  };
}
