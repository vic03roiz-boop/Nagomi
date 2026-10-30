const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ChannelType } = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const am = require('../../systemes/automod');

const REGLES = { invitations: '🔗 Invitations Discord', liens: '🌐 Tous les liens', mots: '🚫 Mots interdits', mentions: '📣 Trop de mentions', spam: '💨 Spam de messages', raid: '🚨 Anti-raid' };

module.exports = {
  data: new SlashCommandBuilder().setName('automod').setDescription('Protège le serveur automatiquement')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'voir (état de la protection)', value: 'voir' }, { name: 'activer (une règle)', value: 'activer' }, { name: 'desactiver (une règle)', value: 'desactiver' },
      { name: 'mot (ajouter / retirer un mot interdit)', value: 'mot' }, { name: 'lien (autoriser / retirer un site)', value: 'lien' },
      { name: 'exempter (rôle ou salon ignoré)', value: 'exempter' }, { name: 'regler (changer un nombre)', value: 'regler' },
      { name: 'raid (arrêter le mode raid)', value: 'raid' }))
    .addStringOption((o) => o.setName('regle').setDescription('Quelle règle ?').addChoices(...Object.entries(REGLES).map(([value, name]) => ({ name, value }))))
    .addStringOption((o) => o.setName('texte').setDescription('Le mot ou le site (ex : tenor.com). Un second envoi le retire'))
    .addRoleOption((o) => o.setName('role').setDescription('Rôle à exempter (un second envoi le retire)'))
    .addChannelOption((o) => o.setName('salon').setDescription('Salon ou catégorie à exempter').addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildAnnouncement))
    .addStringOption((o) => o.setName('reglage').setDescription('Pour « regler » : quel nombre ?').addChoices(
      { name: 'mentions max par message', value: 'mentionsMax' }, { name: 'spam : nb de messages', value: 'spamMessages' }, { name: 'spam : en combien de secondes', value: 'spamSecondes' },
      { name: 'infractions avant sourdine', value: 'sanctionApres' }, { name: 'durée de sourdine (min)', value: 'sanctionMinutes' },
      { name: 'raid : nb d’arrivées', value: 'raidArrivees' }, { name: 'raid : en combien de secondes', value: 'raidSecondes' }, { name: 'raid : durée de sourdine (min)', value: 'raidMinutes' }))
    .addIntegerOption((o) => o.setName('valeur').setDescription('Le nombre').setMinValue(1).setMaxValue(1000)),

  async execute(i) {
    const action = i.options.getString('action'); const r = am.reglages(); const regle = i.options.getString('regle'); const texte = i.options.getString('texte');
    const bascule = (liste, v) => (liste.includes(v) ? liste.filter((x) => x !== v) : [...liste, v]);

    if (action === 'voir') {
      const raid = am.etatRaid();
      return rep.repondre(i, new EmbedBuilder().setColor(couleurs.rose).setTitle('🛡️ Protection Nagomi').setFooter({ text: textes.pied })
        .setDescription(Object.entries(REGLES).map(([k, n]) => `${r[k] ? '🟢' : '⚪'} ${n}`).join('\n') +
          `\n\n💨 Spam : ${r.spamMessages} messages en ${r.spamSecondes} s · 📣 ${r.mentionsMax} mentions max\n🤫 Sourdine ${r.sanctionMinutes} min après ${r.sanctionApres} infractions\n` +
          `🚨 Raid : ${r.raidArrivees} arrivées en ${r.raidSecondes} s → sourdine ${r.raidMinutes} min${raid.actif ? '\n**⚠️ MODE RAID ACTIF**' : ''}\n\n` +
          `🚫 Mots interdits : ${r.motsListe.length ? r.motsListe.map((m) => `||${m}||`).join(' ') : 'aucun'}\n🌐 Sites autorisés : ${r.liensOk.join(', ')}\n` +
          `🎀 Rôles exemptés : ${r.exemptRoles.map((x) => `<@&${x}>`).join(' ') || 'aucun'}\n📁 Salons exemptés : ${r.exemptSalons.map((x) => `<#${x}>`).join(' ') || 'aucun'}\n\n*L'équipe n'est jamais sanctionnée.*`));
    }
    if (action === 'activer' || action === 'desactiver') {
      if (!regle) return rep.repondre(i, rep.erreur('Choisis la `regle`.'));
      r[regle] = action === 'activer'; am.enregistrer(r);
      return rep.repondre(i, rep.ok(`${REGLES[regle]} : ${action === 'activer' ? 'activé' : 'désactivé'}.`));
    }
    if (action === 'mot') {
      if (!texte) return rep.repondre(i, rep.erreur('Écris le mot dans `texte`.'));
      const w = texte.trim().toLowerCase(); const ajout = !r.motsListe.includes(w); r.motsListe = bascule(r.motsListe, w); am.enregistrer(r);
      return rep.repondre(i, rep.ok(ajout ? `Mot ajouté. (Pense à activer la règle : \`/automod action:activer regle:mots\`)` : 'Mot retiré.'));
    }
    if (action === 'lien') {
      if (!texte) return rep.repondre(i, rep.erreur('Écris le site dans `texte` (ex : tenor.com).'));
      const s = texte.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const ajout = !r.liensOk.includes(s); r.liensOk = bascule(r.liensOk, s); am.enregistrer(r);
      return rep.repondre(i, rep.ok(ajout ? `**${s}** est autorisé.` : `**${s}** n'est plus autorisé.`));
    }
    if (action === 'exempter') {
      const role = i.options.getRole('role'); const salon = i.options.getChannel('salon');
      if (!role && !salon) return rep.repondre(i, rep.erreur('Choisis un `role` ou un `salon`.'));
      if (role) r.exemptRoles = bascule(r.exemptRoles, role.id);
      if (salon) r.exemptSalons = bascule(r.exemptSalons, salon.id);
      am.enregistrer(r); return rep.repondre(i, rep.ok('Exemptions mises à jour (refais la même commande pour retirer). `/automod action:voir` pour la liste.'));
    }
    if (action === 'regler') {
      const cle = i.options.getString('reglage'); const v = i.options.getInteger('valeur');
      if (!cle || !v) return rep.repondre(i, rep.erreur('Il me faut `reglage` et `valeur`.'));
      r[cle] = v; am.enregistrer(r); return rep.repondre(i, rep.ok('Réglage enregistré 🌸'));
    }
    if (action === 'raid') { am.arreterRaid(); return rep.repondre(i, rep.ok('Mode raid arrêté : les nouveaux membres ne sont plus mis en sourdine.')); }
  },
};
