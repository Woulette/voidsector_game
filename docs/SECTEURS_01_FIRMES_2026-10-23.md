# Secteurs de départ des quatre firmes

La composition validée de Helion-01 est déclinée sur les trois autres secteurs 01 : Nereid bleu en haut à gauche, Aureon doré en haut à droite, Sylva vert en bas à droite. Helion reste rouge en bas à gauche. L'apparence dépend de la carte et reste la même pour tous les joueurs qui la visitent.

## Composition et profondeur

- `firmHomeMapThemes.js` définit les quatre identités strictes ID/nom, palettes et axes de réflexion.
- `firmHomeMapScenery.js` reflète les positions de la composition Helion : planète, couronne stellaire, épaves, six variantes de rochers et nuages. Les rotations et silhouettes d'origine sont conservées ; changer de coin ne retourne plus les illustrations.
- La planète garde son coefficient 0,07 ; les profondeurs, tailles et opacités approuvées restent identiques. Les nuages proches suivent les plans éloignés dans l'ordre de rendu. Le vide aux bords utilise les mêmes transitions douces, sans trait ajouté ni coupure de planète.
- Les secteurs 02 à 05, CORE et portails ne sont pas concernés.

## Textures et coût de rendu

Les fichiers détaillés d'origine restent séparés, à leur résolution native. Une clé `mapPalette` distingue les variantes dans le cache. Le chargeur télécharge l'URL originale commune, puis prépare une fois les couleurs dans un canvas réutilisable. Le cache existant limite les cartes conservées à trois et libère aussi ces variantes. Les métaux neutres, lumières froides et valeurs alpha d'origine sont conservés. Les teintes chaudes sont adaptées sans entraîner les lumières dorées vers le vert ni les lumières vertes vers le jaune.

Aucun filtre de couleur ni traitement pixel n'est ajouté à la boucle de rendu. Un chargement tardif ne peut pas recréer une texture déjà évincée. Le cache LRU des images ponctuelles suit également le canvas préparé.

## Base et interactions

Le module partagé `helionOneHub.js` installe la couronne, la raffinerie et le relais dans les quatre secteurs de départ. Leurs offsets et rectangles de protection suivent les mêmes axes de réflexion. Le serveur et le client consomment ces positions ; le tutoriel les lit depuis les stations réellement installées. La préparation des textures change uniquement leurs couleurs et conserve désormais le sens original des trois bâtiments.

`getVisibleSpawnStations()` fournit les services pour le décor et la mini-carte, quelle que soit la firme du visiteur. `getSpawnStations()` et `getStationAt()` gardent la restriction d'interaction à la firme de la carte ; le tutoriel et les zones de protection gardent leurs règles précédentes. Le survol et les titres conditionnels sont conservés pour les services accessibles.

## Mini-cartes des secteurs 01

La définition et l'illustration existantes de Helion restent la référence. `miniMapVisuals.js` ajoute des vues fixes pour les trois autres secteurs, avec la même échelle de planète (44 % de la largeur) et de source stellaire (28 %), placées selon le coin de la firme. Les trois atlas 1200×540 sont issus du renderer de mini-carte : ils contiennent seulement le fond, la planète et la nébuleuse. Bâtiments, portails, services et pilote restent dessinés séparément à leurs coordonnées réelles. Les images du décor ne sont pas retournées.

Le cache de mini-carte, ses commandes, son cadre et ses proportions générales restent ceux du travail existant. Les secteurs 02 à 05 et les portails gardent leurs définitions précédentes.

## Vérification et publication

Preuves, captures, contrôles sur sources de production et publication ciblée : `output/firm-home-maps-2026-10-23/`. L'aperçu isolé utilise les vrais modules de rendu et de chargement ; il ne représente pas une session multijoueur authentifiée. Les zones cliquables et la protection sont aussi contrôlées par les tests client/serveur.

- Publication principale `20261023-firm-homes1` à 17:42 Europe/Paris. Neuf fichiers ciblés, sauvegarde `/opt/avosoma-backups/20261023-firm-homes1-154200`. Redémarrage pour recharger le placement partagé : PID 4003944, NRestarts 0, PostgreSQL prêt.
- 117 tests ciblés réussis sur les sources distantes fraîches avec le payload exact, dont les invariants des quatre cartes, client/serveur, streaming et LRU, parallax/rotation, alpha, cibles et protection, tutoriel, portails et non-régression de mini-carte. Onze textures de production vérifiées par empreinte avant les tests.
- Les six cibles de relais/commerce sont reconnues dans le navigateur public. Déplacement de caméra de 1 000 unités : planète décalée de 70 pixels logiques sur chaque variante, conformément à son coefficient 0,07. Les quatre bords et le hors-carte sont contrôlés ; captures de Nereid conservées.
- Sur l'aperçu du décor seul, en 1680×1000, rendu chaud médian autour de 0,3 ms et P95 de 0,4 à 0,5 ms pour les trois variantes, comparables à Helion. Cette mesure de soumission du décor exclut les combats multijoueurs, le coût GPU complet et la fréquence d'images réelle du jeu.
- La vérification publique finale compare les neuf empreintes effectives après correction des contrôles de l'aperçu. Deux alias actualisent également le module d'interaction inchangé : un vieux cache non versionné pouvait encore construire l'ancienne cible de commerce. Les autres alias et travaux parallèles sont préservés.
- Aperçu public : `https://avosoma.absyrion.com/assets/maps/previews/firm-homes1/index.html`. Les corrections d'aperçu et d'alias ont été publiées sans autre redémarrage. Aucun compte de production n'a été utilisé pour les essais ; `server/data/profiles.json` conserve ses 3 octets et sa date du 12 septembre 2026.

## Correction de l'orientation des QG

À la demande du créateur, la couronne conserve son orientation verticale d'origine sur Nereid-01 et Aureon-01. Les emplacements réfléchis et les couleurs restent identiques ; le miroir horizontal et les autres bâtiments ne sont pas modifiés. La correction est limitée à la préparation des textures de QG dans `mapAssetPalette.js`.

Publication `20261023-hq-upright1` à 18:06 Europe/Paris : trois fichiers vérifiés par empreintes publiques HTTPS, 52 tests ciblés réussis sur les sources distantes fraîches et captures des deux rendus publics contrôlées. Alias du module actualisés dans le jeu et l'aperçu. Aucun redémarrage, PID 4003944 / NRestarts 0 inchangés, PostgreSQL prêt. Sauvegarde : `/opt/avosoma-backups/20261023-hq-upright1-160654`. Preuves : `output/firm-hq-upright-2026-10-23/`.

## Correction des services, du sens des décors et des mini-cartes

La publication `20261023-map-consistency1` du 23 octobre à 18:36 Europe/Paris remplace la règle d'orientation du correctif précédent : tous les bâtiments et éléments de décor gardent leur sens d'origine, avec les emplacements déjà validés. Les services sont visibles aux autres firmes, sans nouvelle autorisation d'interaction.

- Onze fichiers publiés depuis une base distante fraîche, avec fusion des seuls changements du lot et contrôles d'empreinte avant écriture. Onze empreintes publiques HTTPS vérifiées après publication ; sauvegarde `/opt/avosoma-backups/20261023-map-consistency1-163620`.
- 93 tests ciblés réussis sur les sources de production avec le payload exact : quatre variantes, visibilité/interactions pour les quatre firmes, orientation des illustrations, streaming/LRU, mini-cartes, survol, protection, tutoriel, transfert et rendu. Onze textures natives comparées à la production avant les essais.
- L'aperçu public utilise les vrais renderers et le système de stations, avec une firme de visite configurable. Sur chaque carte : deux services visibles pour un étranger, deux clics refusés, puis deux clics reconnus pour le propriétaire. Les quatre mini-cartes publiques et le rendu des services sont capturés, sans erreur de console. Cet aperçu ne constitue pas un essai avec un compte multijoueur authentifié.
- Aucun redémarrage ; PID 4003944 et NRestarts 0 inchangés, PostgreSQL prêt. Le fichier local `server/data/profiles.json` reste à trois octets et conserve sa date antérieure.

Sources de vérification : `output/firm-map-consistency-2026-10-23/`, notamment `release/public-verification.json`, `public-browser-report.json`, `nereid-public-visiteur.png` et les quatre captures `minimap-public-*.png`.
