# Éclanite publié et propositions d’attaques — 25 octobre 2026

## Publication du modèle validé

Le joueur valide l’Éclanite puis demande de publier la mise à jour et d’arrêter la refonte des corps pour passer aux animations d’attaque. Le lot frontend **`20261025-eclanite-visual1` est publié à 19 h 19 Europe/Paris**, le 25 octobre 2026, sur `https://avosoma.absyrion.com/`.

La source violette validée, son noyau fixe, les six fragments indépendants, leur éclat au tir et la poussière cristalline sont raccordés au renderer du jeu. Les trois modules `eclaniteMotion.js`, `eclaniteWake.js` et `eclaniteSprite.js` sont les sources partagées ; les anciens modules locaux de l’atelier les réexportent. Le profil est dans `combatData/eclaniteVisuals.js`, et `enemyEclanite.js` conserve ses états cosmétiques en WeakMap.

Les animations ne mutent pas l’entité autoritaire ou interpolée. Le flash natif suit uniquement les impulsions d’attaque reçues ; il ne programme pas de futurs tirs. La précharge simulée de l’atelier ne constitue pas un événement serveur. La poussière utilise les positions réelles, conserve les virages, s’arrête et s’évapore ; les écarts de reprise d’onglet et les téléportations ne dessinent pas de pont entre deux positions éloignées. Le budget est de 64 particules par Éclanite.

Le nouveau renderer prend entièrement en charge l’Éclanite : les anciens flottements, variations d’échelle et éclats ambiants ne s’ajoutent plus au modèle. La source est préchargée et sert aussi aux références du catalogue. Les autres cristaux restent sur leur rendu actuel.

Le gabarit 82 × 82, rayon 35, vitesse 240, délai d’attaque 1 seconde, vitesse du projectile 560, statistiques, orientation fixe et délai de poursuite restent conservés. Les neuf vaisseaux du joueur et les quatre familles ennemies déjà publiées ne changent pas. Les propositions d’attaques ci-dessous ne font pas partie de cette publication.

### Lot et preuves

Dix fichiers : cinq nouveaux modules/profil, trois raccordements existants (`entities.js`, `combatAssets.js`, chemin d’image dans `enemies.js`), le PNG validé et l’index publié en dernier. Overlay reconstruit sur une capture fraîche du runtime de production, sans modification de backend ni redémarrage.

- **171 tests réussis** sur le candidat isolé : 368 modules frontend et 945 imports résolus ; 571 fichiers hors modification conservés dans le candidat.
- Vingt et un contrôles Éclanite : pose indépendante/continue, contrat de données, vrais pulses et tirs répétés, reprise d’onglet, propriété unique du rendu sur entité figée, préchargement et boucle de simulation/réception/interpolation à 30/60/120/144/240 Hz, avec et sans limite de rendu.
- Syntaxe et espaces contrôlés ; comparaison navigateur du renderer natif en taille normale et ×3, déplacement et tir, sans erreur ou alerte console. Aucun compte MMO connecté pendant cette vérification locale.
- Dix empreintes publiques conformes, **236 cibles d’importmap en HTTP 200**, `game.js`, styles et `/health` publics vérifiés.
- **573 fichiers hors lot et 27 gardes** préservés ; PID 2510150 et `NRestarts=0` conservés, PostgreSQL sain et aucun nouvel avertissement.
- Après installation, huit scénarios natifs Éclanite, seize Tracker, seize Parasite et le contrôle des neuf vaisseaux passent sur les modules installés, en mémoire, sans modifier de données persistantes.

Sauvegarde : `/opt/avosoma-backups/20261025-eclanite-visual1-20261025T181916Z`.

Preuves : `output/eclanite-release-2026-10-25/`, notamment `manifest.json`, `source-diff.patch`, `candidate-validation.json`, `candidate-tests.txt`, `staging-verification.json`, `deployment-result.json`, `public-verification.json`, `installed-loop-proof.json`, `post-check.json`, `whitespace-validation.json`, `eclanite-native-macro.png` et `eclanite-native-wide-shot.png`.

L’atelier indique désormais que l’animation de l’Éclanite est publiée. Recharger le jeu pour charger les nouvelles versions.

## Propositions pour le prochain chantier

Ces idées répondent à la demande d’animations d’attaque ; elles restent à travailler dans l’atelier. Elles conservent les corps validés et donnent à chaque famille une séquence lisible de préparation, départ, vol et impact. Les boss garderaient la même signature, avec une préparation plus marquée et des effets un peu plus amples.

| Famille | Proposition d’animation |
| --- | --- |
| Orbe | Les pattes s’ouvrent un instant et le noyau concentre une lumière cyan. Une boule bleue compacte part du noyau, sans trait derrière, puis produit une petite onde ronde au contact. |
| Vorak | Les ailes se resserrent, le canon devient rouge clair, puis une décharge rouge brève part avec un petit recul du canon. Des étincelles métalliques soulignent l’impact. |
| Parasite | Les tentacules se contractent, les glandes deviennent vert brillant, puis il projette un globule acide dense dont la surface se déforme en vol. Quelques éclaboussures vertes se dispersent au contact. |
| Traqueur | Les arcs convergent entre ses points cyan, puis il libère une impulsion bleu-blanc enveloppée d’arcs courts. Un éclatement électrique bref marque le contact. Sa bombe ralentissante à la mort garde son fonctionnement actuel. |
| Éclanite | Les fragments s’orientent légèrement vers la cible, le noyau devient presque blanc, puis lance une lame cristalline violette. Elle pivote en vol et se fragmente visuellement à l’impact. Le noyau et le corps restent droits. |

Commencer par l’Orbe pour régler les durées, la lisibilité à taille normale et la correspondance entre noyau, projectile et impact, puis décliner sur les quatre autres. Des microvariations de lumière et de pose peuvent éviter une répétition mécanique ; la cadence et les résultats de combat restent autoritaires.

Une véritable préparation **avant** le départ demandera une intention de tir synchronisée avec le serveur, annulable si le tir n’a finalement pas lieu. Ne pas prédire des tirs uniquement à partir du cooldown côté rendu et ne pas retarder artificiellement les dégâts pour montrer une animation. Ce travail n’est pas inclus dans le lot présent.

Les impacts devront conserver le maillage hexagonal du joueur et la membrane réfractive des ennemis, visibles uniquement au contact quand le bouclier absorbe. Une cible tuée par le coup ne doit pas garder une animation de bouclier ; aucune fissure persistante n’est ajoutée à sa coque.
