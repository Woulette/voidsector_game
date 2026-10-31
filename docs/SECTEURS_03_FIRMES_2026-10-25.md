# Secteurs 03 des firmes — alignement du 25 octobre 2026

## État actuel

Correction locale contrôlée, sans déploiement. L’aperçu `aligned3` remplace `native4` et les propositions précédentes. Dernière consigne : conserver le style des nouvelles planètes, adapter Helion en rouge, puis partager les dimensions, les silhouettes et la poche violette d’Helion entre les quatre firmes.

## Matériaux et composition

La planète master est `assets/maps/decor/sector03-aligned-v3/shattered-planet.png`, 1536 × 1024 RGBA. ImageGen intégré a réalisé sa version rouge à partir de la nouvelle planète Nereid. Les quatre planètes utilisent ensuite ce même master avec le cache de matériaux du jeu : aucun décalage de silhouette entre des générations indépendantes. La couche reste à 360 × 240, position apparente (54, −66) au centre, parallaxe 0,09, sans miroir.

Les structures, astéroïdes, cristaux et fragments reprennent les sources exactes d’Helion. Le cache convertit uniquement les couleurs chaudes vers le cyan, l’or ou l’émeraude. Les pixels neutres, les reflets violets et l’alpha sont conservés. La structure garde 420 × 280, position apparente (−490, −154), rotation −0,08 et parallaxe 0,22. Les variantes SVG des quatre grandes étoiles partagent tous leurs tracés, tailles et opacités.

Les anciens PNG indépendants dans `sector03-firms-v2` sont conservés comme sources d’itération, mais ne sont plus utilisés par le catalogue, à l’exception des trois SVG d’étoiles.

Les 229 couches de décor de chaque variante correspondent à celles d’Helion : dimensions, positions, rotations, cadrages d’atlas, opacités, filtres, profondeur et réglages de fondu. Les étoiles procédurales ordinaires restent produites par le moteur existant ; les captures complètes ne doivent pas être présentées comme des images RGB identiques.

## Poche violette

La teinte violette appliquée auparavant à tout le nuage principal (`mapPalette=eclanite`) a été retirée. Le nuage reprend la couleur de la firme et l’émission commune utilise le PNG original `helion03-ruins-v1/violet-gas.png`, sans redimensionnement différent ni nouveau halo.

Le matériau du seul nuage principal porte `mapPocket=helion03`. Dans l’ellipse originale (x 0,57 ; y 0,51 ; rx 0,36 ; ry 0,29), il conserve progressivement la lumière de la source sous l’émission violette. Cela évite de transformer ce cœur en bleu ou en vert par mélange. La conservation de couleur est nulle hors de cette ellipse. Les autres nuages, les secteurs 01/02 et les autres matériaux n’utilisent pas cette option. Traitement une fois au chargement, jamais dans la boucle de rendu.

Le PNG d’émission, sa géométrie, son alpha, son mélange screen, sa pulsation et les lumières d’Éclanite restent ceux d’Helion. La perception des bords dépend naturellement de la couleur du fond environnant.

## Mini-cartes et intégration

Les quatre `assets/maps/minimaps/*-03-aligned-v3.png` sont des exports 1200 × 540 du renderer de mini-carte réel, sans marqueurs. Même placement fixe de planète, nébuleuse et poussière ; aucune dépendance à la caméra.

Le catalogue et la factory restent limités aux couples 22/Nereid-03, 32/Aureon-03 et 42/Sylva-03. Helion change uniquement de source de planète et d’atlas de mini-carte. Les portails, dimensions jouables, ennemis, quêtes et autres données MMO sont conservés. Aucun changement de serveur, de moteur world.js ou de mapScenerySky.js.

## Vérifications

- 47 tests ciblés réussis : secteurs 01/02/03, gameplay conservé, palettes, poche locale, streaming borné à trois cartes, mini-cartes fixes, parallaxes et fondu hors carte.
- Audit dans le navigateur du cache réellement préparé : 229 couches par variante, 12 textures uniques par variante, **0 différence d’alpha et 0 différence de géométrie** par rapport à Helion.
- Boîte visible de la planète à alpha ≥ 128 : (210,55)–(1533,977), identique sur les quatre variantes. Structure : (84,53)–(1486,971). Émission violette : (479,461)–(954,829).
- Vues finales des quatre firmes à caméra (0,0), zoom 65 %. Contrôle rapproché de la structure à 120 %. Déplacement de 1000 unités : déplacement de la planète de 90 unités de rendu.
- Contrôle hors carte Nereid : décor noir, vaisseau et interface visibles. Console sans erreur ni avertissement. Tests de fondu couvrant les quatre côtés et les coins.
- Aucun test de session MMO authentifiée ni déploiement revendiqué.

## Aperçus et preuves

Aperçu interactif :
http://127.0.0.1:8765/assets/maps/previews/sector03-firms2/index.html?sector=22&view=centre&zoom=.65&v=aligned3

Comparaison :
http://127.0.0.1:8765/output/sector03-alignment-20261025/comparison.html

Dossier `output/sector03-alignment-20261025/` :
- `planet-generation.json` : outil intégré ImageGen, prompt exact, entrée, sortie originale et fichier installé.
- `pixel-qa.json` : résultats détaillés des pixels et des dimensions réelles.
- `runtime-manifest.json` : sources actives et empreintes.
- `*-final.png`, `nereid-ruin-120.png`, `nereid-outside.png` : captures vérifiées.
- `before/` : état précédent des fichiers concernés avant cette correction.

## Publication ultérieure

Reprendre un instantané frais de production et intégrer seulement ce lot : nouveau master de planète, catalogue partagé, sélection de matériau du nuage principal, préparation de palette localisée, quatre atlas, factory déjà raccordée et alias associés. Les trois SVG d’étoiles restent nécessaires. Ne pas livrer la palette globale violette ni les PNG indépendants désactivés. Préserver les autres travaux concurrents et ne pas envoyer le workspace entier.
