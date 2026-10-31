# Relais de quêtes — console claire

Direction retenue : maquette « Console claire » validée par l’utilisateur le 22 octobre 2026. Interface intégrée et publiée à 21:52:22 Europe/Paris, version `20261022-quest-console1`.

## Présentation

- En-tête de firme et secteur courant ; trois états lisibles : Disponibles, En cours, Terminées.
- Liste à gauche avec icônes d’activité, niveau, sélection dorée, quêtes rares/prioritaires et indication de la limite de cinq missions.
- Filtres Principales, Journalières, Hebdomadaires ; accès explicite aux missions verrouillées.
- Commandant de chaque firme dans un briefing compact ; transmission personnalisée complète dépliable, avec le contrôleur de texte progressif existant.
- Objectifs réels illustrés, compteurs distincts, lieu, conditions de réussite, étapes numérotées et dépendances des missions longues.
- Récompenses détaillées, y compris équipement, matériaux, munitions et fragments. Bouton d’action conservé au bas de la fenêtre pendant le défilement.
- Présentation adaptée aux formats 1880×1080, 1366×768 et 390×844 ; la position mémorisée d’une fenêtre de relais est bornée à l’écran lors de son ouverture.

La mission « Nouvelle Gamme » affiche désormais « Posséder un Velox », le vrai sprite du jeu et le compteur de possession. Son briefing ne demande plus de l’équiper : la condition existante est bien la possession dans le hangar. Les valeurs des récompenses et les règles serveur ne sont pas modifiées.

## Organisation

`spawnPanel.js` délègue les quêtes à `questRelayPanel.js`. Ce dernier construit les états, filtres, liste, briefing, récompenses et actions. `questRelayObjectives.js` présente les objectifs et lit la progression fournie par le contrôleur, avec les clés du magasin de progression existant. Aucune progression n’est écrite par ces modules.

`combatPanels.js` transmet `getQuestObjectiveProgress` et le nom de carte, rétablit l’ouverture de la transmission et le défilement pour une même mission, et protège la navigation au clavier de l’actualisation automatique. Les attributs des actions existantes, l’abandon et les restrictions du tutoriel sont conservés.

## Vérifications

- 76 tests ciblés réussis : objectifs, clés de progression, capacité, verrouillages, quatre firmes, catalogue complet, briefing, abandon/tutoriel, sélection et modes de services, fabrication et commerce. Le nouveau test couvre notamment un excès de progression sur une étape qui ne doit pas valider les autres.
- Vérification de syntaxe des modules modifiés.
- Contrôle navigateur sur les vrais renderers et données, dans un environnement de présentation isolé : disponible, en cours, réclamation, terminé, mission longue et changement de firme. Scénarios d’acceptation/réclamation simulés pour l’affichage ; aucune action de quête effectuée sur un compte de production.
- Dernier affichage : aucune image manquante, aucune erreur console après rechargement, objectif et récompenses visibles sans défilement sur le scénario Velox en 1880×1080.
- Huit fichiers publiés, empreintes identiques sur le serveur puis via HTTPS ; service actif, PostgreSQL disponible, PID inchangé pendant cette publication (`2856426`). Aucun redémarrage effectué par cette livraison.

## Livraison et preuves

Les modifications de fabrication `20261022-crafting1`, déjà publiées par l’autre chat pendant ce travail, ont été conservées. Le fichier `spawnPanel.js` a été comparé à la nouvelle base de production pour garantir que ses sections fabrication/commerce/raffinerie restaient identiques après extraction du relais. Publication limitée à huit fichiers front ; aucune copie de toute la copie de travail, aucun fichier de profils ni fichier serveur installé.

- Sauvegarde locale : `C:/Users/Ntmav/.codex/backups/voidsector_game/20261022-quest-relay-console1-before`.
- Sauvegarde distante : `/opt/avosoma-backups/quest-relay-console1-20261022`.
- Paquet, différences, manifeste, contrôles : `tmp/quest-relay-console1/`.
- Capture et relevé navigateur : `output/quest-relay-console-2026-10-22/`.

La publication est un déploiement ciblé du site existant. Aucun commit ni push Git global n’a été effectué depuis cette copie de travail partagée.
