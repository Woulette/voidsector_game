# Dossier du pilote — refonte du 23 octobre 2026

La présentation reprend la maquette validée : identité et dossier à gauche, vaisseau actif ou drones utilisés au centre, statistiques effectives et expérience à droite, titre et ascension en bas. Les données d'exemple sont remplacées par celles du profil canonique.

## Vérification de la maquette

- Les 25 grades et leurs SVG existants proviennent de `src/data/ranks.js`. Le niveau ne détermine pas seul le grade. Soldat d'élite commence à 9 000 points et Caporal à 13 000 ; à 12 500 points la progression entre ces grades vaut 87,5 %.
- Le Razorion Rare, ses caractéristiques de base et le titre « Système stellaire colonisé » existent. Les valeurs affichées sont celles des getters du jeu : équipement, compétences et bonus actifs inclus. L'absorption configurée peut notamment être 50 % même avec une capacité de bouclier nulle ; le zéro de la maquette n'est pas une règle.
- La réputation affichée peut être négative. Le nombre de quêtes reprend les récompenses réclamées et les autres compteurs restent ceux du profil réel.
- Le titre se débloque après Le Cœur de l'Éternel. Son bonus de 5 % aux lasers, roquettes et missiles exige de l'équiper ; le masquer conserve le bonus.
- L'ascension est unique : niveau 50 et chacun des neuf portails de progression terminé. Elle remet le niveau à 1 et l'XP courante à 0, conserve les compétences et ouvre la progression jusqu'au niveau 100. Neuf répétitions d'un même portail ne suffisent pas.

## Organisation

`src/ui/renderProfile.js` porte le rendu et la conservation du focus/défilement ; `profilePresentation.js` projette les données existantes sans octroyer de progression ; `profileIcons.js` porte les pictogrammes. Le rendu de profil est extrait de la façade `render.js`. `src/styles/profileDossier.css` limite les changements au Profil du Hangar.

Les commandes serveur existantes d'équipement et de visibilité du titre, d'ascension et le choix local vaisseau/drones sont conservés. Les synchronisations identiques ne reconstruisent pas le DOM. Aucun changement des grades, bonus, progression, achats ou règles de combat.

## Validation

Douze tests de présentation et contrats ciblés couvrent les vrais grades, les deux jauges, les valeurs signées, le titre et l'ascension serveur, les drones, l'échappement HTML et la conservation du focus. Les tests métier existants de grades, titres et ascension restent utilisés.

Quinze vérifications sur les modules serveur de production isolés contrôlent les refus, la persistance des commandes de titre et d'ascension et les restaurations après échec de sauvegarde. Les achats, titres et progressions des comptes de production ne servent pas à ces essais.

La publication frontend est limitée à sept fichiers runtime versionnés `20261023-profile1`, construits sur les fichiers publics frais pour préserver les autres chantiers. Preuves locales : `output/profile-refonte-2026-10-23/` ; les comptes et identifiants de test restent hors paquet et hors Git.
