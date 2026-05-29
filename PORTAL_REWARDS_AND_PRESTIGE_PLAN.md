# VoidSector - Portails, recompenses, prestige et reste a faire

Ce document sert de pense-bete pour la premiere boucle de progression.

## Deja implemente

- Commande de test `window.voidsectorDev.maxTest()` pour donner les ressources, portails, raffinage, niveaux et points de competence.
- Correction equipement drone : drag and drop et double-clic fonctionnent pour les lasers/generateurs autorises.
- Les generateurs de vitesse sont bloques sur les drones.
- Prix des competences mis a jour par paliers.
- Les competences se debloquent par colonnes : il faut finir les 3 competences de la colonne precedente.
- Les colonnes de competences demandent aussi les portails termines, pas seulement deverrouilles.
- Messages de prerequis visibles sur les competences bloquees.
- Recompenses principales des portails ajoutees.
- Noyau Overdrive Drone ajoute : application permanente sur drone de combat, drone rouge, +50% degats des lasers du drone.
- Cap niveau 50 avant portail ancestral, cap niveau 100 apres.
- Systeme de prestige de premiere boucle pose : portail ancestral termine, niveau 50, competences max.
- Documentation des portails et de la boucle prestige.

## Recompenses de portails

| Portail | Recompenses | Deblocage |
| --- | --- | --- |
| Bleu | 20 000 NOVA, 20 000 munitions x4, Laser MK-IV garanti au premier clear puis 50% | Acces aux premieres competences |
| Violet | 35 000 NOVA, 35 000 munitions x4 | Acces aux futurs vaisseaux a competence |
| Rouge | 50 000 NOVA, 50 000 munitions x4, 50% Noyau Overdrive Drone | Suite des competences, amelioration drone rouge |
| Emeraude | 50 000 NOVA, 25 000 munitions x4, 33% Laser MK-IV | Acces aux ameliorations d'equipement |
| Neant | 60 000 NOVA, 30 000 munitions x4, 33% Laser MK-IV, 33% Noyau Overdrive Drone | Acces aux recettes |
| Ancestral | 100 000 NOVA, 10 000 munitions x6, drone ancestral garanti au premier clear puis 50% | Acces prestige, cap niveau 100, laser ancestral craftable |

## Noyau Overdrive Drone

- Objet obtenu via portails Rouge et Neant.
- Equipable uniquement sur les drones de combat achetes en magasin.
- Application permanente : une fois pose sur un drone, il ne peut plus etre retire.
- Le drone devient rouge.
- Les lasers equipes sur ce drone font +50% degats.
- Le bonus ne doit pas affecter les lasers du vaisseau ni les autres drones.

## Drone ancestral

- Recompense du Portail Ancestral.
- Premier clear : obtention garantie.
- Clears suivants : 50% de chance.
- Design prevu : drone special avec 2 emplacements au choix laser ou generateur.
- A terme, il pourra aussi etre obtenu via les recettes.

## Prestige

Conditions prevues :
- Portail Ancestral termine.
- Niveau 50 atteint.
- Toutes les competences de premiere boucle au maximum.

Effet prevu :
- Retour niveau 1.
- Competences conservees.
- Nouveau cap niveau 100.
- Deblocage de nouvelles competences plus puissantes pour la boucle suivante.

## Reste a faire prioritaire

- Integrer les images de boss generees dans `assets/enemies/`.
- Decouper la planche de boss si on garde une seule image source.
- Ajouter un boss coherent par portail :
  - Bleu : Gardien azur du seuil.
  - Violet : Archonte de la faille violette.
  - Rouge : Warlord ecarlate.
  - Emeraude : Matriarche emeraude.
  - Neant : Obelisque du Neant.
  - Ancestral : Colosse ancestral.
- Modifier les vagues de portail pour que le dernier combat utilise le boss du portail actif.
- Equilibrer PV, bouclier, degats, vitesse, portee et recompenses de chaque boss.
- Ajouter les futurs vaisseaux a competence en magasin, bloques tant que le portail Violet n'est pas termine.
- Creer le vrai drone ancestral avec 2 emplacements flexibles laser/generateur.
- Ajouter le bouton/onglet d'ameliorations apres portail Emeraude.
- Ajouter le systeme de recettes apres portail du Neant.
- Ajouter le laser ancestral craftable via recette.
- Ajouter les monstres et recompenses plus fortes pour soutenir la fin de premiere boucle.
- Verifier que la boucle complete peut viser environ 1 000 heures de jeu avec les prochains contenus.

## Reste a faire plus tard

- Ajouter les vaisseaux payables en NOVA avec sorts et plus de lasers.
- Ajouter de meilleurs lasers au-dessus du MK-IV.
- Ajouter les recettes de prestige.
- Ajouter les nouvelles competences post-prestige.
- Ajouter les ameliorations long terme pour taper plus fort, avoir plus de vie et pousser la progression.
- Prevoir la deuxieme boucle apres prestige : niveau 1 avec competences conservees, cap niveau 100, nouveaux objectifs.

## Assets boss generes

Une planche de 6 boss a ete generee ici :

`C:\Users\Ntmav\.codex\generated_images\019e5f17-f37a-7ff1-9053-0658594caa02\ig_024350c2ca6ca685016a14957536c881918e8f0e4e57558130.png`

Il reste a choisir si on l'utilise telle quelle comme reference ou si on decoupe chaque boss en sprite individuel.

## Recettes futures

- Le Portail du Neant debloque l'acces aux recettes.
- Les recettes serviront notamment a obtenir ou fabriquer :
  - le drone ancestral apres le premier deblocage,
  - le laser ancestral craftable,
  - de meilleurs lasers,
  - les ameliorations de progression.
