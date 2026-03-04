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

function ui_loadMaster(payload) {
  var idMaster = payload && payload.id_master;
  var loadMasterResult = api_loadMaster(idMaster);
  var data;
  var sourceVariants;
  var variants;

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
  sourceVariants = safeArray_(data.variants);
  variants = sourceVariants.map(function(variant) {
    var hasRowRef = Object.prototype.hasOwnProperty.call(variant, "rowRef");

    return {
      rowRef: hasRowRef ? variant.rowRef : null,
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
    ok: true,
    data: {
      id_master: data.id_master,
      structureDE: data.structureDE,
      variants: variants
    }
  };
}
