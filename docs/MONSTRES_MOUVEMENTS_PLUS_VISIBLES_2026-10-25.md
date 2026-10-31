# Mouvements des monstres plus visibles — 25 octobre 2026

**Suite : version validée et publiée le 25 octobre à 20 h 21 (Paris), lot `20261025-enemy-motion1`.** Voir [le rapport de publication](MONSTRES_MOUVEMENTS_PUBLICATION_2026-10-25.md). Le texte ci-dessous conserve l’état de la préparation locale.

Le joueur revient sur la discrétion des animations de locomotion et demande d’agrandir le Parasite de 12 à 15 % et le Traqueur de 10 à 12 %. Retouche locale : **Parasite +15 % et Traqueur +12 %**, communs et boss pour garder leur hiérarchie. Aucun déploiement dans cette étape ; la production reste sur le lot Éclanite `20261025-eclanite-visual1` précédemment publié.

## Taille et locomotion

Les facteurs de dessin passent de `.94` à `.94 × 1.15` pour les deux Parasites et `.94 × 1.12` pour les deux Traqueurs. Les dimensions et rayons du catalogue restent inchangés. Le sillage du Traqueur prend ce même facteur pour garder ses points d’émission attachés au modèle, sans changer sa densité ou sa durée.

`render/enemyLocomotion.js` contient une enveloppe cosmétique commune : elle suit la puissance issue des positions réelles et se détend à l’arrêt, indépendamment du nombre d’images par seconde. Elle anime les membres, sans modifier les positions, les orientations autoritaires ou le délai de poursuite.

- **Parasites** : balayages, courbures et étirements plus amples, six activités indépendantes conservées. Une marge de 64 pixels sur les textures de pose évite de couper les pointes sorties du cadre initial ; le noyau et la carapace gardent leur gabarit de dessin prévu.
- **Traqueurs** : plus grand débattement des six appendices, phases stables indépendantes de la puissance instantanée et racines fixées. Les régions d’influence sont mélangées progressivement, au lieu de changer brutalement de membre sur une ligne du maillage. Un masque distinct suit les pattes arrière et conserve le centre rigide. Les arcs restent attachés aux positions déformées.
- **Voraks** : débattement des deux ailes plus lisible avec des rythmes légèrement différents. La phase ne multiplie pas le temps écoulé par une puissance variable, ce qui évite les changements brusques de pose en accélération. Le canon, les lumières, les tirs et la coque restent conservés.
- **Orbes** : oscillations propres et extension des branches renforcées pendant le déplacement. Le noyau, la rotation de base lente et ses relances restent conservés.
- **Éclanite** : déplacements radiaux, flottement et torsion des six fragments renforcés en mouvement. La pose de repos reste identique ; le noyau ne tourne pas.

## Comparaison réelle dans l’atelier

`tools/vfx-lab/locomotionBefore/` garde dix-neuf modules/profils figés avant cette retouche. Les références réécrivent leurs imports vers cette copie, pour que la colonne gauche conserve réellement les animations et tailles publiées. La droite utilise les nouveaux modules partagés du jeu. Les deux colonnes affichent le même monstre, commun ou boss, avec le même déplacement et le même temps de démonstration.

Les anciennes comparaisons commun/boss et les fixtures antérieures du Parasite ne remplacent pas cette référence pendant ce contrôle. Le libellé indique explicitement « avant · publié » à gauche et « mouvements renforcés » à droite. Le texte précise que cette retouche n’est pas publiée.

Aperçus :

- Parasite : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=chasseur_spectral&scenario=patrol&view=macro&revision=locomotion-2`
- Traqueur : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=cuirasse_nebulaire&scenario=patrol&view=macro&revision=locomotion-2`

## Vérifications

**211 tests réussis**, seize contrôles de syntaxe, et treize empreintes de données/règles/effets préservées : catalogue, orientation, poursuite et attaques serveur, réacteurs du joueur, projectiles, impacts, boucliers et les sillages non concernés. Les coups, leur fréquence, les dommages et la bombe du Traqueur restent identiques.

Les mesures sur trente secondes de mouvement, hors augmentation de taille, donnent les rapports de débattement suivants par rapport à la référence :

| Animation mesurée | Rapport |
| --- | --- |
| Tentacules du Parasite | ×1,98 à ×2,02 |
| Appendices du Traqueur | ×1,95 à ×2,72 |
| Flottement des fragments de l’Éclanite | ×2,36 à ×2,49 |
| Articulation des branches de l’Orbe, hors rotation de base | ×4,63 à ×4,66 |
| Débattement angulaire des ailes du Vorak | ×7,56, depuis une animation initialement très faible |

Ces valeurs mesurent l’amplitude et ne représentent pas une augmentation de vitesse de déplacement ou de taille globale. Les gains de taille du Parasite et du Traqueur s’ajoutent à la différence visuelle des membres.

Les tests vérifient notamment les racines fixes, les poses de repos, les pulses réels, les objets autoritaires figés, l’enveloppe à 30/60/120/144/240 Hz, les arrêts et les téléportations. Les contrôles de triangles des Parasites restent valides. La nouvelle vérification du Traqueur balaie les cellules réellement opaques de ses deux sources et les phases de tir, sans inversion du maillage. Les empreintes des PNG sont liées à ces cellules dans la fixture de test.

Contrôle navigateur des cinq familles et de leurs variantes boss, avec comparaisons en taille normale et ×3 ; aucun avertissement ou erreur console. Le boss Parasite peut dépasser le cadre d’un gros plan ×3, ce qui relève du cadrage, et ses membres ne sont plus coupés par la texture de pose. Aucune nouvelle illustration générée.

Preuves dans `output/enemy-locomotion-2026-10-25/` : `validation.json`, `full-tests.txt`, `guards-before.json`, `guards-after.json`, `baseline-manifest.json`, `modified-runtime-files.json`, `excursion-metrics.json`, `geometry-check.json`, `opaque-geometry.json`, `browser-warnings.json` et les captures par famille. Les fichiers `before/` conservent les sources de départ.
