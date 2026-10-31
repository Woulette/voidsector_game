# Helion-01 : profondeur, parallaxe et limite sans contour

Révision publiée sur Netcup le 18 octobre 2026 à 20 h 05, heure de Paris.
Version navigateur : `20261018-helion-depth1`.

## Composition et mouvement

La répartition régulière de rochers fixes est remplacée par trois champs courbes et une population plus diffuse. Les six silhouettes existantes gardent des tailles et orientations variées, avec trois plages de profondeur : coefficients de caméra de 0,34 à 0,48 pour les petits rochers lointains, de 0,58 à 0,72 pour les intermédiaires et de 0,86 à 0,94 pour les plus proches. Aucun rocher de décor n'est verrouillé au plan de gameplay à coefficient 1.

La planète est ancrée vers le coin inférieur gauche du secteur, avec un coefficient 0,30 au lieu de 0,045. Pour un déplacement de caméra de 1 000 unités, elle se décale de 300 unités de rendu logique, au lieu de 45. Elle quitte donc progressivement le champ en s'éloignant du coin, au lieu d'accompagner presque constamment le joueur. Sa taille d'affichage est de 1 560 unités logiques ; au zoom de 78 %, cela représente environ 1 217 pixels à partir de la texture existante de 1 254 pixels.

Les trois couches de poussière du fond lointain ont des coefficients de 0,10 à 0,20 et des opacités faibles. Les treize couches intermédiaires ou proches utilisent des coefficients de 0,50 à 0,88, des proportions, opacités et angles variés. Elles gardent une répartition régionale et des passages moins chargés.

Les images du décor sont préparées une fois dans un ordre du lointain vers le proche, selon leur coefficient. La planète précède ainsi les nuages intermédiaires et proches. Ceux-ci peuvent recouvrir son disque et les rochers plus lointains. Les stations interactives, vaisseaux, ennemis et effets de combat sont rendus ensuite pour conserver leur lisibilité.

Le trait rouge est supprimé sur Helion-01 via `showBoundary: false`. Le découpage du décor aux vraies limites du secteur reste actif : fond, étoiles, planète, rochers et nuages s'arrêtent au bord, et le hors-map est noir. Le changement porte sur l'affichage, sans modifier les déplacements hors secteur ni leurs règles.

## Projection

`src/game/render/mapSceneryProjection.js` porte la projection et le retrait hors écran des éléments. Le nouveau mode explicite `space: "map"` définit un ancrage dans les coordonnées du secteur et une vitesse de parallaxe :

`écran = centre de la vue + (ancrage - centre de la caméra dans le monde) × coefficient`

Ce calcul utilise les dimensions logiques de la vue, donc tient compte du zoom. Lorsque la caméra est centrée sur l'ancrage, l'élément reste au centre quelle que soit la résolution. Les modes historiques sans cette option, y compris `space: "world"`, conservent leurs coordonnées et leurs coefficients par défaut. Le retrait hors écran tient compte des coins des images tournées.

Les modèles de firmes et le tableau partagé `MAPS` restent intacts. La variante visuelle demeure limitée à Helion-01. Aucun gameplay, profil, portail ou code serveur n'a été modifié.

## Asset supplémentaire

Un voile de poussière rouge-brun transparent a été généré pour les plans proches : `assets/maps/decor/helion01-v3/dust-wisp.png`, PNG RGBA de **1 774 × 887**, **1 321 757 octets**, avec alpha de 0 à 253. Il est réutilisé avec plusieurs transformations, sans filtre dynamique ni calcul d'image par frame.

Le prompt exact est conservé dans `output/helion01-assets/2026-10-18/dust-wisp-depth-prompt.txt`. L'original du générateur reste conservé sous `C:\Users\Ntmav\.codex\generated_images\01a14fba-5b0d-7282-a7c9-ebd011760c27\exec-fb8c8ed0-19d0-414d-9b34-7716faa07632.png`.

Le cache de maps découvre ce nouvel asset et continue à dédupliquer les chemins. Les réglages de nébuleuses et d'astéroïdes sont respectés ; le rendu bas peut désactiver les nébuleuses. Les éléments hors écran ne sont pas dessinés et le tri des couches ne se fait pas à chaque frame.

## Vérifications

- Suite serveur : **1 058 / 1 058** ; tests client : **40 / 40** ; syntaxe des neuf modules JavaScript publiés : OK.
- Quatorze régressions visuelles couvrent notamment la conservation des autres maps et du gameplay, le streaming, les modes de coordonnées historiques, les vitesses relatives, la stabilité des ancrages selon la résolution et le zoom, l'ordre poussières/planète, les options graphiques et le vide extérieur sans contour.
- Contrôle des pixels hors secteur : **36 combinaisons** qualité/zoom/vue, **12 870 pixels** noirs et opaques hors secteur, sans échec.
- Inspection de l'aperçu utilisant le vrai moteur de décor, à proximité de la planète, au centre et au bord du secteur. Aucune erreur console observée.
- Enregistrement d'un aller-retour de **14 secondes**, en MP4 H.264 Baseline, **1 280 × 720**, environ **30 images par seconde**, zoom **78 %**, depuis (-2 700, 3 300) vers (-1 000, 2 400), puis retour. Les images extraites à 0,5, 5 et 7,8 secondes ont été examinées : la planète sort du champ et les différents plans se décalent. Le film montre un aperçu du moteur de décor, pas une partie multijoueur connectée.
- La vidéo publique a été décodée puis lue jusqu'au bout dans le navigateur, sans erreur. Son hébergement répond aux requêtes HTTP Range en **206**, avec le type `video/mp4`, pour permettre la lecture et la navigation dans le fichier.
- Mesure du rendu isolé sur le même trajet de 240 positions, qualité haute, 1 280 × 720 et caches préchauffés : moyenne **0,403 ms avant**, **0,452 ms après** ; P95 **0,6 ms avant**, **0,7 ms après**. La composition comporte davantage de couches ; ce contrôle ne démontre pas un gain de FPS, ne mesure pas le GPU et ne remplace pas l'essai d'une partie multijoueur sur le PC du créateur.
- Les **16 fichiers publics** correspondent aux empreintes publiées, y compris les fichiers binaires. Santé publique OK, PostgreSQL prêt, service actif, même processus et aucun redémarrage automatique.
- Le client public charge jusqu'à son écran de connexion sans erreur console après publication ; aucun compte n'a été connecté pour ce contrôle.
- L'onglet du compte multijoueur n'était pas disponible dans les navigateurs connectés. Aucune vérification d'une partie connectée n'est revendiquée pour cette passe.

## Aperçus et publication

Page publique, avec vidéo et captures : [Helion-01 : profondeur et parallaxe](https://avosoma.absyrion.com/assets/maps/previews/helion01-depth1/index.html).

Les captures et le film sont conservés dans `output/helion01-assets/2026-10-18/`. Le fichier MP4 fait **5 275 443 octets**. Les images publiques et le film de démonstration ne sont pas référencés par le cache du jeu et ne se chargent pas pendant une partie.

La publication porte sur dix fichiers JavaScript/HTML du client, le nouvel asset PNG, et cinq fichiers de démonstration. La version précédente a été comparée avant remplacement, les copies sont atomiques et l'index du jeu est installé en dernier. Le serveur n'a pas été redémarré.

- Sauvegarde serveur : `/opt/avosoma-backups/helion-depth-20261018`.
- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-helion-depth-before`.
- Archive, manifeste, différences ciblées, tests, mesures, contrôles, images extraites du film et outil de retour arrière : `tmp/helion-depth-release/` ; copie de publication sous `/tmp/avosoma-helion-depth-20261018` sur le serveur.

Cette révision reste limitée à Helion-01 et conserve la version précédente pour un retour arrière ciblé si nécessaire.
