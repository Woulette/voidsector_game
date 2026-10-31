# Tentacules indépendants et arcs du Traqueur — 25 octobre 2026

Publication ultérieure : les changements de cette proposition sont en ligne dans le lot `20261025-tracker-parasite1`, publié à 15 h 51 Paris. Voir `docs/TRAQUEUR_PUBLICATION_ET_BOSS_2026-10-25.md`. Le contenu ci-dessous décrit l'étape locale précédente.

Évolution locale demandée après examen du Traqueur bleu : les tentacules du Parasite manquent d'amplitude et leurs gestes se répètent trop ; le Traqueur doit recevoir des arcs électriques. **Cette étape n'est pas publiée.** Les illustrations et les fumées précédemment publiées sont conservées.

## Parasite commun et boss

`src/game/render/parasiteTentacles.js` définit six rythmes distincts avec des enveloppes d'activité propres, des pauses progressives, une courbure variable, de petits étirements et une ondulation vers les pointes. Une interpolation lisse et déterministe fait évoluer ces gestes, sans tirage aléatoire à chaque image. La vitesse et l'amplitude évoluent séparément pour chaque membre ; le boss garde un rythme plus lent.

`parasiteMotion.js` et `parasiteBossMotion.js` appliquent ces mouvements aux membres. Les attaches et le noyau restent stables ; le boss conserve sa coque ronde, sa couronne et sa réaction au tir. `parasiteSprite.js` calcule seulement six états de mouvement par dessin et les réutilise sur les bandes du maillage.

Sur trente secondes au repos, les excursions des six pointes communes sont multipliées respectivement par 1,85 ; 2,04 ; 1,63 ; 1,85 ; 2,07 ; 1,72, par rapport au mouvement précédent. Il s'agit d'une mesure de la pose du sprite, pas d'un changement de déplacement ou de vitesse du monstre.

L'atelier conserve l'ancienne animation dans `tools/vfx-lab/parasite/beforeMotion.js`, `beforeBossMotion.js` et `beforeRenderer.js`. La comparaison affiche le même commun ou le même boss à gauche et à droite ; le boss Parasite n'est plus comparé au commun pour cette retouche de mouvement. Les illustrations restent identiques.

## Traqueur abyssal

`tools/vfx-lab/tracker/electricity.js` ajoute des filaments cyan à cœur clair entre des appendices et la coque. Les points d'attache suivent leur déformation. Les décharges restent brèves et irrégulières, avec au plus deux arcs simultanés et une présence renforcée pendant le flash du tir. Une graine dérivée de l'identifiant évite de synchroniser tous les futurs Traqueurs ; la géométrie reste stable entre deux pas de scintillement.

Le renderer local conserve la base bleue v4 tournée à 180°, ses membres et sa brume. Les arcs sont uniquement cosmétiques ; ils ne créent aucune attaque, aucun dégât ni effet de zone.

## Vérification

- **56 tests réussis** : mouvements commun/boss, racines, forme ronde, couronne, absence de tir inventé, déformation sans inversion des triangles, continuité à 240 Hz, intermittence et budget des arcs, sillage du Traqueur, plus réception/interpolation/rendu natifs des Parasites à 30/60/120/144/240 Hz et avec limite de FPS.
- 12 modules contrôlés par `node --check`, vérification des espaces réussie.
- 13 empreintes conservées : illustrations, profils, catalogue, orientation, poursuite, définition et attaque serveur, ainsi que les quatre fumées. La fumée du joueur n'est pas modifiée dans cette étape.
- Contrôle navigateur de l'ancien et du nouveau commun, du boss et des arcs du Traqueur. Aucun avertissement ni erreur console observé. Il s'agit de scènes de démonstration locales, sans compte MMO connecté.

Preuves : `output/parasite-tentacles-tracker-arcs-2026-10-25/`, avec `validation.json`, `guards-before.json`, les sources avant/après, `parasite-independent.png`, `parasite-boss-independent.png`, `tracker-arcs-final.png` et `browser-warnings.json`.

Aperçus locaux :

- Parasite : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=chasseur_spectral&scenario=patrol&view=macro&revision=parasite-motion-tracker-arcs-1`.
- Traqueur : `http://127.0.0.1:8765/tools/vfx-lab/?mode=enemies&subject=cuirasse_nebulaire&scenario=showcase&view=macro&revision=parasite-motion-tracker-arcs-1`.
