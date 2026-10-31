# Molette, Orion et décor d’origine — 31 octobre 2026

La molette rapproche désormais la caméra et permet de revenir à la vue d’origine. Le dézoom manuel s’arrête à 100 %, conformément à la correction du joueur ; le zoom avant atteint 180 %. L’élargissement automatique de la vue hors carte conserve son facteur antérieur de 0,78. Les conversions de clic et le centrage du pilote restent alignés. La molette sur la mini-carte et les panneaux, ainsi que les raccourcis de zoom du navigateur, gardent leur comportement.

Le décor d’origine d’Hélion-01 est rétabli avec son véritable moteur de dessin : planète, astéroïdes, épaves et nébuleuses. Il est composé sous les coques et bâtiments 3D, sans substitution par des formes procédurales. Les Orbes conservent leur animation d’origine.

Le rendu de l’Orion atténue les microreliefs et les reflets de sa surface. Sa rugosité est stabilisée et le premier plan 3D utilise un échantillonnage plus fin. La géométrie et les textures sources restent inchangées ; l’Asterion conserve ses réglages de surface. Le fichier d’inspection de l’Orion est ouvert dans Blender avec ses matériaux : `.codex/3d-prep/Orion-inspection.blend`. Les manipulations du joueur dans cette copie ne remplacent pas le modèle du jeu.

## Validation et publication

- Version `20261031-zoom-orion2`, publiée le 31 octobre à 17:06:59 UTC, soit 18:06:59 Europe/Paris.
- 110 tests réussis sur les sources candidates du serveur : molette, limites, rayonnement hors carte, centrage et clics, Hélion-01, mini-carte, commandes et modèles 3D.
- Le test local global `map-scenery-outside.test.js` dépend de `firmSectorThreeVisuals.js`, absent du serveur actuel. Cette refonte locale des secteurs 3 est exclue de la publication ; elle n’a pas été écrasée dans le projet.
- Après un redémarrage concurrent détecté avant installation, le candidat a été reconstruit depuis la production fraîche.
- Dix fichiers publics vérifiés par SHA-256 ; 603 sources surveillées. PID MMO inchangé pendant ce lot, PostgreSQL prêt, aucune écriture en attente ni erreur fraîche du service.
- Contrôle réel de la mission publique : décor d’origine visible, Orion 3D chargé, tentative répétée de dézoom bloquée à 1, aucune nouvelle erreur navigateur.
- Les comptes, équipements, munitions et règles serveur ne sont pas modifiés par ce lot.

Les preuves et le paquet restreint restent dans `output/zoom-orion-live-2026-10-31/`. La capture publique reste dans ce dossier ignoré par Git pour préserver les informations du compte utilisé.
