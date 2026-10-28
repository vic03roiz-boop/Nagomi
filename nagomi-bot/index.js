// 🍵 NAGOMI — point de départ du bot.
// ⚠️ Tu n'as JAMAIS besoin de modifier ce fichier.
// Les commandes sont dans commandes/, les systèmes automatiques dans systemes/.
const { Client, GatewayIntentBits, Partials, Events, MessageFlags } = require('discord.js');
const { chargerCommandes, demarrerSystemes } = require('./outils/chargeur');
const rep = require('./outils/reponses');

const TOKEN = process.env.DISCORD_TOKEN || process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;
if (!TOKEN) { console.error('❌ Variable DISCORD_TOKEN manquante (Railway → Variables).'); process.exit(1); }

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,          // à activer dans le portail développeur (Server Members Intent)
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,        // pour les logs (texte des messages modifiés/supprimés) — à activer aussi dans le portail
    GatewayIntentBits.GuildVoiceStates,      // logs vocal
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildEmojisAndStickers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
});

client.commands = chargerCommandes();
const systemes = demarrerSystemes(client);

client.once(Events.ClientReady, async () => {
  const liste = client.commands.map((c) => c.data.toJSON());
  try {
    if (GUILD_ID) await client.application.commands.set(liste, GUILD_ID);
    else await client.application.commands.set(liste);
    console.log(`🍵 Nagomi est prête : ${liste.length} commandes ${GUILD_ID ? 'sur le serveur' : '(globales)'} · systèmes : ${systemes.join(', ') || 'aucun'}`);
  } catch (e) { console.error('❌ Enregistrement des commandes :', e.message); }
});

// Aiguillage : slash, boutons, menus, formulaires.
// Les boutons/menus/formulaires ont un customId du type "commande:action:…" → envoyés à commande.composant()
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd) await cmd.execute(interaction);
    } else if (interaction.isAutocomplete()) {
      const cmd = client.commands.get(interaction.commandName);
      if (cmd?.autocomplete) await cmd.autocomplete(interaction);
    } else if (interaction.customId) {
      const cmd = client.commands.get(interaction.customId.split(':')[0]);
      if (cmd?.composant) await cmd.composant(interaction);
    }
  } catch (e) {
    console.error('[interaction]', e);
    if (interaction.isAutocomplete?.()) return;
    const msg = rep.erreur("Oups, quelque chose s'est mal passé. Réessaie dans un instant 🥀");
    try {
      if (interaction.deferred || interaction.replied) await interaction.followUp({ embeds: [msg], flags: MessageFlags.Ephemeral });
      else await interaction.reply({ embeds: [msg], flags: MessageFlags.Ephemeral });
    } catch {}
  }
});

process.on('unhandledRejection', (e) => console.error('[erreur non gérée]', e));
client.login(TOKEN);
