# Mini-carte des secteurs — 23 octobre 2026

Vue d'ensemble fixe : Helion-01 utilise une capture de decor avec planete et nebuleuse. Le fond reste independant du deplacement et du zoom ; les marqueurs suivent les coordonnees du monde. Le quadrillage et ses lettres sont retires a la demande du createur.

Le titre affiche la planete du systeme de la carte, via les icones de firme deja presentes : Helion/Astra rouge, Nereid/Cygnus bleu, Aureon/Solarys jaune et Sylva/Verdantis vert. Le systeme du joueur ne choisit pas cette icone.

Le cadre, les coordonnees et les marqueurs sont rendus par `miniMapChrome.js`. `miniMapLayout.js` partage la geometrie entre le rendu, les boutons et la conversion des clics. Le contenu conserve le ratio du secteur et les clics sur le cadre sont absorbes.

Version de cache : `20261023-minimap4`. Le PNG 1200 x 960 est charge via `combatAssets.js`. Les caches du fond changent pour le secteur, la taille ou les textures disponibles, sans suivre la camera.

Verification : tests de mini-carte et portails, stabilite du fond, proportions, bords de clic et changement de planete selon le secteur. Publication Avosoma par superposition limitee aux fichiers de mini-carte, construite depuis le client actif pour conserver les autres mises a jour. Aucun code serveur, profil ou donnee de compte n'est modifie.
