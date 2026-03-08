function computeStatuses(rows) {
  function buildFraction(x, total) {
    return {
      x: x,
      total: total
    };
  }

  function normalizeProfitRatio(value) {
    var normalized;
    var num;

    if (value === null || typeof value === "undefined") {
      return null;
    }

    normalized = String(value).trim().replace(",", ".");
    if (normalized === "") {
      return null;
    }

    num = Number(normalized);
    if (!isFinite(num) || isNaN(num)) {
      return null;
    }

    return num;
  }

  function roundRatioByDisplayedPercent(ratio) {
    if (ratio === null) {
      return null;
    }

    return Number((ratio * 100).toFixed(1)) / 100;
  }

  function buildMasterStatus(entry) {
    if (!entry || entry.hasSaved !== true) {
      return "GRAY";
    }

    if (entry.hasLowProfitMa === true) {
      return "RED";
    }

    return "GREEN";
  }

  function buildCollectionStatus(masters) {
    var hasRed = false;
    var hasGray = false;

    if (!Array.isArray(masters) || masters.length === 0) {
      return "GRAY";
    }

    masters.forEach(function(master) {
      if (!master || typeof master !== "object") {
        return;
      }

      if (master.status === "RED") {
        hasRed = true;
        return;
      }

      if (master.status === "GRAY") {
        hasGray = true;
      }
    });

    if (hasRed) {
      return "RED";
    }

    if (hasGray) {
      return "GRAY";
    }

    return "GREEN";
  }

  if (!Array.isArray(rows)) {
    return createError("ERR_BAD_REQUEST", "Invalid rows input.", {
      receivedType: typeof rows
    });
  }

  var collectionsMap = {};
  var mastersMapByCollection = {};
  var row;
  var index;
  var collectionKey;
  var idMaster;
  var masterKey;
  var collectionEntry;
  var masterEntry;
  var collections;
  var mastersByCollection = {};

  for (index = 0; index < rows.length; index += 1) {
    row = rows[index];

    if (!row || typeof row !== "object" || Array.isArray(row)) {
      return createError("ERR_BAD_REQUEST", "Invalid row.", {
        index: index
      });
    }

    if (row.collection === null || typeof row.collection === "undefined") {
      return createError("ERR_BAD_REQUEST", "Missing collection.", {
        index: index
      });
    }

    collectionKey = String(row.collection).trim();

    if (collectionKey === "") {
      return createError("ERR_BAD_REQUEST", "Missing collection.", {
        index: index
      });
    }

    idMaster = Number(row.id_master);
    if (
      row.id_master === null ||
      typeof row.id_master === "undefined" ||
      !isFinite(idMaster) ||
      isNaN(idMaster) ||
      idMaster <= 0
    ) {
      return createError("ERR_BAD_REQUEST", "Invalid id_master.", {
        index: index,
        id_master: row.id_master
      });
    }

    if (row.ok !== null && typeof row.ok !== "undefined" && row.ok !== true) {
      return createError("ERR_BAD_REQUEST", "Invalid ok value.", {
        index: index,
        ok: row.ok
      });
    }

    masterKey = String(idMaster);

    if (!Object.prototype.hasOwnProperty.call(collectionsMap, collectionKey)) {
      collectionsMap[collectionKey] = {
        collection: collectionKey,
        x: 0,
        total: 0
      };
      mastersMapByCollection[collectionKey] = {};
    }

    collectionEntry = collectionsMap[collectionKey];
    collectionEntry.total += 1;
    if (row.ok === true) {
      collectionEntry.x += 1;
    }

    if (!Object.prototype.hasOwnProperty.call(mastersMapByCollection[collectionKey], masterKey)) {
      mastersMapByCollection[collectionKey][masterKey] = {
        id_master: idMaster,
        nom: row.nom === null || typeof row.nom === "undefined" ? "" : row.nom,
        savedCount: 0,
        totalCount: 0,
        hasSaved: false,
        hasLowProfitMa: false
      };
    }

    masterEntry = mastersMapByCollection[collectionKey][masterKey];
    masterEntry.totalCount += 1;
    if (row.ok === true) {
      var roundedMaPou = roundRatioByDisplayedPercent(normalizeProfitRatio(row.ma_pou));

      masterEntry.savedCount += 1;
      masterEntry.hasSaved = true;
      if (roundedMaPou === null || roundedMaPou < 0.2) {
        masterEntry.hasLowProfitMa = true;
      }
    }
  }

  Object.keys(mastersMapByCollection).sort(function(a, b) {
    return a.localeCompare(b);
  }).forEach(function(collectionName) {
    var masters = Object.keys(mastersMapByCollection[collectionName]).map(function(key) {
      var item = mastersMapByCollection[collectionName][key];

      return {
        id_master: item.id_master,
        nom: item.nom,
        status: buildMasterStatus(item),
        fraction: buildFraction(item.savedCount, item.totalCount)
      };
    });

    masters.sort(function(a, b) {
      var nomCompare = String(a.nom).localeCompare(String(b.nom));

      if (nomCompare !== 0) {
        return nomCompare;
      }

      return a.id_master - b.id_master;
    });

    mastersByCollection[collectionName] = masters;
  });

  collections = Object.keys(collectionsMap).sort(function(a, b) {
    return a.localeCompare(b);
  }).map(function(collectionName) {
    var item = collectionsMap[collectionName];
    var masters = mastersByCollection[collectionName] || [];

    return {
      collection: item.collection,
      status: buildCollectionStatus(masters),
      fraction: buildFraction(item.x, item.total)
    };
  });

  return {
    ok: true,
    data: {
      collections: collections,
      mastersByCollection: mastersByCollection
    }
  };
}
