# Helion-01 : planète lointaine, vestiges et lumière stellaire

Préparée le 18 octobre, cette révision a été publiée sur Netcup le **22 octobre 2026 à 18 h 01**, heure de Paris. Version navigateur : `20261022-helion-relics1`.

## Planète et composition conservée

Le coefficient de la planète passe de **0,30 à 0,12**. Un déplacement de caméra de 1 000 unités déplace son image de 120 unités logiques au lieu de 300. Ce réglage est donc 2,5 fois plus lent que la révision précédente, tout en restant plus mobile que l'ancien réglage de 0,045.

L'ancrage est recalculé à **(-9 050, 7 800)** pour conserver exactement le cadrage de la révision précédente lorsque la caméra est centrée sur le spawn. La taille reste 1 560 × 1 560. Ce sont des coordonnées de projection du fond, sans collision ni effet sur la taille du secteur.

La répartition des cinq voiles intermédiaires/proches, des cinq nappes lointaines et des rochers est identique à la composition validée. La comparaison JSON dans l'aperçu le confirme. Le fond rouge, la luminosité de base, la vignette et le traitement progressif des bords sont conservés. Les autres maps et le gameplay restent inchangés.

## Décors de fond

Trois repères sont placés derrière les rochers, dont le coefficient minimal reste 0,34 :

- Une frégate brisée, coefficient **0,20**, taille **360 × 240**, opacité **0,48**, dans la partie nord-ouest.
- Une rémanence d'ancienne explosion, coefficient **0,17**, taille **620 × 413**, opacité **0,48**, dans la partie nord-est. Il s'agit d'un vestige de gaz et de débris, pas d'un effet de combat figé.
- L'épave de station existante, désormais au coefficient **0,22**, taille **260 × 146**, opacité **0,40**, dans la partie sud-ouest, au lieu du gros élément verrouillé au plan de gameplay.

Les trois éléments restent à l'intérieur du secteur grâce à la transition existante sur leurs empreintes apparentes. Les nuages proches restent rendus devant eux. Aucun événement, projectile ou objet interactif n'est ajouté.

Les quatre points blancs de la révision précédente sont remplacés par une couronne stellaire texturée, au coefficient **0,065**, accompagnée de deux halos ambiants diffus sans point blanc central. La couronne utilise le mélange `screen` et passe derrière la planète. Les halos sont préparés une fois dans le cache existant ; `point: false` retire leur petite pastille blanche. Les lumières des autres maps gardent leur comportement précédent.

La texture de couronne respecte l'option `starGlow`, y compris son absence par défaut en qualité basse ou moyenne. La rémanence respecte l'option `nebulae`. Le rendu des autres décors et les réglages existants sont conservés.

## Assets et références

Trois PNG RGBA originaux sont générés avec imagegen, puis copiés dans `assets/maps/decor/helion01-v4/`. Ils mesurent tous **1 536 × 1 024** et possèdent une véritable transparence :

- `derelict-frigate.png` : **1 837 900 octets**, alpha 0 à 254, bord entièrement transparent.
- `stellar-corona.png` : **1 835 133 octets**, alpha 0 à 253, alpha maximal de 1 au bord.
- `reactor-remnant.png` : **2 034 267 octets**, alpha 0 à 254, alpha maximal de 1 au bord.

Ils sont dessinés à des dimensions inférieures à leurs textures, préchargés et dédupliqués par le streaming existant. Ils ne constituent pas une image géante de map. Le coût supplémentaire des pixels RGBA décodés est d'environ 18 Mio pour ces trois textures. Aucun filtre d'image, calcul de particules d'explosion ou génération de texture n'est ajouté à chaque frame.

Les prompts exacts se trouvent dans `output/helion01-assets/2026-10-18/`, avec le suffixe `relics-prompt.txt`. Les originaux du générateur sont conservés sous `C:\Users\Ntmav\.codex\generated_images\01a14fba-5b0d-7282-a7c9-ebd011760c27\` ; leurs chemins et les contrôles d'alpha sont consignés dans `tmp/helion-relics-release/asset-metadata.json`.

Références visuelles consultées dans le navigateur : [capture promotionnelle DarkOrbit avec planète et explosion](https://www.mmobomb.com/g/380/DarkOrbit-Reloaded-screenshots-3.jpg), [capture avec station, lumière et structures](https://cdn11.bigcommerce.com/s-u0v3cvo4an/images/stencil/1000w/products/16487/156736/screen_03__26937.1714045316.jpg), et [capture communautaire Steam avec fond galactique lumineux](https://images.steamusercontent.com/ugc/13892628103600282809/8E06AB1AD5E06B69535F14CEB3B50EC5CD82271A/?ima=fit&imcolor=%23000000&impolicy=Letterbox&imw=1024&letterbox=false). La [fiche officielle Steam](https://store.steampowered.com/app/4054110/DarkOrbit_Reloaded/) a également été consultée. Les références servent à examiner les silhouettes, les halos et la séparation des plans. Aucun asset de DarkOrbit n'a été téléchargé ou réutilisé dans le projet.

## Vérifications

- Suites serveur **1 064 / 1 064**, client **40 / 40**.
- Vingt régressions visuelles, incluant le cadrage inchangé de la planète au spawn selon la résolution et le zoom, sa présence après un petit trajet, les vitesses relatives, l'ordre des plans, la découverte des assets et les options graphiques.
- Contrôle raster : **42 combinaisons** de vue/qualité/zoom et **106 398 échantillons hors secteur**, fond continu et aucune contribution du décor borné à l'extérieur.
- Comparaison des nuages et rochers avant/après : identiques.
- Mesure indicative du décor isolé : 240 positions après préchauffage, qualité haute, zoom 78 %, **1 280 × 720**. Temps CPU moyen **0,347 ms avant / 0,364 ms après**, P95 **0,5 ms dans les deux cas**. Cela ne mesure ni le coût GPU ni les FPS d'une partie multijoueur.

## Aperçu et publication

La vidéo et les captures sont destinées à être consultées sur téléphone : [Helion-01 : planète lointaine et vestiges](https://avosoma.absyrion.com/assets/maps/previews/helion01-relics1/index.html).

La vidéo du moteur de décor dure 24 secondes. La première partie montre la planète pendant un trajet de (-2 700, 3 300) vers (-1 000, 2 400), puis retour ; la seconde parcourt les vestiges de (-1 400, -1 000) vers (1 600, -1 700), puis retour. Ce n'est pas une partie multijoueur connectée.

- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-helion-relics-before`.
- Préparation, mesures, tests, manifestes et retour arrière : `tmp/helion-relics-release/`.
- Sauvegarde serveur : `/opt/avosoma-backups/helion-relics-20261022`.

La publication porte sur **17 fichiers** : neuf fichiers JavaScript/HTML du client, les trois nouveaux PNG et cinq fichiers de démonstration. Les empreintes des 17 fichiers publics correspondent au manifeste après installation ; les fichiers binaires sont comparés sans normalisation de contenu. La version précédente a été comparée avant remplacement et sauvegardée. Les copies sont atomiques et l'index est installé en dernier.

La vidéo publique H.264 Baseline mesure 1 280 × 720, dure **24,005 secondes** et fait **9 962 951 octets**. Les requêtes Range répondent en 206 avec le type `video/mp4`. Le navigateur a décodé la vidéo sans erreur ; les images extraites à 0,5, 7,8 et 19,8 secondes ont été examinées, notamment pour confirmer que la planète reste bien visible à l'extrémité du trajet.

Le client public charge la version `20261022-helion-relics1` jusqu'à l'écran de connexion, sans compte connecté pour cette vérification. La santé publique confirme PostgreSQL prêt et le service conserve le même PID, sans redémarrage. Aucune vérification d'une partie multijoueur connectée n'est revendiquée.
