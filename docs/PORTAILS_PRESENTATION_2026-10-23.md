# Portails — présentation validée le 23 octobre 2026

Le créateur a validé la première présentation locale d’Azuron, Vesper, Kharon et Ionis. Conserver cette organisation pour la suite du travail.

- Sélection rapide des quatre portails à gauche, avec image, niveau, fragments et état d’accès.
- Fiche du portail sélectionné au centre : présentation, mode solo, vies, victoires, fragments, récompenses et action d’accès.
- Space Caster à droite : cible sélectionnée, butin possible, lots ×1/×10/×100, coût, solde et résultats.
- Les cinq portails suivants restent accessibles par « Portails suivants » ; leur contenu détaillé reste celui qui existait avant cette refonte.
- La demande porte sur le visuel et l’organisation. Les règles, coûts et récompenses ne sont pas modifiés.

## État de livraison

La présentation a été publiée sur `https://avosoma.absyrion.com/` le 23 octobre 2026 à 17 h 16 (Paris), sous la version `20261023-portals-ui1`.

Le lot contient six fichiers d’interface, composés sur la version de production fraîche pour préserver les autres publications. Les trois nouveaux fichiers sont installés avant le rendu, la feuille de style et l’index, publié en dernier. Le serveur de jeu n’a pas été redémarré ; le service reste actif, sans redémarrage inattendu, et PostgreSQL est prêt.

Les 16 tests ciblés passent aussi sur une copie Linux des sources de production avec le seul lot ajouté. Les six empreintes publiques correspondent au paquet. Le contrôle dans le navigateur public confirme les quatre sélections, les neuf choix disponibles, l’absence d’image de portail manquante et de débordement horizontal, sans erreur de console. Aucun tirage ni action économique d’un vrai compte n’a été exécuté.

Sauvegarde de retour arrière : `/opt/avosoma-backups/20261023-portals-ui1`. Preuves de publication et manifeste : `output/portals-presentation-2026-10-23/release/`. Capture publique : `output/portals-presentation-2026-10-23/public-portals-20261023.png`.

Aperçu : `http://127.0.0.1:18731/`. Ses profils et actions sont simulés et ne modifient aucun compte de production.

Sources : `src/ui/renderPortals.js`, `src/ui/renderPortalWorkspace.js`, `src/ui/portalPresentation.js`, `src/styles/portals.css`, avec branchements dans `index.html` et `styles.css`.

Vérifications : 16 tests existants ciblés réussis, syntaxe des trois modules contrôlée, navigation des neuf portails, états d’accès, tarifs Premium, résultats et focus vérifiés dans le navigateur. Rendu contrôlé à 1920, 1366 et 390 pixels.

Captures, sauvegarde initiale, journal des tests et détails : `output/portals-presentation-2026-10-23/`.
