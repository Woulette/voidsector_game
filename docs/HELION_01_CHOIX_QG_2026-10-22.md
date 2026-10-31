# Hélion 01 — quatre architectures de QG

Le joueur demande plusieurs propositions visuelles inspirées de références sur Internet, pour sélectionner une direction. Cette étape produit des concepts et une galerie ; elle ne remplace aucun bâtiment dans les parties.

## Propositions

1. Bastion militaire : forteresse hexagonale compacte, blindage et quais courts.
2. Couronne orbitale : anneau ouvert, poste de commandement central et espace négatif important.
3. Arsenal orbital : structure de chantier et trois longs bras d'amarrage.
4. Archipel modulaire : quatre modules reliés par des passerelles, composition asymétrique.

Les quatre sources sont créées avec l'outil imagegen intégré, un appel par variante. Aucun asset de jeu tiers n'est repris. Palette graphite, métal gris, accents rouges et éclairages ambre. Chaque PNG mesure 1 254 × 1 254 pixels, RGBA avec alpha 0–255. Ce sont des propositions de silhouette ; la version sélectionnée devra encore être adaptée et vérifiée dans le jeu avec son interface et ses interactions.

## Références consultées

- DarkOrbit, Homebase Redesign Concept, archive officielle de 2013 : https://board-en.darkorbit.com/threads/homebase-redesign-concept.1031/
- EVE Online, Faction Citadels, publication officielle de 2018 : https://www.eveonline.com/news/view/faction-citadels-the-details
- Illustration officielle Faction Fortizar effectivement inspectée dans le navigateur : https://images.ctfassets.net/7lhcm73ukv5p/6AV1ZnB6Q82eGUkMa0s4QW/594ee0cc704fd1d34db66eaa9dc840da/FACTION_FORTIZAR.jpg

Ces références sont historiques, pas une vérification de l'état des jeux en 2026.

## Fichiers

- Sources PNG et prompts complets : `output/helion01-hub-alternatives/2026-10-22/`, préfixes `01-bastion`, `02-couronne`, `03-arsenal`, `04-archipel`.
- Aperçu isolé : `tmp/helion-hub-choices1/preview.html`, utilisant le véritable renderer de décor d'Hélion, sans connexion MMO.
- Les quatre captures utilisent le même cadre 1 880 × 1 080, zoom 0,78, QG 1 100 unités, vaisseau 90 unités. QG centré à spawn.y − 180 et vaisseau de comparaison à spawn.y + 410.
- Galerie statique : `assets/maps/previews/helion01-hub-choices1/` : quatre JPEG, quatre PNG, quatre prompts et `index.html`.
- Galerie publiée : https://avosoma.absyrion.com/assets/maps/previews/helion01-hub-choices1/index.html

## Vérifications

Les quatre silhouettes ont été inspectées dans le décor, la transparence des PNG et les dimensions des captures contrôlées. Syntaxe du script d'aperçu vérifiée avec `node --check`. Galerie vérifiée sur mobile (390 pixels de viewport, sans débordement horizontal) et ordinateur (1 440 pixels, deux colonnes). Les liens locaux pointent tous vers des fichiers existants.

Le manifeste de diffusion est limité aux treize nouveaux fichiers de la galerie. Aucun fichier de runtime, de profil ou de base de données n'est inclus. Le mécanisme vérifie l'absence préalable de ces chemins, les empreintes avant installation et après installation, et permet le retrait de cette seule galerie en cas d'échec. Aucune commande de redémarrage n'est présente.

Publication terminée le 22 octobre 2026 à 19 h 52 min 55 s (Paris). Treize empreintes vérifiées après installation et par les URLs HTTPS publiques. Santé du service et PostgreSQL OK. Les quatre images publiques chargent à 1 880 pixels de largeur ; aucun débordement horizontal observé. Preuves : `tmp/helion-hub-choices1/deploy.log`, `public-verification.json` et `public-gallery.jpg`. Le serveur local d'aperçu a été arrêté et les onglets temporaires fermés ; seule la galerie publique est conservée comme résultat.
