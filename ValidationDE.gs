function isEmpty(value) {
  return value === null || value === "";
}

function isNonEmpty(value) {
  return value !== null && value !== "";
}

function validateStructureDE(rowsForMaster) {
  var allHaveMetalNom = rowsForMaster.every(function(row) {
    return isNonEmpty(row.metal_nom);
  });
  var allHaveTaille = rowsForMaster.every(function(row) {
    return isNonEmpty(row.taille);
  });
  var allMetalNomNull = rowsForMaster.every(function(row) {
    return isEmpty(row.metal_nom);
  });
  var allTailleNull = rowsForMaster.every(function(row) {
    return isEmpty(row.taille);
  });

  if (allHaveMetalNom && allHaveTaille) {
    var seenPairs = {};
    var hasDuplicatePair = rowsForMaster.some(function(row) {
      var pairKey = String(row.metal_nom) + "\u0000" + String(row.taille);
      if (Object.prototype.hasOwnProperty.call(seenPairs, pairKey)) {
        return true;
      }

      seenPairs[pairKey] = true;
      return false;
    });

    if (hasDuplicatePair) {
      return createError(
        "ERR_INVALID_DE_STRUCTURE",
        "Invalid D/E structure for master variants.",
        {
          id_master: rowsForMaster[0] ? rowsForMaster[0].id_master : null
        }
      );
    }

    return {
      type: "DE",
      tabHeader: "metal_nom",
      colHeader: "taille"
    };
  }

  if (allHaveMetalNom && allTailleNull) {
    return {
      type: "D",
      tabHeader: null,
      colHeader: "metal_nom"
    };
  }

  if (allHaveTaille && allMetalNomNull) {
    return {
      type: "E",
      tabHeader: null,
      colHeader: "taille"
    };
  }

  return createError(
    "ERR_INVALID_DE_STRUCTURE",
    "Invalid D/E structure for master variants.",
    {
      id_master: rowsForMaster[0] ? rowsForMaster[0].id_master : null
    }
  );
}
