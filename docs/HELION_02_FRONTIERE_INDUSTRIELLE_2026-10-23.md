# Helion-02 — Frontière industrielle

Première version jouable issue du concept validé : station orbitale diagonale avec relief précalculé, plateforme de maintenance et transporteur abandonné. Le lot concerne uniquement Helion-02. Les quatre cartes 01 et les autres secteurs gardent leurs compositions précédentes.

## Composition et assets

`src/game/combatData/helionTwoVisuals.js` porte l'overlay visuel. `combatOrchestrator.js` l'applique après la composition des cartes 01. Les dimensions, portails, portail fermé, Ricky, types/niveaux/nombres d'ennemis et données de quêtes restent ceux des définitions canoniques ; les tableaux de gameplay sont conservés par référence.

Trois assets séparés sont installés dans `assets/maps/decor/helion02-industrial-v1/` :

| Asset | Résolution | Affichage nominal | Parallaxe |
| --- | --- | --- | --- |
| `orbital-station.webp` | 1374×1145 | 800×667 | 0,27 |
| `maintenance-platform.webp` | 1379×1141 | 380×314 | 0,36 |
| `derelict-freighter.webp` | 1774×887 | 520×260 | 0,20 |

Les PNG ont été générés individuellement avec imagegen à partir du concept diagonal approuvé, puis encodés en WebP sans perte. Les données RGBA décodées sont strictement identiques aux PNG. Environ 3,32 Mo transférés pour les trois fichiers, contre 4,87 Mo pour leurs originaux ; environ 18,9 Mo de pixels RGBA décodés. La transparence extérieure et les ouvertures sont réelles. Les plans solides utilisent une opacité de rendu de 1, sans miroir ni rotation supplémentaire. Le volume et l'orientation sont dans le dessin : aucun moteur 3D ni traitement de pixels par image n'est ajouté.

Les sources PNG, contrôles alpha et briefs sont conservés sous `output/helion02-industrial-2026-10-23/`. Les trois éléments sont décoratifs et n'ajoutent pas d'interaction de maintenance ou de commerce.

## Continuité avec Helion-01

Les textures `nebula-crimson.png`, `dust-wisp.png` et l'atlas existant de six astéroïdes sont réutilisés. Même palette de fond, cinq plans très lointains et quelques nuages intermédiaires ; seuls deux voiles proches, d'opacité 0,17. Les images sont triées par profondeur pour que les nuages proches passent devant la planète et les structures lointaines.

La planète rouge précédente de Helion-02 reste utilisée, avec un cadrage plus discret en haut à droite et un coefficient 0,065 : 65 pixels logiques de décalage pour un trajet de 1 000 unités. La station se déplace de 270 pixels logiques sur la même distance. Les six silhouettes de rochers ont une distribution déterministe propre au secteur, des tailles de 24 à 80 et plusieurs plans de profondeur. Les points de portails et de PNJ sont dégagés dans cette distribution.

La logique de bord validée sur Helion-01 est reprise : décroissance du ciel sur les 900 dernières unités puis jusqu'à 120 unités au-delà, sans trait de frontière. Les décors proches s'effacent avec leur emprise à l'approche du bord ; les éléments très lointains ne sont pas brutalement coupés. Le cache de streaming existant garde sa limite de trois cartes, et les options de nuages et d'astéroïdes restent actives.

## Mini-carte

`miniMapVisuals.js` ajoute une définition strictement limitée à l'ID 1 / Helion-02. Le fond fixe `assets/maps/minimaps/helion-02-wide-v1.png`, en 1200×540, est exporté avec le renderer réel de mini-carte. Il contient le fond, la planète et la station, sans PNJ ni marqueurs de portails incorporés. Les marqueurs restent composés depuis l'état du jeu. Les définitions des quatre secteurs 01 sont conservées.

## Vérifications

- 100 tests ciblés réussis sur une copie fraîche des sources de production avec les dix fichiers exacts du lot. Couverture : gameplay conservé, autres cartes inchangées, textures/streaming, profondeur, cadres et cache de mini-carte, options graphiques, bords, interactions des bases, tutoriel et transferts de carte.
- 17 textures existantes comparées aux empreintes de production avant les essais. Syntaxe des modules modifiés contrôlée. Les deux changements de l'orchestrateur se limitent à l'import du domaine et à sa composition.
- Contrôles du renderer réel en 1680×1000 et 1366×768, zoom 80 % et 100 %, rendu allégé, arrivée depuis Helion-01, station, maintenance, épave, Ricky, quatre bords et hors-carte.
- Comparaison CPU à 1680×1000, qualité haute, nuages/astéroïdes activés, sur les 120 dernières images après au moins 240 images depuis chaque déplacement : ancien décor médian 0,7–1,0 ms / P95 1,3–1,4 ms ; nouveau médian 0,5–0,7 ms / P95 0,8–1,1 ms. Cela mesure la soumission CPU du décor et de la mini-carte dans cet aperçu ; ce n'est ni une mesure complète du GPU ni une preuve de fréquence d'images en combat multijoueur.

## Publication

Version `20261023-helion2-industrial1` publiée le 23 octobre à 19:25:20 Europe/Paris. Dix fichiers frontend installés sous garde d'empreintes, archive contrôlée après transfert et page d'entrée installée en dernier. Sauvegarde : `/opt/avosoma-backups/20261023-helion2-industrial1-172520`.

Les dix fichiers sont vérifiés par empreintes publiques HTTPS. Aucun redémarrage : PID 4003944, NRestarts 0, PostgreSQL prêt. Les changements parallèles et alias des autres modules sont préservés. Aucun compte de production n'a été utilisé pour les essais.

Aperçu public : `https://avosoma.absyrion.com/assets/maps/previews/helion02-industrial1/index.html`. Il utilise les vrais modules de rendu et les données canoniques, avec un pilote de démonstration ; il ne représente pas une session multijoueur authentifiée. Neuf textures prêtes, arrivée/Ricky/maintenance/hors-carte et déplacement de planète de 65 pixels contrôlés publiquement, sans erreur console. Preuves dans `output/helion02-industrial-2026-10-23/`, notamment `release/public-verification.json`, `public-browser-report.json` et `public-industry.png`.


## 2026-10-24 — Espacement, profondeur et mini-carte

Version courante : `20261024-helion2-adjust1`, publiée à 12:26:55 Europe/Paris. La plateforme de maintenance est retirée du décor et des assets à charger ; son fichier précédent reste conservé pour un éventuel retour arrière.

| Élément | Ancien réglage | Nouveau réglage |
| --- | --- | --- |
| Épave, ancrage | −3500 / 1900 | −4000 / 2700 |
| Station, vitesse apparente | p = 0,27 | p = 0,40 ; 400 pixels logiques par trajet de 1000 unités |
| Station, mini-carte | largeur 0,24 | largeur 0,14 (−41,7 %) |
| Planète, taille en jeu | 850 × 850 | 750 × 750 (−11,8 %) |
| Planète, ancrage | 10500 / −6500 | 9600 / −5700 |
| Planète, mini-carte | 0,86 / 0,18 ; largeur 0,44 | 0,83 / 0,23 ; largeur 0,38 |

La station garde sa taille en jeu (800 × 667 environ), son orientation native et une profondeur intermédiaire. Le coefficient de planète reste 0,065. Son déplacement vers le bas-gauche équivaut à −58,5 / +52 pixels logiques pour une caméra identique. Nuages, rochers, éclairage, bords et autres cartes sont inchangés par ce lot.

Le nouvel atlas fixe `assets/maps/minimaps/helion-02-wide-v2.png` (1200 × 540) est exporté avec le renderer réel de mini-carte. Un nouvel export depuis l'aperçu public donne exactement les mêmes octets. Les repères de portails/PNJ restent indépendants du fond.

102 tests ciblés réussis sur les dernières sources distantes avec les six fichiers du payload. Contrôles visuels de l'approche de la capture utilisateur, station et déplacement de 1000 unités ; vue publique des deux grands décors et de la planète à 1680 × 1200, zoom 80 %, sans erreur console. Il s'agit d'un aperçu isolé utilisant les modules publiés avec un pilote de démonstration, pas d'une session multijoueur authentifiée.

Une modification concurrente de `index.html` a bloqué la première tentative avant toute écriture. Le lot a été reconstruit sur les sources distantes actualisées, puis testé et publié sous garde d'empreintes. Les changements parallèles de rendu des portails et leurs alias sont préservés. Les six fichiers finaux ont été vérifiés par HTTPS. Sauvegarde : `/opt/avosoma-backups/20261024-helion2-adjust1-102655`. Aucun redémarrage : PID 4125505, NRestarts 0, PostgreSQL prêt ; profils locaux et métadonnées du fichier distant inchangés.

Preuves : `output/helion02-adjustments-2026-10-24/public-overview.png`, `public-browser-report.json` et `release/{manifest,public-verification,postflight,staged-test-report}.json`.


## 2026-10-24 — Structures plus profondes et planète de mini-carte

Version courante `20261024-helion2-depth1`, publiée à 12:44:14 Europe/Paris. La station passe de 800 à 540 unités de largeur (−32,5 %), l'épave de 520 à 350 (−32,7 %), avec proportions natives conservées. Leurs parallaxes passent de 0,40 à 0,36 et de 0,20 à 0,16 : mouvement un peu plus posé, tandis que la traversée de leur silhouette reste plus courte grâce à la réduction de taille. Les ancrages et l'espacement sont conservés.

Le filtre 2D déjà pris en charge par le renderer, `brightness(0.90) saturate(0.80) contrast(0.88)`, atténue légèrement ces deux seuls sprites. Alpha de rendu toujours égal à 1 : les coques restent opaques. Aucun flou, texture nouvelle ni traitement supplémentaire des autres couches.

La planète est déplacée uniquement sur la mini-carte : x normalisé 0,83 → 0,88, soit environ 22 pixels vers la droite sur le dessin de 444 pixels de large de l'aperçu. Sa hauteur, sa taille et la planète en jeu ne changent pas. Nouvel atlas fixe `helion-02-wide-v3.png` (1200 × 540), exporté avec le renderer de mini-carte et reproduit à l'identique depuis l'aperçu public.

102 tests ciblés réussis sur les sources de production fraîches plus le payload. Cinq fichiers frontend modifiés, six gardés et vérifiés par HTTPS ; page principale publiée en dernier. Sauvegarde `/opt/avosoma-backups/20261024-helion2-depth1-104414`. Aucun redémarrage, PID 4125505 / NRestarts 0 inchangés, PostgreSQL prêt, profils locaux et métadonnées du fichier distant préservés.

Contrôle visuel public à 1680 × 1200 / zoom 80 %, sans erreur console : coût CPU indicatif du décor et de la mini-carte médian 0,8 ms / P95 1,5 ms sur la vue comparée. Il ne s'agit pas d'un test complet du GPU ou du combat multijoueur. L'aperçu utilise les vrais modules publiés avec un pilote de démonstration, sans compte multijoueur authentifié. Preuves sous `output/helion02-depth-2026-10-24/` : `public-overview.png`, `public-browser-report.json`, `release/public-verification.json` et `release/postflight.json`.
