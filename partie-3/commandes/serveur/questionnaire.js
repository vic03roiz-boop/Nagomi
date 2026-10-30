// 🪪 Questionnaire d'arrivée : pseudo MSP + choix des rôles → le salon s'ouvre une fois tout rempli.
const {
  SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, MessageFlags,
} = require('discord.js');
const rep = require('../../outils/reponses');
const couleurs = require('../../reglages/couleurs');
const textes = require('../../reglages/textes');
const parametres = require('../../outils/parametres');
const { estStaff } = require('../../outils/permissions');
const { journaliser } = require('../../outils/journal');
const profil = require('../../systemes/profil');

const { bd } = profil;
const PAR_PAGE = 3;
const sessions = new Map(); // userId -> { pseudo, reponses, page }
const [d1, d2] = textes.deco;

const actifs = (guild) => bd.data.groupes
  .map((g) => ({ ...g, roles: g.roles.filter((r) => guild.roles.cache.has(r)) }))
  .filter((g) => g.roles.length);

function ecran(guild, s) {
  const gs = actifs(guild);
  const pages = Math.max(1, Math.ceil(gs.length / PAR_PAGE));
  s.page = Math.min(Math.max(s.page || 0, 0), pages - 1);
  const ici = gs.slice(s.page * PAR_PAGE, (s.page + 1) * PAR_PAGE);
  const emb = new EmbedBuilder().setColor(couleurs.rose)
    .setTitle(`${d1} Ton profil ${d2}`)
    .setDescription([`Pseudo MSP : **${s.pseudo}** · serveur **${s.serveur}**`, '',
      ...ici.map((g) => `**${g.titre}** ${g.obligatoire ? '' : '*(facultatif)*'}\n${g.aide}`)].join('\n'))
    .setFooter({ text: `Page ${s.page + 1}/${pages} · ${textes.pied}` });
  const rows = ici.map((g) => {
    const choisis = s.reponses[g.id] || [];
    const menu = new StringSelectMenuBuilder().setCustomId(`questionnaire:sel:${g.id}`)
      .setPlaceholder(g.titre).setMinValues(g.obligatoire ? 1 : 0).setMaxValues(g.multiple ? Math.min(g.roles.length, 25) : 1)
      .addOptions(g.roles.slice(0, 25).map((id) => {
        const r = guild.roles.cache.get(id);
        return { label: r.name.slice(0, 100), value: id, default: choisis.includes(id), emoji: g.couleur ? profil.emojiCouleur(r.color) : undefined };
      }));
    return new ActionRowBuilder().addComponents(menu);
  });
  const btns = new ActionRowBuilder();
  if (s.page > 0) btns.addComponents(new ButtonBuilder().setCustomId('questionnaire:page:-1').setLabel('Retour').setStyle(ButtonStyle.Secondary));
  if (s.page < pages - 1) btns.addComponents(new ButtonBuilder().setCustomId('questionnaire:page:1').setLabel('Suivant').setStyle(ButtonStyle.Primary));
  else btns.addComponents(new ButtonBuilder().setCustomId('questionnaire:fin').setLabel('Valider mon profil').setEmoji('🍵').setStyle(ButtonStyle.Success));
  return { embeds: [emb], components: [...rows, btns], flags: MessageFlags.Ephemeral };
}

const maj = ({ flags, ...r }) => r; // pas de flags dans une mise à jour
const manquants = (guild, s) => actifs(guild).filter((g) => g.obligatoire && !(s.reponses[g.id]?.length));

module.exports = {
  data: new SlashCommandBuilder().setName('questionnaire').setDescription("Le questionnaire d'arrivée (pseudo MSP + rôles)")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand((s) => s.setName('panneau').setDescription('Poster le message avec les boutons dans un salon')
      .addChannelOption((o) => o.setName('salon').setDescription('Ex : le salon du règlement').setRequired(true)))
    .addSubcommand((s) => {
      s.setName('roles').setDescription('Choisir les rôles proposés pour une question')
        .addIntegerOption((o) => o.setName('question').setDescription('Quelle question ?').setRequired(true).addChoices(
          { name: '1 · Genre (femme, homme, autre)', value: 1 }, { name: '2 · Âge (+18, -18)', value: 2 },
          { name: '3 · Version MSP (MSP1, MSP2, City)', value: 3 }, { name: '4 · Couleur', value: 4 },
          { name: '5 · Centres d\'intérêt (facultatif)', value: 5 }));
      for (let n = 1; n <= 12; n++) s.addRoleOption((o) => o.setName(`role${n}`).setDescription(`Rôle n°${n}`).setRequired(n === 1));
      return s;
    })
    .addSubcommand((s) => s.setName('reglement').setDescription('Choisir le message du règlement : les membres doivent y réagir')
      .addChannelOption((o) => o.setName('salon').setDescription('Le salon du règlement').setRequired(true))
      .addStringOption((o) => o.setName('message').setDescription("L'identifiant du message du règlement (clic droit > Copier l'identifiant)").setRequired(true))
      .addStringOption((o) => o.setName('emoji').setDescription('Emoji de réaction : un emoji classique ou un emoji de ton serveur (par défaut 🍵)')))
    .addSubcommand((s) => s.setName('etat').setDescription('Voir comment le questionnaire est réglé'))
    .addSubcommand((s) => s.setName('interdire').setDescription('Interdire (ou autoriser à nouveau) un pseudo MSP, ex : un arnaqueur')
      .addStringOption((o) => o.setName('action').setDescription('Que faire ?').setRequired(true).addChoices({ name: 'interdire', value: 'interdire' }, { name: 'autoriser', value: 'autoriser' }))
      .addStringOption((o) => o.setName('pseudo').setDescription('Le pseudo MSP').setRequired(true))),

  async execute(i) {
    if (!estStaff(i.member)) return rep.repondre(i, rep.erreur(textes.pasStaff));
    const sub = i.options.getSubcommand();

    if (sub === 'roles') {
      const g = bd.data.groupes.find((x) => x.id === i.options.getInteger('question'));
      const roles = [];
      for (let n = 1; n <= 12; n++) { const r = i.options.getRole(`role${n}`); if (r && !roles.includes(r)) roles.push(r); }
      const moi = i.guild.members.me.roles.highest.position;
      const mauvais = roles.filter((r) => r.managed || r.id === i.guild.id || r.position >= moi);
      if (mauvais.length) return rep.repondre(i, rep.erreur(`Je ne peux pas donner : ${mauvais.map((r) => `**${r.name}**`).join(', ')}. Mon rôle doit être **au-dessus** d'eux (Paramètres du serveur → Rôles).`));
      g.roles = roles.map((r) => r.id);
      if (g.id === 4) g.couleur = true;
      bd.sauver();
      return rep.repondre(i, rep.ok(`Question **${g.titre}** : ${roles.map((r) => `<@&${r.id}>`).join(' ')}`));
    }

    if (sub === 'reglement') {
      const salon = i.options.getChannel('salon'), emoji = (i.options.getString('emoji') || '🍵').trim();
      const msg = await salon.messages?.fetch(i.options.getString('message').trim()).catch(() => null);
      if (!msg) return rep.repondre(i, rep.erreur("Je ne trouve pas ce message dans ce salon. Vérifie l'identifiant."));
      const ok = await msg.react(emoji).then(() => true).catch(() => false);
      if (!ok) return rep.repondre(i, rep.erreur("Je n'ai pas pu réagir avec cet emoji (emoji du serveur : utilise-le dans le message, ou prends un emoji classique)."));
      bd.data.reglement = { channelId: salon.id, messageId: msg.id, emoji: emoji.startsWith('<') ? emoji.replace(/<a?:(\w+):\d+>/, '$1') : emoji };
      bd.sauver();
      return rep.repondre(i, rep.ok(`Règlement réglé : les membres doivent réagir avec ${emoji} sur [ce message](${msg.url}). J'ai déjà posé la réaction.`));
    }

    if (sub === 'etat') {
      const lignes = bd.data.groupes.map((g) => `**${g.id}. ${g.titre}** ${g.obligatoire ? '' : '(facultatif) '}→ ${g.roles.length ? g.roles.map((r) => `<@&${r}>`).join(' ') : '*pas encore réglé*'}`);
      const membreRole = parametres.lire('memberRoleId');
      lignes.push('', `Règlement : ${bd.data.reglement ? `réaction ${bd.data.reglement.emoji} sur <#${bd.data.reglement.channelId}>` : '⚠️ **non réglé** (`/questionnaire reglement`)'}`,
        `Rôle donné à la fin : ${membreRole ? `<@&${membreRole}>` : '⚠️ **non réglé** (utilise `/config`)'}`,
        `Profils remplis : **${Object.values(bd.data.membres).filter((m) => m.termine).length}**`,
        `Pseudos interdits : ${bd.data.interdits.length ? bd.data.interdits.join(', ') : 'aucun'}`);
      return rep.repondre(i, new EmbedBuilder().setColor(couleurs.rose).setTitle('🪪 Questionnaire').setDescription(lignes.join('\n')));
    }

    if (sub === 'interdire') {
      const p = profil.norm(i.options.getString('pseudo'));
      if (i.options.getString('action') === 'interdire') { if (!bd.data.interdits.includes(p)) bd.data.interdits.push(p); }
      else bd.data.interdits = bd.data.interdits.filter((x) => x !== p);
      bd.sauver();
      return rep.repondre(i, rep.ok(`Pseudo **${p}** ${i.options.getString('action') === 'interdire' ? 'interdit' : 'à nouveau autorisé'}.`));
    }

    // panneau
    const salon = i.options.getChannel('salon');
    if (!salon?.isTextBased()) return rep.repondre(i, rep.erreur('Choisis un salon textuel.'));
    const emb = new EmbedBuilder().setColor(couleurs.rose)
      .setTitle(`${d1} Bienvenue chez Nagomi ${d2}`)
      .setDescription([
        'Pour entrer dans le salon de thé, il te reste une petite étape 🍵', '',
        `**1.** Lis le règlement et réagis-y avec ${bd.data.reglement?.emoji ? (/^[\w]+$/.test(bd.data.reglement.emoji) ? (i.guild.emojis.cache.find((e) => e.name === bd.data.reglement.emoji)?.toString() || bd.data.reglement.emoji) : bd.data.reglement.emoji) : '🍵'}`,
        '**2.** Clique sur **Commencer** : pseudo MSP, serveur MSP, puis tes rôles (genre, âge, version, couleur…)',
        '**3.** Valide : le serveur s\'ouvre à toi ✨', '',
        '*Ton pseudo est lié à ton compte Discord : un pseudo = un compte. Ça protège tout le monde des arnaques 🤍*',
      ].join('\n')).setFooter({ text: textes.pied });
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('questionnaire:start').setLabel('Commencer').setEmoji('🍵').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId('questionnaire:modifier').setLabel('Modifier mon profil').setEmoji('🌸').setStyle(ButtonStyle.Secondary));
    await salon.send({ embeds: [emb], components: [row] });
    await rep.repondre(i, rep.ok(`Panneau posté dans ${salon}.`));
  },

  async composant(i) {
    const [, action, arg] = i.customId.split(':');
    const guild = i.guild, uid = i.user.id;
    const fiche = bd.data.membres[uid];
    const expire = () => rep.repondre(i, rep.info('Cette fenêtre a expiré : clique à nouveau sur **Commencer** 🌸'));

    if (action === 'start' || action === 'modifier') {
      if (!actifs(guild).length) return rep.repondre(i, rep.erreur("Le questionnaire n'est pas encore réglé par l'équipe."));
      if (fiche?.termine) {
        sessions.set(uid, { pseudo: fiche.pseudo, serveur: fiche.serveur, reponses: structuredClone(fiche.reponses || {}), page: 0 });
        return i.reply(ecran(guild, sessions.get(uid)));
      }
      if (action === 'modifier') return rep.repondre(i, rep.info('Tu n\'as pas encore rempli ton profil : clique sur **Commencer** 🍵'));
      const modal = new ModalBuilder().setCustomId('questionnaire:modal').setTitle('Ton pseudo MSP')
        .addComponents(
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('pseudo')
            .setLabel('Ton pseudo exact sur MovieStarPlanet').setStyle(TextInputStyle.Short).setMinLength(3).setMaxLength(25).setRequired(true)),
          new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('serveur')
            .setLabel('Ton serveur MSP (ex : FR, UK, DE, US…)').setStyle(TextInputStyle.Short).setMinLength(2).setMaxLength(20).setRequired(true)));
      return i.showModal(modal);
    }

    if (action === 'modal') {
      const pseudo = i.fields.getTextInputValue('pseudo').trim();
      if (!profil.pseudoValide(pseudo)) return rep.repondre(i, rep.erreur('Ce pseudo semble incorrect (3 à 25 caractères : lettres, chiffres, `_` `.` `-`).'));
      const serveur = profil.normServeur(i.fields.getTextInputValue('serveur'));
      if (!/^[\p{L}\p{N} ._\-]{2,20}$/u.test(serveur)) return rep.repondre(i, rep.erreur('Ce serveur MSP semble incorrect (ex : FR, UK, DE, US…).'));
      const n = profil.cle(pseudo, serveur);
      if (bd.data.interdits.includes(profil.norm(pseudo))) {
        await journaliser(guild, { titre: '🚫 Pseudo interdit', description: `${i.user} a tenté d'utiliser le pseudo interdit **${pseudo}**.`, couleur: couleurs.erreur }).catch(() => {});
        return rep.repondre(i, rep.erreur("Ce pseudo n'est pas accepté. Contacte l'équipe avec un ticket 🎫"));
      }
      const autre = bd.data.pseudos[n];
      if (autre && autre !== uid) {
        await journaliser(guild, { titre: '⚠️ Pseudo déjà utilisé', description: `${i.user} a donné le pseudo **${pseudo}**, déjà lié à <@${autre}>.`, couleur: couleurs.miel }).catch(() => {});
        return rep.repondre(i, rep.erreur("Ce pseudo est déjà lié à un autre compte Discord. L'équipe a été prévenue : ouvre un ticket 🎫 si c'est bien le tien."));
      }
      sessions.set(uid, { pseudo, serveur, reponses: {}, page: 0 });
      return i.reply(ecran(guild, sessions.get(uid)));
    }

    const s = sessions.get(uid);
    if (!s) return expire();

    if (action === 'sel') {
      s.reponses[Number(arg)] = i.values;
      return i.update(maj(ecran(guild, s)));
    }
    if (action === 'page') { s.page += Number(arg); return i.update(maj(ecran(guild, s))); }

    if (action === 'fin') {
      const manque = manquants(guild, s);
      if (manque.length) {
        const pg = actifs(guild).findIndex((g) => g.id === manque[0].id);
        s.page = Math.floor(pg / PAR_PAGE);
        const e = ecran(guild, s);
        e.content = `🥀 Il manque encore : **${manque.map((g) => g.titre).join(', ')}**`;
        return i.update(maj(e));
      }
      const n = profil.cle(s.pseudo, s.serveur);
      if (bd.data.pseudos[n] && bd.data.pseudos[n] !== uid) { sessions.delete(uid); return i.update({ content: '', embeds: [rep.erreur('Ce pseudo vient d\'être pris par un autre compte.')], components: [] }); }
      const membre = await guild.members.fetch(uid).catch(() => null);
      if (!membre) return;
      const echecs = await profil.appliquer(membre, s.reponses);
      bd.data.pseudos[n] = uid;
      bd.data.membres[uid] = { pseudo: s.pseudo, serveur: s.serveur, reponses: s.reponses, termine: true, date: fiche?.date || Date.now(), modifie: Date.now() };
      bd.sauver(); sessions.delete(uid);
      if (echecs.length) await journaliser(guild, { titre: '⚠️ Questionnaire : rôles non donnés', description: `Pour ${i.user} : ${echecs.join(' · ')}\nVérifie que mon rôle est au-dessus des rôles du questionnaire.`, couleur: couleurs.miel }).catch(() => {});
      else await journaliser(guild, { titre: '🪪 Profil rempli', description: `${i.user} → pseudo MSP **${s.pseudo}** (${s.serveur})`, couleur: couleurs.matcha }).catch(() => {});
      const regl = bd.data.reglement, accepte = bd.data.accepte[uid];
      const fin = !accepte && regl ? rep.info(`Profil enregistré, **${s.pseudo}** ! Dernière étape : réagis avec ${regl.emoji} au règlement dans <#${regl.channelId}> et le serveur s'ouvrira 🍵`)
        : rep.ok(echecs.length ? "Profil enregistré, mais je n'ai pas pu donner tous tes rôles : préviens l'équipe 🌸"
        : `Bienvenue chez Nagomi, **${s.pseudo}** ! Le salon est ouvert, installe-toi 🍵✨`);
      return i.update({ content: '', embeds: [fin], components: [] });
    }
  },
};
