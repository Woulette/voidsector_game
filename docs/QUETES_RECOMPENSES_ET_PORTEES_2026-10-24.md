# Récompenses de quête et portées des mobs — 24 octobre 2026

## Publication en ligne — 20261024-quest-ranges1

Publié le 24 octobre 2026 sur `https://avosoma.absyrion.com`. Le lot contient uniquement cinq fichiers : définitions des mobs serveur et Deadly, catalogue client des mobs, listener de profil client et index avec trois alias de cache ciblés. La refonte Azuron encore locale reste hors du lot.

Le candidat est construit depuis un instantané frais des 489 fichiers du runtime public, puis reçoit seulement les modifications autorisées. Validation : 319 tests réussis ; trois assertions propres à la future refonte Azuron sont exclues explicitement du candidat public (calendrier de 30 vagues et indices de mouvement, absents du runtime de production conservé). Les 20 types de mobs sont vérifiés à la portée exacte et une unité au-delà, ainsi que les 46 entrées de portail avant/après.

Publication serveur puis frontend, index en dernier. Redémarrage effectué : PID `4125505` → `928637`, service actif avec `NRestarts=0`, PostgreSQL sain, aucune persistance en attente et aucun nouveau journal d'erreur. Les cinq empreintes serveur correspondent au manifeste ; les trois fichiers frontend accessibles publiquement répondent HTTP 200 avec les empreintes attendues.

Sauvegarde de retour arrière : `/opt/avosoma-backups/20261024-quest-ranges1-112738`. Preuves : `output/quest-ranges-release-2026-10-24/manifest.json`, `candidate-tests-report.json`, `candidate-tests-selection.json`, `deployment-result.json`, `public-verification.json` et `live-behavior-verification.json`.

## Nouveaux réglages demandés — publiés

Les deux tableaux utilisateur sont appliqués côté client et serveur et publiés en ligne dans la version `20261024-quest-ranges1`. Les tableaux des sections suivantes restent le relevé historique du serveur avant cette modification.

| Mob | Nouvelle portée de tir |
|---|---:|
| Orbe sentinelle et son boss | 220 |
| Vorak rusher et son boss | 200 |
| Parasite astral et son boss | 260 |
| Pondeuse astrale | 290 |
| Traqueur abyssal et son boss | 270 |
| Cuirasse ambre et son boss | 250 |
| Éclanite | 250 |
| Cristanite | 270 |
| Astranite | 280 |
| Deadly — Éclaireur | 260 |
| Deadly — Intercepteur, Gardien et Traqueur | 270 |
| Deadly — Ravageur | 280 |
| Deadly — Amiral K-137 | 300 |

Les autres valeurs spécifiques de portail restent exactement celles du tableau utilisateur : tourelle de Vesper 620, drone géant 500, boss d'Éclanite et Kharon 450, gardiens prismatiques 400, boss prismatiques 450, ennemis des Précurseurs 460/480/500/440, Dévoreur de Nox 300, explosion du kamikaze de rayon 150.

Les variantes ordinaires des portails héritent des nouvelles portées de leur type. La détection des secteurs reste à 936 unités. Le placement explicitement configuré d'Azuron à 150–160 unités est préparé localement dans `pursuit.js` pour la refonte Azuron encore non publiée ; le présent lot conserve le runtime Azuron et la poursuite actuellement en ligne. Les formations ordinaires se rapprochent selon les nouvelles portées.

Validation comportementale : les 14 types de secteur et les 6 types Deadly tirent à la distance maximale autorisée et ne tirent pas une unité au-delà ; les créations monde, portails génériques/Alpha et Azuron héritent des valeurs attendues. Les 46 entrées du relevé sont comparées avant/après pour vérifier les valeurs demandées et la conservation des boss spéciaux. Preuves et résultat des tests : `output/enemy-ranges-balance-2026-10-24/verification.json` et `tests.log`.

## Récompenses : bug reproduit et correctif publié

Le serveur envoie le bilan du monstre (`player:reward`), puis la récompense de quête (`quest:claimed`) et le profil complet actualisé (`profile:sync`). Le bilan du monstre reste en attente du prochain rendu, alors que le profil complet est appliqué immédiatement. Au rendu suivant, les anciens montants du monstre écrasaient les crédits, NOVA, XP et niveau reçus avec la quête. Le monstre suivant faisait réapparaître le total serveur correct.

Le correctif dans `src/multiplayer/playerSocketListeners.js` retire uniquement les anciens totaux de progression des récompenses déjà en attente lorsqu'un profil avec les données joueur arrive. Les événements sont conservés pour leurs popups et journaux. Les récompenses arrivant après ce profil continuent à mettre à jour les totaux.

Périmètre : le correctif client des récompenses a été publié avec les nouvelles portées dans la version `20261024-quest-ranges1`. Le fichier client avant correction et les modules concernés ont été comparés au code actuellement servi en ligne. Une sauvegarde du fichier modifié existe dans `C:/Users/Ntmav/.codex/backups/voidsector_game/20261024-quest-reward-sync-before/`.

Vérification : le test reproduit la régression avant correction (dont la disparition d'un gain de niveau), puis vérifie les deux ordres d'arrivée des événements, un achat faisant baisser le solde, un popup différé après changement de carte, plusieurs récompenses avant/après le profil, un profil sans données joueur, et la conservation des popups/journaux sans double gain. Résultat final : **200 tests réussis, 0 échec**. Voir `output/quest-reward-sync-2026-10-24/targeted-tests.log`.

## Lecture des portées

Valeurs en unités du monde, mesurées du centre du mob au centre de sa cible. Il s'agit de la distance maximale pour déclencher un tir ordinaire ; les capacités de zone peuvent avoir leur propre rayon.

Sur les secteurs, la détection utilise `max(780, portée de tir + 260) × 1,2`, soit **936 unités pour les 14 types de secteur actuels**. Orbe sentinelle et Vorak rusher, ainsi que leurs boss, attendent une attaque du joueur avant de tirer. La mémoire de poursuite standard est de 10 secondes. Les règles de ciblage spéciales des portails peuvent différer.

Les valeurs de tir et la formule de détection ont été lues sur le serveur actif. Les constructeurs d'ennemis ont aussi été exécutés sans persistance, en lecture seule, sur le serveur : les 46 entrées ci-dessous concordent avec le code local. Le module IA local contient des changements parallèles ; la formule et le contrôle de distance indiqués ici ont été vérifiés dans la version réellement déployée.

## Mobs de secteur

| Mob | Identifiant | Portée de tir |
|---|---|---:|
| Orbe sentinelle | `drone_pirate` | 300 |
| Vorak rusher | `raider_astral` | 250 |
| Parasite astral | `chasseur_spectral` | 300 |
| Pondeuse astrale | `pondeuse_astrale` | 350 |
| Traqueur abyssal | `cuirasse_nebulaire` | 300 |
| Cuirasse ambre | `cuirasse_ambre` | 350 |
| Eclanite | `eclanite` | 330 |
| Cristanite | `cristanite` | 350 |
| Astranite | `astranite` | 360 |
| Boss Orbe sentinelle | `boss_drone_pirate` | 300 |
| Boss Vorak rusher | `boss_raider_astral` | 250 |
| Boss Parasite astral | `boss_chasseur_spectral` | 300 |
| Boss Traqueur abyssal | `boss_cuirasse_nebulaire` | 300 |
| Boss Cuirasse ambre | `boss_cuirasse_ambre` | 350 |

## Ennemis des portails

Les variantes ordinaires d'Azuron, Vesper, Kharon, Nox et des vagues génériques héritent de la portée de leur type de secteur. Le boss Alpha générique conserve aussi la portée de son type. Les gardiens et boss spécifiques sont détaillés ci-dessous.

| Portail / rôle | Ennemi | Portée de tir |
|---|---|---:|
| Deadly / Ricky | Éclaireur | 300 |
| Deadly / Ricky | Intercepteur | 330 |
| Deadly / Ricky | Gardien | 330 |
| Deadly / Ricky | Traqueur | 330 |
| Deadly / Ricky | Ravageur | 280 |
| Deadly / Ricky | Amiral K-137 | 360 |
| Vesper - gardes | Traqueur abyssal | 300 |
| Vesper - gardes | Parasite astral | 300 |
| Vesper - gardes | Vorak rusher | 250 |
| Vesper | Tourelle de confinement | 620 |
| Vesper | Drone geant de Vesper | 500 |
| Precurseurs | Geôlier démoniaque | 460 |
| Precurseurs | Gardien immaculé du talisman | 480 |
| Precurseurs | Roi des Démons | 500 |
| Precurseurs | Légionnaire infernal | 440 |
| Prismatique | Gardien ancestral — PLANÈTE DE FEU | 400 |
| Prismatique | Gardien ancestral — PLANÈTE D’EAU | 400 |
| Prismatique | Gardien ancestral — PLANÈTE ROUGE CRISTALLINE | 400 |
| Prismatique | Ardent prismatique | 450 |
| Prismatique | Régent prismatique | 450 |
| Prismatique | Cryarque prismatique | 450 |
| Eclanite - gardes | Eclanite | 330 |
| Eclanite - gardes | Cristanite | 350 |
| Eclanite - boss | Gardien verdoyant d’Éclanite | 450 |
| Eclanite - gardes | Astranite | 360 |
| Eclanite - boss | Gardien écarlate d’Éclanite | 450 |
| Eclanite - boss | Gardien azur d’Éclanite | 450 |
| Kharon | Vesperion de Kharon | 450 |
| Kharon | Nyxaris de Kharon | 450 |
| Kharon | Asterion de Kharon | 450 |
| Nox | Dévoreur de station | 300 |
| Nox | Kamikaze de Nox | Pas de tir ; déclenchement à 80, explosion de rayon 150 |

Les cages, noyaux et planètes destructibles ne tirent pas. Les drones orbitant autour du boss de Vesper sont des éléments visuels ; le tir du boss a une portée de 500.

Preuves : `output/quest-reward-sync-2026-10-24/live-range-verification.json`, `live-enemy-ranges.json`, `tests-before.log` et `targeted-tests.log`.


