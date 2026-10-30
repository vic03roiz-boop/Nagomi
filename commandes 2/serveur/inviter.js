const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } = require('discord.js');
const rep = require('../../outils/reponses');
const parametres = require('../../outils/parametres');
const { journaliser } = require('../../outils/journal');
const { ouvrir } = require('../../outils/stockage');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const invitations = require('../../systemes/invitations');

// Pour inviter UNE personne que tu connais (ami(e), proche) avec un joli message privé.
// Garde-fous : 5 invitations par jour et par personne de l'équipe, une seule par personne invitée.
const bd = ouvrir('inviter', { envois: [] });     // [{ par, vers, date }]
const MAX_PAR_JOUR = 5;
const [d1, d2] = textes.deco;

module.exports = {
  data: new SlashCommandBuilder().setName('inviter').setDescription('Invite une personne que tu connais à rejoindre Nagomi (message privé)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addUserOption((o) => o.setName('membre').setDescription('La personne à inviter (tu peux coller son identifiant)').setRequired(true))
    .addStringOption((o) => o.setName('message').setDescription('Un petit mot perso (facultatif)').setMaxLength(300)),

  async execute(i) {
    const cible = i.options.getUser('membre'); const mot = i.options.getString('message');
    if (cible.bot) return rep.repondre(i, rep.erreur('Les bots ne peuvent pas être invités 🤖'));
    if (cible.id === i.user.id) return rep.repondre(i, rep.erreur('Tu es déjà là 🌸'));
    if (await i.guild.members.fetch(cible.id).catch(() => null)) return rep.repondre(i, rep.erreur(`**${cible.displayName}** est déjà sur le serveur 🌸`));
    const jour = Date.now() - 24 * 3600 * 1000;
    if (bd.data.envois.some((e) => e.vers === cible.id)) return rep.repondre(i, rep.erreur('Cette personne a déjà reçu une invitation de ma part. Envoie-lui plutôt le lien toi-même 🌸'));
    if (bd.data.envois.filter((e) => e.par === i.user.id && e.date > jour).length >= MAX_PAR_JOUR) return rep.repondre(i, rep.erreur(`Limite atteinte : ${MAX_PAR_JOUR} invitations par jour.`));
    await i.deferReply({ flags: MessageFlags.Ephemeral });

    // une invitation rien que pour cette personne : 1 utilisation, valable 7 jours
    const id = parametres.lire('welcomeChannelId'); const salon = (id && await i.guild.channels.fetch(id).catch(() => null)) || i.guild.systemChannel
      || i.guild.channels.cache.find((c) => c.isTextBased() && c.permissionsFor(i.guild.members.me)?.has('CreateInstantInvite'));
    if (!salon) return rep.repondre(i, rep.erreur("Je n'ai trouvé aucun salon où créer l'invitation. Règle le salon de bienvenue avec `/config`."));
    const invit = await salon.createInvite({ maxUses: 1, maxAge: 7 * 24 * 3600, unique: true, reason: `/inviter par ${i.user.tag}` }).catch(() => null);
    if (!invit) return rep.repondre(i, rep.erreur("Je n'ai pas pu créer l'invitation (il me faut la permission « Créer une invitation »)."));
    invitations.lierCode(invit.code, i.user.id);

    const e = new EmbedBuilder().setColor(couleurs.rose).setTitle(`🍵 ${i.member.displayName} t'invite chez Nagomi`).setFooter({ text: `${textes.pied} · invitation personnelle, valable 7 jours` })
      .setDescription(`${d1}\nUn petit salon de thé MSP, doux et chaleureux, où l'on se retrouve en toute confiance 🌸\n${d2}` + (mot ? `\n\n💌 *« ${mot} »*\n— ${i.member.displayName}` : '') +
        `\n\nClique sur le bouton pour entrer, la porte est ouverte rien que pour toi.`);
    const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Rejoindre Nagomi').setEmoji('🎀').setStyle(ButtonStyle.Link).setURL(invit.url));
    const envoye = await cible.send({ embeds: [e], components: [row] }).then(() => true).catch(() => false);
    if (!envoye) {
      await invit.delete().catch(() => {});
      return rep.repondre(i, rep.erreur(`**${cible.displayName}** n'accepte pas mes messages privés. Envoie-lui le lien toi-même (clic droit sur un salon → « Inviter des personnes »).`));
    }
    bd.data.envois.push({ par: i.user.id, vers: cible.id, date: Date.now() }); bd.sauver();
    await journaliser(i.guild, { titre: '💌 Invitation envoyée', description: `${i.user} a invité **${cible.tag}** par message privé.` });
    return rep.repondre(i, rep.ok(`Invitation envoyée à **${cible.displayName}** 💌 (lien personnel, valable 7 jours)`));
  },
};
