# Mini-carte : fond fixe du secteur — 23 octobre 2026

Statut : publie sur Avosoma, version `20261023-minimap4`, commit GitHub `427195b`.

La demande est une vue d'ensemble illustree et immobile : fond nuageux continu, planete et source lumineuse a des positions approximatives fixes, avec les marqueurs de navigation par-dessus.

## Image du secteur

- `assets/maps/minimaps/helion-01.png` est une capture de decor de 1 200 x 960 pixels produite par le renderer du jeu dans `tmp/minimap-scenery-20261023/capture-static.html`.
- La composition de mini-carte est definie dans `src/game/combatData/miniMapVisuals.js` : planete en bas a gauche, source lumineuse au-dessus a droite. Ce placement illustratif est independant des coordonnees de parallaxe de la grande vue.
- Une seule grande texture couvre le ciel pour former un fond nuageux continu. Les petits nuages individuels, les asteroides et les epaves ne sont pas recopies.
- La capture ne contient aucun joueur, HUD, portail ou marqueur. Ces elements sont superposes dans la mini-carte, a leurs vraies coordonnees de navigation. Les batiments gardent leurs positions et la visibilite des services suit celle du monde.

## Code et cache

`miniMapScenery.js` n'utilise plus la camera du joueur pour placer ou rafraichir le fond. Le PNG est charge une fois par le cache de map (`combatAssets.js`), puis reduit a la taille du widget. Le cache de rendu n'est invalide que par un changement de map, de dimensions, de services visibles ou de textures disponibles. Deplacement et zoom n'invalident pas le fond.

Les autres secteurs conservent un apercu fixe calcule au centre du secteur. Aucun serveur, profil, asset de la grande vue ou gameplay n'est modifie. Les proportions, deplacement du widget, boutons +/- et conversion des clics sont conserves. Version de cache locale : `20261023-minimap4`.

## Habillage de navigation

Apres validation du fond fixe par le createur, une seconde demande porte sur l'habillage du widget. `miniMapChrome.js` dessine un cadre bleu graphite a angles coupes, le nom du secteur sur deux niveaux, des boutons +/- plus larges et une barre de coordonnees separee. Le fond valide et sa composition ne sont pas modifies.

A la demande du createur, le quadrillage, ses croisements et les reperes A-E / 1-4 sont retires. Le titre reprend l'icone de planete du systeme de la carte : Helion/Astra rouge, Nereid/Cygnus bleu, Aureon/Solarys jaune et Sylva/Verdantis vert, independamment de la firme du joueur. Le joueur est une petite fleche cyan entouree d'un repere ; le QG, les services et les portails ont des silhouettes distinctes. Le trajet reste dore. Les marqueurs et le radar sont limites au rectangle de carte, afin de ne pas deborder sur les coordonnees ou l'en-tete.

`miniMapLayout.js` partage les marges exactes du contenu avec `minimapState.js`. Les proportions s'appliquent a l'image interieure, y compris apres migration d'une taille sauvegardee. Le cadre et la barre de coordonnees absorbent leurs clics ; seule l'image interieure commande une destination. Les boutons gardent le redimensionnement existant et l'en-tete permet de deplacer le panneau.

## Verification

- Tests cibles : 44 reussis (mini-carte, chargement des assets, portails fermes/prepares, hub et decor Helion-01).
- Nouvelle passe apres habillage : 1 362 tests serveur reussis ; suite client : 40 reussis. Le lot mini-carte et survol des services comporte 13 tests reussis, dont les coordonnees aux bords, les boutons et les clics sur le cadre.
- Controle raster dans le navigateur : fond de 360 x 288 pixels strictement identique apres un deplacement simule de 6 000 unites et un changement de zoom ; **0 pixel modifie**. Le controle utilise le vrai renderer de fond de la mini-carte.
- L'apercu integre utilise `createCombatSceneRenderer.drawMiniMap`, comme le jeu ; aucun compte multijoueur n'est connecte pour cette verification.
- Verification syntaxique des modules et `git diff --check` reussis. Journaux : `tmp/minimap-scenery-20261023/design-server-tests.log` et `design-client-tests.log`.

Sauvegardes de l'etat precedent : `C:/Users/Ntmav/.codex/backups/voidsector_game/20261023-minimap-static-before/` et `20261023-minimap-habillage-before/`. Les changements concurrents du checkout sont preserves. Publication effectuee par superposition limitee a 11 fichiers frontend, en conservant le dernier index de production. Les 11 empreintes publiques correspondent au candidat valide. Le serveur reste actif avec le meme PID et aucun redemarrage ; PostgreSQL est pret. Sauvegarde distante : `/opt/avosoma-backups/20261023-minimap4`. Push du commit `427195b` sur `origin/main` verifie. Preuves : `output/minimap-release-2026-10-23/public-verification.json` et `deployment.log`.

Apercu local : `http://127.0.0.1:8765/tmp/minimap-scenery-20261023/release.html?v=minimap4` ; bouton « Voir le detail » pour examiner la mini-carte seule.

Regression finale : selection de la planete du secteur testee sur Helion, Nereid/Cygnus, Aureon et Sylva, y compris lorsque la firme du joueur differe. Dix tests locaux cibles et six tests du candidat de publication reussis. Verification navigateur H1 et Nereid-01, puis chargement du client public. Aucun compte de jeu utilise pour ces nouveaux controles.
