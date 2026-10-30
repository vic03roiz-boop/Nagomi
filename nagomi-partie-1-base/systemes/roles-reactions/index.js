// 🌸 Donne / retire le rôle quand on met / enlève la réaction (configuré avec /reactionrole)
const { Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const bd = ouvrir('rolesreactions', {});

async function traiter(reaction, user, ajouter) {
  if (user.bot) return;
  try {
    if (reaction.partial) await reaction.fetch();
    const d = bd.data[reaction.message.id];
    if (!d) return;
    const roleId = d.roles[reaction.emoji.id || reaction.emoji.name];
    if (!roleId) return;
    const membre = await reaction.message.guild.members.fetch(user.id);
    if (ajouter) await membre.roles.add(roleId, 'rôle-réaction');
    else await membre.roles.remove(roleId, 'rôle-réaction');
  } catch (e) { console.error('[roles-reactions]', e.message); }
}

module.exports = {
  demarrer(client) {
    client.on(Events.MessageReactionAdd, (r, u) => traiter(r, u, true));
    client.on(Events.MessageReactionRemove, (r, u) => traiter(r, u, false));
    client.on(Events.MessageDelete, (m) => { if (bd.data[m.id]) { delete bd.data[m.id]; bd.sauver(); } });
  },
};
