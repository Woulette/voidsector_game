# Azuron — nuages lointains et lumière accentuée

**Composition remplacée à 15 h 26**, `20261025-azuron-nebula2` : le fond utilise désormais 17 morceaux lointains et deux nouvelles textures inspirées de la mini-carte. Les six nuages isolés et leurs filtres décrits ci-dessous sont remplacés. Voir [AZURON_NEBULEUSE_2026-10-25.md](AZURON_NEBULEUSE_2026-10-25.md).

Publié le **25 octobre 2026 à 14 h 28, heure de Paris**, version `20261025-azuron-distant1`.

La scène conserve uniquement les **six nuages lointains**, parallaxes de **0,08 à 0,10**. Les douze éléments intermédiaires, les quatre voiles proches et les cent petites poussières ajoutées dans la version précédente sont retirés. Les petits fragments glacés et les étoiles restent ceux du décor existant.

Trois éléments lointains reçoivent une lumière plus forte, comme les zones bleu clair de la référence de mini-carte fournie par l’utilisateur :

- Brume en haut à gauche : opacité 0,90, luminosité ×1,35, saturation ×1,12, contraste ×1,06.
- Nuage en bas à droite : opacité 0,92, luminosité ×1,45, saturation ×1,12, contraste ×1,08.
- Filaments lointains du haut : opacité 0,58, luminosité ×1,25, saturation ×1,10.

Les autres éléments conservent des intensités plus douces. Les filtres sont appliqués par le renderer existant ; aucun bitmap n’a été recréé ou agrandi. Les sources natives de 1 536 × 1 024 et la largeur maximale de 760 pixels logiques restent adaptées à une densité de canvas ×2. Le centre de l’arène reste dégagé.

## Vérification

Rendu observé dans une copie isolée du vrai client et du serveur, avec compte local, ouverture des deux portes après une série et rechargement conservant cette même tentative. Le chat et les diagnostics sont repliés, les commandes QA masquées et la mini-carte déplacée dans ce compte pour voir la scène. Console sans erreur ni avertissement. Les ennemis sont retirés par un bouton QA : ce contrôle ne constitue ni un run gagné normalement ni une partie authentifiée sur le MMO public. Aucun compte public n’a été modifié pour la QA.

Capture : [browser-distant-light.png](../output/azuron-distant-2026-10-25/browser-distant-light.png).

Audit des dimensions et projections sur 15 combinaisons de positions et tailles de vue : six sources dessinées, taille physique maximale sous la résolution native à densité ×2. **161 tests ciblés réussis**, sans test ignoré, sur le candidat final local, le staging et les sources effectivement déployées. Syntaxe et `git diff --check` du périmètre conformes.

Une publication concurrente d’Helion-03 et de la mini-carte a changé cinq fichiers pendant les contrôles. La première garde de publication l’a détectée et n’a rien installé. La capture publique a été rafraîchie, l’index reconstruit en conservant ces changements, puis les 161 tests courants ont tous passé. Les six écarts des nouveaux tests avec l’ancienne capture sont reproduits sur les sources antérieures et conservés dans `baseline-unrelated-tests.log` ; aucun test n’est écarté ou figé dans le candidat final.

## Publication

**Deux fichiers frontend livrés** : `src/game/combatData/azuronArena.js` et `index.html`, publié en dernier avec quatre alias de cache actualisés. Deux empreintes publiques HTTPS conformes, **565 gardes** vérifiées dont **563 fichiers préservés**, y compris les trois textures de nébuleuse et les portails existants. Aucun changement serveur ni redémarrage. PID **2362785**, `NRestarts=0`, PostgreSQL prêt, aucun nouveau journal d’erreur au contrôle.

Sauvegarde : `/opt/avosoma-backups/20261025-azuron-distant1-132829`. Preuves : `output/azuron-distant-2026-10-25/`, notamment `manifest.json`, `source-guards.json`, `snapshots/`, `layer-audit.json`, `deploy-result.json`, `verify-result.json` et `verification.json`.
