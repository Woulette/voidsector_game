# Grades : éclat du métal renforcé

Publié le 23 octobre 2026 sous `20261023-rankshine1`, après validation des formes de `20261023-coherence1`. Retour du créateur : beaux mais trop sobres, manque d’éclat.

Les 25 SVG conservent leurs silhouettes, galons, barrettes, étoiles et ornements. Les dégradés ajoutent des reflets spéculaires plus clairs, les arêtes biseautées accrochent davantage la lumière et les noyaux bleus sont ravivés. Les dorures et les gemmes rouges sont plus brillantes ; une légère lumière statique sur les tranches est plus marquée dans les hauts grades. Pas d’animation ni de symbole supplémentaire.

Contrôles : mêmes géométries SVG avant/après ; 25 fichiers rendus à 32, 128 et 256 px avec transparence conservée ; luminosité moyenne augmentée sur chacun. Comparatif visuel : `output/grades-eclat-2026-10-23/comparatif-eclat.png`.

Publication limitée à 25 images, au jeton de cache de `src/data/ranks.js` et aux alias correspondants de la page. Les règles d’attribution, points et quotas ne changent pas. Les travaux simultanés du profil, du HUD et des quêtes sont conservés. Un redémarrage bref permet également au serveur de transmettre les nouvelles URL d’insignes ; aucun portail actif au précontrôle.

17 tests locaux et 17 tests sur le candidat exact de production réussis, contrôle syntaxique du module et démarrage isolé réussis. Le test de présentation utilisé pour le candidat correspond à l’interface effectivement déployée : le test local courant avait déjà reçu une dépendance de la future interface de titres/ascension, absente du runtime public au moment du contrôle. Cette première tentative de validation est conservée ; aucun code de cette autre fonctionnalité n’a été ajouté au lot.

27 empreintes publiques sur 27 conformes, PostgreSQL prêt, service actif sans redémarrage automatique : PID `3943270`, `NRestarts=0`. Sauvegarde runtime `/opt/avosoma-backups/20261023-rankshine1` ; sauvegarde des profils effectuée service arrêté par le mécanisme existant. Aucune migration de données ni modification de gameplay dans ce lot. Aucun commit/push global.

Preuves et manifeste : `output/grades-eclat-2026-10-23/`.
