// 🎮 Mini-jeux : le pendu MSP (on tape les lettres dans le salon) et le quiz (/quiz)
const { EmbedBuilder, Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');

const quiz = ouvrir('quiz', { questions: [
  { q: 'Comment s\'appelle la monnaie de base de MovieStarPlanet ?', bonne: 'Les StarCoins', mauvaises: ['Les Pièces d\'or', 'Les Gemmes', 'Les Rubis'] },
  { q: 'Comment s\'appelle l\'abonnement payant de MSP qui donne des avantages ?', bonne: 'VIP', mauvaises: ['Premium', 'Gold', 'Super Star'] },
  { q: 'Comment appelle-t-on la popularité de ton personnage sur MSP ?', bonne: 'La Fame', mauvaises: ['Le Karma', 'Le Prestige', 'Les Likes'] },
] });

const MOTS = ['starcoins', 'diamants', 'filmstar', 'boutique', 'autographe', 'celebrite', 'vetements', 'coiffure', 'animaux', 'artbook',
  'chambre', 'tenue', 'concours', 'cadeau', 'popularite', 'maquillage', 'paillettes', 'vedette', 'podium', 'projecteur', 'tapisrouge',
  'collection', 'accessoire', 'personnage', 'scenario', 'montage', 'moviestar', 'clavardage', 'abonnement', 'nouveaute'];

const parties = new Map(); // salonId -> partie de pendu
const VIES = 7;
const sansAccent = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

function plateau(p, fin) {
  const mot = [...p.mot].map((l) => (p.trouvees.has(l) || fin ? l : '_')).join(' ');
  const c = fin === 'gagne' ? couleurs.matcha : fin === 'perdu' ? couleurs.erreur : couleurs.rose;
  return new EmbedBuilder().setColor(c).setTitle('🍵 Le pendu de Nagomi')
    .setDescription([`\`${mot.toUpperCase()}\``, '', `Vies : ${'❤️'.repeat(p.vies)}${'🤍'.repeat(VIES - p.vies)}`,
      `Lettres ratées : ${[...p.ratees].join(' ').toUpperCase() || '—'}`, '',
      fin === 'gagne' ? `🏆 Bravo <@${p.gagnant}> ! Le mot était **${p.mot}**.`
        : fin === 'perdu' ? `🥀 Perdu ! Le mot était **${p.mot}**.`
        : 'Tape **une lettre** dans le salon, ou **le mot entier** si tu as trouvé 🌸']
      .join('\n')).setFooter({ text: textes.pied });
}

async function lancerPendu(salon) {
  if (parties.has(salon.id)) return false;
  const mot = MOTS[Math.floor(Math.random() * MOTS.length)];
  const p = { mot, trouvees: new Set(), ratees: new Set(), vies: VIES, msg: null };
  p.msg = await salon.send({ embeds: [plateau(p)] });
  parties.set(salon.id, p);
  return true;
}

module.exports = {
  quiz, parties, lancerPendu, plateau,
  demarrer(client) {
    client.on(Events.MessageCreate, async (m) => {
      try {
        if (m.author.bot || !m.guild) return;
        const p = parties.get(m.channelId); if (!p) return;
        const t = sansAccent(m.content.trim());
        if (!/^[a-z]+$/.test(t) || (t.length > 1 && t.length !== p.mot.length)) return;
        let fin = null;
        if (t.length > 1) {
          if (t === p.mot) { [...p.mot].forEach((l) => p.trouvees.add(l)); fin = 'gagne'; }
          else { p.vies--; await m.react('❌').catch(() => {}); }
        } else if (p.trouvees.has(t) || p.ratees.has(t)) { return m.react('🔁').catch(() => {}); }
        else if (p.mot.includes(t)) { p.trouvees.add(t); await m.react('✅').catch(() => {}); if ([...p.mot].every((l) => p.trouvees.has(l))) fin = 'gagne'; }
        else { p.ratees.add(t); p.vies--; await m.react('❌').catch(() => {}); }
        if (fin) p.gagnant = m.author.id;
        else if (p.vies <= 0) fin = 'perdu';
        if (fin) parties.delete(m.channelId);
        await p.msg.edit({ embeds: [plateau(p, fin)] }).catch(() => {});
        if (fin === 'gagne') await m.channel.send(`🎉 <@${m.author.id}> a trouvé le mot !`).catch(() => {});
      } catch (e) { console.error('[pendu]', e.message); }
    });
  },
};
