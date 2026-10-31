# Mini-carte : suivi du monstre verrouillé

Publié le 24 octobre 2026, version `20261024-lock1`.

Le petit point rouge d'un monstre sélectionné reste visible sur toute la carte courante, même lorsque le pilote s'éloigne au-delà de son radar. Sa position suit les coordonnées vivantes du monstre ; aucune ancienne position n'est conservée séparément. Le changement de cible remplace le suivi. Le déverrouillage, la destruction et le changement de carte retirent le point distant. Les monstres voisins gardent leur visibilité radar habituelle et les portails conservent leurs règles de repères existantes.

## Implémentation

- `src/game/render/combatScene.js` transmet la sélection courante au rendu de la mini-carte.
- `src/game/render/canvasHud.js` exempte uniquement le monstre sélectionné du filtre de distance et écarte les entités mortes. Il utilise l'identifiant vivant, sans créer de suivi persistant ni de nouveau cercle.
- `index.html` actualise seulement les alias d'import des deux modules avec le jeton de version.

Le serveur diffuse déjà les monstres vivants de toute la carte. Aucun changement de protocole, de serveur ou de profil n'était nécessaire. La sélection et son nettoyage existants restent utilisés.

## Vérification

Les sept tests de comportement ajoutés dans `server/test/minimap-locked-target.test.js` couvrent les quatre quadrants hors radar, la visibilité des autres monstres, le déverrouillage, le changement de cible, l'identité et les coordonnées vivantes, la mort, les snapshots complets et différentiels, le changement de carte et les portails. Six échouaient avant le correctif. Les 56 tests ciblés passent localement et sur un candidat constitué des sources actuellement en production et des deux modules corrigés.

Un scénario local de navigateur utilise le véritable rendu de scène, les interactions et la synchronisation des ennemis du jeu. Un serveur Socket.IO isolé lui transmet les snapshots produits par le gestionnaire de monde. Sept contrôles passent, dont le déplacement réseau du monstre à 7 004 unités du pilote pour un radar de 1 250 unités, le changement de cible, le déverrouillage, Échap, la mort et le changement de carte. Aucun compte ou profil public n'est utilisé par cette simulation. Aucun message d'erreur navigateur n'a été observé.

## Publication

Trois fichiers frontend ont été installés avec contrôle des empreintes et sauvegarde sous `/opt/avosoma-backups/20261024-lock1`. Une modification concurrente de l'index a été détectée avant toute écriture ; le paquet a été reconstruit depuis l'index plus récent. Les autres changements ont été conservés, y compris le traitement optionnel des stations déjà présent dans le rendu public.

Les trois empreintes HTTPS publiques sont conformes au paquet. Le service est resté actif avec le PID `928637`, zéro redémarrage, PostgreSQL disponible et aucune erreur fraîche dans le journal de publication. Les éléments de preuve, le manifeste, les résultats et la capture du scénario local sont dans `output/minimap-lock-2026-10-24/`.
