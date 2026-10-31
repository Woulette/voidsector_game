# PvP, réputation et malus — 23 octobre 2026

## Règles définies avec le créateur

- Détruire un allié commence à −1 000 de réputation. Chaque nouvelle élimination alliée sanctionnée double le précédent malus : −2 000, −4 000, −8 000, etc.
- Sept jours complets sans nouvelle infraction remettent le prochain malus à −1 000. Chaque infraction relance ce délai glissant. L'expiration ne rembourse pas la réputation perdue.
- Le compteur concerne tous les alliés détruits et reste lié au compte après reconnexion et redémarrage.
- La légitime défense ne donne ni malus ni récompense contre un allié. La riposte ne renverse pas le rôle de l'agresseur initial.
- La réputation peut être négative. Les gains suivants remboursent cette dette normalement, sans effacement automatique à zéro.
- Les éliminations alliées ne donnent aucun point de firme, objectif PvP ou compteur de kills récompensés.

| Réputation actuelle | Majoration du MAGASIN et des achats en partie |
| --- | --- |
| Supérieure à −10 000 | 0 % |
| De −10 000 à −99 999 | +10 % |
| De −100 000 à −199 999 | +20 % |
| De −200 000 à −299 999 | +30 % |
| De −300 000 à −399 999 | +40 % |
| −400 000 ou moins | +50 %, plafond |

La majoration touche les achats en crédits/NOVA du MAGASIN et les munitions achetées en partie. La boutique de firme en firmatons, les paiements réels, la fabrication et les autres dépenses restent hors de ce barème, selon la réponse utilisateur. La remise Premium existante se calcule aussi sur les prix majorés ; affichage et débit utilisent les mêmes règles.

À −500 000 ou moins, le joueur devient une **CIBLE**, visible par les autres pilotes. Un allié peut le détruire sans malus et sans récompense. Le statut disparaît lorsque la réputation repasse au-dessus de −500 000. L'Ascension ne permet pas de rendre une cible intouchable en revenant sous le niveau 10 ; elle peut également riposter en légitime défense. Les zones de non-agression et la séparation des instances restent contrôlées par le serveur.

Pour une même cible ennemie, par journée UTC existante et par paire de comptes :

1. Éliminations 1 à 5 : 100 points de firme et réputation complète.
2. Éliminations 6 à 10 : 5 points de firme et 5 % de réputation.
3. À partir de la onzième : aucun gain supplémentaire, objectif ou compteur de kill récompensé.

Les points de firme conservent leur propriétaire du premier tir valide. Le compteur de réputation du pilote qui termine la cible est aussi contrôlé lorsque ce propriétaire est différent. Deux sockets du même compte ne consomment qu'une tentative ; changer de socket ou alterner les propriétaires du premier tir ne remet pas le suivi à zéro. Aucune sanction rétroactive n'est inventée pour les anciens combats.

## Réalisation

- `src/shared/reputation.js` : réputation signée, doublement, délai glissant, paliers et statut cible.
- `src/shared/shopPricing.js`, `src/core/shopPricingStore.js`, `server/src/economy/shopPayment.js` : calcul commun des prix limité aux achats concernés.
- `server/src/combat/pvpDiscipline.js` : agresseur/victime par compte et droit de riposte pendant le combat (15 secondes depuis le dernier tir accepté, renouvelées par les échanges).
- `server/src/combat/playerPvpRewards.js` : règlement unique par vie, contrôle des firmes, malus, sauvegarde avant confirmation et récompenses ennemies.
- `server/src/firms/firmPvp.js` et `firmWar.js` : compteur quotidien persistant et arrêt des progressions après dix éliminations récompensées.
- Normalisation, gains d'XP, profils publics, administration et client conservent les valeurs négatives. Les deux champs de récidive sont protégés de `profile:save`.
- Le serveur publie le statut CIBLE ; le client ajoute ce libellé et explique les sanctions et la majoration. Il ne décide ni des prix ni des exceptions de combat.

Les droits de riposte prennent fin à la mort ou à l'expiration du combat. Le compteur de récidive de sept jours est persistant. Les nombres restent dans les entiers représentables sans perte de précision en JavaScript.

## Vérifications

Pièces : `output/pvp-discipline-2026-10-23/`.

- Tests ciblés : délai exact, doublement, dette, paliers, statut cible, légitime défense, échec de sauvegarde, double règlement, achats, devis drones, limite de dix ennemis et doubles sockets.
- Serveur isolé et vrais clients Socket.IO : −1 000/−2 000/−4 000, puis après redémarrage −8 000/−16 000/−32 000 ; légitime défense et cible alliée sans gain ni malus ; achat à 11 000 crédits réellement débité à 11 000.
- Navigateur sur compte jetable local à −500 000 : M-1 à 15 000 crédits, débit de 15 000 et 1 000 munitions reçues ; dette et achat conservés après reconnexion. Capture `magasin-majoration-50.png`, aucune erreur console.
- Validation finale : **1 382/1 382 tests serveur**, **40/40 tests client**, **122/122 tests ciblés sur une copie Linux du runtime public**. Le démarrage réel de la phase serveur, avant installation du client, est également vérifié.

## Publication

Version `20261023-pvp3`, publiée le 23 octobre 2026 à **13:46:23 Europe/Paris**. Trente fichiers installés vérifiés, dont quatorze fichiers client comparés aux réponses HTTPS publiques. Service `avosoma-beta.service` actif, PID `3768128`, `NRestarts=0`, PostgreSQL prêt et aucun nouvel échec dans les journaux de ce PID. Le navigateur public charge sans erreur console.

Sauvegarde du code : `/opt/avosoma-backups/20261023-pvp3`. Sauvegarde privée des profils : `/opt/avosoma-account-backups/20261023-pvp3.json`, mode 0600. Aucune session de portail récente au redémarrage et aucune réputation négative historique à migrer. Aucun compte de production réinitialisé. Archive SHA-256 : `443bbc45bc2e3fb60d29b17674b22ae78520b4bcca47506fdbb006d0c723c51a`.

La tentative `pvp1` a été annulée automatiquement : les deux nouveaux modules partagés manquaient dans la phase précédant le redémarrage. Le code précédent a été restauré et le service contrôlé sain. L’ordre a été corrigé et un test de démarrage de la phase serveur ajouté. `pvp2` a ensuite été arrêté avant toute mutation par la garde de concurrence : un autre chantier venait de publier `index.html`. La version finale a été reconstruite sur cette nouvelle base, avec uniquement les changements PvP figés et les autres imports conservés. Traces des deux tentatives dans `failed-pvp1/` et `failed-pvp2/`.

Le changement nécessite un rechargement complet du client déjà ouvert (`Ctrl + F5`) pour recevoir les nouveaux tarifs, messages et libellés. Les profils existants ne reçoivent aucune pénalité rétroactive.
