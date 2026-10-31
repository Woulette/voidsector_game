# Secteurs 02 des quatre firmes

Les secteurs Nereid-02, Aureon-02 et Sylva-02 reprennent la frontière industrielle actuellement approuvée de Helion-02. Leurs anciennes scènes procédurales sont remplacées par les mêmes structures illustrées, textures de nuages et six silhouettes d'astéroïdes, avec les couleurs de leurs secteurs 01 et des emplacements réfléchis. Les illustrations gardent leur sens natif.

| Secteur | Identité | Planète | Station | Épave |
| --- | --- | --- | --- | --- |
| Nereid-02 / 21 | Bleu froid | 9600 / 5700 | −1750 / 250 | −4000 / −2700 |
| Aureon-02 / 31 | Or ambré | −9600 / 5700 | 1750 / 250 | 4000 / −2700 |
| Sylva-02 / 41 | Vert émeraude | −9600 / −5700 | 1750 / −250 | 4000 / 2700 |

La planète reste très lointaine, avec p=0,065 et 750 unités de diamètre. La station conserve sa largeur de 540 unités et p=0,36 ; l'épave reste à 350 unités et p=0,16. Les coques sont opaques et leurs filtres restent ceux de Helion-02. Les secteurs utilisent 420 étoiles proches, cinq fonds lointains et deux voiles proches discrets, avec les mêmes fondus de limites. La préparation des palettes existante adapte les couleurs une fois au chargement et garde les métaux neutres.

## Intégration

Le module `firmSectorTwoVisuals.js` exige le couple ID/nom exact et dérive les couleurs des thèmes de départ existants. Les points de navigation réels de chaque secteur sont réfléchis vers le repère canonique avant la génération déterministe des rochers, puis seul le décor est réfléchi à nouveau. Le dégagement de 320 unités autour des portails et PNJ est conservé, même si ces points évoluent. `createHelionTwoScene` devient exportée sans aucune autre modification de la scène Helion-02.

Les dimensions 10000×8000, ennemis, niveaux, graines, quêtes, Ricky, portails ouverts et fermés, et toutes les données de gameplay restent celles des définitions canoniques. Leurs tableaux sont conservés par référence. Les secteurs 01 et 03 à 05, CORE et portails de progression ne changent pas.

## Mini-cartes et aperçu

Trois atlas fixes 1200×540 sont exportés avec le renderer réel sous `assets/maps/minimaps/{nereid,aureon,sylva}-02-wide-v1.png`. Ils contiennent le fond nuageux, la planète et la station, sans astéroïdes, épave ni marqueurs de PNJ ou portails. La planète conserve 38 % de la largeur de la carte, la station 14 %, avec les positions normalisées réfléchies depuis Helion-02. Les marqueurs et le joueur sont dessinés séparément.

L'aperçu `assets/maps/previews/sector02-firms1/` utilise les vrais modules de chargement et de rendu. Il permet de changer de secteur, explorer les principaux points, comparer l'ancienne composition et voir la mini-carte. Il ne connecte aucun compte et ne représente pas une session MMO authentifiée.

## Vérifications

- Invariants des données et références de gameplay, non-mutation des définitions, identités strictes, profondeur, orientation des images, palettes, options graphiques et dégagement de la navigation.
- Mini-cartes fixes, dimensions des atlas, échelles et positions des repères, exclusion des marqueurs et non-régression des secteurs existants.
- Contrôle navigateur des trois palettes et exports réels des mini-cartes. Un déplacement de caméra de 1000 unités décale la planète de 65 pixels logiques sur chacune des variantes.

Preuves, captures et rapports de publication : `output/sector02-firms-20261024/`.

## Publication

Lot frontend `20261024-sector02-firms1` publié à 17 h 32 Europe/Paris : dix fichiers limités, index en dernier, sans modification serveur ni redémarrage. Les 86 tests ciblés, cinq syntaxes et 235 modules d'imports sont vérifiés sur une copie fraîche de production avec le candidat exact. Les dix empreintes installées et publiques HTTPS correspondent, et les 162 cibles d'importmap sont accessibles. Les 316 alias étrangers et les travaux concurrents sont conservés.

Le PID 1144897 reste inchangé, PostgreSQL est prêt et le journal ne présente aucun nouvel avertissement ou erreur. Sauvegarde : `/opt/avosoma-backups/20261024-sector02-firms1`. L'aperçu public est `https://avosoma.absyrion.com/assets/maps/previews/sector02-firms1/index.html` ; les trois cartes y chargent dix textures chacune, avec captures et console sans erreur. Les essais n'utilisent pas de compte multijoueur authentifié. Le prototype séparé de Helion-03 est exclu de ce lot.
