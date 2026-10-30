// 🎫 Réglages des tickets : modifie les raisons proposées dans le menu, le texte du panneau, etc.
module.exports = {
  maxParMembre: 1,                       // nombre de tickets ouverts en même temps par personne
  titrePanneau: 'Besoin d’un coup de main ?',
  textePanneau:
    'Une question, un souci, une vente à vérifier ?\n' +
    'Choisis la raison dans le menu ci-dessous : un salon **privé** s’ouvrira rien que pour toi et l’équipe 🌸',
  // Les raisons du menu (max 25) : id unique, texte, emoji, description
  motifs: [
    { id: 'aide',        label: 'Question / aide',          emoji: '✨', description: 'Une question sur le serveur ou MSP' },
    { id: 'transaction', label: 'Achat ou vente',           emoji: '🛍️', description: 'Un échange à sécuriser avec l’équipe' },
    { id: 'signalement', label: 'Signalement',              emoji: '🔎', description: 'Un scam, un comportement à signaler' },
    { id: 'recompense',  label: 'Récompense / giveaway',    emoji: '🎁', description: 'Réclamer un lot ou une récompense' },
    { id: 'partenariat', label: 'Partenariat',              emoji: '🤝', description: 'Proposer une collaboration' },
    { id: 'autre',       label: 'Autre',                    emoji: '💌', description: 'Tout le reste' },
  ],
};
