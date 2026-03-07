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
  headers = headers.data.headers;

  var columnMap = buildColumnMap(headers);
  if (columnMap && columnMap.ok === false) {
    return columnMap;
  }

  var rows = readDataRows();
  var rowsWithRefs;
  var rowsForMasterWithRefs;
  var rowsForMaster;
  if (rows && rows.ok === false) {
    return rows;
  }
  rows = rows.data.rows;
  rowsWithRefs = rows.map(function(row, index) {
    return {
      rowRef: DATA_START_ROW + index,
      row: row
    };
  });

  rowsForMasterWithRefs = rowsWithRefs.filter(function(entry) {
    return entry.row.id_master === convertedIdMaster;
  });
  rowsForMaster = rowsForMasterWithRefs.map(function(entry) {
    var variant = {};

    Object.keys(entry.row).forEach(function(header) {
      variant[header] = entry.row[header];
    });
    variant.rowRef = entry.rowRef;

    return variant;
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

  var structureDE = validateStructureDE(rowsForMasterWithRefs.map(function(entry) {
    return entry.row;
  }));
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
