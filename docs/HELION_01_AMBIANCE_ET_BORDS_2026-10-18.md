# Helion-01 : ambiance, répartition des nuages et bords progressifs

Révision publiée sur Netcup le 18 octobre 2026 à **20 h 28**, heure de Paris. Version navigateur : `20261018-helion-ambient1`.

Cette passe remplace la coupure rectangulaire du décor introduite dans la révision précédente. Elle reste limitée à Helion-01.

## Composition

- Le fond, les étoiles lointaines, les halos et la planète continuent à l'extérieur du secteur. La planète reste en bas à gauche et conserve son coefficient de parallaxe de 0,30.
- Les rochers, l'épave et les voiles intermédiaires ou proches s'effacent progressivement avant les bords. Aucun contour ni aplat noir n'est ajouté.
- Les nuages intermédiaires ou proches passent de treize à cinq : trois intermédiaires et deux proches, répartis à l'intérieur du secteur. Aucun de ces cinq voiles ne recouvre le spawn.
- Cinq nappes lointaines, avec des coefficients de 0,065 à 0,12, couvrent l'ensemble du secteur. Elles restent derrière la planète et se déplacent bien plus lentement que les autres plans.
- Le fond rouge sombre est légèrement relevé et l'opacité de la vignette est divisée par deux. Quatre points lumineux chauds, à faible parallaxe, créent des repères dans le fond.

Les textures existantes sont réutilisées. Il n'y a pas de nouvelle grande image de map ni de filtre dynamique sur les vaisseaux. Les entités de combat sont rendues après le décor. Les réglages existants de nébuleuses, astéroïdes et lumières restent respectés ; les halos supplémentaires sont affichés avec l'option de lumières, activée par défaut en qualité haute.

## Rendu et coût

`getMapSceneryEdgeOpacity` dans `src/game/render/mapSceneryBounds.js` calcule une transition progressive sur 460 unités. Le calcul utilise la position apparente de chaque image après parallaxe et son encombrement tourné, dans les coordonnées logiques du jeu. Une image proche n'est plus dessinée si son empreinte atteint le bord. Elle s'efface donc avant d'y arriver, au lieu d'être tranchée avec tout le fond.

Cette règle s'active uniquement sur les images marquées `edgeFade` et sur les petites étoiles du premier plan lorsque la scène définit une distance de transition. Les stations et portails interactifs gardent leur visibilité et leurs coordonnées.

`src/game/render/mapSceneryLights.js` prépare un petit halo de 512 × 512 par point lumineux, puis réutilise ce cache. Les quatre sources représentent environ 4 Mio de pixels RGBA. Aucun dégradé de halo n'est recalculé par frame pour ces sources. Les autres maps gardent leur ancien rendu de lumières.

Le streaming continue à réutiliser les mêmes assets et le tri des profondeurs reste effectué à la construction de la scène. Le gameplay, les profils, les portails et le serveur ne sont pas modifiés.

## Vérifications locales

- Tests serveur : **1 062 / 1 062** ; tests client : **40 / 40**.
- Dix-huit tests ciblés couvrent la conservation du gameplay et des autres maps, les coordonnées historiques, la parallaxe, le streaming, les réglages graphiques, les découpes de l'atlas, la transition sur chaque bord, les images tournées, la continuité extérieure du fond et de la planète, le spawn dégagé et la réutilisation du cache lumineux.
- Contrôle raster avec le moteur réel : **42 combinaisons** de vue/qualité/zoom, **129 372 pixels échantillonnés hors secteur**, fond continu partout et **aucune différence due au décor proche** à l'extérieur. Le test isole les images proches et compare à un fond sans ces images, en conservant les mêmes étoiles lointaines. Les stations interactives sont exclues de ce contrôle de décor.
- Inspection visuelle du spawn, du centre et des bords, y compris le disque de la planète continuant à l'extérieur. Pas d'erreur console observée.
- Mesure indicative du rendu isolé, même moteur avec les compositions précédente et nouvelle : 240 positions après préchauffage, qualité haute, zoom 78 %, 1 254 × 884. Temps CPU moyen **0,392 ms avant / 0,364 ms après**, P95 **0,5 / 0,5 ms**. Ces petites différences ne prouvent pas un gain de FPS et ne mesurent pas le coût GPU ni une partie multijoueur.

## Aperçu et publication

Les quatre captures et la vidéo de 24 secondes du moteur de décor sont publiées pour consultation sur téléphone : [aperçu Helion-01](https://avosoma.absyrion.com/assets/maps/previews/helion01-ambient1/index.html).

La première moitié montre un déplacement près de la planète ; la seconde montre un aller-retour au-delà du bord gauche. Ce sont des aperçus isolés du décor avec un vaisseau représentatif, pas un enregistrement d'une partie multijoueur connectée.

- Sauvegarde locale avant modification : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-helion-ambient-before`.
- Préparation, tests, manifeste, mesures, contrôle raster et outil de retour arrière : `tmp/helion-ambient-release/`.
- Sauvegarde serveur : `/opt/avosoma-backups/helion-ambient-20261018`.

Les **16 fichiers publics** correspondent aux empreintes attendues, y compris les quatre JPEG et le MP4. La version précédente a été comparée avant remplacement ; les copies sont atomiques et l'index du jeu est installé en dernier. La santé publique confirme PostgreSQL prêt et le service actif conserve le même PID, sans redémarrage.

La vidéo publique **H.264 Baseline**, **1 254 × 884**, environ **30 images par seconde**, fait **9 609 395 octets** et dure **24,005 secondes**. Elle a été décodée puis lue jusqu'à la fin dans le navigateur sans erreur. Les requêtes HTTP Range sont acceptées en 206. Quatre images extraites du film ont été examinées pour vérifier la sortie de la planète et la disparition du décor proche aux limites.

Le client public charge la version `20261018-helion-ambient1` jusqu'à l'écran de connexion, sans erreur console. Aucune connexion à un compte ni vérification d'une partie multijoueur n'est revendiquée. Le déploiement est exclusivement frontal ; le serveur n'a pas été redémarré.
