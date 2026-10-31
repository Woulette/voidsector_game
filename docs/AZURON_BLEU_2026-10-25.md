# Azuron — portails existants et nébuleuse bleue

**Complément publié à 14 h 13**, `20261025-azuron-layers1` : le fond unique agrandi décrit ci-dessous est remplacé par 22 morceaux transparents, trois sources natives et trois plans de profondeur. La petite mini-carte conserve l’illustration d’ensemble. Règles actuelles, assets, prompts et preuves : [AZURON_COUCHES_2026-10-25.md](AZURON_COUCHES_2026-10-25.md).

Publié le **25 octobre 2026 à 13 h 54, heure de Paris**, version `20261025-azuron-blue1`.

La correction visuelle remplace les deux anneaux dessinés pour les séries et le grand décor de ferraille par les visuels demandés pour un premier portail bleu. Les règles de vagues, les dimensions, les positions, les tentatives payées, les récompenses et les délais publiés plus tôt restent actifs.

## Portails

- À gauche, la continuation réutilise **l’image bleue existante d’Azuron**, `assets/portals/seuil_azuron.png`, avec le même halo que le portail préparé sur la carte de firme.
- À droite, la sortie réutilise **le portail de voyage déjà présent entre les secteurs** : `assets/portals/sector-travel/gate-rim-v1.png` et `energy-core-v1.png`. Son renderer existant conserve la profondeur du cadre, les particules et la charge liée au transfert réel de quatre secondes.
- `render/azuronGate.js` est un petit adaptateur vers ce renderer commun. `mapPortals.js` réutilise le renderer des portails préparés pour la continuation. Aucune nouvelle illustration de portail n’a été créée.

## Carte

Fond opaque créé avec **imagegen intégré** : [azure-nebula.png](../assets/maps/decor/azuron-blue-v1/azure-nebula.png), 1 536 × 1 024, 2 483 540 octets. Le prompt complet est conservé dans [imagegen-prompt.md](../output/azuron-blue-visuals-2026-10-25/imagegen-prompt.md).

La composition utilise des nuages bleu azur et cobalt, des filaments cyan, une zone centrale plus sombre et de fines poussières froides. Le fond se déplace lentement en parallaxe ; de petits fragments glacés ajoutent une profondeur discrète. Le cadre industriel et ses tons rouille ne sont plus référencés par l’arène active. Les anciens assets sont conservés pour l’historique et le retour arrière.

`combatData/azuronArena.js` porte cette composition et sa référence `miniMapVisual`, reprise par `miniMapVisuals.js` pour que la mini-carte affiche exactement la même illustration. `combatAssets.js` précharge les trois textures de portails nécessaires à leurs apparitions entre les séries, via `portalAssets`.

## Vérifications et publication

- **160 tests ciblés réussis sur 160**, sans test ignoré, sur le candidat local, le staging puis les sources effectivement déployées : Azuron et ses trente vagues, tentatives et vies, récompenses, reprise, transferts de portail, renderer commun des portails, mini-cartes, graphismes des autres firmes, streaming et culling des assets. Le test historique `azuron-scenery.test.js` concerne le prototype violet non livré ; il ne fait pas partie de cette sélection.
- Copie isolée du vrai client et du serveur, avec son propre compte : première série vidée par un bouton QA, les deux textures existantes et la nouvelle mini-carte observées, sortie par J mesurée à **4 010 ms**, puis reprise confirmée à la **vague 6**. Console sans erreur ni avertissement. Ce contrôle ne constitue ni un run gagné normalement ni une partie authentifiée dans le MMO public. Aucun compte public n’a été modifié pour la QA.
- Capture : [browser-blue-gates.png](../output/azuron-blue-visuals-2026-10-25/browser-blue-gates.png). Le panneau de diagnostics et le chat ont été repliés dans le compte local pour voir les portails ; le cadre « TEST LOCAL » appartient uniquement à l’outil de vérification.
- Syntaxe des cinq modules vérifiée ; `git diff --check` du périmètre conforme. Le changement de `combatAssets.js` a été reporté par hunk sur la version publique fraîche afin de préserver ses autres modifications.

**Sept fichiers frontend livrés**, dont le PNG et `index.html` publié en dernier. **Sept empreintes HTTPS** conformes, **562 gardes** contrôlées dont **555 fichiers préservés**. Sauvegarde : `/opt/avosoma-backups/20261025-azuron-blue1-125416`. Aucun fichier serveur ni donnée de compte dans le payload, aucun redémarrage. Service inchangé, PID **2362785**, `NRestarts=0`, PostgreSQL prêt, aucune erreur du processus au contrôle.

Manifestes, sources antérieures, archive, copie publique et rapports sont dans `output/azuron-blue-visuals-2026-10-25/`, notamment `manifest.json`, `source-guards.json`, `deploy-result.json`, `verify-result.json` et `verification.json`.
