function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Prix Boutique 2026");
}

function mapStatus_(status) {
  if (status === "GREEN") {
    return "ok";
  }

  if (status === "RED") {
    return "problem";
  }

  if (status === "GRAY") {
    return "neutral";
  }

  return "neutral";
}

function safeArray_(value) {
  return Array.isArray(value) ? value : [];
}

function ui_loadState(payload) {
  var requestedKey =
    payload && payload.activeCollectionKey !== null && typeof payload.activeCollectionKey !== "undefined"
      ? String(payload.activeCollectionKey)
      : null;
  var loadAllResult = api_loadAll();
  var statuses;
  var sourceCollections;
  var mastersByCollection;
  var collections;
  var mastersForCollection;
  var masters;

  if (loadAllResult.ok !== true) {
    return loadAllResult;
  }

  if (
    !loadAllResult.data ||
    !loadAllResult.data.statuses ||
    !loadAllResult.data.statuses.collections ||
    !loadAllResult.data.statuses.mastersByCollection
  ) {
    return createError("ERR_UI_MAPPING", "Invalid api_loadAll structure", {});
  }

  statuses = loadAllResult.data.statuses;
  sourceCollections = safeArray_(statuses.collections);
  mastersByCollection = statuses.mastersByCollection;

  collections = sourceCollections.map(function(item) {
    return {
      key: String(item.collection),
      name: String(item.collection),
      status: mapStatus_(item.status),
      fractionText: String(item.fraction.x) + " / " + String(item.fraction.total)
    };
  });

  if (requestedKey === null) {
    masters = [];
  } else {
    mastersForCollection = safeArray_(mastersByCollection[requestedKey]);
    masters = mastersForCollection.map(function(master) {
      return {
        key: String(master.id_master),
        name: String(master.nom || ""),
        status: mapStatus_(master.status)
      };
    });
  }

  return {
    ok: true,
    data: {
      collections: collections,
      activeCollectionKey: requestedKey,
      masters: masters
    }
  };
}
