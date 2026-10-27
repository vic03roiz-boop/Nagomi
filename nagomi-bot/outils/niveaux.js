// 📈 Le cœur du système de niveaux : calcul de l'XP, des niveaux, et des rôles de paliers.
const { ouvrir } = require('./stockage');

const bd = ouvrir('niveaux', { membres: {} });                         // { idMembre: { xp, messages } }
const cfg = ouvrir('paliers', { mode: 'remplacer', liste: [] });        // liste : [{ niveau, roleId }]

// XP nécessaire pour passer du niveau n au niveau n+1 (même courbe que MEE6)
const coutNiveau = (n) => 5 * n * n + 50 * n + 100;

// XP total nécessaire pour ATTEINDRE le niveau n
function xpPourAtteindre(n) { let t = 0; for (let k = 0; k < n; k++) t += coutNiveau(k); return t; }

function niveauDepuisXp(xp) { let n = 0, reste = xp; while (reste >= coutNiveau(n)) { reste -= coutNiveau(n); n++; } return n; }

function infos(idMembre) {
  const m = bd.data.membres[idMembre] || { xp: 0, messages: 0 };
  const niveau = niveauDepuisXp(m.xp);
  const debut = xpPourAtteindre(niveau);
  return { xp: m.xp, messages: m.messages, niveau, dansNiveau: m.xp - debut, pourSuivant: coutNiveau(niveau) };
}

function classement() {
  return Object.entries(bd.data.membres).map(([id, m]) => ({ id, xp: m.xp })).sort((a, b) => b.xp - a.xp);
}

// Modifie l'XP. Renvoie { ancien, nouveau } (niveaux)
function changerXp(idMembre, fonction, compterMessage = false) {
  const m = (bd.data.membres[idMembre] ||= { xp: 0, messages: 0 });
  const ancien = niveauDepuisXp(m.xp);
  m.xp = Math.max(0, Math.round(fonction(m.xp)));
  if (compterMessage) m.messages++;
  bd.sauver();
  return { ancien, nouveau: niveauDepuisXp(m.xp) };
}

// ----- Paliers de rôles -----
const paliers = () => [...cfg.data.liste].sort((a, b) => a.niveau - b.niveau);
const mode = () => cfg.data.mode;

// Quels rôles de paliers ce niveau donne-t-il ?
function rolesVoulus(niveau) {
  const atteints = paliers().filter((p) => p.niveau <= niveau);
  if (!atteints.length) return [];
  return mode() === 'remplacer' ? [atteints.at(-1).roleId] : atteints.map((p) => p.roleId);
}

// Met les rôles du membre d'équerre avec son niveau. Renvoie les rôles ajoutés.
async function synchroniser(membre, niveau) {
  const voulus = new Set(rolesVoulus(niveau));
  const tous = new Set(cfg.data.liste.map((p) => p.roleId));
  const ajoutes = [];
  for (const id of voulus) {
    if (!membre.roles.cache.has(id)) {
      const ok = await membre.roles.add(id, `Palier niveau ${niveau}`).then(() => true).catch(() => false);
      if (ok) ajoutes.push(id);
    }
  }
  for (const id of tous) {
    if (!voulus.has(id) && membre.roles.cache.has(id)) await membre.roles.remove(id, `Palier niveau ${niveau}`).catch(() => {});
  }
  return ajoutes;
}

module.exports = { bd, cfg, coutNiveau, xpPourAtteindre, niveauDepuisXp, infos, classement, changerXp, paliers, mode, rolesVoulus, synchroniser };
