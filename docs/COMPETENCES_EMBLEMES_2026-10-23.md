# Emblèmes des branches de compétences

Les trois grands emblèmes Dégâts, Bouclier et Utilitaire sont redessinés pour se rapprocher de la référence validée : explosion corail avec éclair central, bouclier bleu avec médiane et facettes, clé turquoise ouverte en diagonale.

`skillTreeBranchIcon()` dans `skillTreeIcons.js` utilise des tracés SVG dédiés en 64 × 64 ; `renderSkills.js` les appelle uniquement dans les trois en-têtes de branche. Les petites icônes de nœuds, de fiche et de commandes restent identiques. Aucun style CSS, modèle de progression, coût, bonus, prérequis ou handler de jeu n'est modifié.

L'aperçu utilise les vrais modules et styles avec des données fictives, sans connexion de compte ni action de jeu. Les dessins sont contrôlés à leurs dimensions réelles : 52 × 58 sur grand écran et 39 × 48 à 1366 × 768. Les dix tests de présentation existants passent et les deux modules passent la vérification syntaxique.

Version frontend : `20261023-skillemblems1`. Manifeste limité aux deux modules et à leurs aliases dans `index.html`. Captures avant/après et rapports : `output/skill-emblems-2026-10-23/`.

Publication Netcup vérifiée : trois empreintes publiques conformes et cinq aliases des modules modifiés contrôlés. Le processus serveur 3862931 reste actif sans redémarrage, PostgreSQL sain. Sauvegarde : `/opt/avosoma-backups/20261023-skillemblems1`. Les contrôles visuels utilisent uniquement l'aperçu privé, sans interrompre de session de jeu réelle.
