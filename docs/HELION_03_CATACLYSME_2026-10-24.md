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



## Publication du 25 octobre 2026 : ruines et éclats d’Éclanite

Le lot `20261025-helion3-ruins1` publie l’aperçu validé dans `output/helion03-ruins-20261025/`. La planète centrale mesure 360 × 240 avec une parallaxe de 0,09. Le cargo a été remplacé par une structure orbitale brisée de 420 × 280. Après la dernière demande, son centre apparent est décalé de 98 unités vers la gauche, sans déplacement vertical, et sa parallaxe passe de 0,14 à 0,22 pour défiler environ 57 % plus vite devant le pilote.

Les 153 petits astéroïdes et les quatre fragments proches de la planète ont une opacité de 1 ; leurs tailles, positions et éclairages conservent la profondeur. Deux petits dépôts de cristaux et six éclats violets lumineux, de deux silhouettes différentes, marquent la présence des Éclanites. Leurs parallaxes de 0,055 à 0,065 les maintiennent derrière la planète. Quatre étoiles lointaines et l’atmosphère bordeaux restent présentes. Toutes les règles, dimensions jouables, références de portails et compositions d’ennemis sont préservées, ainsi que les autres cartes.

Les nouveaux sprites transparents sont copiés sans retouche dans `assets/maps/decor/helion03-ruins-v1/`. La lueur violette est l’export natif du traitement lumineux approuvé, réutilisé directement par le rendu et la mini-carte. La mini-carte fixe de 1200 × 540 est exportée par le moteur ; sa planète est placée à 52 % / 47 %, avec une largeur de 15 %. La nébuleuse et sa lueur restent à 77 % / 39 %. Les petits débris restent exclus de ce fond fixe.

Validation : égalité des scènes locale approuvée et intégrée après normalisation des chemins et du traitement lumineux exporté ; 34 contrôles ciblés réussis, deux fichiers JavaScript vérifiés, sept modules importés sans manque. Deux autres tests de migration de largeur de mini-carte échouent identiquement sur la base publique capturée et sur le candidat : ils concernent une évolution distincte du checkout et sont consignés dans `validation/baseline-minimap-tests.log` et `staged-tests-all.log`. Aucun correctif hors périmètre n’est inclus.

Publication limitée à 11 fichiers frontend, `index.html` installé en dernier. Les 11 empreintes publiques et installées concordent et les 210 cibles de l’importmap public répondent. Un alias ajouté simultanément dans l’index public a été conservé lors du remplacement limité des deux modules de décor. Sauvegarde : `/opt/avosoma-backups/20261025-helion3-ruins1`.

Le service conserve son PID 2362785 et NRestarts 0, PostgreSQL est prêt et le journal ne contient aucune nouvelle alerte ou erreur sur la fenêtre de publication. Aucun redémarrage serveur. Le rendu public est vérifié à 1254 × 884, zoom 80 %, sans erreur console : `output/helion03-ruins-20261025/published-centre-80.png`. Ce contrôle utilise l’aperçu public avec le moteur du jeu et un pilote d’exemple ; il ne constitue pas une session MMO authentifiée. Rapports dans les dossiers `release/` et `validation/` de cet aperçu.

## 2026-10-25 — Reflets intégrés sur la structure de Helion-03

- Direction visuelle choisie : reflets cuivre et améthyste sur la structure détruite.
- Release : `20261025-helion3-reflections1`, publiée le 25 octobre 2026 à 14:08:03 UTC.
- Asset natif transparent 1536 × 1024 : `assets/maps/decor/helion03-reflections-v1/orbital-ruin.png`.
- Seuls la source de l'image et son filtre de rendu changent. Taille 420 × 280, position apparente (-490, -154), parallaxe 0.22, planète, gaz, astéroïdes, mini-carte et gameplay conservés.
- Publication limitée à quatre fichiers frontend, index principal publié en dernier. 444 alias indépendants de l'index et 364 alias de l'aperçu conservés.
- Sauvegarde : `/opt/avosoma-backups/20261025-helion3-reflections1`.
- 24 tests ciblés réussis, syntaxe et importations contrôlées ; 4/4 empreintes publiques et installées conformes, 218 destinations de l'importmap accessibles.
- Service actif, PID 2458909 conservé, aucun redémarrage, PostgreSQL prêt et aucune nouvelle erreur ou alerte dans le journal depuis la publication.
- Vérification visuelle dans l'aperçu public, sans session MMO authentifiée : `output/helion03-integrated-lighting-20261025/published-centre-80.png`.
- Les retouches suivantes aux astéroïdes seront préparées séparément en aperçu local.

## Éclanite intégrée — publication du 25 octobre 2026

Release : `20261025-helion3-eclanite1`.

Les six éclats et les deux petits dépôts décoratifs utilisent trois nouveaux sprites natifs transparents : facettes opaques, reflets cuivre et fractures violettes lumineuses. Les éclats suivent une disposition irrégulière près du gaz violet. Une passe émissive conserve leur silhouette sombre. Les 153 astéroïdes gardent leur géométrie et leur parallaxe ; 65 reçoivent des reflets cuivre, 15 des reflets violets, et 73 conservent leur texture neutre. La lueur du gaz varie de 4 % sur 20 secondes et reste fixe avec la préférence de mouvement réduit. Les halos des éclats suivent le réglage des rochers.

La planète, la structure éclairée, les étoiles, les ancrages des nuages, la mini-carte fixe et le gameplay sont conservés. Les nouveaux sprites PNG sont copiés sans redimensionnement ni retouche après leur génération. `helionThreeFinishes.js` compose ces finitions ; `mapSceneryAnimation.js` calcule seulement l'opacité de rendu.

Publication frontend de 11 fichiers, sauvegarde `/opt/avosoma-backups/20261025-helion3-eclanite1`, index livré en dernier. Candidat construit sur une capture fraîche du runtime public, 28 tests ciblés réussis sans exclusion, quatre modules contrôlés syntaxiquement, comparaison de scène avec l'aperçu approuvé conforme. Les deux nouveaux modules et les alias modifiés préservent tous les autres imports. Aucun redémarrage serveur : PID 2510150, PostgreSQL prêt, aucun nouveau journal d'avertissement ou d'erreur lors des contrôles.

Le rendu est vérifié dans l'aperçu public utilisant les modules déployés, sans erreur de console. Ce contrôle n'est pas une session MMO authentifiée. Capture et preuves : `output/helion03-eclanite-20261025/release/`. La version précédente reste sauvegardée. L'essai supplémentaire du test local `azuron-scenery.test.js` a été écarté du périmètre : il dépend de `azuronVisuals.js`, absent du runtime public capturé ; aucun fichier Azuron n'a été ajouté à cette livraison.
