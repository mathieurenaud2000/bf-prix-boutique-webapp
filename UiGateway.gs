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

function buildUiMasterDetailData_(data) {
  var sourceVariants = safeArray_(data.variants);
  var variants = sourceVariants.map(function(variant) {
    var hasRowRef = Object.prototype.hasOwnProperty.call(variant, "rowRef");
    var normalizedRowRef = Number(variant.rowRef);
    var rowRef = hasRowRef &&
      isFinite(normalizedRowRef) &&
      !isNaN(normalizedRowRef) &&
      normalizedRowRef > 0 &&
      Math.floor(normalizedRowRef) === normalizedRowRef
      ? normalizedRowRef
      : null;

    return {
      rowRef: rowRef,
      id: variant.id,
      id_master: variant.id_master,
      metal_nom: variant.metal_nom,
      taille: variant.taille,
      temps: variant.temps,
      metal_prix: variant.metal_prix,
      matiere: variant.matiere,
      chaine: variant.chaine,
      boite: variant.boite,
      fabrication_prix: variant.fabrication_prix,
      bf_pri: variant.bf_pri,
      bf_sug: variant.bf_sug,
      bf_pou: variant.bf_pou,
      bf_web_pou: variant.bf_web_pou,
      m_pou: variant.m_pou,
      l_pou: variant.l_pou,
      ma_pou: variant.ma_pou
    };
  });

  return {
    id_master: data.id_master,
    structureDE: data.structureDE,
    variants: variants
  };
}

function ui_loadState(payload) {
  var loadAllResult = api_loadAll();
  var statuses;
  var sourceCollections;
  var mastersByCollection;
  var collections;

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

  return {
    ok: true,
    data: {
      collections: collections,
      mastersByCollection: Object.keys(mastersByCollection).reduce(function(result, collectionKey) {
        result[String(collectionKey)] = safeArray_(mastersByCollection[collectionKey]).map(function(master) {
          return {
            key: String(master.id_master),
            name: String(master.nom || ""),
            status: mapStatus_(master.status)
          };
        });
        return result;
      }, {})
    }
  };
}

function ui_loadState_preloadAll(payload) {
  var stateResult = ui_loadState(payload);
  var mastersByCollection;
  var masterDetailsById = {};
  var seenMasterIds = {};
  var collectionKeys;
  var i;
  var j;

  if (!stateResult || stateResult.ok !== true || !stateResult.data) {
    return stateResult;
  }

  mastersByCollection = stateResult.data.mastersByCollection;
  collectionKeys = Object.keys(mastersByCollection);

  for (i = 0; i < collectionKeys.length; i += 1) {
    var collectionKey = collectionKeys[i];
    var masters = safeArray_(mastersByCollection[collectionKey]);

    for (j = 0; j < masters.length; j += 1) {
      var master = masters[j];
      var masterKey = String(master && master.key);
      var numericId = Number(masterKey);
      var loadMasterResult;

      if (!masterKey || seenMasterIds[masterKey]) {
        continue;
      }

      seenMasterIds[masterKey] = true;
      loadMasterResult = api_loadMaster(numericId);
      if (loadMasterResult.ok !== true) {
        return loadMasterResult;
      }

      if (
        !loadMasterResult.data ||
        !Array.isArray(loadMasterResult.data.variants)
      ) {
        return createError("ERR_UI_MAPPING", "Invalid api_loadMaster structure", {});
      }

      masterDetailsById[masterKey] = buildUiMasterDetailData_(loadMasterResult.data);
    }
  }

  return {
    ok: true,
    data: {
      collections: stateResult.data.collections,
      mastersByCollection: stateResult.data.mastersByCollection,
      masterDetailsById: masterDetailsById
    }
  };
}

function ui_loadCollectionDetails(payload) {
  var collectionKey = payload && payload.collectionKey !== null && typeof payload.collectionKey !== "undefined"
    ? String(payload.collectionKey)
    : "";
  var stateResult = ui_loadState({ activeCollectionKey: null });
  var collectionName = collectionKey;
  var masterDetailsById = {};
  var seenMasterIds = {};
  var masters;
  var i;

  if (stateResult.ok !== true) {
    return stateResult;
  }

  if (
    !stateResult.data ||
    !stateResult.data.mastersByCollection ||
    typeof stateResult.data.mastersByCollection !== "object"
  ) {
    return createError("ERR_UI_MAPPING", "Invalid ui_loadState structure", {});
  }

  if (Array.isArray(stateResult.data.collections)) {
    for (i = 0; i < stateResult.data.collections.length; i += 1) {
      if (String(stateResult.data.collections[i].key) === collectionKey) {
        collectionName = String(stateResult.data.collections[i].name || collectionKey);
        break;
      }
    }
  }

  masters = safeArray_(stateResult.data.mastersByCollection[collectionKey]);
  for (i = 0; i < masters.length; i += 1) {
    var masterKey = String(masters[i] && masters[i].key);
    var numericId = Number(masterKey);
    var loadMasterResult;

    if (!masterKey || seenMasterIds[masterKey]) {
      continue;
    }

    seenMasterIds[masterKey] = true;
    loadMasterResult = api_loadMaster(numericId);
    if (loadMasterResult.ok !== true) {
      return loadMasterResult;
    }

    if (
      !loadMasterResult.data ||
      !Array.isArray(loadMasterResult.data.variants)
    ) {
      return createError("ERR_UI_MAPPING", "Invalid api_loadMaster structure", {});
    }

    masterDetailsById[masterKey] = buildUiMasterDetailData_(loadMasterResult.data);
  }

  return {
    ok: true,
    data: {
      collectionKey: collectionKey,
      collectionName: collectionName,
      masterDetailsById: masterDetailsById
    }
  };
}

function ui_loadMaster(payload) {
  var idMaster = payload && payload.id_master;
  var loadMasterResult = api_loadMaster(idMaster);
  var data;

  if (loadMasterResult.ok !== true) {
    return loadMasterResult;
  }

  if (
    !loadMasterResult.data ||
    !Array.isArray(loadMasterResult.data.variants)
  ) {
    return createError("ERR_UI_MAPPING", "Invalid api_loadMaster structure", {});
  }

  data = loadMasterResult.data;

  return {
    ok: true,
    data: buildUiMasterDetailData_(data)
  };
}
