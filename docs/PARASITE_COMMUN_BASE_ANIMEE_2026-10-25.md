# Parasite commun — première base animée du 25 octobre 2026

Après validation et publication des deux Voraks, le joueur demande de poursuivre la même recherche sur le Parasite. Cette nouvelle proposition concerne **le Parasite commun dans l’atelier local**. Elle n’est pas publiée ; la variante boss viendra après examen de cette base.

## Illustration et mouvement

Nouvelle illustration transparente, conservée dans `assets/enemies/parasite-scout-v1/parasite-source.png`, avec le prompt exact à côté. Création via l’outil intégré `image_gen`, l’ancien Parasite servant de référence à son identité verte et organique.

Six tentacules bien séparés entourent un noyau vert et une carapace sombre. Le noyau reste ancré ; les extrémités souples ondulent à des phases différentes et prennent un léger retard opposé au déplacement. Une déformation en dix bandes par tentacule agit sur les vrais pixels de l’illustration, avec un masque séparé des veines lumineuses. Le corps suit son angle de poursuite existant, sans rotation autonome ajoutée.

Au tir, le noyau et les veines deviennent vert brillant. Le flash reste localisé aux membranes et aux tissus lumineux. La propulsion organique laisse une brume vert pâle et quelques spores ; les nuages déjà émis gardent leur trajectoire dans le monde, s’élargissent et s’évaporent après un arrêt. L’historique est limité à 68 nuages et conserve les fractions d’émission entre les images répétant une position de simulation.

`tools/vfx-lab/parasite/motion.js`, `wake.js` et `renderer.js` séparent pose, vapeur et dessin. Le chemin du Parasite dans `creatures.js` remplace son ancienne proposition générique sans empiler les animations de corps. Aucun changement du catalogue du jeu, du serveur, des statistiques, de la collision, de la poursuite, du poison ou des projectiles dans cette étape.

Le facteur de dessin 0,94 pour l’entité existante de 86 conserve un gabarit de monstre courant, vérifié en ×1 et ×3.

## Vérification

- **49 tests ciblés réussis** : neuf nouveaux scénarios Parasite, seize Vorak, six Orbe et dix-huit scénarios de poursuite existants.
- Racines ancrées, extrémités indépendantes, retard de déplacement, flash au vrai âge de tir simulé ; émission avec rendu 30/60/120/144/240 Hz et positions à 60 Hz, arrêt et téléportation.
- Syntaxe vérifiée ; inspection navigateur en poursuite, ×1/×3, temps réel et ralenti, capture du flash vert pendant « Éclat du noyau ». Aucune erreur/alerte console observée. PNG RGBA avec transparence réelle.

Captures et résultats : `output/parasite-scout-2026-10-25/`, dont `parasite-first-macro.png`, `parasite-wide.png` et `parasite-attack.png`.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=chasseur_spectral&scenario=pursuit&view=macro&revision=parasite-rig-1&surface=shield` ; proposition à droite.
