# Compétences du pilote — refonte du 23 octobre 2026

La page du Hangar reprend la maquette validée : trois branches horizontales et cinq paliers, avec la compétence sélectionnée détaillée à droite. Les nœuds verrouillés et terminés restent consultables. Le choix d'un nœud ne déclenche aucun achat ; seul le bouton « Améliorer » lance la commande existante du prochain rang de la branche sélectionnée.

## Organisation

- `src/ui/skillTreeModel.js` projette le catalogue, les rangs et les getters de progression dans un modèle de présentation. Il calcule l'affichage des coûts, dont la remise Premium sur les NOVA et les matériaux réellement requis.
- `src/ui/skillTreeIcons.js` rassemble les pictogrammes SVG du domaine.
- `src/ui/renderSkills.js` rend l'arbre et le détail. La sélection reste locale à l'interface. Les synchronisations identiques conservent le DOM ; une mise à jour conserve le focus clavier et les positions de défilement internes.
- `src/styles/skillTree.css` limite ses styles au Hangar. Sur grand écran, l'arbre et le détail occupent la hauteur disponible. Sur petit écran, l'arbre défile horizontalement dans son panneau et le détail passe dessous.
- `src/app.js` conserve une délégation fine ; `render.js` et `renderProgression.js` restent des façades. Les imports concernés sont versionnés `20261023-skills1`.

Les bonus, prix, rangs, points et prérequis restent ceux du jeu. Le Seuil d'Azuron et les trois branches au rang 3/3 du palier précédent restent obligatoires. Le serveur conserve l'autorité et la persistance ; aucune règle économique ou de combat n'est modifiée.

## Validation

- Treize tests ciblés passent : présentation, sélection sans achat, prérequis Azuron et paliers, ressources/points insuffisants, remise Premium, matériaux, rang maximal, échappement HTML, conservation du focus et de la sélection.
- Sept scénarios sur les vrais modules serveur de production isolés passent : cinq refus Socket.IO, achat canonique sauvegardé/relu, échec de sauvegarde avec restauration de l'état.
- Contrôle navigateur : arbre et fiche, consultation d'un palier verrouillé sans dépense, achat réel sur un compte isolé puis rechargement conservant le rang et les soldes attendus. Aucun achat effectué sur un compte de production pour ces essais.
- Le paquet de publication contient uniquement neuf fichiers frontend. L'index et les imports sont reconstruits sur la version publique fraîche afin de conserver les autres chantiers déjà publiés.

Preuves locales : `output/skills-refonte-2026-10-23/`. Les données et identifiants des comptes de test restent dans ce répertoire local et ne font pas partie du paquet ni du commit.
