// 📦 Charge TOUT SEUL les commandes (dossier commandes/) et les systèmes (dossier systemes/).
// Pour ajouter une commande : dépose un fichier dans le bon dossier, c'est tout.
const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');

const RACINE = path.join(__dirname, '..');

function chargerCommandes() {
  const commandes = new Collection();
  const dossier = path.join(RACINE, 'commandes');
  for (const categorie of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (!categorie.isDirectory()) continue;
    for (const fichier of fs.readdirSync(path.join(dossier, categorie.name))) {
      if (!fichier.endsWith('.js') || fichier.startsWith('_')) continue;
      try {
        const cmd = require(path.join(dossier, categorie.name, fichier));
        if (!cmd?.data || !cmd?.execute) { console.warn(`[chargeur] ${categorie.name}/${fichier} ignoré (data/execute manquant)`); continue; }
        cmd.categorie = categorie.name;
        commandes.set(cmd.data.name, cmd);
      } catch (e) { console.error(`[chargeur] ❌ ${categorie.name}/${fichier} :`, e.message); }
    }
  }
  return commandes;
}

function demarrerSystemes(client) {
  const dossier = path.join(RACINE, 'systemes');
  const demarres = [];
  for (const sys of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (!sys.isDirectory()) continue;
    const fichier = path.join(dossier, sys.name, 'index.js');
    if (!fs.existsSync(fichier)) continue;
    try { require(fichier).demarrer(client); demarres.push(sys.name); }
    catch (e) { console.error(`[chargeur] ❌ système ${sys.name} :`, e.message); }
  }
  return demarres;
}

module.exports = { chargerCommandes, demarrerSystemes };
