# Ricky : lecture des dialogues et soucoupe animee — 24 octobre 2026

Demande : conserver le theme et tous les dialogues, rendre leur lecture plus claire, nettoyer la soucoupe de Ricky et l'animer pendant les deplacements, les attaques et le soutien.

## Dialogue

`npcDialogueView.js` compose le panneau de transmission : soucoupe du locuteur, nom, fonction, mission, compteur de repliques et boutons. Le texte utilise une taille de 17 px sur ordinateur, 16 px sur mobile, avec interligne et espacement adaptes. Un element de mesure invisible reserve la hauteur du texte complet pour que la frappe progressive ne deplace pas le panneau. L'animation de transition reste limitee au corps de la replique.

Le premier clic affiche toute la replique ; le suivant continue. Le bouton Precedent permet de relire. Entree et Espace font avancer, fleche gauche revient, Echap ferme. Ces touches sont interceptees uniquement pendant la conversation, hors saisie dans un champ. Le retour en arriere ne rejoue pas les actions de quetes deja envoyees.

Les fonctions qui fournissent les dialogues des niveaux 5 et 10 et de Sauvons Deadly sont comparees avec la sauvegarde avant travaux : elles sont identiques. Les conditions et le moment de progression des quetes, dont l'attaque du niveau 5 et la cle de secours, sont conserves.

## Soucoupe et animation

Sprite versionne : `assets/ships/npc/ricky-saucer-v2.png`. Generation via l'outil imagegen integre, a partir du sprite existant, vue strictement de dessus et transparence reelle. Coque grise, verriere cyan et deux ports jaunes conserves. L'original n'est pas remplace. Prompt complet et provenance : `output/ricky-dialogue-visuals-2026-10-24/imagegen-prompt.txt`.

`src/data/rickyVisuals.js` fournit une reference unique pour les quatre Ricky de carte, le compagnon dans Deadly, le portrait de conversation et les objectifs de quetes. Les autres PNJ gardent leurs images.

`src/game/render/rickySaucer.js` dessine des effets legers : sustentation, deux propulseurs arriere dont la puissance suit le mouvement, recul et eclairs aux points de tir, activation verte du coeur et anneaux de soin. Le lien vers la balise est bref, puis la balise existante garde son rendu normal. Les reglages de reacteurs, de portails et d'eclairs de bouche sont respectes.

Les tirs sont marques par le traitement existant de `combat:hit` pour `ricky_companion`, le soin par `portal:ricky-heal`. Les impulsions visuelles survivent aux snapshots suivants du meme compagnon, tandis que ses PV, bouclier, positions et vitesses sont remplaces par ceux du serveur. Les marqueurs sont remis a zero si l'identifiant de compagnon change. Aucune attaque, aucun soin ou cooldown n'est cree cote client ; aucun fichier serveur ni schema de profil n'est modifie.

## Verifications

34 premiers tests cibles reussis, dont l'absence de duplication de progression en revenant dans un dialogue et le parcours reseau de recuperation de cle. Trois nouveaux tests couvrent l'image commune aux quatre firmes, la fin des impulsions sans modification des statistiques et la conservation des effets lors des snapshots.

Suite globale du workspace : 1 868 tests reussis sur 1 869. L'echec restant est le test de libelles de statistiques dans `src/ui/render.js`, deplacees dans l'atelier par le travail de hangar parallele ; ce lot ne publie pas cette interface.

Le candidat part d'une copie fraiche de la production. Deux actualisations ont ensuite conserve les publications paralleles des effets, reparateurs et interfaces : seuls les changements propres a Ricky sont ajoutes a cette base publique. Les autres modifications locales non publiees sont exclues. Lors du premier controle, la suite VFX generale changeait en parallele (timing M6 et nouveau module de coque) ; elle a ete laissee hors de ce lot, sans modifier ses tests. Les dix suites ciblees sur le candidat final totalisent 49 tests reussis localement et sur le serveur de production, dans un repertoire de staging isole.

Le montage de controle utilise le vrai renderer de scene, le dialogue, les effets de tirs et de balise, sur le decor d'Helion-02. Clic, relecture, touches et fermeture verifies ; panneau contenu dans les ecrans 1662x950, 1366x768 et 390x844. Deplacement, tirs et soin sont visibles dans les captures et la video. C'est un apercu avec evenements simules, sans session de jeu publique authentifiee et sans ecriture de profil utilisateur.

## Publication

Version `20261024-ricky-visuals1`, publiee le 24 octobre 2026 a 17 h 43 Europe/Paris. Manifest limite a 16 fichiers frontend, archive SHA-256 `6b8d97cf499aad6fb5576339bab7fed6a3f6c1ee8388bec478e28d01bc940f73`, index publie en dernier. Les 16 empreintes sont conformes dans le candidat, le staging, le repertoire servi et les reponses HTTPS publiques.

Sauvegarde : `/opt/avosoma-release-backups/20261024-ricky-visuals1-20261024T154301Z`. Aucun redemarrage par ce lot : PID 1182716 et NRestarts 0 identiques avant/apres ; service actif, PostgreSQL pret, `/health` OK et aucune nouvelle erreur dans les journaux depuis la publication.

Le controle navigateur final charge les modules, styles et images depuis le site public ; seul le montage d'apercu et ses evenements simules restent locaux. Dialogue, relecture, clavier, deplacement, tirs et soin controles ; aucune erreur JavaScript ni reponse HTTP en echec. Captures publiques et video : `public-dialogue.png`, `public-attack-canvas.png`, `public-move.png`, `public-heal.png` et `public-ricky-animations.webm` dans le dossier de preuves.

Preuves, prompts, manifests, resultats de tests et publication : `output/ricky-dialogue-visuals-2026-10-24/`. Les fichiers de controle et de documentation ne sont pas copies dans le runtime public.
