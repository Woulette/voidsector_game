# Azuron — décor en morceaux et couches de profondeur

**Complément publié à 14 h 28**, `20261025-azuron-distant1` : les plans intermédiaire et proche ainsi que les petites poussières sont retirés. Seuls les six nuages lointains restent, avec trois zones lumineuses accentuées. Cette correction remplace la composition à 22 éléments décrite dans l’historique ci-dessous ; voir [AZURON_LUMIERES_2026-10-25.md](AZURON_LUMIERES_2026-10-25.md).

Publié le **25 octobre 2026 à 14 h 13, heure de Paris**, version `20261025-azuron-layers1`.

La scène utilise désormais **22 éléments transparents répartis en trois plans de profondeur**. L’illustration unique agrandie de la première version n’est plus dessinée dans l’arène. Elle sert uniquement d’aperçu réduit dans la mini-carte.

## Images et composition

Trois PNG RGBA natifs de **1 536 × 1 024**, créés avec **imagegen intégré**, sans agrandissement ni retouche de l’ancienne image :

| Élément | Asset | Prompt conservé |
| --- | --- | --- |
| Brume lointaine | [azure-mist.png](../assets/maps/decor/azuron-layered-v1/azure-mist.png) | [prompt-azure-mist.md](../output/azuron-layered-2026-10-25/prompt-azure-mist.md) |
| Nuage intermédiaire | [azure-cloud.png](../assets/maps/decor/azuron-layered-v1/azure-cloud.png) | [prompt-azure-cloud.md](../output/azuron-layered-2026-10-25/prompt-azure-cloud.md) |
| Filaments proches | [azure-filaments.png](../assets/maps/decor/azuron-layered-v1/azure-filaments.png) | [prompt-azure-filaments.md](../output/azuron-layered-2026-10-25/prompt-azure-filaments.md) |

Six éléments lointains utilisent des parallaxes de 0,08 à 0,10 ; douze éléments intermédiaires, de 0,28 à 0,38 ; quatre voiles proches, de 0,64 à 0,80. Les morceaux sont placés sur la carte, tournés et parfois retournés avec des opacités distinctes. Leur alpha se fond dans le ciel ; le renderer existant écarte les morceaux hors champ. La zone centrale reste plus sombre pour les combats.

La largeur affichée maximale est **760 pixels logiques**, avec le ratio natif 3:2 conservé. À une densité de canvas ×2, le plus grand morceau occupe 1 520 pixels physiques sur une source de 1 536 pixels : **aucune interpolation d’agrandissement jusqu’à ×2**. Découper l’ancienne illustration seule n’aurait pas ajouté de détails ; cette version emploie de nouveaux éléments natifs indépendants.

`src/game/combatData/azuronArena.js` compose toute la scène. Aucun changement du renderer général, des portails existants ou des règles de jeu n’est nécessaire. Les sources sont chargées une seule fois par le cache de carte existant et réutilisées par les 22 placements. Dimensions de l’arène : **7 800 × 5 400 unités**, comme précédemment.

## Vérifications

- Audit des trois fichiers : canaux RGBA réels, 39,8 à 50,5 % des pixels entièrement transparents, alpha maximal d’un pixel sur le bord limité à 1/255. Les dimensions et les proportions des 22 placements restent sous les dimensions natives à densité ×2.
- Audit géométrique sur 15 combinaisons : formats 1 280 × 720, 1 920 × 1 080 et 2 560 × 1 440, centre et quatre positions éloignées de la carte. Entre 9 et 18 morceaux visibles suivant la position et la taille de vue. Cet audit vérifie projection et dimensions ; les captures navigateur sont prises à 1 280 × 720.
- Vrai client et serveur dans une copie isolée avec compte local : portes après la première série, scène au centre, déplacement par clic sur la mini-carte jusqu’à environ `(2 900, -850)` unités. Les couches se déplacent distinctement et ne montrent aucun bord de rectangle visible. Console sans erreur ni avertissement. Les ennemis de la série sont retirés par un bouton QA ; ce contrôle ne constitue ni un run gagné normalement ni une partie authentifiée sur le MMO public. Aucun compte public n’a été modifié pour la QA.
- **160 tests ciblés réussis**, sans test ignoré, sur candidat local, staging et sources effectivement déployées. Syntaxe et `git diff --check` du périmètre conformes.

Captures : [centre](../output/azuron-layered-2026-10-25/browser-layered-centre.png), [après déplacement](../output/azuron-layered-2026-10-25/browser-layered-east.png). Le chat et les diagnostics sont repliés, les commandes QA masquées et la mini-carte déplacée uniquement dans le compte local pour inspecter la scène.

## Publication

**Cinq fichiers frontend livrés** : trois PNG, le module d’arène et l’index avec trois alias de cache actualisés. Index publié en dernier, **cinq empreintes HTTPS conformes**, **565 gardes de sources contrôlées**, dont **560 fichiers préservés**. Aucun fichier serveur ni donnée de compte dans le payload, aucun redémarrage. Service inchangé, PID **2362785**, `NRestarts=0` ; PostgreSQL prêt et aucun nouveau journal d’erreur au contrôle.

Sauvegarde : `/opt/avosoma-backups/20261025-azuron-layers1-131357`. Preuves : `output/azuron-layered-2026-10-25/`, notamment `asset-metadata.json`, `layer-audit.json`, `candidate-tests.log`, `deploy-result.json`, `verify-result.json`, `manifest.json` et `source-guards.json`.
