// 🏗️ Le plan du serveur Nagomi, utilisé par /setup.
// Tu peux modifier les noms, ajouter ou retirer des salons ici AVANT de lancer /setup.
//
// type : 'texte' | 'annonce' | 'vocal'
// lecture : true = les membres lisent mais n'écrivent pas
// cle : (facultatif) range l'identifiant du salon dans la config du bot

const R = (nom, couleur, perms, extra = {}) => ({ nom, couleur, perms, ...extra });

module.exports = {
  roles: [
    R('✦ Équipe', 0xe58a8a, [
      'ManageMessages', 'ModerateMembers', 'KickMembers', 'BanMembers',
      'ManageNicknames', 'MuteMembers', 'ViewAuditLog', 'MentionEveryone',
    ], { cle: 'staffRoleId', hoist: true, mentionnable: true }),
    R('✦ Membre', 0xf4b0b0, [], { cle: 'memberRoleId', hoist: false }),
  ],

  // acces : 'tous' (visible même sans rôle) | 'membres' | 'equipe'
  categories: [
    {
      nom: '🍵 ・ L’entrée', acces: 'tous',
      salons: [
        { nom: '🌸・bienvenue', type: 'texte', lecture: true, cle: 'welcomeChannelId' },
        { nom: '🍃・au-revoir', type: 'texte', lecture: true, cle: 'goodbyeChannelId' },
        { nom: '📜・règlement', type: 'texte', lecture: true, cle: 'rulesChannelId' },
        { nom: '📣・annonces', type: 'annonce', lecture: true },
      ],
    },
    {
      nom: '☁️ ・ Le salon', acces: 'membres',
      salons: [
        { nom: '💬・discussion', type: 'texte' },
        { nom: '🎀・présentations', type: 'texte', cle: 'introChannelId' },
        { nom: '📸・médias', type: 'texte' },
        { nom: '📈・niveaux', type: 'texte', cle: 'levelChannelId' },
        { nom: '🤖・commandes', type: 'texte' },
        { nom: '🔊・salon vocal', type: 'vocal' },
      ],
    },
    {
      nom: '👗 ・ La vitrine', acces: 'membres',
      salons: [
        { nom: '✨・looks-msp', type: 'texte' },
        { nom: '💌・astuces-msp', type: 'texte' },
      ],
    },
    {
      nom: '🛍️ ・ Le comptoir', acces: 'membres',
      salons: [
        { nom: '🛒・ventes', type: 'texte' },
        { nom: '🔎・achats', type: 'texte' },
      ],
    },
    {
      nom: '🎁 ・ Les sachets surprise', acces: 'membres',
      salons: [
        { nom: '🎉・giveaways', type: 'texte', lecture: true },
        { nom: '🎟️・tickets', type: 'texte', lecture: true, cle: 'ticketPanelChannelId' },
      ],
    },
    {
      nom: '🎫 ・ Les tickets', acces: 'equipe', cle: 'ticketCategoryId',   // les tickets ouverts apparaissent ici
      salons: [],
    },
    {
      nom: '🔑 ・ L’arrière-boutique', acces: 'equipe',
      salons: [
        { nom: '📋・logs', type: 'texte', cle: 'logsChannelId' },
        { nom: '💭・discussion-équipe', type: 'texte' },
        { nom: '🧰・commandes-équipe', type: 'texte' },
      ],
    },
  ],
};
