function computeVariantIsGood(row) {
  return row.ok === true &&
    typeof row.ma_pou === "number" &&
    !isNaN(row.ma_pou) &&
    row.ma_pou >= 0.20;
}

function computeMasterStatus(rowsForMaster) {
  var hasAnyNotOk = rowsForMaster.some(function(row) {
    return row.ok !== true;
  });

  if (hasAnyNotOk) {
    return "GRAY";
  }

  var allVariantsGood = rowsForMaster.every(function(row) {
    return computeVariantIsGood(row);
  });

  if (allVariantsGood) {
    return "GREEN";
  }

  return "RED";
}

function computeFraction(rows) {
  var x = rows.filter(function(row) {
    return computeVariantIsGood(row);
  }).length;

  return {
    x: x,
    total: rows.length
  };
}

function computeCollectionStatusAndFraction(rowsForCollection) {
  return {
    status: computeMasterStatus(rowsForCollection),
    fraction: computeFraction(rowsForCollection)
  };
}
