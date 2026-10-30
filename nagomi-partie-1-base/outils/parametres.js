// ⚙️ Les réglages du serveur (salons, rôles…), modifiables avec /config et /setup.
const { ouvrir } = require('./stockage');
const bd = ouvrir('parametres', {});

module.exports = {
  lire: (cle) => bd.data[cle] ?? null,
  ecrire(cle, valeur) {
    if (valeur === null || valeur === undefined) delete bd.data[cle];
    else bd.data[cle] = valeur;
    bd.sauver();
  },
  tout: () => ({ ...bd.data }),
};
