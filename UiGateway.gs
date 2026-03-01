function doGet(e) {
  return HtmlService
    .createHtmlOutputFromFile("index")
    .setTitle("Prix Boutique 2026");
}

function ui_loadStateB(payload) {
  var loadAllResult = api_loadAll();
  var requestedKey = payload && typeof payload.collectionKey !== "undefined" && payload.collectionKey !== null
    ? String(payload.collectionKey)
    : "";
  var mastersByCollection;
  var mastersForCollection;
  var matchedKey;
  var masters;
  var i;
  var master;
  var status;
  var keys;

  function normalizeKey(value) {
    var normalized = String(value).trim().replace(/\u2019/g, "'");

    if (typeof normalized.normalize === "function") {
      normalized = normalized.normalize("NFKC");
    }

    return normalized;
  }

  if (!loadAllResult.ok) {
    return loadAllResult;
  }

  if (
    !loadAllResult.data ||
    !loadAllResult.data.statuses ||
    !loadAllResult.data.statuses.mastersByCollection
  ) {
    return {
      ok: false,
      error: {
        code: "ERR_UI_MAPPING",
        message: "Unable to map api_loadAll() to ui_loadStateB contract",
        details: {
          observedShapeFromCode: {
            fieldPaths: [
              "api_loadAll().data.rows",
              "api_loadAll().data.statuses",
              "api_loadAll().data.statuses.mastersByCollection",
              "api_loadAll().data.statuses.mastersByCollection[collectionKey][]",
              "api_loadAll().data.statuses.mastersByCollection[collectionKey][].id_master",
              "api_loadAll().data.statuses.mastersByCollection[collectionKey][].nom",
              "api_loadAll().data.statuses.mastersByCollection[collectionKey][].status"
            ]
          },
          missingFields: [
            "data.statuses.mastersByCollection"
          ],
          mappingNotes: "api_loadAll() must expose statuses.mastersByCollection keyed by collection name."
        }
      }
    };
  }

  mastersByCollection = loadAllResult.data.statuses.mastersByCollection;
  if (Object.prototype.hasOwnProperty.call(mastersByCollection, requestedKey)) {
    matchedKey = requestedKey;
  } else if (Object.prototype.hasOwnProperty.call(mastersByCollection, String(requestedKey).trim())) {
    matchedKey = String(requestedKey).trim();
  } else {
    keys = Object.keys(mastersByCollection);

    for (i = 0; i < keys.length; i += 1) {
      if (normalizeKey(keys[i]) === normalizeKey(requestedKey)) {
        matchedKey = keys[i];
        break;
      }
    }
  }

  if (!matchedKey) {
    return {
      ok: true,
      data: {
        collectionKey: requestedKey,
        collectionName: requestedKey,
        masters: []
      }
    };
  }

  mastersForCollection = mastersByCollection[matchedKey];

  if (!Array.isArray(mastersForCollection)) {
    mastersForCollection = [];
  }

  masters = [];

  for (i = 0; i < mastersForCollection.length; i += 1) {
    master = mastersForCollection[i];

    if (!master || typeof master.id_master === "undefined" || typeof master.nom === "undefined") {
      return {
        ok: false,
        error: {
          code: "ERR_UI_MAPPING",
          message: "Unable to map api_loadAll() to ui_loadStateB contract",
          details: {
            observedShapeFromCode: {
              fieldPaths: [
                "api_loadAll().data.rows",
                "api_loadAll().data.statuses",
                "api_loadAll().data.statuses.mastersByCollection",
                "api_loadAll().data.statuses.mastersByCollection[collectionKey][]",
                "api_loadAll().data.statuses.mastersByCollection[collectionKey][].id_master",
                "api_loadAll().data.statuses.mastersByCollection[collectionKey][].nom",
                "api_loadAll().data.statuses.mastersByCollection[collectionKey][].status"
              ]
            },
            missingFields: [
              "id_master",
              "nom"
            ],
            mappingNotes: "Master items must expose identifiable id and name fields."
          }
        }
      };
    }

    status = "neutral";
    if (master.status === "GREEN") {
      status = "ok";
    } else if (master.status === "RED") {
      status = "problem";
    } else if (master.status === "GRAY") {
      status = "neutral";
    }

    masters.push({
      key: String(master.id_master),
      name: master.nom === null ? "" : String(master.nom),
      status: status
    });
  }

  return {
    ok: true,
    data: {
      collectionKey: matchedKey,
      collectionName: matchedKey,
      masters: masters
    }
  };
}
