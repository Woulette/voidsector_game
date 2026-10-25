# Helion-03 — Sillon écarlate et planète brisée

Le décor « Sillon écarlate » garde son identité rouge/cuivre et la planète éventrée approuvée. Après le signalement du fond flou, sa composition reprend la méthode de Helion-01/02 : atmosphère sombre, cinq voiles lointains discrets et une seule formation lumineuse détaillée, avec transparence native. La petite image opaque étirée en grand fond est remplacée.

## Composition et intégration

`helionThreeVisuals.js` applique exclusivement ce décor au couple ID 2 / nom Helion-03. Après la retouche de profondeur, la planète mesure 480 × 320 unités, avec un ancrage 9000 / −5000 et une parallaxe 0,03 : pour 1000 unités de déplacement, elle défile seulement de 30 pixels logiques. Elle est 25 % plus petite et plus centrale que la première publication. Elle reste statique, sans animation d'explosion répétée. Ces réglages restent identiques après la reconstruction du fond.

La nouvelle nébuleuse mesure 1300 × 731,64 unités pour une source de 1672 × 941 pixels : à zoom 80 % / DPR 1,5, chaque pixel source couvre 0,933 pixel physique, contre 2,113 pour l'ancien fond. Elle utilise l'alpha natif, sans filtre de flou, étirement de ratio, blend screen ou rotation. Son ancrage −2400 / −1200 et sa parallaxe 0,06 placent le sillon à gauche de la planète. Cinq voiles issus de Helion-01/02, avec des opacités de 0,055 à 0,08, remplissent l'atmosphère. Les deux voiles proches et deux halos chauds existants restent identiques. Il n'y a ni tuilage ni mosaïque de petites nébuleuses répétées.

La composition utilise le renderer et le streaming existants. Dimensions de carte, portails, collisions, ennemis, niveaux, quêtes, gains, étoiles et rochers canoniques sont conservés. Les autres cartes ne changent pas.

La planète est un nouvel asset RGBA généré avec le moteur image intégré, puis encodé en WebP lossless sans changer les pixels : `assets/maps/decor/helion03-cataclysm-v1/shattered-planet.webp`, 1536 × 1024, 1 869 652 octets, SHA-256 `ca1eb402e3740b1d836384f537a3c233b10865be4c2a985451ecce96d1663700`. La source PNG et le prompt final sont conservés dans `output/helion03-cataclysm-20261024/` ; la génération d'origine reste dans le dossier d'images générées de Codex.

La nouvelle crête est `assets/maps/decor/helion03-layered-v1/scarlet-ridge.webp`, 1672 × 941 RGBA, alpha 0 à 255, 1 586 854 octets, SHA-256 `c84681a86086de29f2122c3dbea57458dead93dcdbd95a5ef9b4aa03518bdd2e`. Génération image intégrée, conversion WebP lossless avec pixels RGBA inchangés ; source et prompt dans `output/helion03-layered-20261024/`.

## Mini-carte et aperçu

`assets/maps/minimaps/helion-03-wide-v3.png` est un atlas fixe 1200 × 540 exporté par le renderer réel. Il contient l'atmosphère rouge de Helion-01, la nouvelle nébuleuse et la planète, sans vaisseaux, rochers ni marqueurs. Le joueur et les portails sont dessinés séparément. La planète reste à 67 % / 34 %, avec une largeur de 20 % ; la nébuleuse se situe à 46 % / 53 %, avec une largeur de 72 %. La caméra du joueur ne déplace pas ce fond. Les atlas précédents restent disponibles pour revenir aux premiers cadrages.

`miniMapScenery.js` accepte un fond explicitement marqué `minimap:true` comme repère lors de la capture et du rendu de secours. Les nuages ordinaires restent exclus ; les autres scènes n'ont pas de nouveau repère. L'atlas remplace ensuite les couches individuelles dans le cache de mini-carte.

L'aperçu `assets/maps/previews/helion03-cataclysm1/index.html` permet de visiter les points du secteur, de comparer l'ancien décor et de voir la mini-carte. Il utilise les vrais modules du jeu, avec un pilote d'exemple, sans compte ni progression MMO. Le bouton technique d'export apparaît seulement avec le paramètre `capture`.

## Vérification et publication

Les tests ciblés contrôlent la sélection stricte de carte, les références de gameplay, les données déterministes du secteur, la profondeur, les options graphiques, les dimensions des assets, la capture de mini-carte et la stabilité de son cache. Vérification navigateur du cadrage et de plusieurs points du secteur. Les preuves et rapports sont conservés dans `output/helion03-cataclysm-20261024/`.

Lot frontend `20261024-helion3-cataclysm2` publié à 18 h 10 Europe/Paris : neuf fichiers, limités aux quatre modules concernés, à l'index, aux deux nouveaux assets et à l'aperçu. Les 103 tests sur la copie fraîche de production avec le candidat exact, cinq syntaxes et 242 modules d'imports passent. Les neuf empreintes installées et publiques HTTPS correspondent ; les 173 cibles de l'importmap de l'aperçu répondent HTTP 200. Les 337 alias étrangers et les travaux concurrents du checkout et du serveur sont conservés.

L'index a été publié en dernier, après un rapprochement limité de son état concurrent. Aucun changement de logique serveur ni redémarrage : PID 1182716 inchangé, PostgreSQL prêt, journal sans nouveau warning ou erreur. Sauvegarde `/opt/avosoma-backups/20261024-helion3-cataclysm2`. L'aperçu public `https://avosoma.absyrion.com/assets/maps/previews/helion03-cataclysm1/index.html` est vérifié dans le navigateur, sans erreur console ; capture `output/helion03-cataclysm-20261024/cataclysm-public.png`. Cette vérification visuelle n'utilise pas de compte MMO authentifié.


Retouche de profondeur publiée le 24 octobre à 20 h 12 Europe/Paris, lot 20261024-helion3-depth1 : cinq fichiers frontend, 28 tests ciblés, deux syntaxes, cinq empreintes publiques conformes et 176 cibles d'importmap accessibles. Les 353 alias étrangers, les anciens assets et le JS d'aperçu sont conservés. PID 1222927 inchangé, PostgreSQL prêt, aucun redémarrage ni nouvelle erreur. Sauvegarde /opt/avosoma-backups/20261024-helion3-depth1. Vérification visuelle de l'aperçu public au centre et capture output/helion03-depth-20261024/centre-public.png, sans compte MMO authentifié.


Fond par couches publié le 24 octobre à 20 h 31 Europe/Paris, lot 20261024-helion3-layered1 : six fichiers frontend, 28 tests ciblés, deux syntaxes, six empreintes publiques conformes et 183 cibles d'importmap accessibles. Les 361 alias étrangers du principal et 353 de l'aperçu sont préservés. Planète, textures de base, ancien atlas et JS d'aperçu inchangés. PID 1346787 stable, PostgreSQL prêt, aucun redémarrage ni nouvelle erreur. Sauvegarde /opt/avosoma-backups/20261024-helion3-layered1. Scène et atlas vérifiés dans l'aperçu public à 1920×1080 ; capture output/helion03-layered-20261024/centre-1920-public.png et console sans erreur.

## Publication du 25 octobre 2026 : fond bordeaux et vestiges

Le lot `20261025-helion3-crimson1` remplace la composition précédente par l'aperçu approuvé dans `output/helion03-wreck-20261025/`. Il reprend les nappes bordeaux de Helion-01/02, rapproche la planète du centre (1800 / -2200, parallaxe 0,03, toujours 480 × 320), ajoute quatre étoiles plus grandes disposées de manière asymétrique, une épave de cargo à gauche et quatre fragments planétaires lointains. La parallaxe du cargo est 0,18 ; celle des fragments est 0,045. Les petites étoiles proches passent à 420. Ces éléments restent du décor ; les dimensions et règles du secteur, les portails, les ennemis et les autres cartes sont préservés.

Le cargo est un PNG transparent natif 1774 × 887, généré avec image_gen à partir du style du cargo de Helion-02. Source et prompt : `output/helion03-wreck-20261025/cargo-wreck.png` et `image-prompt.txt`. Les assets publiés sont isolés dans `assets/maps/decor/helion03-crimson-v1/`. L'ancienne planète et les textures de Helion-01/02 sont réutilisées ; il ne s'agit pas d'un nouveau fond 4K.

La mini-carte fixe `assets/maps/minimaps/helion-03-crimson-v1.png` (1200 × 540) a été exportée par le moteur de rendu. Elle place la planète à 52 % / 47 %, la nébuleuse à 77 % / 39 % et la nappe secondaire à 20 % / 74 %. Les épaves et petits débris restent exclus ; les marqueurs du joueur et des portails restent séparés.

Publication limitée à sept fichiers frontend, avec `index.html` installé en dernier. Les 35 tests ciblés et les deux vérifications syntaxiques passent sur une copie fraîche de production avec le candidat exact. La scène intégrée est égale à la scène approuvée après normalisation des chemins d'assets. Les sept empreintes installées et publiques concordent, les 199 cibles de l'importmap public répondent HTTP 200, et les 395 alias étrangers du principal ainsi que les 353 de l'aperçu sont conservés. Un changement concurrent de l'index de production a été préservé par rebase limité des deux modules concernés.

Sauvegarde : `/opt/avosoma-backups/20261025-helion3-crimson1`. Aucun redémarrage serveur : PID 2314836 et NRestarts 0 inchangés, PostgreSQL prêt, aucune nouvelle alerte ou erreur dans le journal. L'aperçu public a été vérifié à 1280 × 720 avec une console sans erreur ; capture `output/helion03-wreck-20261025/published-centre.png`. Cette vérification visuelle utilise le rendu public avec un pilote d'exemple, pas une session MMO authentifiée. Les rapports détaillés sont dans `output/helion03-wreck-20261025/release/` et `validation/`.
