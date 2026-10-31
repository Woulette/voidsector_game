# Azuron — nébuleuse plus dense, assortie à la mini-carte

Publié le **25 octobre 2026 à 15 h 26, heure de Paris**, version `20261025-azuron-nebula2`.

Le fond de l’arène reprend les masses de gaz bleues, leurs creux sombres et leurs vallées lumineuses visibles sur la mini-carte. La composition passe de six nuages séparés à **17 morceaux lointains**, avec deux ensembles plus lumineux en haut à gauche et en bas à droite et des nappes moins intenses qui les relient. Les contours ne reçoivent plus les anciens filtres de luminosité ; le mélange conserve les volumes sombres des images.

Toutes les parallaxes restent entre **0,045 et 0,08**. Aucune poussière proche ni couche de premier plan n’est réintroduite. L’arène conserve ses dimensions et les portails existants. L’image d’ensemble préférée par l’utilisateur reste celle de la mini-carte ; elle n’est pas étirée sur l’arène.

## Images et provenance

Deux nouveaux PNG **RGBA 1 536 × 1 024**, créés avec **imagegen intégré** à partir du panorama `assets/maps/decor/azuron-blue-v1/azure-nebula.png` comme référence visuelle. Les fichiers d’origine générés sont conservés dans le dossier imagegen ; leurs copies utilisées par le projet sont ci-dessous. La brume `azure-mist.png` existante complète les deux nouveaux motifs.

| Morceau | Fichier utilisé | Prompt exact |
| --- | --- | --- |
| Nébuleuse céleste | [celestial-bank.png](../assets/maps/decor/azuron-nebula-v2/celestial-bank.png) | [prompt-celestial-bank.md](../output/azuron-nebula-coherence-2026-10-25/prompt-celestial-bank.md) |
| Banc de faille | [rift-bank.png](../assets/maps/decor/azuron-nebula-v2/rift-bank.png) | [prompt-rift-bank.md](../output/azuron-nebula-coherence-2026-10-25/prompt-rift-bank.md) |

Chaque placement garde les proportions natives et une largeur maximale de **760 pixels logiques**. À une densité de canvas ×2, sa largeur physique de 1 520 reste sous les 1 536 pixels de la source. Les morceaux se chevauchent avec leur alpha naturel ; les trois sources ne sont chargées qu’une fois chacune par le cache de carte.

## Vérifications

- Dimensions, canaux alpha et transparence des bordures vérifiés. Entre 38 et 40 % des pixels des deux nouveaux éléments sont entièrement transparents ; alpha maximal sur la bordure : 7/255 pour le premier et 1/255 pour le second.
- Audit de projection sur **15 combinaisons** : 1 280 × 720, 1 920 × 1 080 et 2 560 × 1 440, au centre et à quatre positions éloignées de l’arène. Entre 15 et 17 morceaux visibles, tous sous leurs dimensions natives à densité ×2. Cet audit est géométrique ; les captures navigateur sont prises à 1 280 × 720.
- **165 tests sur 165**, sans test ignoré, sur le candidat final, le staging distant puis les sources effectivement déployées. Couverture : Azuron, reprise et vies, portails, mini-carte, cache/streaming et rendu. Syntaxe et `git diff --check` du périmètre validés.
- Client et serveur réels dans une **copie isolée avec compte local** : contrôle au centre, deux portes ouvertes après un nettoyage QA, puis déplacement par la mini-carte à environ `(2 730, -850)` unités. La densité et les détails restent présents pendant le déplacement ; console sans erreur ni avertissement. Le bouton QA retire les ennemis pour stabiliser la scène : ces captures ne représentent ni un run gagné normalement ni une session authentifiée sur le MMO public. Aucun profil public modifié pour la QA.

Captures : [centre et mini-carte](../output/azuron-nebula-coherence-2026-10-25/browser-nebula-centre.png), [après déplacement](../output/azuron-nebula-coherence-2026-10-25/browser-nebula-east.png).

## Publication

**Quatre fichiers frontend livrés** : les deux PNG, `src/game/combatData/azuronArena.js` et `index.html` publié en dernier avec cinq alias de cache actualisés. Quatre empreintes HTTPS publiques conformes et **575 gardes** vérifiées, dont **571 fichiers préservés**. La publication concurrente de la collecte de butin a été détectée avant installation ; la base publique a été rafraîchie et ses changements conservés.

Le serveur n’est pas redémarré par cette livraison. PID **2491946**, `NRestarts=0`, PostgreSQL prêt et santé serveur correcte ; aucune nouvelle erreur détectée au contrôle. Sauvegarde : `/opt/avosoma-backups/20261025-azuron-nebula2-142626`.

Preuves : `output/azuron-nebula-coherence-2026-10-25/`, notamment `asset-metadata.json`, `layer-audit.json`, `candidate-tests.log`, `manifest.json`, `source-guards.json`, `deploy-result.json`, `verify-result.json` et `verification.json`. Les fichiers QA, comptes, tests et outils sont exclus du payload.
