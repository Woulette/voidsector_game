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

## Largeurs corrigées le 24 octobre 2026

La version `20261024-portals-width1` est publiée à 12 h 21 (Paris). Sur grand écran, la sélection des portails passe de 280 à 390 px vers la droite et le Space Caster de 390 à 480 px vers la gauche. Les bords extérieurs restent en place ; la fiche centrale utilise l'espace restant. La disposition compacte commence à 1440 px pour préserver sa lisibilité.

La publication contient uniquement la règle de colonnes, son adaptation compacte et les deux marqueurs de cache, dans trois fichiers composés depuis la production courante. Les autres ajustements locaux des illustrations ne sont pas inclus. Cinq tests existants du catalogue passent ; le paquet a été contrôlé à 1920, 1441, 1366 et 390 px sans débordement horizontal. Le navigateur public confirme les colonnes de 390 / 942 / 480 px et le nouveau cache. Les trois empreintes installées et HTTPS correspondent au paquet ; le service conserve son PID, sans redémarrage, et PostgreSQL est prêt.

Sauvegarde : `/opt/avosoma-backups/20261024-portals-width1`. Preuves et capture publique : `output/portals-width-2026-10-24/`.

## Space Caster réorganisé le 24 octobre 2026

La version `20261024-caster-layout1` est publiée à 12 h 39 (Paris). Les blocs de taux et de butin possible à droite ainsi que la jauge centrale de fragments sont retirés. Les récompenses reçues occupent une zone agrandie au-dessus du choix du lot, du prix et du bouton de lancement.

Le bouton « ? » ouvre les probabilités et quantités de chaque butin, les zones de fragments du portail choisi et le taux de 0,33 % sur les ennemis éligibles. `portalCasterHelp.js` porte cette présentation ; ses probabilités sont vérifiées contre les tirages réels du module serveur, avec une réserve disponible, complète et après victoire. La suspension des fragments concerne le Space Caster avant la première victoire ; les drops des maps restent possibles. Aucune règle économique n'est modifiée.

Douze tests ciblés passent. Le paquet exact est contrôlé à 1920, 1366, 900 et 390 px : aide contenue dans l'écran, aucun débordement horizontal, commandes sous les récompenses. Le navigateur public confirme la suppression des blocs et l'ouverture de l'aide. Les six empreintes HTTPS et installées correspondent au paquet. Le service conserve son PID et PostgreSQL est prêt.

Sauvegarde : `/opt/avosoma-backups/20261024-caster-layout1`. Sources avant modification, paquet, contrôles et captures publiques : `output/portal-caster-layout-2026-10-24/`.
