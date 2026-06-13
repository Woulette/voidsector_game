# Pipeline des assets de jeu

## Objectif

Garder des objets de boutique et des ressources dropables visuellement coherents avec les equipements realistes existants, sans charger inutilement le navigateur.

## Regle principale

- Creer un master raster transparent en `512x512`.
- Utiliser un derive `WebP 256x256` dans les boutiques, inventaires et fenetres de recompense.
- Utiliser un derive `WebP 128x128` pour les drops au sol et petites listes.
- Ne pas charger le master PNG en jeu.
- Garder les SVG pour les symboles simples, medailles et icones d'interface.

Un SVG tres detaille avec beaucoup de formes, filtres et degradés n'est pas automatiquement plus performant qu'un petit WebP.

## Budget recommande

| Usage | Format | Dimension | Budget cible |
| --- | --- | ---: | ---: |
| Source de travail | PNG avec alpha | 512x512 | pas de limite runtime |
| Boutique / inventaire | WebP avec alpha | 256x256 | moins de 40 Ko |
| Drop au sol / petite icone | WebP avec alpha | 128x128 | moins de 12 Ko |
| Projectile anime | PNG/WebP avec alpha | dimension utile | moins de 40 Ko |

Le navigateur decode chaque image en memoire selon sa surface, pas selon son poids compresse sur disque. Un `256x256` RGBA decode represente environ `256 Ko`; un `512x512` represente environ `1 Mo`.

## Prototype valide techniquement

Prototype : cables de cuivre industriels.

| Fichier | Usage | Poids mesure |
| --- | --- | ---: |
| `assets/resources/common/prototypes/copper_cables_512.png` | master transparent | 251,9 Ko |
| `assets/resources/common/prototypes/copper_cables_256.webp` | boutique / inventaire | 16,9 Ko |
| `assets/resources/common/prototypes/copper_cables_128.webp` | drop au sol | 5,8 Ko |

Le `WebP 256` est environ 15 fois plus leger que le master PNG tout en gardant un rendu propre pour l'interface.

## Gamme commune produite

Les huit ressources communes disposent maintenant de leurs masters et derives optimises :

- `copper_cables` : cables de cuivre ;
- `steel_plates` : plaques d'acier ;
- `insulating_polymer` : polymere isolant ;
- `printed_circuits` : circuits imprimes ;
- `ceramic_capacitors` : condensateurs ceramiques ;
- `optical_lenses` : lentilles optiques ;
- `propellant_powder` : poudre propulsive ;
- `pressurized_tanks` : reservoirs pressurises.

Planche de validation : `assets/resources/common/preview.html`.

Les fichiers directement places dans `assets/resources/common/` sont les derives destines au jeu. Les masters `512x512` sont conserves dans `assets/resources/common/masters/`.

## Gammes Rare a Mythique produites

Les ressources de firme avancees suivent la meme regle : un objet unique lisible, master `512x512`, derive boutique `256x256` et derive drop `128x128`.

- Rare : `assets/resources/rare/` ;
- Tres rare : `assets/resources/veryRare/` ;
- Elite : `assets/resources/elite/` ;
- Mythique : `assets/resources/mythic/`.

Chaque rarete contient 8 ressources craftables et ses masters dans `masters/`. Les previews de controle sont :

- `assets/resources/rare/preview.png` ;
- `assets/resources/veryRare/preview.png` ;
- `assets/resources/elite/preview.png` ;
- `assets/resources/mythic/preview.png` ;
- `assets/resources/preview_all_v2.png`.

Les derivees `*_drop.webp` sont celles utilisees par les drops serveur et l'animation de ramassage. Les assets sont volontairement separes par rarete pour garder des pools de drops et une boutique de firme faciles a verifier.

## Organisation cible

```text
assets/resources/common/
  copper_cables.webp
  copper_cables_drop.webp
  steel_plates.webp
  steel_plates_drop.webp
```

Les masters de production peuvent etre conserves dans un dossier non reference par le jeu ou dans les fichiers de travail du projet.

## Chargement

- Referencer le `WebP 256` dans les catalogues et recettes.
- Utiliser le `WebP 128` dans le rendu des drops.
- Laisser le navigateur mettre en cache chaque URL unique.
- Eviter de creer une copie differente du meme asset pour chaque quantite.
- Afficher la quantite avec du texte UI au-dessus de l'asset.

## Direction visuelle des ressources communes

- objet unique centre et lisible a `64x64` ;
- vue trois-quarts coherente avec les lasers et generateurs ;
- materiaux realistes et silhouette claire ;
- petites lumieres cyan possibles, mais discretes ;
- aucun texte directement dans l'image ;
- aucun fond, aucune ombre portee et aucun cadre integre ;
- la rarete est affichee par l'interface, pas peinte sur l'objet commun.
