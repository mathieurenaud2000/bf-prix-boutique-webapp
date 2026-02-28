function computeStatuses(rows) {
  function buildFraction(x, total) {
    return {
      x: x,
      total: total
    };
  }

  function buildStatus(x, total) {
    if (total > 0 && x === total) {
      return "GREEN";
    }

    if (x === 0) {
      return "GRAY";
    }

    return "RED";
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
        x: 0,
        total: 0
      };
    }

    masterEntry = mastersMapByCollection[collectionKey][masterKey];
    masterEntry.total += 1;
    if (row.ok === true) {
      masterEntry.x += 1;
    }
  }

  collections = Object.keys(collectionsMap).sort(function(a, b) {
    return a.localeCompare(b);
  }).map(function(collectionName) {
    var item = collectionsMap[collectionName];

    return {
      collection: item.collection,
      status: buildStatus(item.x, item.total),
      fraction: buildFraction(item.x, item.total)
    };
  });

  Object.keys(mastersMapByCollection).sort(function(a, b) {
    return a.localeCompare(b);
  }).forEach(function(collectionName) {
    var masters = Object.keys(mastersMapByCollection[collectionName]).map(function(key) {
      var item = mastersMapByCollection[collectionName][key];

      return {
        id_master: item.id_master,
        nom: item.nom,
        status: buildStatus(item.x, item.total),
        fraction: buildFraction(item.x, item.total)
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

  return {
    ok: true,
    data: {
      collections: collections,
      mastersByCollection: mastersByCollection
    }
  };
}
