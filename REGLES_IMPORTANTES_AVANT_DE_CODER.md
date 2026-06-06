# Regles importantes avant de coder

Ce fichier est obligatoire a lire avant de modifier le projet VoidSector.

Objectif : eviter de recreer des fichiers fourre-tout. Le projet a ete decoupe volontairement en petits modules par domaine pour rester lisible, maintenable et compatible MMO.

## Regle principale

Ne pas remettre de grosse logique dans un fichier facade.

Une facade sert a composer ou re-exporter les fonctions publiques historiques. Si une nouvelle logique ne rentre pas clairement dans le role du fichier, creer ou utiliser un module de domaine.

Exemples de facades :

- `src/core/store.js`
- `src/core/refineryStore.js`
- `src/core/questStore.js`
- `server/src/economy/refinery.js`
- `server/src/quests/quests.js`
- `server/src/index.js`

Ces fichiers doivent rester courts et lisibles.

## Ou mettre le code client

- Catalogue, getters simples : `src/core/catalogStore.js`
- Orientation visuelle commune des monstres et de leurs icones : `src/data/enemyVisuals.js`
- Monnaie locale legacy : `src/core/currencyStore.js`
- XP / points de competence : `src/core/xpStore.js`
- Graphismes : `src/core/graphicsStore.js`
- Progression portails / prestige : `src/core/portalProgressStore.js`
- Normalisation sauvegarde locale : `src/core/stateNormalizer.js`
- Stats combat / equipements actifs : `src/core/combatStatsStore.js`
- Quetes :
  - evenements de progression : `src/core/questStore.js`
  - progression / acceptation : `src/core/questProgressStore.js`
  - matchers d'objectifs : `src/core/questObjectiveMatchers.js`
  - echecs : `src/core/questFailureStore.js`
  - rewards / claim legacy : `src/core/questRewardStore.js`
- Raffinerie :
  - facade / production : `src/core/refineryStore.js`
  - regles pures : `src/core/refineryRules.js`
  - etat / niveaux : `src/core/refineryStateStore.js`
  - upgrades : `src/core/refineryUpgradeStore.js`
  - expeditions / craft soute : `src/core/refineryShipmentStore.js`

## Ou mettre le code serveur

- Quetes serveur :
  - facade publique : `server/src/quests/quests.js`
  - etat / progression : `server/src/quests/questState.js`
  - matchers : `server/src/quests/questMatchers.js`
  - rewards / claim : `server/src/quests/questRewards.js`
- Raffinerie serveur :
  - facade publique : `server/src/economy/refinery.js`
  - regles pures : `server/src/economy/refineryRules.js`
  - acces profil / cargo / soute : `server/src/economy/refineryProfile.js`
  - upgrades : `server/src/economy/refineryUpgrades.js`
  - jobs simples : `server/src/economy/refineryJobs.js`
  - production : `server/src/economy/refineryProduction.js`
  - expeditions / craft soute : `server/src/economy/refineryShipments.js`

## Quand creer un nouveau fichier

Creer un nouveau fichier si :

- le fichier actuel commence a depasser son role ;
- la nouvelle logique fait plus qu'un petit branchement ;
- le code appartient a un sous-domaine clair ;
- le changement ajoute une responsabilite serveur MMO sensible ;
- le meme bloc pourrait devoir etre teste ou relu seul.

Ne pas creer un nouveau fichier si :

- c'est un simple import/export ;
- c'est une ligne de glue dans une facade ;
- la logique appartient deja clairement a un module existant.

## Regles MMO

- Le serveur doit rester l'autorite pour les donnees critiques : credits, NOVA, XP, items, munitions, portails, competences, prestige, quetes, raffinerie, rewards.
- Le client peut garder du legacy/local tant que la migration n'est pas terminee, mais il ne doit pas devenir la source de verite MMO.
- Si une feature touche le MMO, verifier le client ET le serveur.
- Ne pas supprimer le mode local legacy sans demande explicite.

## Regles de verification

Apres chaque extraction ou changement sensible :

- lancer `node --check` sur les fichiers modifies ;
- si possible lancer le check complet client ou serveur ;
- faire un smoke test d'import si le fichier est une facade ou utilise des imports circulaires ;
- mettre a jour `MMO_REFACTOR_NOTES.md` si l'architecture change.

## Fichiers a lire avant de coder

Avant de modifier une feature MMO ou l'architecture :

1. `MMO_100_PERCENT_PLAN.md`
2. `MMO_REFACTOR_NOTES.md`
3. `REGLES_IMPORTANTES_AVANT_DE_CODER.md`

Si ces fichiers contredisent une intuition rapide, suivre les fichiers et inspecter le code avant de modifier.

Pour les sujets plateforme, site public, compte global, support, paiements ou futur portail Absyrion, lire aussi :

- `ABSYRION_PLATFORM_PLAN.md`
