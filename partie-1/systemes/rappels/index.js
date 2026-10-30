// 📣 Messages automatiques (/auto) et 🎂 anniversaires (/anniversaire)
const { EmbedBuilder } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

const auto = ouvrir('messages-auto', { liste: [], suivant: 1 });
const anniv = ouvrir('anniversaires', { membres: {}, salonId: null, dernier: '' });
const [d1, d2] = textes.deco;

const FREQ = { '6h': 6 * 36e5, '12h': 12 * 36e5, jour: 24 * 36e5, semaine: 7 * 24 * 36e5 };

function parisMaintenant() {
  const p = Object.fromEntries(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false })
    .formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { an: +p.year, mois: +p.month, jour: +p.day, heure: +p.hour % 24, date: `${p.year}-${p.month}-${p.day}` };
}

function embedAuto(a) {
  return new EmbedBuilder().setColor(couleurs.rose).setTitle(a.titre || `${d1} Petit rappel ${d2}`).setDescription(a.texte).setFooter({ text: textes.pied });
}
async function envoyerAuto(client, a) {
  const c = await client.channels.fetch(a.salonId).catch(() => null);
  if (c?.isTextBased()) await c.send({ embeds: [embedAuto(a)] }).catch((e) => console.error('[auto]', e.message));
}

async function tick(client) {
  const now = Date.now();
  for (const a of auto.data.liste) {
    if (a.prochain > now) continue;
    a.prochain = now + FREQ[a.frequence];
    auto.sauver();
    await envoyerAuto(client, a);
  }
  const p = parisMaintenant();
  if (anniv.data.salonId && p.heure >= 9 && anniv.data.dernier !== p.date) {
    anniv.data.dernier = p.date; anniv.sauver();
    const bissextile = (p.an % 4 === 0 && p.an % 100 !== 0) || p.an % 400 === 0;
    const ids = Object.entries(anniv.data.membres)
      .filter(([, d]) => (d.j === p.jour && d.m === p.mois) || (!bissextile && d.j === 29 && d.m === 2 && p.jour === 28 && p.mois === 2)).map(([id]) => id);
    const c = await client.channels.fetch(anniv.data.salonId).catch(() => null);
    const presents = [];
    if (c?.guild) for (const id of ids) if (await c.guild.members.fetch(id).catch(() => null)) presents.push(id);
    if (c && presents.length) await c.send({
      content: presents.map((i) => `<@${i}>`).join(' '),
      embeds: [new EmbedBuilder().setColor(couleurs.miel).setTitle(`🎂 ${d1} Joyeux anniversaire ! ${d2}`)
        .setDescription(`Toute l'équipe de Nagomi souhaite un merveilleux anniversaire à ${presents.map((i) => `<@${i}>`).join(' et ')} 🎀🍰\nPrépare le thé et les gâteaux, c'est ta journée ✨`).setFooter({ text: textes.pied })],
    }).catch((e) => console.error('[anniv]', e.message));
  }
}

module.exports = {
  auto, anniv, FREQ, envoyerAuto, parisMaintenant,
  demarrer(client) {
    client.once('ready', () => { setInterval(() => tick(client).catch((e) => console.error('[rappels]', e.message)), 60 * 1000); });
  },
};
