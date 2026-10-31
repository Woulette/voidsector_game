# Helion-03 : petits asteroides tres lointains

Publication `20261025-helion3-distant1`, le 25 octobre 2026 a 19 h 43 Europe/Paris.

## Rendu approuve

La carte conserve ses reperes et recoit 40 petits asteroides sur un plan plus
lointain. Leur disposition deterministe forme quatre groupes irreguliers de
tailles differentes, en laissant la planete degagee. Les sprites existants
neutres, cuivre et violets sont reutilises sans nouvelle texture.

La largeur varie de 11 a 24 unites logiques, avec une parallaxe comprise entre
0,0265 et 0,0414. Les corps restent opaques ; leur taille, leur mouvement lent
et leurs reflets attenues donnent la profondeur. Ils suivent le reglage
graphique des asteroides de fond et le fondu commun hors carte. Ils sont exclus
de la mini-carte fixe.

L'ajout est limite a `helionThreeVisuals.js`. Il reproduit exactement la
composition de l'apercu accepte dans
`output/helion03-distant-asteroids-20261025/`. Les couches preexistantes, les
donnees de gameplay et les autres cartes sont conservees. L'ancienne scene est
figee dans `approved-scene.mjs` pour garder la comparaison locale utilisable
apres integration, sans doubler les nouveaux rochers.

## Verification

- 22 tests cibles reussis, aucun echec ou test ignore, sur une copie fraiche du
  runtime public avec le candidat superpose.
- Controle de syntaxe du module, fermeture des six imports sans fichier
  manquant et controle des 176 cibles d'import map de l'apercu.
- Comparaison complete des donnees : candidat identique a l'apercu approuve,
  40 ajouts uniquement, decor existant et autres cartes inchanges.
- Controle visuel de l'apercu public au centre, hors carte et au retour ;
  disparition des rochers confirmee. Ce controle utilise le vrai rendu et les
  assets publics, sans session MMO authentifiee.

## Publication

Trois fichiers frontend : le module de composition, l'import map du jeu et
celle de l'apercu public. Sauvegarde avant remplacement et entree principale
installee en dernier. Aucun changement serveur, de texture ou de mini-carte.

- Sauvegarde : `/opt/avosoma-backups/20261025-helion3-distant1`.
- Trois empreintes identiques en staging, sur disque et par HTTPS.
- 231 cibles d'import map du jeu accessibles ; 15 fichiers de support
  surveilles conserves, dont le renderer et la correction du hors-map.
- 581 fichiers captures hors du lot inchanges ; 471 alias etrangers preserves
  dans l'entree du jeu et 367 dans l'apercu.
- Service actif, PID 2510150 inchange, aucun redemarrage ; PostgreSQL pret et
  aucun nouvel avertissement ou erreur du service pendant le controle.

Les rapports, captures et empreintes sont dans le dossier local de l'apercu,
sous `validation/` et `release/`. Le commit est prepare avec un index temporaire
pour conserver le HEAD, l'index et le travail concurrent du checkout.

Apercu public :
https://avosoma.absyrion.com/assets/maps/previews/helion03-cataclysm1/index.html?view=centre&zoom=.8&v=20261025-helion3-distant1
