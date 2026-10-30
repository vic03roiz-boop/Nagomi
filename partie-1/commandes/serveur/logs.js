const { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');
const rep = require('../../outils/reponses');
const parametres = require('../../outils/parametres');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const { CATEGORIES } = require('../../systemes/logs');
const fils = require('../../outils/fils');

const lire = () => { const r = parametres.lire('logs') || {}; return { off: r.off || [], salons: r.salons || {} }; };

module.exports = {
  data: new SlashCommandBuilder().setName('logs').setDescription('Règle les logs du serveur (messages, membres, rôles…)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices(
      { name: 'voir (état des logs)', value: 'voir' }, { name: 'salon (où envoyer les logs)', value: 'salon' },
      { name: 'fils (un fil privé par catégorie, dans un salon staff)', value: 'fils' }, { name: 'sans-fils (revenir aux salons)', value: 'sansfils' },
      { name: 'activer', value: 'activer' }, { name: 'desactiver', value: 'desactiver' }))
    .addStringOption((o) => o.setName('categorie').setDescription('Quelle catégorie ? (toutes si vide)')
      .addChoices(...Object.entries(CATEGORIES).map(([value, name]) => ({ name, value }))))
    .addChannelOption((o) => o.setName('salon').setDescription('Le salon des logs').addChannelTypes(ChannelType.GuildText)),

  async execute(i) {
    const action = i.options.getString('action'); const cat = i.options.getString('categorie'); const r = lire();
    if (action === 'sansfils') { parametres.ecrire('logsFils', null); return rep.repondre(i, rep.ok('Mode fils désactivé : les logs reviennent dans les salons réglés. (Les anciens fils restent, tu peux les supprimer.)')); }
    if (action === 'fils') {
      const s = i.options.getChannel('salon'); if (!s) return rep.repondre(i, rep.erreur('Choisis le `salon` (un salon réservé à l\'équipe) : les fils y seront créés.'));
      parametres.ecrire('logsFils', { conteneur: s.id, ids: {} });
      const notes = [];
      const staff = parametres.lire('staffRoleId');
      if (staff) await s.permissionOverwrites.edit(staff, { ViewChannel: true, ReadMessageHistory: true, ManageThreads: true }, { reason: 'Logs en fils privés' }).catch(() => notes.push("⚠️ Je n'ai pas pu donner à l'équipe le droit de voir les fils privés : ajoute **Gérer les fils** à ton rôle Équipe sur ce salon."));
      else notes.push("⚠️ Rôle Équipe non réglé (`/config`) : seuls les administrateurs verront les fils privés.");
      const faits = [];
      for (const cat of Object.keys(fils.NOMS)) { const t = await fils.cible(i.guild, cat); if (t) faits.push(`${t}`); }
      if (!faits.length) { parametres.ecrire('logsFils', null); return rep.repondre(i, rep.erreur("Je n'ai pas pu créer de fils privés : donne-moi dans ce salon les permissions **Créer des fils privés**, **Envoyer des messages dans les fils** et **Gérer les fils**.")); }
      return rep.repondre(i, rep.ok(`Les logs iront dans des fils privés de ${s} : ${faits.join(' ')}\nLes transcriptions de tickets sont dans le fil 🎫・tickets.${notes.length ? '\n' + notes.join('\n') : ''}`));
    }
    if (action === 'salon') {
      const s = i.options.getChannel('salon'); if (!s) return rep.repondre(i, rep.erreur('Choisis le `salon`.'));
      if (cat) r.salons[cat] = s.id; else { parametres.ecrire('logsChannelId', s.id); r.salons = {}; }
      parametres.ecrire('logs', r);
      return rep.repondre(i, rep.ok(cat ? `Les logs **${CATEGORIES[cat]}** iront dans ${s}.` : `Tous les logs iront dans ${s}.`));
    }
    if (action === 'activer' || action === 'desactiver') {
      const cibles = cat ? [cat] : Object.keys(CATEGORIES);
      r.off = action === 'activer' ? r.off.filter((c) => !cibles.includes(c)) : [...new Set([...r.off, ...cibles])];
      parametres.ecrire('logs', r);
      return rep.repondre(i, rep.ok(`Logs ${action === 'activer' ? 'activés' : 'désactivés'} : ${cibles.map((c) => CATEGORIES[c]).join(', ')}`));
    }
    const defaut = parametres.lire('logsChannelId'); const f = fils.lire();
    return rep.repondre(i, new EmbedBuilder().setColor(couleurs.rose).setTitle('📋 Logs').setFooter({ text: textes.pied })
      .setDescription(`${f?.conteneur ? `Mode **fils privés** dans <#${f.conteneur}> 🧵\n` : ''}Salon principal : ${defaut ? `<#${defaut}>` : '*(aucun — `/logs action:salon salon:#logs`)*'}\n\n` +
        Object.entries(CATEGORIES).map(([c, n]) => `${r.off.includes(c) ? '⚪' : '🟢'} ${n}${r.salons[c] ? ` → <#${r.salons[c]}>` : ''}`).join('\n')));
  },
};
