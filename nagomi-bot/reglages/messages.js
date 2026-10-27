// 💌 Les messages de bienvenue et d'au revoir (modifie les textes ici, puis redémarre le bot).
// Mots magiques remplacés automatiquement :
//   {membre} = la mention de la personne   {pseudo} = son nom   {serveur} = le nom du serveur
//   {nombre} = nombre de membres           {reglement} / {presentations} = liens vers les salons
const textes = require('./textes');
const [d1, d2] = textes.deco;

module.exports = {
  bienvenue: {
    titre: 'Bienvenue chez Nagomi 🍵',
    description:
      `${d1}\n{membre}, ton thé est servi ! 🌸\n${d2}\n\n` +
      'Tu es notre membre n°**{nombre}**. Installe-toi, on est ravi(e)s de t’accueillir dans notre petit salon.\n\n' +
      '📜 Commence par le règlement : {reglement}\n' +
      '🎀 Puis présente-toi : {presentations}',
  },
  aurevoir: {
    titre: 'À bientôt 🍃',
    description:
      `${d1}\n**{pseudo}** a quitté le salon de thé.\n${d2}\n\n` +
      'Merci d’être passé(e) par {serveur} 🌸\nNous sommes maintenant **{nombre}** membres.',
  },
};
