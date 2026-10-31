// 📊 Statistiques par jour : messages envoyés et temps passé en vocal (lues par /stat)
const { Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');

const bd = ouvrir('stats', { depuis: Date.now(), jours: {} }); // jours: { 'AAAA-MM-JJ': { userId: { m: messages, v: secondes } } }
bd.data.jours ||= {}; bd.data.depuis ||= Date.now();
const actifs = new Map(); // userId -> dernier instant crédité (vocal)

const dateParis = (t = Date.now()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(t); // AAAA-MM-JJ
const fiche = (jour, id) => ((bd.data.jours[jour] ||= {})[id] ||= { m: 0, v: 0 });

function crediter(id) {
  const maintenant = Date.now(), debut = actifs.get(id); if (!debut) return;
  const sec = Math.round((maintenant - debut) / 1000);
  if (sec > 0) { fiche(dateParis(), id).v += sec; actifs.set(id, maintenant); bd.sauver(); }
}
const compte = (e) => e.channelId && !e.member?.user.bot && e.channelId !== e.guild?.afkChannelId;

// Totaux d'un membre sur les N derniers jours (1 = aujourd'hui)
function totaux(id, nbJours) {
  let m = 0, v = 0;
  for (let k = 0; k < nbJours; k++) {
    const f = bd.data.jours[dateParis(Date.now() - k * 86400000)]?.[id];
    if (f) { m += f.m; v += f.v; }
  }
  return { m, v };
}

module.exports = {
  bd, totaux, dateParis,
  demarrer(client) {
    client.once(Events.ClientReady, () => {
      for (const g of client.guilds.cache.values()) for (const e of g.voiceStates.cache.values()) if (compte(e)) actifs.set(e.id, Date.now());
      setInterval(() => {
        for (const id of actifs.keys()) crediter(id);
        const limite = dateParis(Date.now() - 40 * 86400000);
        for (const j of Object.keys(bd.data.jours)) if (j < limite) delete bd.data.jours[j];
      }, 30 * 1000);
    });
    client.on(Events.MessageCreate, (m) => {
      if (!m.guild || m.author.bot) return;
      fiche(dateParis(), m.author.id).m++; bd.sauver();
    });
    client.on(Events.VoiceStateUpdate, (avant, apres) => {
      const id = apres.id || avant.id;
      if (compte(apres)) { if (!actifs.has(id)) actifs.set(id, Date.now()); }
      else if (actifs.has(id)) { crediter(id); actifs.delete(id); }
    });
  },
};
