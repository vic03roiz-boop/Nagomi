// 🪪 Les profils des membres : pseudo MSP lié au compte Discord + rôles choisis dans le questionnaire.
// Réglé avec /questionnaire · consulté par l'équipe avec /profil
const { Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const parametres = require('../../outils/parametres');

const DEFAUT = [
  { id: 1, titre: 'Tu es…', aide: 'Choisis ce qui te correspond.', multiple: false, obligatoire: true, roles: [] },
  { id: 2, titre: 'Ta tranche d’âge', aide: 'Elle sert uniquement à protéger les plus jeunes (aucune date de naissance demandée).', multiple: false, obligatoire: true, roles: [] },
  { id: 3, titre: 'Ta version de MSP', aide: 'Tu peux en choisir plusieurs.', multiple: true, obligatoire: true, roles: [] },
  { id: 4, titre: 'Ta couleur', aide: 'La couleur de ton pseudo sur le serveur ✨', multiple: false, obligatoire: true, roles: [] },
  { id: 5, titre: 'Ce que tu viens chercher', aide: 'Acheter, vendre, discuter… (facultatif)', multiple: true, obligatoire: false, roles: [] },
];
const bd = ouvrir('profils', { groupes: DEFAUT, membres: {}, pseudos: {}, interdits: [], suivant: 6 });

const norm = (p) => p.trim().toLowerCase().replace(/\s+/g, '');
const pseudoValide = (p) => /^[\p{L}\p{N}_.\-]{3,25}$/u.test(p.trim());

// emoji coloré le plus proche de la couleur d'un rôle
function emojiCouleur(c) {
  if (!c) return '🏷️';
  const r = (c >> 16) / 255, g = ((c >> 8) & 255) / 255, b = (c & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, d = max - min;
  if (l > 0.93) return '🤍'; if (l < 0.18) return '🖤';
  let h = 0; if (d) { h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4; h = (h * 60 + 360) % 360; }
  if (d < 0.08) return '🩶';
  if (h < 15 || h >= 345) return l > 0.7 ? '🩷' : '❤️';
  if (h < 40) return l > 0.65 ? '🧡' : '🟤';
  if (h < 65) return '💛'; if (h < 170) return '💚'; if (h < 200) return '🩵'; if (h < 255) return '💙'; if (h < 330) return '💜';
  return '🩷';
}

// Applique le profil : retire les anciens rôles des questions, ajoute les nouveaux, donne le rôle Membre
async function appliquer(membre, reponses, { donnerMembre = true } = {}) {
  const aAjouter = new Set(), aRetirer = new Set();
  for (const g of bd.data.groupes) {
    const choix = reponses[g.id] || [];
    for (const r of g.roles) (choix.includes(r) ? aAjouter : aRetirer).add(r);
  }
  const membreRole = parametres.lire('memberRoleId');
  if (donnerMembre && membreRole) aAjouter.add(membreRole);
  const echecs = [];
  for (const r of aRetirer) if (!aAjouter.has(r) && membre.roles.cache.has(r)) await membre.roles.remove(r, 'Questionnaire').catch((e) => echecs.push(e.message));
  const nouveaux = [...aAjouter].filter((r) => !membre.roles.cache.has(r));
  if (nouveaux.length) await membre.roles.add(nouveaux, 'Questionnaire').catch((e) => echecs.push(e.message));
  return echecs;
}

module.exports = {
  bd, norm, pseudoValide, emojiCouleur, appliquer,
  demarrer(client) {
    // quelqu'un qui revient sur le serveur retrouve ses rôles sans refaire le questionnaire
    client.on(Events.GuildMemberAdd, async (m) => {
      const p = bd.data.membres[m.id]; if (!p?.termine || m.user.bot) return;
      await appliquer(m, p.reponses || {}).catch((e) => console.error('[profil]', e.message));
    });
  },
};
