// ✨ Donne les rôles automatiques (/autorole) à chaque nouveau membre
const { Events } = require('discord.js');
const { ouvrir } = require('../../outils/stockage');
const bd = ouvrir('autoroles', { roles: [] });

module.exports = {
  demarrer(client) {
    client.on(Events.GuildMemberAdd, async (membre) => {
      if (membre.user.bot) return;
      for (const id of bd.data.roles) await membre.roles.add(id, 'autorole').catch((e) => console.error('[autorole]', e.message));
    });
  },
};
