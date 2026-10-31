# Boss Parasite rond — couronne organique, 25 octobre 2026

Le joueur demande de différencier le boss du commun, puis précise que **le corps doit rester rond**. La proposition active conserve ce corps circulaire et ajoute une couronne de six plaques autour du noyau, six grosses glandes de venin et des tentacules segmentés. L'essai allongé est écarté ; ses sources sont conservées dans `output/parasite-boss-form-2026-10-25/`, sans être chargées par l'atelier.

Cette étape reste **locale, sans publication**. Le commun validé demeure la référence affichée à gauche. La fumée des vaisseaux travaillée précédemment n'est pas modifiée dans cette reprise.

## Illustration et animation

L'illustration transparente est enregistrée sans retouche dans `assets/enemies/parasite-boss-v3/parasite-source.png`. Le prompt exact est conservé dans `ART_PROMPT.md` à côté ; génération via l'outil intégré `image_gen`, avec l'ancien boss rond et le commun validé comme références.

Les profils de la famille restent dans `parasite/profiles.js`. Le boss conserve les dimensions natives 104 × 104 et le facteur de dessin 0,94 ; aucune statistique n'est changée pour ajuster son dessin. Le corps est découpé par deux cercles, sans axe allongé. Sa respiration et sa contraction au tir utilisent le même facteur horizontal et vertical.

`parasite/bossMotion.js` anime uniquement le boss : une onde lente parcourt les six tentacules, une contraction accompagne la préparation du tir de démonstration, puis une détente les relâche. Les racines suivent la carapace et les extrémités restent souples. L'angle de déplacement existant est conservé, sans rotation autonome de la coque.

`parasite/bossCrown.js` découpe les pixels peints de la couronne en six plaques, une seule fois par illustration. Une membrane en retrait comble les interstices ; les plaques se déplacent légèrement vers l'extérieur et pivotent en alternance avant le tir, à l'intérieur du corps rond. Le noyau conserve son éclat vert. Le renderer compose ces couches seulement pour le boss ; le dessin du commun garde ses paramètres et son chemin de déformation précédents.

## Vérifications

- **39 tests ciblés réussis** : 15 Parasite existants, 6 nouveaux scénarios de forme/couronne et 18 scénarios de poursuite.
- Corps circulaire pendant respiration, préparation et détente ; six secteurs contigus, racines attachées, mouvement distal sur un cycle complet, aucun faux tir en patrouille, plaques maintenues dans la carapace.
- Les triangles du nouveau maillage ne s'inversent pas pendant les poses complètes de déplacement et de tir. Brume vérifiée à 30/60/120/144/240 Hz avec positions de simulation à 60 Hz.
- Syntaxe de sept modules vérifiée. Empreintes inchangées pour le PNG commun, ses mouvements et sa brume, le catalogue des ennemis, les règles d'orientation et la fumée des vaisseaux.
- Contrôle navigateur en ×1/×3, poursuite et vol avec tirs, capture de l'éclat du noyau. Aucune erreur ou alerte console observée. PNG RGBA avec transparence réelle.

Aucun changement de serveur, collision, poursuite, vitesse, poison, cadence ou projectile. Aucune partie MMO authentifiée ni publication revendiquée.

Preuves et captures : `output/parasite-boss-round-2026-10-25/`.

Ouvrir `/tools/vfx-lab/?mode=enemies&subject=boss_chasseur_spectral&scenario=showcase&view=macro&revision=parasite-boss-round-3&surface=shield`.
