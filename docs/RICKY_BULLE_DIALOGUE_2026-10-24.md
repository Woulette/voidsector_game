# Ricky : retour a une bulle de dialogue — 24 octobre 2026

Demande : remplacer le panneau de transmission precedent par une bulle proche de l'ancienne, plus travaillee et plus compacte, en conservant les textes et le theme du jeu.

`npcDialogueView.js` compose une bulle avec le nom de Ricky accroche au contour, un rappel discret de la mission, le compteur de repliques et deux commandes compactes. Le grand portrait et le bandeau de transmission disparaissent. `npcDialogue.css` dessine le contour arrondi asymetrique, le double filet cyan et la pointe courbe en SVG. Les textes restent a 17 px sur ordinateur et 16 px sur mobile ; les boutons et les touches de lecture/relecture sont conserves.

`questNpcDialogue.js` limite la largeur a 480 px, mesure la hauteur de la replique complete pendant la frappe et place la pointe vers Ricky. Quand le haut de l'ecran manque de place et que le bas permet de contenir la bulle, celle-ci passe sous la soucoupe avec sa pointe retournee. Sur un tres petit ecran ne laissant assez de place d'aucun cote, le cadre reste contraint dans l'ecran. Aucune modification des dialogues, des conditions de quetes, du don de cle ou des animations de la soucoupe.

## Verification

- 17 tests existants reussis localement et sur le candidat distant : dialogues, progression niveau 10 et recuperation de cle, dont le parcours Socket.IO.
- Syntaxe des deux modules JavaScript et `git diff --check` conformes.
- Comparaison des fonctions de dialogues avec la sauvegarde avant travaux : textes identiques.
- Controle du renderer natif sur 1662x950, 1052x730, 390x844 et 620x360 : repliques courtes/longues contenues, retour precedent, Entree/Echap, hauteur stable pendant la frappe et pointe sous/sur la bulle verifies.
- Meme controle final avec modules, CSS et images charges depuis le site public : aucune erreur JavaScript ni reponse HTTP en echec. Le montage de controle et ses evenements sont simules, sans connexion a un compte utilisateur.

## Publication

Version `20261024-ricky-bubble1`, le 24 octobre 2026 a 18 h 11 Europe/Paris. Cinq fichiers frontend : `index.html`, `styles.css`, `src/game/ui/questNpcDialogue.js`, `src/game/ui/npcDialogueView.js`, `src/styles/npcDialogue.css`. Les autres publications en parallele sont conservees a partir des entrees publiques actualisees. Index publie en dernier et cinq empreintes SHA-256 publiques conformes.

Archive SHA-256 : `b34d2e93f6baacdaf1568c2445bdf48c2076c0b0f88e25a49f71f4a126f7b66d`.

Sauvegarde : `/opt/avosoma-release-backups/20261024-ricky-bubble1-20261024T161132Z`. Aucun redemarrage : PID 1182716 et NRestarts 0 identiques avant/apres ; service actif, PostgreSQL pret, `/health` OK, aucune nouvelle erreur dans les journaux depuis la publication.

Preuves : `output/ricky-dialogue-bubble-2026-10-24/`, dont `public-bubble-detail.png`, `public-bubble-below.png`, `public-long-390.png`, `public-browser-qa.json`, `remote-tests.json` et les manifests de publication.
