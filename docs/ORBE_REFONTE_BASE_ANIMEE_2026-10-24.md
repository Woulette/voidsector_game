# Orbe sentinelle — première base visuelle animée

Suite du 25 octobre : ce modèle à huit branches a été validé pour le boss. Un nouvel Orbe commun à six petites pattes le remplace dans la proposition du premier monstre. Voir `ORBE_COMMUN_ET_BOSS_2026-10-25.md`.

## Périmètre

Nouvelle recherche locale à la demande du joueur : reprendre successivement l'Orbe, le Vorak, le Parasite, le Traqueur et l'Éclanite, en commençant par une base aboutie pour l'Orbe. Cette étape remplace uniquement son rendu dans l'atelier `tools/vfx-lab`. Aucun fichier de règles client ou serveur, aucune statistique, aucune cadence réelle ni aucun délai de poursuite n'a été modifié. La nouvelle illustration et son animation ne sont pas publiées dans le MMO.

La recherche X6 est reportée. Le prochain travail devra proposer de l'orange, une animation moins rapide et une signature distincte des lasers ordinaires. Aucun changement X6 n'est inclus ici.

## Illustration et animation

- Nouvelle illustration transparente argent, bleu profond et cyan, produite avec l'outil imagegen intégré. Source conservée dans `assets/enemies/orb-rig-v1/orb-source.png`, prompt complet dans `ART_PROMPT.md` du même dossier. Le sprite de jeu existant reste intact.
- Noyau et logement centraux stables. Huit branches découpées en couches Canvas indépendantes à partir de la nouvelle illustration. Une seule préparation par image ; les couches sont mises en cache.
- Rotation continue à 0,15 radian/seconde, avec une relance supplémentaire de 171° sur 1,05 seconde dans un cycle de 6,8 secondes. Accélération et freinage progressifs, angle continu entre les cycles. Petits décalages bornés et extension des articulations à la charge du noyau.
- Charge bleue durant les 380 ms avant le tir simulé ; bref éclat blanc et cyan dans le noyau au départ de la boule bleue. Aucun grossissement de tout le corps ni ancienne animation de balancement superposée.
- Deux émissions arrière de vapeur bleu gris, orientées d'après le déplacement réel. Les nuages restent en coordonnées de monde, se dispersent et expirent en 1,15 à 1,8 seconde. L'arrêt coupe l'émission. Maximum de 88 nuages, nettoyage en cas de téléportation.

Le dessin fait lire davantage les branches que l'ancien sprite très entouré de transparence : envergure visuelle d'environ 69 unités sur un cadre de 92. Rayon de collision inchangé à 26 ; aucune portée ou règle de contact n'est modifiée.

## Modules et atelier

- `tools/vfx-lab/orb/motion.js` : pose et vitesse de rotation indépendantes de la fréquence d'affichage.
- `tools/vfx-lab/orb/wake.js` : émission, historique borné, extinction et dessin des nuages.
- `tools/vfx-lab/orb/renderer.js` : préparation de l'illustration et composition du corps, des branches et de l'éclat.
- `creatures.js` compose ce rendu avant toute ancienne animation spécifique à l'Orbe.
- `lab.js` charge l'illustration et propose la situation « Vol et tirs · démonstration ». Elle reprend la patrouille simulée existante pour montrer le sillage et le tir ensemble. Ce mode n'est pas une nouvelle IA de combat.

Les deux colonnes conservent les mêmes fonctions de déplacement et le même cadrage : vue d'ensemble ×1, détail ×2 ou gros plan ×3. Le ralenti ×4 et la pause facilitent l'observation. Combat et poursuite restent disponibles avec leurs délais existants. Le maillage hexagonal validé du joueur réagit seulement aux impacts dans la démonstration de l'Orbe ; le projectile reste une boule bleue.

Aperçu : <http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=drone_pirate&scenario=showcase&view=macro&revision=orb-rig-1>.

## Vérifications

`node --test tools/vfx-lab/orb/motion.test.js server/test/enemy-pursuit.test.js` : 23 tests réussis. Les cinq nouveaux tests couvrent la variation de vitesse et la continuité des angles, les huit branches et les phases du noyau, le sillage après virage et arrêt, sa borne et les téléportations, ainsi que l'émission comparable à 30 et 144 images/seconde. Les dix-huit tests de poursuite existants vérifient notamment leurs délais de réaction de 800 à 1 500 ms et les déplacements à plusieurs fréquences.

Syntaxe vérifiée pour les modules modifiés. Contrôle navigateur des rotations lente/rapide, de l'éclat au tir au ralenti, de la silhouette à la taille normale et du sillage en déplacement. Console de l'aperçu sans avertissement ni erreur lors de ce contrôle. Ce sont des vérifications d'atelier local, sans compte MMO connecté.

Preuves et sauvegardes avant modification : `output/orb-sentinel-rig-2026-10-24/`. Les autres travaux présents dans le dépôt ne font pas partie de cette étape.
