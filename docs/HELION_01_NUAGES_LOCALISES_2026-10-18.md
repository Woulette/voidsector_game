# Helion-01 : nuages localisés pour l'orientation

Cet essai a été remplacé par la [révision de profondeur et de parallaxe](HELION_01_PROFONDEUR_ET_PARALLAXE_2026-10-18.md), qui rétablit des plans de nuages intermédiaires et proches, ajoute une parallaxe aux rochers et supprime le contour rouge.

Essai publié sur Netcup le 18 octobre 2026 à 19 h 39, heure de Paris.
Version navigateur : `20261018-helion-cloud-zones1`.

## Répartition

Les trois grandes couches de nébuleuse qui restaient presque toujours dans le champ de la caméra sont remplacées par cinq poches fixes dans les coordonnées du secteur : deux composent une zone plus dense au nord-ouest, une forme un voile plus fin au nord-est, et deux créent une zone moins dense au sud-est. Le centre et de larges passages restent sans nuages. Les tailles, proportions, angles et opacités des poches varient pour distinguer ces régions.

Ces poches suivent `space: "world"` et `p: 1` : elles restent au même endroit lorsque le joueur se déplace ou change de résolution. Le rendu de fond accepte désormais cette option explicite. Les anciens fonds sans cette option conservent leurs coordonnées et leur parallaxe. Le retrait hors écran tient compte des coins d'un nuage tourné pour éviter sa disparition prématurée.

L'essai est limité à Helion-01. La planète, les rochers variés, les limites visuelles et les données de gameplay conservent la version précédente. La texture transparente existante est réutilisée : aucun nouvel asset n'est chargé par le jeu, aucun masque ni filtre dynamique n'est ajouté. Le réglage des nébuleuses continue à masquer ces poches ; les parties du secteur hors écran sont ignorées par le dessin.

## Contrôles et captures

- Tests serveur : **1 055 / 1 055** ; tests client : **40 / 40** ; syntaxe des sept modules JavaScript publiés : OK.
- Deux régressions ajoutées pour la stabilité des repères malgré les mouvements de caméra et tailles de fenêtre, la compatibilité de l'ancienne parallaxe, le réglage des nébuleuses et les coins visibles des nuages tournés.
- Inspection dans l'aperçu isolé utilisant les fonctions réelles de rendu : nord-ouest dense, nord-est plus léger et centre dégagé. Aucune erreur console observée. Il ne s'agit pas de captures d'une partie multijoueur connectée.
- Contrôle du vide extérieur : **36 combinaisons** qualité/zoom/vue, **12 870 pixels** noirs et opaques hors secteur, sans échec.
- Mesure sur le trajet de 240 positions de l'aperçu, qualité haute, 1 280 × 720 et caches préchauffés : **0,293 ms avant**, **0,269 ms après** en moyenne ; P95 **0,5 ms** dans les deux cas. Ce résultat porte sur les commandes CPU du décor de ce trajet ; il ne démontre pas un gain global de FPS ni une mesure du GPU.
- Publication vérifiée : **11 empreintes publiques identiques**, dont trois captures JPEG pour l'affichage sur téléphone. Santé publique HTTP 200, PostgreSQL prêt, service actif et même processus, sans redémarrage.

Les trois captures JPEG sont dans `output/helion01-assets/2026-10-18/` et sont accessibles sous `https://avosoma.absyrion.com/assets/maps/previews/helion01-cloud-zones1/` :

- `helion-one-clouds-dense.jpg`
- `helion-one-clouds-light.jpg`
- `helion-one-clouds-clear.jpg`

Les captures publiques ne sont pas référencées par le cache d'assets du jeu et ne se chargent pas pendant une partie.

## Version précédente conservée

Le créateur n'a pas encore jugé le résultat sur PC ; cet essai reste réversible. La répartition précédente des nuages est conservée dans les sauvegardes complètes des huit fichiers client concernés. Les trois captures sont les seuls nouveaux fichiers publics de cette passe.

- Sauvegarde locale : `C:\Users\Ntmav\.codex\backups\voidsector_game\20261018-helion-cloud-zones-before`.
- Sauvegarde serveur : `/opt/avosoma-backups/helion-cloud-zones-20261018`.
- Archive, manifeste, différences ciblées, tests, mesures, contrôles et outil de retour arrière : `tmp/helion-cloud-zones-release/` et `/tmp/avosoma-helion-cloud-zones-20261018` sur le serveur.

La publication a vérifié la version précédente avant remplacement, copié les fichiers atomiquement et installé l'index en dernier. Aucun fichier serveur ni profil joueur n'a été modifié. Si un retour arrière est demandé plus tard, comparer l'état courant au manifeste avant de restaurer la sauvegarde pour préserver d'éventuels changements ultérieurs.
