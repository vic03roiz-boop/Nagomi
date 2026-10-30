// ⏱️ Transforme "10m", "2h", "3j" en millisecondes.
const UNITES = { s: 1000, m: 60000, h: 3600000, j: 86400000, d: 86400000 };

function lireDuree(texte) {
  const m = String(texte || '').trim().toLowerCase().match(/^(\d+)\s*(s|m|h|j|d)$/);
  if (!m) return null;
  return Number(m[1]) * UNITES[m[2]];
}

function afficherDuree(ms) {
  const j = Math.floor(ms / 86400000), h = Math.floor(ms % 86400000 / 3600000), m = Math.floor(ms % 3600000 / 60000);
  const p = [];
  if (j) p.push(`${j} j`); if (h) p.push(`${h} h`); if (m || !p.length) p.push(`${m} min`);
  return p.join(' ');
}

module.exports = { lireDuree, afficherDuree };
