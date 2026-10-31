# Coup fatal et propositions de boucliers — 24 octobre 2026

Le correctif `20261024-shield-lethal1` est publié à 20 h 41 (Paris). Ce document décrit les trois propositions initiales. Choix suivant du créateur, publié à 21 h 01 : maillage hexagonal pour notre vaisseau et membrane réfractive pour les ennemis. Voir `VFX_BOUCLIERS_ATTRIBUTION_2026-10-24.md`.

## Coup fatal publié

Un coup qui tue le monstre ne crée aucune réaction de bouclier, même si le monstre possédait encore une protection. Pour les lasers instantanés, le tir vise directement le corps dans ce cas. Un effet de bouclier précédemment en attente n'est plus dessiné si sa cible est morte. Le X6 B reste une salve de quatre impulsions ; les X1–X4 gardent leur vitesse et leur double passage.

Le serveur transmet `targetDestroyed` à partir des règles réelles d'absorption. `wouldEnemyHitKill` appelle la fonction existante `applyDamageToEnemy` sur une copie isolée de l'ennemi, sans modifier sa vie ni son bouclier. L'ordre existant d'émission du coup, d'application des dégâts et de récompense est conservé. Pour un projectile avec trajet, le verdict est réévalué au moment réel du coup. Le client ne crée pas de réaction pour ce verdict, y compris si l'ennemi n'est déjà plus dans la scène.

Le lot ne comporte que cinq fichiers : `server/src/combat/enemyHits.js`, `src/game/systems/combatEnemyImpacts.js`, `src/game/render/enemyWeaponImpact.js`, `src/game/systems/combatRemoteWeaponEvents.js` et les alias nécessaires d'`index.html`. Il conserve 526 fichiers du runtime hors correctif. Les autres publications récentes, notamment les dégâts, Helion-03 et les clés de portail, sont reprises depuis le serveur courant sans copie globale du workspace.

Validation : 122 tests réussis sur le candidat issu de la production ; archive et syntaxe vérifiées dans le staging ; sauvegarde `/opt/avosoma-backups/20261024-shield-lethal1` ; cinq fichiers installés et quatre fichiers publics vérifiés par SHA-256. Service actif, PID `1365246`, `NRestarts=0`, PostgreSQL sain, aucune nouvelle erreur pertinente. Une sonde des modules installés vérifie le verdict fatal, la cible absente, le point de contact du faisceau et la suppression d'un effet en attente sur une cible morte. Cette sonde utilise des objets isolés et ne modifie aucun compte ou monstre réel. Aucun duel MMO authentifié n'est revendiqué.

## Trois propositions locales

Ouvrir `/tools/vfx-lab/shields.html?revision=shield-proposals-3`.

- A — Membrane réfractive : peau d'énergie translucide, déformation souple au contact, reflet blanc et ondes qui glissent sur la surface.
- B — Maillage hexagonal : les cellules proches de l'impact s'allument, puis la réaction se propage dans le réseau.
- C — Champ magnétique : plusieurs lignes de force et des points lumineux conduisent l'énergie vers les côtés de la protection.

Les trois propositions sont synchronisées, avec les lasers réels X1, X4 et X6 B ; les salves sont espacées pour comparer la réaction. Les cibles proposées sont l'Orbe, le Vorak et le Parasite. Le sélecteur « Détruit en un coup » utilise le même traitement client des coups fatals et ne crée aucun effet de bouclier. « Arrêt sur l'impact », le ralenti et « Rejouer » facilitent la comparaison. Entre les coups, les protections disparaissent entièrement.

Les propositions sont des dessins Canvas natifs, sans nouvel asset raster. `shieldVariants.js` contient uniquement les trois rendus stateless ; `shieldPreviewScene.js` compose le même système de faisceaux et de réception d'impacts que le jeu, dans un état isolé ; `shields.js` orchestre les commandes et les trois vues. Deux tests de cette scène vérifient le coup fatal et les salves, en plus des tests du runtime. Ces fichiers et l'atelier sont exclus du lot publié.

Contrôles visuels : trois styles avec Orbe/X6 B, Parasite/X4 et coup fatal ; disparition entre les coups ; aucune erreur de console sur la version finale. Les imports sont versionnés pour éviter de comparer un ancien module X6 resté en cache.

Preuves techniques : `output/vfx-shield-variants-2026-10-24/release/`. Captures de comparaison, coup fatal et Parasite dans le dossier de visualisation de ce chat.
