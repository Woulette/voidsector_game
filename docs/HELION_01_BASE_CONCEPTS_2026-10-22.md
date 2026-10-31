# Hélion 1 — propositions de QG, commerce et missions, 22 octobre 2026

Le joueur valide la poursuite de la finition visuelle et demande des images pour remplacer le QG provisoire, le commerce et le relais de quêtes, avec des repères pris dans DarkOrbit.

## Livrable de cette étape

Trois concepts originaux générés avec le tool imagegen intégré, avec fond transparent et même famille de matériaux : titane clair, structure graphite, plaques rouges Hélion et éclairage discret. Le commerce possède des quais et du fret ; le relais de missions des paraboles et capteurs. Le QG laisse une ouverture pour le vaisseau.

- Sources PNG et prompts complets : `output/helion01-hub-concepts/2026-10-22/`.
- Résolution effective des trois PNG : 1 254 × 1 254, RGBA, alpha 0–255. Les silhouettes solides restent à l'intérieur des images ; alpha maximal du bord extérieur : 1/255.
- Les deux services ont été générés avec le nouveau QG comme référence de matériaux et d'architecture. Aucun asset DarkOrbit n'est repris.
- Références visuelles consultées : https://board-en.darkorbit.com/threads/homebase-redesign-concept.1031/ et https://board-en.darkorbit.com/threads/nyx-faq.847/ (archives officielles).

## Mise en situation

`tmp/helion-hub-concepts/preview.html` utilise le vrai renderer et le décor actuel d'Hélion dans un aperçu isolé. `conceptRenderer.js` dessine les trois nouveaux sprites. Cet aperçu ne se connecte pas au MMO.

Composition proposée : QG 720 × 720, commerce et missions 300 × 300. Le QG actuel est dessiné à 1 460 × 1 460. Taille du vaisseau identique pour la comparaison. Le centre visuel du QG est à spawn.y - 180 ; les services à spawn.x ± 520 et spawn.y - 300. Les étiquettes et les positions sont aussi des propositions.

Ces images ne remplacent pas encore les stations dans les parties. Le client actif reste `20261022-helion-light1`. Aucun fichier du runtime du jeu ou du serveur n'est modifié par cette étape. Pour intégrer ultérieurement un nouveau placement, réconcilier les positions / zones d'interaction client et serveur avant toute modification de gameplay.

## Vérifications et diffusion

- Les trois sources sont inspectées, leurs transparences et résolutions contrôlées ; vérification visuelle du QG, des services et de leur assemblage sur le fond réel, aux vues du spawn et d'approche.
- Syntaxe du renderer d'aperçu et des scripts HTML : OK. Galerie en trois colonnes sur ordinateur et une sur téléphone ; contrôle à 375 pixels CSS sans débordement horizontal. Les cinq images de la galerie publique chargent correctement.
- Comparaison avant/après vérifiée dans la galerie. Vues JPEG effectivement capturées à 1 664 × 950.
- Dix nouveaux fichiers statiques publiés le 22 octobre à 19 h 04 min 18 s (Paris) et vérifiés par empreintes à l'installation puis en HTTPS. Aucune modification de l'index du jeu ; service actif, PID 1480850 inchangé, zéro redémarrage et santé PostgreSQL OK.
- Galerie : https://avosoma.absyrion.com/assets/maps/previews/helion01-hub-concepts1/index.html
- Manifestes, métadonnées, captures et publication : `tmp/helion-hub-concepts/`. Sauvegarde distante de publication : `/opt/avosoma-backups/helion-hub-concepts-20261022`.

## Révision des proportions — 22 octobre, 19 h 20

Le joueur trouve le QG trop petit dans la première proposition. Nouvelle mise en situation : QG de 1 100 unités au lieu de 720 (+52,8 %), services de 360 au lieu de 300 (+20 %). Le centre visuel du QG passe à spawn.y - 90 ; les services sont proposés côté intérieur, à spawn.x + 710, commerce à spawn.y + 80 et missions à spawn.y - 400. Ces positions restent des propositions visuelles et ne modifient aucune interaction serveur.

Nouveau comparatif : https://avosoma.absyrion.com/assets/maps/previews/helion01-hub-scale2/index.html . Les deux captures sont désormais effectuées avec `tab.screenshot({fullPage:true})`, qui conserve le viewport complet de 1 880 × 950 ; le wrapper natif `getScreenshot` plafonnait la largeur capturée à 1 664. Même zoom et même taille de vaisseau pour les deux propositions.

Trois fichiers statiques publiés le 22 octobre à 19 h 20 min 41 s (Paris), vérifiés par empreintes et dans le navigateur public. Client de jeu inchangé. Préparation et preuves : `tmp/helion-hub-scale2/`.

Un blocage de relance signalé entre les deux propositions s'est résolu pendant le diagnostic, confirmé par le joueur. Le service, la base et les URLs publiques répondaient normalement ; aucune cause n'est établie et aucun correctif d'authentification ni déconnexion de session n'a été effectué. L'onglet public Edge était utilisé par l'autre chat ; son contrôle n'a pas été forcé.
