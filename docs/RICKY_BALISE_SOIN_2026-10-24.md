# Ricky : balise de soin autonome et animation — 24 octobre 2026

La balise appartient au compagnon Ricky dans le portail Sauvons Deadly. Elle est désormais déclenchée par le serveur et posée à la position réelle de sa soucoupe. Le joueur ne dispose plus du bouton de lancement. L'ancien événement manuel est conservé comme point de compatibilité mais refuse l'activation ; il ne crée aucun soin ni aucune balise.

## Règles du soin

- Ricky déploie la balise lorsque lui-même ou un membre vivant et présent dans son instance atteint au plus 75 % de coque, dans un rayon de 250 unités internes autour de lui (25 coordonnées de mini-carte).
- La position est fixée au moment de la pose. Ricky peut ensuite reprendre son combat ou rejoindre le joueur sans déplacer le champ.
- Paramètres conservés : 3 000 points de coque par pulsation, rayon 250, durée 18 secondes et recharge 60 secondes à partir du lancement. Le soin est plafonné à la coque maximale.
- Une première pulsation est immédiate, puis les suivantes sont espacées de 2 secondes. L'ancienne séquence pouvait soigner immédiatement puis une seconde fois dès le tick suivant : ce doublon est supprimé.
- Pas de nouveau lancement si Ricky est mort, si l'instance est terminée, si une balise est encore active ou si aucun joueur vivant n'est présent. Les joueurs déconnectés, morts, hors carte, non entrés ou ayant abandonné sont exclus du déclenchement et du soin.
- La balise reste active jusqu'à son expiration même si Ricky meurt après l'avoir posée, comme auparavant.

`server/src/portals/rickyHealBeacon.js` possède le déclenchement, les pulsations et la validation des destinataires. `rickyPortalRuntime.js` le branche au tick existant, sans minuteur supplémentaire. La navigation autonome et le rappel à plus de 200 sur X ou Y de mini-carte restent ceux de `rickyCompanionAi.js`.

## Rendu

`src/game/render/rickyHealBeacon.js` dessine un émetteur à trois appuis, une croix médicale lumineuse et une bordure segmentée vert menthe. Le champ s'ouvre en 700 ms ; les ondes et petites croix suivent `lastPulseAt`, fourni par le serveur à chaque pulsation réelle. La balise s'efface pendant sa dernière seconde. Les nouveaux champs `sourceId`, `createdAt`, `lastPulseAt` et `pulseIntervalMs` sont transmis par la sérialisation habituelle du groupe.

Le réglage graphique `portalEffects: false` conserve l'émetteur et la limite de portée avec un rendu fixe. Aucun nouvel asset ni CSS : le dessin utilise le Canvas natif. L'animation de lancement de la soucoupe continue de dépendre de l'événement confirmé `portal:ricky-heal`.

## Vérifications

112 tests ciblés réussis sur le candidat local et sur le serveur distant : seuil, origine exacte y compris zéro, membres autorisés, portée, recharge, durée, soin plafonné, absence de doublon, refus des commandes manuelles, expiration, quêtes, clés de secours, navigation autonome, HUD et tick. Seize scénarios propres à la balise incluent deux parcours Socket.IO à deux clients, en WebSocket et en polling forcé, avec sérialisation du groupe et listener client réels.

Après publication, ces seize scénarios passent de nouveau avec des liens vers les modules réellement installés sous `/opt/avosoma/server/src` et `/opt/avosoma/src`. Ces serveurs de test utilisent uniquement des objets éphémères sur l'interface locale, sans compte ni modification de profil de production.

Le passage global du workspace compte 1 974 succès sur 1 975 tests. L'unique échec connu est le test statique de fiche de vaisseau qui cherche encore « Vie actuelle » dans `src/ui/render.js` après extraction dans l'atelier. La suite ciblée exclut uniquement le scénario général de préparation Azuron qui attend 30 vagues, alors que la production antérieure en contient 20. Ces divergences ne sont pas introduites par le soin.

Le contrôle navigateur rejoue une trace obtenue avec le runtime serveur candidat : pose, poursuite de Ricky pendant que l'émetteur reste fixe, pulsations, extinction et expiration. Les phases et la lecture complète passent localement puis avec les modules/styles/assets chargés depuis le site public, sans erreur JavaScript ni réponse HTTP en échec. C'est un aperçu isolé du renderer réel ; aucune partie MMO authentifiée n'a été utilisée pour cette vérification visuelle. Vidéo : `output/ricky-heal-beacon-2026-10-24/public-ricky-heal-beacon.webm`.

## Publication

Version `20261024-ricky-heal1`, publiée le 24 octobre 2026 à 21 h 05 Europe/Paris. Sept fichiers de runtime et seize empreintes protégées. Le premier précontrôle a détecté un changement concurrent de `index.html` et s'est arrêté avant toute écriture ; le candidat a été recomposé sur les sources publiques récentes, en conservant uniquement les changements de ce lot.

Archive SHA-256 : `ad1c884edf5a3643a8803c19519184c4c339f1cbd5f9eba3735381c5d5a66482`. Sauvegarde : `/opt/avosoma-backups/20261024-ricky-heal1-190522`. Backend installé avant redémarrage, puis frontend et index en dernier. PID 1385896 vers 1389965, NRestarts 0 ; PostgreSQL prêt, `/health` sain et aucune nouvelle erreur du processus. Sept empreintes distantes et quatre fichiers publics HTTPS correspondent au manifeste.

Preuves, candidat, patch, manifests, archives, tests et captures : `output/ricky-heal-beacon-2026-10-24/`. Le redémarrage était déjà autorisé explicitement par le joueur lors de l'installation de l'IA.
