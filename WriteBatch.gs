function normalizeSheetRowRef(value) {
  var rowRef = Number(value);

  if (!isFinite(rowRef) || isNaN(rowRef) || rowRef <= 0 || Math.floor(rowRef) !== rowRef) {
    return null;
  }

  return rowRef;
}

function normalizeWritableCellValue(value) {
  return value === null ? "" : value;
}

function buildContiguousSegments(numbers) {
  if (numbers.length === 0) {
    return [];
  }

  var sortedNumbers = numbers.slice().sort(function(a, b) {
    return a - b;
  });
  var segments = [];
  var currentSegment = [sortedNumbers[0]];

  for (var i = 1; i < sortedNumbers.length; i += 1) {
    if (sortedNumbers[i] === sortedNumbers[i - 1] + 1) {
      currentSegment.push(sortedNumbers[i]);
    } else {
      segments.push(currentSegment);
      currentSegment = [sortedNumbers[i]];
    }
  }

  segments.push(currentSegment);
  return segments;
}

function buildContiguousRowBlocks(rowRefs) {
  if (rowRefs.length === 0) {
    return [];
  }

  var blocks = [];
  var currentBlock = [rowRefs[0]];

  for (var i = 1; i < rowRefs.length; i += 1) {
    if (rowRefs[i] === rowRefs[i - 1] + 1) {
      currentBlock.push(rowRefs[i]);
    } else {
      blocks.push(currentBlock);
      currentBlock = [rowRefs[i]];
    }
  }

  blocks.push(currentBlock);
  return blocks;
}

function areNumberArraysEqual(left, right) {
  if (left.length !== right.length) {
    return false;
  }

  for (var i = 0; i < left.length; i += 1) {
    if (left[i] !== right[i]) {
      return false;
    }
  }

  return true;
}

function writeColumnSegmentsForRowBlocks(sheet, rowBlocks, columnSegments, valuesByRowRef, defaultValue) {
  rowBlocks.forEach(function(rowBlock) {
    columnSegments.forEach(function(columnSegment) {
      var startRow = rowBlock[0];
      var startCol = columnSegment[0];
      var matrix = rowBlock.map(function(rowRef) {
        return columnSegment.map(function(col) {
          var rowValues = valuesByRowRef[String(rowRef)] || {};

          if (Object.prototype.hasOwnProperty.call(rowValues, String(col))) {
            return rowValues[String(col)];
          }

          return defaultValue;
        });
      });

      sheet.getRange(startRow, startCol, rowBlock.length, columnSegment.length).setValues(matrix);
    });
  });
}

function writeSparsePhaseOneBlocks(sheet, rowBlocks, unionColumnSegments, valuesByRowRef) {
  rowBlocks.forEach(function(rowBlock) {
    unionColumnSegments.forEach(function(unionColumnSegment) {
      var currentGroup = null;
      var groups = [];

      rowBlock.forEach(function(rowRef) {
        var rowValues = valuesByRowRef[String(rowRef)] || {};
        var subsetColumns = unionColumnSegment.filter(function(col) {
          return Object.prototype.hasOwnProperty.call(rowValues, String(col));
        });

        if (subsetColumns.length === 0) {
          if (currentGroup !== null) {
            groups.push(currentGroup);
            currentGroup = null;
          }
          return;
        }

        if (
          currentGroup !== null &&
          rowRef === currentGroup.rowRefs[currentGroup.rowRefs.length - 1] + 1 &&
          areNumberArraysEqual(currentGroup.columns, subsetColumns)
        ) {
          currentGroup.rowRefs.push(rowRef);
          return;
        }

        if (currentGroup !== null) {
          groups.push(currentGroup);
        }

        currentGroup = {
          rowRefs: [rowRef],
          columns: subsetColumns
        };
      });

      if (currentGroup !== null) {
        groups.push(currentGroup);
      }

      groups.forEach(function(group) {
        var subsetSegments = buildContiguousSegments(group.columns);

        subsetSegments.forEach(function(subsetSegment) {
          var startRow = group.rowRefs[0];
          var startCol = subsetSegment[0];
          var matrix = group.rowRefs.map(function(rowRef) {
            var rowValues = valuesByRowRef[String(rowRef)];

            return subsetSegment.map(function(col) {
              return rowValues[String(col)];
            });
          });

          sheet.getRange(startRow, startCol, group.rowRefs.length, subsetSegment.length).setValues(matrix);
        });
      });
    });
  });
}

function writeMasterBatch(idMaster, expectedRowRefs, updates) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    return createError(
      "ERR_WRITE_FAILED",
      "Failed to acquire write lock.",
      {
        id_master: idMaster
      }
    );
  }

  try {
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
    if (rows && rows.ok === false) {
      return rows;
    }
    rows = rows.data.rows;

    var rowsWithRefs = rows.map(function(row, index) {
      return {
        rowRef: DATA_START_ROW + index,
        row: row
      };
    });

    var rowsForMasterWithRefs = rowsWithRefs.filter(function(entry) {
      return entry.row.id_master === idMaster;
    });

    if (rowsForMasterWithRefs.length === 0) {
      return createError(
        "ERR_NOT_FOUND",
        "No variants found for id_master.",
        {
          id_master: idMaster
        }
      );
    }

    var masterRowNums = rowsForMasterWithRefs.map(function(entry) {
      return entry.rowRef;
    });
    var masterRowRefSet = {};

    masterRowNums.forEach(function(rowRef) {
      masterRowRefSet[String(rowRef)] = true;
    });

    var expectedRowRefSet = {};
    expectedRowRefs.forEach(function(rowRef) {
      expectedRowRefSet[String(rowRef)] = true;
    });

    var hasScopeMismatch = expectedRowRefs.some(function(rowRef) {
      return !Object.prototype.hasOwnProperty.call(masterRowRefSet, String(rowRef));
    }) || masterRowNums.some(function(rowRef) {
      return !Object.prototype.hasOwnProperty.call(expectedRowRefSet, String(rowRef));
    });

    if (hasScopeMismatch) {
      return createError(
        "ERR_INVALID_MASTER_SCOPE",
        "Provided row scope does not match the target master.",
        {
          id_master: idMaster,
          expectedRowRefs: expectedRowRefs,
          masterRowNums: masterRowNums
        }
      );
    }

    var updatesByRowRef = {};
    var writableColumnSet = {};

    for (var updateIndex = 0; updateIndex < updates.length; updateIndex += 1) {
      var update = updates[updateIndex];
      var values = update.values;
      var headerNames = Object.keys(values);

      for (var headerIndex = 0; headerIndex < headerNames.length; headerIndex += 1) {
        var header = headerNames[headerIndex];

        if (!Object.prototype.hasOwnProperty.call(columnMap.headerToCol, header)) {
          return createError(
            "ERR_BAD_REQUEST",
            "One or more update headers are invalid.",
            {
              header: header
            }
          );
        }

        if (header !== "ok") {
          writableColumnSet[String(columnMap.headerToCol[header])] = true;
        }
      }

      updatesByRowRef[String(update.rowRef)] = update;
    }

    var rowsForMasterPrepared = rowsForMasterWithRefs.map(function(entry) {
      var preparedRow = {};
      var sourceRow = entry.row;
      var sourceHeaders = Object.keys(sourceRow);

      sourceHeaders.forEach(function(header) {
        preparedRow[header] = sourceRow[header];
      });

      var update = updatesByRowRef[String(entry.rowRef)];
      if (update) {
        Object.keys(update.values).forEach(function(header) {
          preparedRow[header] = update.values[header];
        });
      }

      preparedRow.ok = true;

      return preparedRow;
    });

    var structureDE = validateStructureDE(rowsForMasterPrepared);
    if (structureDE && structureDE.ok === false) {
      return structureDE;
    }

    var sheet = getSheet();
    if (sheet && sheet.ok === false) {
      return sheet;
    }
    sheet = sheet.data.sheet;

    var okCol = columnMap.headerToCol.ok;
    var writableColumns = Object.keys(writableColumnSet).map(function(colKey) {
      return Number(colKey);
    });
    var columnSegments = buildContiguousSegments(writableColumns);
    var rowBlocks = buildContiguousRowBlocks(expectedRowRefs);
    var phaseOneValuesByRowRef = {};

    expectedRowRefs.forEach(function(rowRef) {
      var update = updatesByRowRef[String(rowRef)];
      var valuesByCol = {};

      Object.keys(update.values).forEach(function(header) {
        if (header === "ok") {
          return;
        }

        valuesByCol[String(columnMap.headerToCol[header])] = normalizeWritableCellValue(update.values[header]);
      });

      phaseOneValuesByRowRef[String(rowRef)] = valuesByCol;
    });

    writeSparsePhaseOneBlocks(sheet, rowBlocks, columnSegments, phaseOneValuesByRowRef);

    var okRowBlocks = buildContiguousRowBlocks(expectedRowRefs);
    var okColumnSegments = [[okCol]];
    var okValuesByRowRef = {};

    expectedRowRefs.forEach(function(rowRef) {
      okValuesByRowRef[String(rowRef)] = {};
      okValuesByRowRef[String(rowRef)][String(okCol)] = true;
    });

    writeColumnSegmentsForRowBlocks(sheet, okRowBlocks, okColumnSegments, okValuesByRowRef, true);

    SpreadsheetApp.flush();

    var reloadedRows = readDataRows();
    if (reloadedRows && reloadedRows.ok === false) {
      return reloadedRows;
    }

    var reloadedRowsWithRefs = reloadedRows.map(function(row, index) {
      return {
        rowRef: DATA_START_ROW + index,
        row: row
      };
    });

    var reloadedRowsForMasterWithRefs = reloadedRowsWithRefs.filter(function(entry) {
      return entry.row.id_master === idMaster;
    });

    if (reloadedRowsForMasterWithRefs.length !== expectedRowRefs.length) {
      return createError(
        "ERR_WRITE_FAILED",
        "Reloaded variant count does not match the expected row scope.",
        {
          id_master: idMaster,
          expectedCount: expectedRowRefs.length,
          actualCount: reloadedRowsForMasterWithRefs.length
        }
      );
    }

    var variantsReloaded = reloadedRowsForMasterWithRefs.map(function(entry) {
      return entry.row;
    });
    var reloadedStructureDE = validateStructureDE(variantsReloaded);

    if (reloadedStructureDE && reloadedStructureDE.ok === false) {
      return reloadedStructureDE;
    }

    return {
      ok: true,
      data: {
        id_master: idMaster,
        variantsReloaded: variantsReloaded,
        structureDE: reloadedStructureDE
      }
    };
  } catch (error) {
    return {
      ok: false,
      error: {
        code: "ERR_WRITE_FAILED",
        message: error && error.message ? String(error.message) : String(error),
        stack: error && error.stack ? String(error.stack) : null,
        rowRefs: Array.isArray(expectedRowRefs) ? expectedRowRefs.slice() : [],
        columns: Array.isArray(writableColumns) ? writableColumns.slice() : [],
        id_master: idMaster
      }
    };
  } finally {
    lock.releaseLock();
  }
}
