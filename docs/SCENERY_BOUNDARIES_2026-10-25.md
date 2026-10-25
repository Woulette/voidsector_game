# Limites du decor des cartes — 25 octobre 2026

Publication : `20261025-scenery-bounds1`, le 25 octobre 2026 a 15:18:06 UTC.

## Constat avant modification

Le probleme a ete reproduit dans l'apercu public Helion-03, hors carte a X -570 :
le fond devenait noir mais la planete, les grandes etoiles et les eclats restaient
visibles. `drawMapScenerySkyFade` etait appele avant les images en parallaxe,
les nuages de premier plan et les particules proches. Les anciennes cartes sans
configuration `skyFade` ne beneficiaient pas non plus du fondu commun.

## Correction

- `drawWorldLayer` applique une seule fois le fondu, apres toutes les couches
  decoratives et avant les marqueurs de jeu. Les appels intermediaires ont ete
  retires des deux chemins de rendu du fond.
- Les cartes sans configuration utilisent `inside: 900, outside: 120`. Les
  profils particuliers existants sont conserves.
- Un `skyFade: null` explicite conserve le contournement utilise par les captures
  fixes de la mini-carte. Les dimensions de carte invalides sont ignorees.
- Le fondu suit les limites du monde : la partie encore dans la carte reste
  visible et s'assombrit progressivement. Une vue entierement hors de la zone de
  transition devient noire. Le retour dans la carte restaure le decor.
- Les positions, tailles, parallaxes et assets des cartes ne changent pas. Les
  vaisseaux, combats, dangers hors carte et l'interface gardent leur fonctionnement.

## Validation

- 77 tests reussis, aucun echec ou test ignore, sur une copie fraiche du runtime
  public avec les quatre fichiers candidats superposes ; deux controles de syntaxe
  et une fermeture de 53 modules sans import manquant.
- Un test de regression couvre les secteurs et les portails, leurs quatre bords
  et quatre coins, le contournement de la mini-carte et l'ordre de rendu des
  marqueurs de jeu.
- Controle Canvas dans le navigateur : 30 cartes, 1 440 cas (huit directions,
  deux zooms et trois qualites). Aucun pixel de decor hors zone apres correction,
  contre 2 522 pixels dans le temoin Helion-03 avant correction. Centre inchange
  et retour dans la carte verifies. Ce controle utilise le vrai moteur de rendu
  et des textures temoins opaques.
- Controle visuel avec les vrais assets dans l'apercu local puis public : decor
  masque hors carte, joueur et mini-carte presents, decor restaure au retour.
  Ce controle est un apercu du moteur, pas une session MMO authentifiee.

Les preuves locales sont dans `output/map-scenery-bounds-20261025/` : audit
avant modification, captures avant/apres, rapport des tests et matrice de pixels.
Le test Helion-01 preexistant dans le checkout a aussi ete ajuste au nouveau
comportement pour cette validation. Ce fichier etait absent d'origin/main ; il
n'est pas importe en bloc dans ce commit restreint.

## Publication et preservation

- Quatre fichiers frontend seulement : les deux modules et les import maps de
  l'entree du jeu et de l'apercu public. Sauvegarde avant remplacement, entree
  principale publiee en dernier.
- Sauvegarde : `/opt/avosoma-backups/20261025-scenery-bounds1`.
- Empreintes des quatre fichiers verifies sur disque et par HTTPS ; 231 cibles
  de l'import map accessibles ; 12 fichiers de support surveilles inchanges.
- 577 autres fichiers du runtime captures avant publication restent inchanges.
- Service actif avec le meme PID 2510150, sans redemarrage ; PostgreSQL pret ;
  aucun nouvel avertissement ou erreur du service pendant les controles.
- 469 alias sans rapport dans l'entree du jeu et 366 dans l'apercu preserves.
- Enregistrement Git restreint via un index temporaire ; le HEAD et l'index du
  checkout de travail sont preserves.

Apercu public :
https://avosoma.absyrion.com/assets/maps/previews/helion03-cataclysm1/index.html?view=outside&zoom=.8&v=20261025-scenery-bounds1
