# Raffinerie orbitale — publication du 25 octobre 2026

La direction validée est une station spatiale modulaire au rendu de jeu vidéo : cinq collecteurs sur la gauche, unités de transformation à droite, Noyau Astra, stockage et transport. Le bandeau des onze matériaux affiche les stocks actuels, leurs maxima numériques et une jauge fine.

## Présentation et fonctionnement

- L’illustration de station est un décor sans texte, nombre ou bouton intégré. Les treize zones de modules sont de vrais boutons HTML, avec niveau, état et amélioration en cours issus du profil courant.
- Sélectionner un matériau affiche son débit théorique, son état réel, sa recette et ses commandes dans une barre commune en bas. Le Noyau Astra conserve ses trois ingrédients.
- Les flèches de la recette sélectionnée apparaissent sur la station. « Liaisons de fabrication » révèle les quatorze liens et leurs quantités depuis les six recettes du catalogue.
- Amélioration, déblocage, accélération et activation/pause utilisent les gestionnaires et validations existants. Sélectionner ou ouvrir une amélioration ne dépense rien. Les plafonds dépendent toujours du module Stockage.
- Expédition et bilan utilisent leurs vues existantes. Le raffinage et le perfectionnement embarqués restent séparés de cette présentation de station.
- Jusqu’à 900 px, une liste de modules permet de sélectionner ou d’améliorer les éléments sans dépendre de petites zones sur l’illustration.
- Le rapprochement DOM conserve l’image, les saisies et le focus pendant les rafraîchissements du profil.

## Sources

- `src/ui/refineryOrbitalStation.js` : illustration, géométrie des zones, connexions issues des recettes et commandes du matériau choisi.
- `src/ui/renderRefinery.js` : composition avec les getters de stock, capacité, niveau et chantier actuels ; préférence temporaire d’affichage des liaisons.
- `src/styles/refineryOrbital.css` : présentation limitée à la station du hangar ; bandeau de stocks compact et repli mobile.
- `assets/refinery/orbital-v2/station.png` : illustration reconstruite avec le mode intégré `image_gen`, après la correction de disposition demandée par l’utilisateur. La première illustration est conservée dans `orbital-v1/`.
- `styles.css` et `index.html` : chargement de la nouvelle feuille de style et cache `20261025-orbital3`, en conservant les autres imports. Le module partagé `refineryPresentation.js` utilise désormais le même cache pour le bandeau de stocks.

Les prompts exacts et la provenance des images sont enregistrés dans `output/refinery-orbital-20261025/asset-generation.json`. Les fichiers antérieurs à ce travail sont sauvegardés dans son sous-dossier `before/` ; il ne s’agit pas d’une sauvegarde complète du checkout déjà modifié.

## Correction de disposition et des cadres, deuxième version

L’utilisateur a corrigé la première intégration pendant la préparation de la publication : les cinq collecteurs restent à gauche ; Alliage, Catalyseur et Plaque forment une même colonne de haut en bas ; Conducteur et Blindage sont superposés dans la colonne suivante ; Noyau Astra reste seul tout à droite. Stockage et Transport occupent la bande inférieure.

L’illustration a été reconstruite selon cette disposition. Chaque rectangle de sélection a été recalé sur la silhouette complète de sa machine, sans inclure les bras de liaison. Les étiquettes sont ancrées à l’extérieur des cadres, et le module survolé ou sélectionné passe au-dessus des autres zones. Les étiquettes de station affichent le nom et le niveau ; les états détaillés et temps d’amélioration restent dans le panneau du matériau sélectionné. Les treize modules, les onze stocks/plafonds et les quatorze liens issus des recettes sont conservés.

La source générée, le prompt exact et le mode intégré figurent dans `output/refinery-orbital-20261025/asset-generation-v2.json`. SHA-256 de la nouvelle illustration : `166ccf40a6ad04533da577a7be2bad6e2b83ee68d7fea60b2d95e69081af3aea`. Les sources et preuves de la première version ont été sauvegardées dans `output/refinery-orbital-20261025/revision2/before/` avant cette correction.

Vérification de la deuxième version : 42 tests ciblés réussis ; 30 rendus sur les six formats et cinq profils synthétiques, sans débordement, étiquette masquée ni erreur navigateur ; 39 survols sur les treize modules à 1 024, 1 366 et 1 920 px, sans coin de cadre masqué ou rogné. Ce dernier contrôle portait sur la visibilité des coins ; le retour utilisateur suivant a néanmoins montré que les limites étaient encore trop courtes autour des embouts. Les commandes, les recettes et le rafraîchissement des stocks ont été revérifiés dans la fixture locale. Preuves : `revision2/tests.txt`, `browser-verification.json`, `revision2/hover-verification.json`, `revision2/corrected-overview.png` et captures de survol du titane et de la silice.

## Ajustement du bandeau et des quatre coins, troisième version

Le bandeau suit la nouvelle demande : nom du matériau sans icône, stock actuel plus grand juste en dessous, puis jauge pleine hauteur contenant seulement la valeur maximum. Le remplissage utilise toujours le rapport stock/capacité courant, limité à 100 % ; aucun pourcentage ni préfixe MAX n’est ajouté au texte de la jauge. Les maxima et les quantités restent complets, y compris dix millions.

Les rectangles de sélection sont maintenant calibrés en pixels de l’illustration source de 1 672 × 941 px, avec les embouts inclus. L’inspection à taille native et un repère gradué du titane et de la silice ont permis de corriger chaque hauteur indépendamment. Le contour continu a été retiré : seuls les quatre coins sont dessinés. Pendant un survol, seul le cadre du module sous le pointeur est visible ; le matériau sélectionné et ses commandes restent inchangés.

Sources de cette retouche : `src/ui/refineryOrbitalStation.js`, `src/ui/refineryPresentation.js`, `src/styles/refineryOrbital.css`, et les références de cache dans `index.html` / `styles.css`. Aucune nouvelle illustration ni modification d’économie. L’état antérieur est sauvegardé dans `output/refinery-orbital-20261025/revision3/before/`.

Vérification de la troisième version : 42 tests ciblés, 30 rendus et 39 survols ; contrôle supplémentaire de 36 scénarios de jauges (0, 25, 50, 90, 100 et 120 % du maximum, sur six largeurs), soit 396 lectures de stocks/capacités. La largeur et la hauteur réelles du remplissage, l’absence d’icônes et de texte supplémentaire, la lisibilité des nombres complets et la hiérarchie des tailles de police sont vérifiées. Preuves dans `revision3/` : `tests.txt`, `browser-verification.json`, `hover-verification.json`, `stocks-verification.json`, captures de survol et `refinery-final.png`. Les captures `framing-calibrated-*` et `collector-ruler.png` servent au calage graphique ; leurs grilles ne font pas partie du jeu.

## Vérifications locales

- 42 tests ciblés : présentation de station, matériaux autorisés, production et recettes serveur, règles partagées, synchronisation et commandes client.
- Syntaxe des modules JavaScript de station, de présentation et de composition vérifiée.
- Trente rendus contrôlés : six formats de 390 à 1 920 px et cinq profils synthétiques (améliorations, station active, verrouillage, niveaux maximum, ingrédients absents).
- Onze stocks/plafonds, onze matériaux de production, deux modules d’infrastructure et quatorze liaisons conservés ; pas de débordement horizontal, de chevauchement d’étiquettes, d’image manquante ni d’erreur navigateur dans ces contrôles.
- Commandes réelles du client interceptées dans une fixture locale : sélection, pause, amélioration, accélération, stockage, recettes du Noyau et du Catalyseur, changement d’onglet et sélection mobile. Les commandes n’ont pas modifié l’état économique du profil de test.
- Rafraîchissement du stock, conservation du même élément image, quantité et focus d’expédition vérifiés.

Les essais navigateur utilisent un profil synthétique et des commandes neutralisées ; ils ne constituent pas une session MMO authentifiée. Aucun compte réel ni service de production n’a été modifié. Preuves : `output/refinery-orbital-20261025/browser-verification.json` et captures dans le même dossier.

Des changements parallèles de l’importmap sont arrivés pendant l’intégration. Ils ont été conservés ; la fixture a été régénérée depuis l’index courant, puis les 42 tests et les contrôles navigateur ont été réexécutés avec succès. `local-manifest.json` décrit les sept fichiers d’exécution de cette livraison locale et les différences parallèles observées.

## État de livraison

Version validée publiée sur https://avosoma.absyrion.com/ le 25/10/2026 13:42:04 CET, cache `20261025-orbital3`. La publication précédente avait été interrompue pour les corrections de disposition et de lisibilité ; la troisième version a ensuite été explicitement validée et autorisée par l’utilisateur.

- Sept fichiers d’exécution publiés, avec `index.html` en dernier. Les empreintes du paquet local, du candidat distant, des fichiers installés et des sept réponses HTTPS correspondent. Le manifeste exact est `output/refinery-orbital-20261025/release/manifest.json`.
- Index et imports de styles reconstruits à partir des fichiers publics courants : 423 alias existants conservés, 552 fichiers sources contrôlés hors livraison préservés. Les changements parallèles locaux n’ont pas été publiés globalement.
- Sauvegarde de retour arrière : `/opt/avosoma-backups/20261025-orbital3-123720`, avec les anciennes versions des quatre fichiers existants et un manifeste décrivant aussi les trois nouveaux fichiers. Aucun fichier de serveur ni donnée économique n’a été modifié par la livraison.
- 42 tests ciblés réussis sur la copie du runtime de production avec la livraison appliquée ; 30 rendus sur le candidat gelé, puis 30 rendus utilisant les fichiers réellement récupérés depuis HTTPS. Sélection, pause, amélioration, accélération, expédition, stocks et recettes ont été contrôlés avec un profil synthétique et des commandes neutralisées. Ces essais ne constituent pas une session MMO authentifiée.
- Service `avosoma-beta.service` actif, même PID `2362785`, `NRestarts=0`, aucun redémarrage. PostgreSQL prêt, `/health` HTTP 200, aucune écriture en attente ni limitation de débit signalée au contrôle final. Aucun nouveau journal d’erreur détecté depuis l’installation.

Preuves de publication : `release/publish-result.json`, `release/verify-result.json`, `release/public-verification.json`, `release/validate.log`, `release/candidate-browser/` et `release/public-browser/`. La première exécution du contrôle navigateur public a rencontré un problème de fermeture de requêtes interceptées dans le banc de test ; la fermeture des routes a été corrigée, puis le contrôle complet a réussi avec un code de sortie nul. Aucun correctif du jeu n’a été nécessaire pour ce problème de banc de test.

Correctif de cadrage publié ensuite à 14 h 05 (Paris), cache `20261025-orbital-fit1` : le bloc complet tient dans la hauteur de la fenêtre au bas de la page sur les formats de bureau vérifiés. Cette version a ensuite été remplacée à 14 h 49 par `20261025-orbital-fluid1`, pour supprimer les bandes latérales créées par le centrage. La scène occupe toute la largeur, avec un atlas transparent et des positions propres à chaque machine. Voir `docs/RAFFINERIE_LARGEUR_2026-10-25.md` pour la correction finale, ses nouveaux assets et ses preuves de publication.
