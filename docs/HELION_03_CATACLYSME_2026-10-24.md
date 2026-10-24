# Helion-03 — Sillon écarlate et planète brisée

Le décor local « Sillon écarlate » approuvé devient le fond de Helion-03. La nébuleuse rouge/cuivre conserve sa composition, ses profondeurs sombres et sa lumière chaude. Une planète éventrée, avec un cœur incandescent et des morceaux de croûte arrachés, matérialise le cataclysme demandé dans le lointain.

## Composition et intégration

`helionThreeVisuals.js` applique exclusivement ce décor au couple ID 2 / nom Helion-03. Après la retouche de profondeur, la planète mesure 480 × 320 unités, avec un ancrage 9000 / −5000 et une parallaxe 0,03 : pour 1000 unités de déplacement, elle défile seulement de 30 pixels logiques. Elle est 25 % plus petite et plus centrale que la première publication. Elle reste statique, sans animation d'explosion répétée. La nébuleuse unique garde sa parallaxe 0,06, deux voiles discrets et deux halos chauds fixes.

La composition utilise le renderer et le streaming existants. Dimensions de carte, portails, collisions, ennemis, niveaux, quêtes, gains, étoiles et rochers canoniques sont conservés. Les autres cartes ne changent pas.

La planète est un nouvel asset RGBA généré avec le moteur image intégré, puis encodé en WebP lossless sans changer les pixels : `assets/maps/decor/helion03-cataclysm-v1/shattered-planet.webp`, 1536 × 1024, 1 869 652 octets, SHA-256 `ca1eb402e3740b1d836384f537a3c233b10865be4c2a985451ecce96d1663700`. La source PNG et le prompt final sont conservés dans `output/helion03-cataclysm-20261024/` ; la génération d'origine reste dans le dossier d'images générées de Codex.

## Mini-carte et aperçu

`assets/maps/minimaps/helion-03-wide-v2.png` est un atlas fixe 1200 × 540 exporté par le renderer réel. Il contient la nébuleuse et la planète, sans vaisseaux, rochers ni marqueurs. Le joueur et les portails sont dessinés séparément. La planète se situe à 67 % / 34 %, avec une largeur de 20 % ; la nébuleuse à 60 % / 40 %, avec une largeur de 88 %. La caméra du joueur ne déplace pas ce fond. La version 1 reste disponible pour revenir au premier cadrage.

`miniMapScenery.js` accepte un fond explicitement marqué `minimap:true` comme repère lors de la capture et du rendu de secours. Les nuages ordinaires restent exclus ; les autres scènes n'ont pas de nouveau repère. L'atlas remplace ensuite les couches individuelles dans le cache de mini-carte.

L'aperçu `assets/maps/previews/helion03-cataclysm1/index.html` permet de visiter les points du secteur, de comparer l'ancien décor et de voir la mini-carte. Il utilise les vrais modules du jeu, avec un pilote d'exemple, sans compte ni progression MMO. Le bouton technique d'export apparaît seulement avec le paramètre `capture`.

## Vérification et publication

Les tests ciblés contrôlent la sélection stricte de carte, les références de gameplay, les données déterministes du secteur, la profondeur, les options graphiques, les dimensions des assets, la capture de mini-carte et la stabilité de son cache. Vérification navigateur du cadrage et de plusieurs points du secteur. Les preuves et rapports sont conservés dans `output/helion03-cataclysm-20261024/`.

Lot frontend `20261024-helion3-cataclysm2` publié à 18 h 10 Europe/Paris : neuf fichiers, limités aux quatre modules concernés, à l'index, aux deux nouveaux assets et à l'aperçu. Les 103 tests sur la copie fraîche de production avec le candidat exact, cinq syntaxes et 242 modules d'imports passent. Les neuf empreintes installées et publiques HTTPS correspondent ; les 173 cibles de l'importmap de l'aperçu répondent HTTP 200. Les 337 alias étrangers et les travaux concurrents du checkout et du serveur sont conservés.

L'index a été publié en dernier, après un rapprochement limité de son état concurrent. Aucun changement de logique serveur ni redémarrage : PID 1182716 inchangé, PostgreSQL prêt, journal sans nouveau warning ou erreur. Sauvegarde `/opt/avosoma-backups/20261024-helion3-cataclysm2`. L'aperçu public `https://avosoma.absyrion.com/assets/maps/previews/helion03-cataclysm1/index.html` est vérifié dans le navigateur, sans erreur console ; capture `output/helion03-cataclysm-20261024/cataclysm-public.png`. Cette vérification visuelle n'utilise pas de compte MMO authentifié.


Retouche de profondeur publiée le 24 octobre à 20 h 12 Europe/Paris, lot 20261024-helion3-depth1 : cinq fichiers frontend, 28 tests ciblés, deux syntaxes, cinq empreintes publiques conformes et 176 cibles d'importmap accessibles. Les 353 alias étrangers, les anciens assets et le JS d'aperçu sont conservés. PID 1222927 inchangé, PostgreSQL prêt, aucun redémarrage ni nouvelle erreur. Sauvegarde /opt/avosoma-backups/20261024-helion3-depth1. Vérification visuelle de l'aperçu public au centre et capture output/helion03-depth-20261024/centre-public.png, sans compte MMO authentifié.
