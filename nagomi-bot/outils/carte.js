// 🌸 Dessine la carte de niveau (image) dans l'esprit Nagomi.
const path = require('path');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');
GlobalFonts.registerFromPath(path.join(__dirname, '..', 'polices', 'Fredoka-600.woff2'), 'Fredoka');
GlobalFonts.registerFromPath(path.join(__dirname, '..', 'polices', 'Fredoka-700.woff2'), 'FredokaB');

const C = { rose: '#f4b0b0', roseClair: '#ffe1eb', miel: '#e0b262', matcha: '#a8ba8c', creme: '#fbf3e6', brun: '#684238', encre: '#96495c' };

function rect(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); }
function petale(ctx, x, y, t, rot, couleur) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.fillStyle = couleur;
  ctx.beginPath(); ctx.moveTo(0, -t); ctx.bezierCurveTo(t, -t * 0.6, t * 0.8, t * 0.8, 0, t); ctx.bezierCurveTo(-t * 0.8, t * 0.8, -t, -t * 0.6, 0, -t); ctx.fill(); ctx.restore();
}
function fleur(ctx, x, y, t, couleur, coeur) {
  for (let k = 0; k < 5; k++) petale(ctx, x + Math.cos((k * 2 * Math.PI) / 5 - Math.PI / 2) * t, y + Math.sin((k * 2 * Math.PI) / 5 - Math.PI / 2) * t, t * 0.9, (k * 2 * Math.PI) / 5, couleur);
  ctx.fillStyle = coeur; ctx.beginPath(); ctx.arc(x, y, t * 0.4, 0, Math.PI * 2); ctx.fill();
}
function tasse(ctx, x, y, s) {            // petite tasse de thé + vapeur
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = C.rose; ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (const dx of [-12, 0, 12]) { ctx.beginPath(); ctx.moveTo(dx, -8); ctx.bezierCurveTo(dx - 7, -20, dx + 7, -28, dx, -38); ctx.stroke(); }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = C.encre; ctx.lineWidth = 3.5;
  ctx.beginPath(); ctx.moveTo(-28, 0); ctx.lineTo(28, 0); ctx.bezierCurveTo(28, 34, 14, 44, 0, 44); ctx.bezierCurveTo(-14, 44, -28, 34, -28, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(30, 14, 11, -Math.PI / 2, Math.PI / 2); ctx.stroke();
  ctx.fillStyle = C.roseClair; ctx.beginPath(); ctx.ellipse(0, 1, 26, 5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = C.rose; ctx.beginPath(); ctx.arc(-9, 22, 4, 0, Math.PI * 2); ctx.fill();   // petit coeur-joue
  ctx.restore();
}
function texte(ctx, t, x, y, police, couleur, align = 'left') { ctx.font = police; ctx.fillStyle = couleur; ctx.textAlign = align; ctx.fillText(t, x, y); }
function coupe(ctx, t, max) { while (ctx.measureText(t).width > max && t.length > 1) t = t.slice(0, -2) + '…'; return t; }

async function carteNiveau({ nom, avatarUrl, niveau, rang, xp, xpMax, messages, prochain }) {
  const W = 920, H = 300, c = createCanvas(W, H), ctx = c.getContext('2d');
  // fond crème rayé, bordure rose
  ctx.save(); rect(ctx, 0, 0, W, H, 36); ctx.clip();
  ctx.fillStyle = C.creme; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffeaf1'; for (let x = -H; x < W + H; x += 84) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 42, 0); ctx.lineTo(x + 42 - H, H); ctx.lineTo(x - H, H); ctx.fill(); }
  const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, 'rgba(255,255,255,0.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  for (const [x, y, t, r, col] of [[40, 40, 9, 0.4, C.rose], [880, 262, 8, 1.2, C.rose], [860, 40, 7, 2, '#f8cfd0'], [300, 272, 7, 0.9, '#f8cfd0'], [700, 30, 6, 0.2, C.rose]]) petale(ctx, x, y, t, r, col);
  ctx.restore();
  rect(ctx, 6, 6, W - 12, H - 12, 32); ctx.lineWidth = 6; ctx.strokeStyle = C.rose; ctx.stroke();
  rect(ctx, 16, 16, W - 32, H - 32, 24); ctx.lineWidth = 2; ctx.setLineDash([2, 9]); ctx.lineCap = 'round'; ctx.strokeStyle = C.miel; ctx.stroke(); ctx.setLineDash([]);

  // avatar rond avec anneau doré et petite fleur
  const ax = 150, ay = 150, ar = 82;
  ctx.fillStyle = C.miel; ctx.beginPath(); ctx.arc(ax, ay, ar + 9, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, ar + 4, 0, Math.PI * 2); ctx.fill();
  try {
    const img = await loadImage(avatarUrl); ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(img, ax - ar, ay - ar, ar * 2, ar * 2); ctx.restore();
  } catch { ctx.fillStyle = C.roseClair; ctx.beginPath(); ctx.arc(ax, ay, ar, 0, Math.PI * 2); ctx.fill(); }
  fleur(ctx, ax + 62, ay + 68, 11, C.rose, C.miel);

  // textes
  ctx.textBaseline = 'alphabetic';
  ctx.font = '44px FredokaB'; const n = coupe(ctx, nom, 440);
  texte(ctx, n, 275, 98, '44px FredokaB', C.brun);
  texte(ctx, `Niveau ${niveau}`, 275, 146, '30px FredokaB', C.encre);
  texte(ctx, rang ? `#${rang}` : '—', 880, 98, '40px FredokaB', C.miel, 'right');
  texte(ctx, 'classement', 880, 124, '19px Fredoka', C.rose, 'right');
  tasse(ctx, 838, 214, 0.75);

  // barre d'XP
  const bx = 275, by = 172, bw = 500, bh = 34, part = Math.max(0, Math.min(1, xp / xpMax));
  rect(ctx, bx, by, bw, bh, bh / 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = C.rose; ctx.stroke();
  if (part > 0) {
    const w = Math.max(bh, bw * part); ctx.save(); rect(ctx, bx + 3, by + 3, bw - 6, bh - 6, (bh - 6) / 2); ctx.clip();
    const gr = ctx.createLinearGradient(bx, 0, bx + w, 0); gr.addColorStop(0, C.rose); gr.addColorStop(1, '#f2c98a');
    rect(ctx, bx + 3, by + 3, w - 6, bh - 6, (bh - 6) / 2); ctx.fillStyle = gr; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; rect(ctx, bx + 10, by + 7, w - 20, 7, 4); ctx.fill(); ctx.restore();
    fleur(ctx, bx + Math.min(bw - 14, w - 6), by + bh / 2, 9, '#fff', C.miel);
  }
  texte(ctx, `${xp.toLocaleString('fr-FR')} / ${xpMax.toLocaleString('fr-FR')} XP`, bx, 240, '24px FredokaB', C.brun);
  texte(ctx, `${messages.toLocaleString('fr-FR')} messages`, bx + bw, 240, '22px Fredoka', C.encre, 'right');
  if (prochain) texte(ctx, `prochain palier : niveau ${prochain}`, bx, 270, '19px Fredoka', C.rose);
  return c.toBuffer('image/png');
}

module.exports = { carteNiveau };
