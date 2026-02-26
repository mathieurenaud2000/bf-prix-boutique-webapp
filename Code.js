function onEdit(e) {
  var sheet = e.source.getActiveSheet(); // Récupère la feuille active
  var range = e.range; // Récupère la cellule modifiée
  
  // Vérifie si la modification est dans la feuille "DISTRIBUTION MÉMORABLE" et dans la colonne W (colonne 23)
  if (sheet.getName() == "DISTRIBUTION MÉMORABLE" && range.getColumn() == 23) {
    var row = range.getRow(); // Récupère le numéro de la ligne modifiée
    sheet.getRange(row, 24).setValue(""); // Efface la cellule de la même ligne dans la colonne X (colonne 24)
  }
}
