function api_saveMaster(payload) {
  if (!payload || Array.isArray(payload)) {
    return createError(
      "ERR_BAD_REQUEST",
      "Invalid payload.",
      {}
    );
  }

  var convertedIdMaster = Number(payload.id_master);

  if (
    payload.id_master === null ||
    typeof payload.id_master === "undefined" ||
    isNaN(convertedIdMaster) ||
    !isFinite(convertedIdMaster) ||
    convertedIdMaster <= 0
  ) {
    return createError(
      "ERR_INVALID_ID_MASTER",
      "Invalid id_master.",
      {
        id_master: payload.id_master
      }
    );
  }

  if (!Array.isArray(payload.expectedRowRefs) || !Array.isArray(payload.updates)) {
    return createError(
      "ERR_BAD_REQUEST",
      "Invalid payload.",
      {}
    );
  }

  if (payload.expectedRowRefs.length !== payload.updates.length) {
    return createError(
      "ERR_BAD_REQUEST",
      "expectedRowRefs and updates must have the same length.",
      {
        expectedRowRefsLength: payload.expectedRowRefs.length,
        updatesLength: payload.updates.length
      }
    );
  }

  var expectedRowRefSet = {};
  var normalizedExpectedRowRefs = [];

  for (var expectedIndex = 0; expectedIndex < payload.expectedRowRefs.length; expectedIndex += 1) {
    var normalizedExpectedRowRef = normalizeSheetRowRef(payload.expectedRowRefs[expectedIndex]);

    if (normalizedExpectedRowRef === null || Object.prototype.hasOwnProperty.call(expectedRowRefSet, String(normalizedExpectedRowRef))) {
      return createError(
        "ERR_BAD_REQUEST",
        "expectedRowRefs must contain unique valid row numbers.",
        {
          expectedRowRefs: payload.expectedRowRefs
        }
      );
    }

    expectedRowRefSet[String(normalizedExpectedRowRef)] = true;
    normalizedExpectedRowRefs.push(normalizedExpectedRowRef);
  }

  var updateRowRefSet = {};
  var normalizedUpdates = [];

  for (var updateIndex = 0; updateIndex < payload.updates.length; updateIndex += 1) {
    var update = payload.updates[updateIndex];

    if (!update || Array.isArray(update) || !update.values || Array.isArray(update.values)) {
      return createError(
        "ERR_BAD_REQUEST",
        "Each update must include a rowRef and a values object.",
        {
          updateIndex: updateIndex
        }
      );
    }

    var normalizedUpdateRowRef = normalizeSheetRowRef(update.rowRef);

    if (normalizedUpdateRowRef === null || Object.prototype.hasOwnProperty.call(updateRowRefSet, String(normalizedUpdateRowRef))) {
      return createError(
        "ERR_BAD_REQUEST",
        "updates must contain unique valid rowRef values.",
        {
          updateIndex: updateIndex,
          rowRef: update.rowRef
        }
      );
    }

    var updateHeaders = Object.keys(update.values);

    for (var valueIndex = 0; valueIndex < updateHeaders.length; valueIndex += 1) {
      var header = updateHeaders[valueIndex];

      if (header !== "ok" && update.values[header] === null) {
        return createError(
          "ERR_BAD_REQUEST",
          "Null values are not allowed in update.values.",
          {
            rowRef: normalizedUpdateRowRef,
            header: header
          }
        );
      }
    }

    updateRowRefSet[String(normalizedUpdateRowRef)] = true;
    normalizedUpdates.push({
      rowRef: normalizedUpdateRowRef,
      values: update.values
    });
  }

  var hasSetMismatch = normalizedExpectedRowRefs.some(function(rowRef) {
    return !Object.prototype.hasOwnProperty.call(updateRowRefSet, String(rowRef));
  }) || normalizedUpdates.some(function(update) {
    return !Object.prototype.hasOwnProperty.call(expectedRowRefSet, String(update.rowRef));
  });

  if (hasSetMismatch) {
    return createError(
      "ERR_BAD_REQUEST",
      "updates rowRef set must exactly match expectedRowRefs.",
      {
        expectedRowRefs: normalizedExpectedRowRefs
      }
    );
  }

  return writeMasterBatch(convertedIdMaster, normalizedExpectedRowRefs, normalizedUpdates);
}

