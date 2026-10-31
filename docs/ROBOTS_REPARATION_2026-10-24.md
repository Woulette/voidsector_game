# Robots de réparation — 24 octobre 2026

Versions publiées : `20261024-repair1` (refonte), `20261024-repair2` (accroche des faisceaux) et `20261024-repair3` (vol plus réactif).

## Vol plus réactif — repair3

À la demande du joueur, le robot se rapproche et recule pendant les soins, tourne plus vite et change son sens d'approche. Le déploiement passe de 0,45 à 0,24 seconde. La vitesse angulaire de base passe de 0,32 à 0,68 radian par seconde, soit une période nominale de 19,63 à 9,24 secondes ; une variation continue produit de brèves inversions de sens. La distance varie sur un cycle d'environ 3,4 secondes, selon la taille du vaisseau. Sur Razorion, elle va d'environ 70 à 94 unités, en comptant la petite oscillation verticale. Les articulations des bras sont également plus actives. Aucun point de soudure n'est déplacé par cette nouvelle trajectoire.

Le test de mouvement reproduit l'absence d'approche/recul sur l'ancienne version, puis vérifie l'amplitude, la vitesse, les inversions progressives, le déploiement et l'absence de saut de position. Les 27 tests ciblés passent localement et sur le candidat issu de la production fraîche. Le contrôle des neuf silhouettes confirme de nouveau zéro contact détaché parmi 17 352 échantillons, avant et après ce changement.

La vidéo `output/repair-drone-motion-2026-10-24/robot-reparation-mobile.mp4` contient 360 images sur 11,97 secondes du vrai renderer, avec les trois variantes, un déplacement et une caméra mobile. C'est un aperçu isolé, dont le module est identique à celui publié. La livraison ne contient que `src/game/render/repairDrone.js` et `index.html`, avec redirection des anciens alias. Les deux empreintes publiques concordent. Le service reste au PID `1182716`, sans redémarrage ni nouvelle erreur ; PostgreSQL est prêt. Sauvegarde : `/opt/avosoma-backups/20261024-repair3`. Les manifests, tests et captures se trouvent dans `output/repair-drone-motion-2026-10-24/`.

## Correction de l'accroche — repair2

Le joueur a signalé que les faisceaux se détachaient de la coque pendant l'orbite du robot. La première version faisait tourner les points de contact sur une ellipse à 23 % de la boîte du sprite, avec un décalage tangent pour les deux bras. Ce parcours traversait les zones transparentes entre les ailes, notamment sur Razorion et Orion. Le contrôle initial de proximité du centre ne suffisait pas à détecter ce défaut de silhouette.

Les deux points sont désormais fixes dans le repère local du vaisseau, sur sa partie centrale opaque. Seuls sa position corrigée et son angle, y compris `renderAngleOffset`, les transforment ; l'orbite et les bras ne déplacent plus les points de soudure. Le balayage est plus compact et suit la coque. Les impulsions suivent exactement la courbe du faisceau. L'origine écran reprend l'arrondi de `drawRotatedImage`, pour éviter un décalage lors des déplacements de caméra.

Validation de cette correction :

- Le test de régression échoue avec le renderer antérieur (5 réussites, 1 échec dans cette suite), puis passe après correction. Les 26 tests ciblés passent localement et sur le candidat reconstruit depuis la production fraîche : robots, réparation de départ, correction visuelle du joueur et poison/PV.
- Les neuf images de combat sont contrôlées sur un tour complet du robot avec quatre orientations du vaisseau et une correction de position. Sur 17 352 contacts, 7 109 visaient des pixels transparents ou insuffisamment opaques avant correction, contre zéro ensuite. Tous les nouveaux contacts et la petite zone balayée ont un alpha de 255. Les neuf textures testées correspondent par SHA-256 aux images publiques. Résultats : `hull-alpha-validation.json` et `public-hull-assets.json` dans le dossier de cette correction.
- L'aperçu utilise les dimensions/images du vrai catalogue, les trois robots, une translation, une rotation continue du vaisseau et une caméra mobile. Le MP4 capture 630 images sur 20,97 secondes. Il s'agit d'une scène isolée avec le vrai renderer, pas d'une session de combat publique. Le fichier du renderer est identique à celui publié.
- Publication limitée à `src/game/render/repairDrone.js` et `index.html`. L'importmap redirige aussi le chemin versionné `repair1` utilisé par `render/player.js` vers `repair2`. Aucun catalogue, image, règle de soin ou fichier serveur n'est livré dans cette correction.
- Une première tentative a été arrêtée avant écriture par la garde du PID après un redémarrage concurrent. La base a été reprise fraîchement, le candidat et ses tests reconstruits, puis l'archive revalidée. Les deux empreintes publiques HTTPS correspondent après publication. Le service conserve alors le PID `1182716`, reste actif et PostgreSQL est prêt ; aucune nouvelle erreur ni redémarrage de notre livraison. Sauvegarde : `/opt/avosoma-backups/20261024-repair2`.

Preuves, vidéo et helpers : `output/repair-drone-attachment-2026-10-24/`. Les sections suivantes décrivent la livraison initiale.

## Direction validée et images

Le joueur a rejeté la première proposition industrielle aux coques fortement colorées. La deuxième direction a été comparée aux vrais lasers, générateurs et drone de combat du jeu, puis approuvée : métal graphite, arêtes argentées, petites lumières bleues, jaunes ou rouges et deux bras métalliques. Les trois modèles utilisent cette même géométrie.

- Images du magasin, de l'inventaire et du rendu : `assets/equipment/repair-drones-native-v1/{blue,yellow,red}.webp`, 512 × 512 avec transparence, environ 59 Ko chacune.
- Masters PNG conservés dans `output/repair-drones-2026-10-24/native-proposal/`.
- Génération/édition avec l'outil intégré `image_gen`, fond transparent ; déclinaisons jaune et rouge dérivées du bleu approuvé. Seuls le redimensionnement et l'encodage WebP sont effectués ensuite avec Pillow.
- Spécification des prompts et références : `output/repair-drones-2026-10-24/prompts.md`.

## Rendu et comportement

`src/data/repairDroneVisuals.js` partage les trois images et couleurs. Il accepte les anciens chemins des snapshots canoniques et privilégie la couleur équipée au taux de réparation : un bonus Premium ne transforme pas visuellement un robot bleu en robot rouge.

`src/game/render/repairDrone.js` calcule une pose orbitale autour du vaisseau corrigé visuellement. Le sprite approuvé fournit le corps et les quatre segments des deux bras, découpés par masques Canvas et animés autour des épaules/coudes. Les faisceaux partent des extrémités articulées et rejoignent deux points voisins sur la coque. Un balayage discret, des impulsions et de courtes étincelles complètent l'effet. Le déploiement apparaît sur 0,45 seconde. Les cinq dessins de sprite par robot et les effets ont un coût borné ; aucun tableau de particules de jeu n'est alimenté par ce rendu.

`render/player.js` délègue au module ; le réglage graphique existant `repairDrone` reste appliqué. `combatAssets.js` précharge les trois images. L'effet cesse à l'arrêt de la réparation, à la mort ou à pleine coque. Les corrections de position du vaisseau sont prises en compte une seule fois.

Dans `systems/repairBot.js`, seule l'émission des cinq anciennes croix vertes par tick est retirée, avec sa dépendance `getParticles`. Le nombre de PV soignés reste affiché. Les ID, prix, raretés, groupe d'équipement, commandes et règles de réparation restent ceux des sources publiques : bleu 1 %/s à 100 000 crédits, jaune 1,5 %/s à 850 000 crédits, rouge 2 %/s à 7 000 NOVA avant remises. Le délai reste de 5 secondes après les dégâts. Aucun code serveur ni donnée persistante modifié.

## Vérifications

- 23 tests ciblés locaux passent : visuels des robots, réparation de départ, poison/PV et cache d'images de combat.
- Sur le candidat construit depuis la production fraîche : 55 tests passent sur 58. Les cinq nouveaux tests couvrent les SKU, les anciens snapshots/Premium, les articulations et corrections, le rendu borné sans mutation de gameplay et les ticks/interruption sans croix vertes.
- Les trois échecs de `shop-showcase.test.js` sont reproduits identiquement sur la copie de production avant modification : cartes Premium, achats dans les fiches et classe `current` du premier aperçu. Bilan de cette seule suite sur la base : 14 réussites et 3 échecs. Aucun changement de magasin hors des images des trois références n'a été ajouté pour les masquer. Logs : `candidate-tests.txt` et `baseline-shop-tests.txt` dans le dossier de sortie.
- Navigateur : les trois images sont décodées, animation avec et sans déplacement, arrêt, échelles 1, 1,65 et 2,5 ; captures `candidate-preview.png`, `candidate-inactive.png` et `candidate-joints.png`.
- Le MP4 `robots-reparation.mp4` est une capture de 120 images en environ 4 secondes du vrai renderer, avec trois joueurs synthétiques et les modules du candidat identiques aux fichiers publiés. Il s'agit d'un aperçu isolé, pas d'une session de combat publique. Le chargement direct de modules publics depuis l'origine locale a été refusé par CORS ; la vérification publique des fichiers est faite séparément par empreintes HTTPS.
- Magasin public ouvert et filtré sur « Drone de Réparation » : les trois vrais articles affichent les images `native-v1`, toutes décodées à 512 px, les effets et les prix existants (remise Premium comprise). Capture `magasin-public.png` et résultat `browser-public.json`. Aucun achat ni équipement effectué pour ce contrôle.
- La mesure CPU de l'aperçu concerne seulement trois rendus locaux ; elle ne constitue pas une mesure des FPS ou de la capacité MMO.

## Publication restreinte

Le candidat est construit par remplacements limités sur une copie fraîche des sources publiques. Les autres modifications du checkout restent hors publication. Dix fichiers seulement sont livrés : trois WebP, les deux nouveaux modules, `equipment.js`, `combatAssets.js`, `systems/repairBot.js`, `render/player.js` et `index.html`.

Le manifeste vérifie les empreintes avant/après et les nouveaux chemins absents ; archive et syntaxe sont contrôlées à distance. Les fichiers sont écrits atomiquement et l'index en dernier. Les dix empreintes publiques HTTPS concordent après publication. Le service conserve le PID `1144897`, aucun redémarrage et aucune nouvelle ligne d'erreur ; PostgreSQL est disponible et la base prête. Sauvegarde : `/opt/avosoma-backups/20261024-repair1`.

Preuves : `output/repair-drones-2026-10-24/{manifest.json,production-overlay.diff,stage-validation.json,deployment-result.json,public-verification.json}`. Les helpers de publication et la sauvegarde distinguent les nouveaux fichiers afin de permettre un retour arrière limité à cette livraison.
