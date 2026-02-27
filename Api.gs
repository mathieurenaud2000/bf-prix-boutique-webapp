function api_loadAll() {
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

  var masterGroups = {};
  var masterOrder = [];
  var collectionGroups = {};
  var collectionOrder = [];

  rows.forEach(function(row) {
    var masterKey = String(row.id_master);

    if (!Object.prototype.hasOwnProperty.call(masterGroups, masterKey)) {
      masterGroups[masterKey] = {
        id_master: row.id_master,
        collection: null,
        nom: null,
        rows: []
      };
      masterOrder.push(masterKey);
    }

    var masterGroup = masterGroups[masterKey];
    masterGroup.rows.push(row);

    if (masterGroup.collection === null && row.collection !== null) {
      masterGroup.collection = row.collection;
    }

    if (masterGroup.nom === null && row.nom !== null && row.nom !== "") {
      masterGroup.nom = row.nom;
    }

    if (row.collection !== null) {
      var collectionKey = String(row.collection);

      if (!Object.prototype.hasOwnProperty.call(collectionGroups, collectionKey)) {
        collectionGroups[collectionKey] = {
          collection: row.collection,
          rows: []
        };
        collectionOrder.push(collectionKey);
      }

      collectionGroups[collectionKey].rows.push(row);
    }
  });

  var mastersByCollection = {};

  masterOrder.forEach(function(masterKey) {
    var masterGroup = masterGroups[masterKey];
    var masterEntry = {
      id_master: masterGroup.id_master,
      nom: masterGroup.nom,
      status: computeMasterStatus(masterGroup.rows),
      fraction: computeFraction(masterGroup.rows)
    };

    if (masterGroup.collection !== null) {
      var collectionKey = String(masterGroup.collection);

      if (!Object.prototype.hasOwnProperty.call(mastersByCollection, collectionKey)) {
        mastersByCollection[collectionKey] = [];
      }

      mastersByCollection[collectionKey].push(masterEntry);
    }
  });

  collectionOrder.forEach(function(collectionKey) {
    mastersByCollection[collectionKey] = (mastersByCollection[collectionKey] || []).sort(function(a, b) {
      if (a.nom === null && b.nom !== null) {
        return 1;
      }

      if (a.nom !== null && b.nom === null) {
        return -1;
      }

      if (a.nom !== null && b.nom !== null) {
        var nameComparison = String(a.nom).localeCompare(String(b.nom));
        if (nameComparison !== 0) {
          return nameComparison;
        }
      }

      return String(a.id_master).localeCompare(String(b.id_master));
    });
  });

  var collections = collectionOrder.map(function(collectionKey) {
    var collectionGroup = collectionGroups[collectionKey];
    var collectionStatusAndFraction = computeCollectionStatusAndFraction(collectionGroup.rows);

    return {
      collection: collectionGroup.collection,
      status: collectionStatusAndFraction.status,
      fraction: collectionStatusAndFraction.fraction
    };
  });

  return {
    ok: true,
    data: {
      sheet: {
        name: SHEET_NAME,
        headerRow: HEADER_ROW,
        dataStartRow: DATA_START_ROW
      },
      columnMap: columnMap,
      collections: collections,
      mastersByCollection: mastersByCollection
    }
  };
}
