# Raffinerie : actions directement sur les materiaux

Demandes du joueur : retirer le bandeau de detail inferieur, les compteurs de production et les titres Extraction / Transformation / Composants / Noyau ; placer l'amelioration et ON/OFF sur chaque materiau ; illustrer Stockage et Transport dans le style des materiaux.

## Interface

- Chacune des onze cartes possede un bouton de selection, un bouton d'amelioration et son propre interrupteur ON/OFF. Ce sont des boutons voisins dans un article, jamais des boutons imbriques.
- Le bouton affiche Debloquer au niveau zero, Ameliorer pour une production debloquee, En cours avec son temps restant pendant un chantier, ou Niveau max. au dernier niveau.
- Le cout reste consultable meme si le joueur ne possede pas encore les ressources. Le lancement reste confirme dans le dialogue existant et valide par le serveur.
- Les productions verrouillees affichent OFF desactive. Les productions debloquees restent commutables pendant une amelioration et au niveau maximum.
- Le bandeau inferieur, les compteurs et les categories redondantes sont retires. Les onze materiaux, les quatorze liens et leurs quantites restent presents. La selection met toujours les ingredients en evidence.
- Les textes restent lisibles, avec niveau et debit separes des commandes. Les cartes defilent horizontalement sur un petit ecran plutot que de reduire les polices.

## Illustrations

Deux PNG individuels generes avec l'outil imagegen integre, dans le style peint des nouveaux materiaux. Fond transparent, silhouettes entieres, aucune retouche raster :

- `assets/materials/refinery-v2/module-stockage.png` : entrepot spatial bleu/ambre avec deux baies et conteneurs.
- `assets/materials/refinery-v2/module-transport.png` : petit transporteur spatial de fret bleu/ambre.

Les illustrations figurent dans les cartes de module et leurs dialogues. Elles utilisent object-fit:contain. Les marges visibles minimales mesurees sont 13,88 % et 11,88 % (alpha >16/255).

Prompts, references et provenance : `output/refinery-card-actions-20261023/asset-generation.json`. Dimensions, bornes alpha et empreintes : `asset-verification.json` dans le meme dossier.

## Verification et publication

33 tests cibles couvrent la structure des onze cartes, leurs identifiants, les etats verrouille/maximum/chantier, les commandes serveur sans mutation locale, la production, les recettes et la synchronisation. Les regles et tarifs serveur sont inchanges.

Les controles navigateur utilisent des donnees isolees non persistantes : niveaux 1 et 20, productions ON/OFF, chantier en cours, gros stocks, cout d'amelioration et modules illustres. Les vrais achats, expeditions et changements de production ne sont pas executes pendant le controle public.

Publication restreinte `20261023-refinery3` : sept fichiers runtime (deux JS, un CSS, deux PNG et les deux entrees de cache). Sept empreintes HTTPS concordent ; 117 cibles d'import publiques repondent correctement. Le service conserve le PID 4003944 sans redemarrage, PostgreSQL est pret. Sauvegarde : `/opt/avosoma-backups/20261023-refinery3`.

Le controle dans une session publique confirme onze cartes, onze boutons d'amelioration, onze interrupteurs, aucune ancienne bande et aucune image manquante. Le bouton Nickel ouvre bien le dialogue Nickel. Aucune alerte/erreur console et aucune depense ni commutation de production pendant ce controle. Manifestes et captures : `output/refinery-card-actions-20261023/release/` et `validation/`.
