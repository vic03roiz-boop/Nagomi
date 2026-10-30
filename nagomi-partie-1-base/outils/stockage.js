// 💾 Petit système de sauvegarde en fichiers JSON.
// Les fichiers vont dans /app/data (volume Railway) s'il existe, sinon dans le dossier donnees/.
const fs = require('fs');
const path = require('path');

const DOSSIER = process.env.DATA_DIR
  || (fs.existsSync('/app/data') ? '/app/data' : path.join(__dirname, '..', 'donnees'));
fs.mkdirSync(DOSSIER, { recursive: true });

const ouverts = new Map();

/**
 * Ouvre (ou crée) un fichier de données.
 * const bd = ouvrir('avertissements', {});
 * bd.data  → les données   |   bd.sauver() → enregistre
 */
function ouvrir(nom, defaut = {}) {
  if (ouverts.has(nom)) return ouverts.get(nom);
  const fichier = path.join(DOSSIER, `${nom}.json`);
  let data;
  try { data = JSON.parse(fs.readFileSync(fichier, 'utf8')); }
  catch { data = JSON.parse(JSON.stringify(defaut)); }
  let attente = null;
  const bd = {
    data,
    sauver() {
      clearTimeout(attente);
      attente = setTimeout(() => {
        try {
          fs.writeFileSync(fichier + '.tmp', JSON.stringify(bd.data, null, 2));
          fs.renameSync(fichier + '.tmp', fichier);
        } catch (e) { console.error(`[stockage] ${nom} :`, e.message); }
      }, 200);
    },
  };
  ouverts.set(nom, bd);
  return bd;
}

module.exports = { ouvrir, DOSSIER };
