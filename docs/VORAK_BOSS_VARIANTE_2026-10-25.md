# Boss Vorak — variante mesurée du modèle validé

Le 25 octobre 2026, le joueur valide le Vorak commun avec les sept points lumineux ajoutés et demande sa variante boss « sans trop l’abuser ». Une nouvelle illustration dérivée conserve la famille rouge et anthracite, le nez effilé, deux ailes articulées et deux moteurs. Les épaules sont plus blindées, les bords renforcés de métal clair et deux petits éclairages supplémentaires apparaissent sur la coque.

Cette étape était une proposition locale, ensuite **validée et publiée à 13 h 25 (Paris)** dans `20261025-vorak-family1` ; voir `VORAK_PUBLICATION_2026-10-25.md`. Le PNG approuvé du commun est préservé. La nouvelle source transparente et son prompt exact sont dans `assets/enemies/vorak-boss-v1/` ; création via l’outil intégré `image_gen` en utilisant le commun comme référence.

## Gabarit et animation

Le profil du commun reste à 0,625 pour une entité de 120 ; celui du boss est à 0,85 pour son entité existante de 104. Hors rotation, les parties visibles représentent environ 69 × 63 pour le commun et 84 × 74 pour le boss, soit environ 20 % de plus. Les dimensions d’entités et collisions ne changent pas.

Les deux illustrations partagent le même renderer local, ses charnières, ses lampes, son éclat au tir et sa vapeur bornée en coordonnées de monde. Les ailes du boss ont une articulation un peu plus retenue. Son orientation fixe existante est conservée ; le commun continue de suivre son angle de déplacement. Aucun changement de poursuite, délai de réaction, vitesse, tir, dégâts ou récompense.

`tools/vfx-lab/vorak/profiles.js` sépare les chemins d’image, les gabarits et les montages de moteurs. L’état de chaque aperçu reste distinct. Quand le boss est sélectionné, la colonne gauche montre explicitement le **commun validé**, la droite la **proposition boss**, au même zoom. Les autres sélections gardent leur comparaison habituelle avec le rendu intégré.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=boss_raider_astral&scenario=pursuit&view=macro&revision=vorak-boss-1&surface=shield`.

## Vérification

- **40 tests ciblés réussis** : 16 scénarios de poses, gabarits, montages et vapeur Vorak ; six scénarios Orbe existants ; 18 scénarios de poursuite existants. L’émission est contrôlée de 30 à 240 Hz pour les deux Voraks avec une simulation à 60 Hz.
- Syntaxe vérifiée des modules modifiés ; inspection navigateur en ×1 et ×3, en poursuite et combat, éclairage et tirs.
- Empreintes du PNG commun, du catalogue d’ennemis et des règles d’orientation inchangées ; les deux PNG ont un véritable canal alpha. `output/vorak-boss-2026-10-25/verification.json` conserve les dimensions visibles et ces gardes.

Les captures sont dans `output/vorak-boss-2026-10-25/`. Cette vérification ne constitue pas une session MMO authentifiée.
