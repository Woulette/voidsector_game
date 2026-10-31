# Effets des réacteurs, armes et monstres — 24 octobre 2026

Statut : publié sur https://avosoma.absyrion.com/ à 16 h 53 (Paris), version `20261024-vfx1`.

- Réacteurs : atlas de plasma coloré selon le vaisseau, sorties recalées sur le bord de la coque, jets plus visibles et déformés en virage. Sillage à durée limitée qui conserve son orientation d'émission et se dissipe après coupure. Même rendu pour le pilote et les autres joueurs.
- Armes : propulsion des roquettes et missiles, projectiles propres aux familles de monstres. Orbe : boule bleue sans trait arrière. Vorak : double impulsion rouge compacte.
- M-6 : recharge serveur de 3 secondes, quatre impulsions visuelles de 95 ms espacées de 75 ms, blanc et noir, départ avant / avant gauche / avant droit / avant. Une seule consommation et un seul calcul de tir réel par salve ; les quatre passages sont visuels. Le mélange ordinaire conserve les portions noires.
- Monstres : petits effets ambiants pour toutes les entrées de rendu, avec respiration, filaments toxiques, braises, motes, arcs ou éclats selon la famille. Les variantes boss et les autres familles de portail passent par le même décorateur, avec conservation des rendus spéciaux existants.
- Éclanite : orientation du corps fixe, seuls ses éclats orbitent. Les règles de rotation, le déplacement et les décisions de poursuite existants restent inchangés. La poursuite observe la cible toutes les 800 à 1 500 ms selon l'identifiant du monstre ; aucune des trajectoires accélérées de l'ancien atelier n'a été intégrée.
- Traqueur abyssal et boss : bombe instantanée à la mort, rayon inclusif de 100 unités, ralentissement de 50 % pendant 5 secondes. Joueurs vivants de la même carte, ou membres de la même instance de portail uniquement. Répétition : rafraîchissement sans cumul multiplicatif. L'expiration rend la vitesse normale. Le ralentissement fixe de l'Astranite reste compatible.

## Intégration

Les nouveaux modules de rendu sont sous `src/game/render/` : `shipEngines.js`, `shipEngineWake.js`, `enemyLife.js`, `weaponVfx.js`, `vfxPrimitives.js`. La règle de vitesse commune au client et au serveur est `src/shared/movementSlow.js`. L'atlas publié est `assets/vfx/thruster-plasma-v2.webp`.

Le serveur applique la bombe, son rayon et son échéance ; le client reçoit le statut et l'effet visuel. Le maintien du mouvement en arrière-plan utilise la vitesse de base validée afin de ne pas appliquer deux fois le ralentissement.

L'équilibrage `20261024-mobs1` déjà publié a été préservé : PV, boucliers, dégâts, niveaux et récompenses. La publication provient d'une superposition restreinte construite sur les fichiers publics existants, sans inclure les autres travaux locaux de hangar ou de collecte.

## Vérification

- 295 tests ciblés passés sur le candidat construit depuis la production : combat, tirs, M-6, statuts, bombes, instances, validation et déplacement en arrière-plan, poursuite et rendu.
- Syntaxe JavaScript locale et distante et contrôle des espaces Git.
- Contrôle navigateur d'un cycle d'attaque des 14 monstres et boss du catalogue, dans une scène simulée utilisant les mêmes fichiers que la publication.
- Contrôle sur le serveur des modules installés avec objets isolés : rayon 100 inclus, cible hors rayon exclue, moitié de la vitesse, disparition à 5 s, M-6 à 3 s / 4 passages / 1 consommation, orientation fixe de l'Éclanite. Ce contrôle n'écrit aucun compte ou état de monde.
- 27 empreintes locales, de staging et installées concordantes ; 20 ressources publiques contrôlées en HTTP 200 avec les mêmes empreintes.
- `avosoma-beta.service` actif, `NRestarts=0`, PostgreSQL disponible, aucune nouvelle erreur pertinente dans les journaux du nouveau processus.
- Ouverture du client public jusqu'à l'écran de connexion ; aucune session MMO authentifiée n'a été exécutée par ce contrôle visuel.

Sauvegarde de retour : `/opt/avosoma-backups/20261024-vfx1`.

Preuves : `output/vfx-release-2026-10-24/release/manifest.json`, `source-diff.patch`, `preserved-runtime.json`, `candidate3/candidate-tests.log`, `browser-monster-checks.json`, `deployment-result.json`, `public-verification.json`, `final-host-verification.json`, `live-behavior-verification.json`.
