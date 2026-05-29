# VoidSector - Plan multi coop

Objectif : commencer un vrai mode multijoueur en ligne, utilisable d'abord a 2 joueurs, mais construit pour pouvoir grandir ensuite.

## Objectif pour demain

Avoir un premier prototype jouable ou :

- chaque joueur entre un pseudo ;
- le joueur peut creer un groupe ;
- le deuxieme joueur peut rejoindre ou accepter une invitation ;
- les deux joueurs se voient en jeu ;
- une instance coop peut etre lancee ;
- les deux joueurs voient les memes monstres ;
- quand un joueur tape un monstre, les PV du monstre changent pour les deux joueurs.

Ce MVP n'a pas besoin d'avoir tout le loot final, toutes les quetes, tous les portails ou l'anti-triche complet. Il doit surtout prouver que le vrai multi fonctionne.

## Etat actuel et decision produit

Le projet a depasse le MVP initial : un prototype MMO jouable existe deja. Il permet de tester a distance avec un ami via le serveur Socket.IO, avec presence joueur, groupe, monstres partages, quetes serveur, portails serveur et une premiere persistance de profil cote serveur.

Decision importante pour les futures IA :

- garder ce travail, car il prouve que le jeu peut fonctionner en ligne ;
- le considerer comme un prototype MMO v1, pas comme l'architecture finale du vrai jeu ;
- ne pas supprimer ces systemes sans raison claire ;
- ne pas empiler tout le futur code dans `combat.js` ;
- quand un systeme MMO est modifie, chercher d'abord s'il doit aller dans `server/src/index.js`, `src/multiplayer/`, ou un nouveau module dedie.

Ce qui est bon a conserver :

- serveur Socket.IO ;
- connexion distante avec Tailscale ou URL serveur ;
- groupes, invitations et HUD de groupe ;
- affichage des joueurs distants et mini-carte de groupe ;
- monstres controles serveur ;
- degats, PV et morts de monstres synchronises ;
- quetes cote serveur ;
- portails cote serveur ;
- partage de recompenses de groupe ;
- premiere sauvegarde de profil serveur.

Ce qui doit etre durci avant une vraie version stable :

- vrais comptes joueurs au lieu d'une sauvegarde par pseudo ;
- base de donnees au lieu du fichier `server/data/profiles.json` ;
- inventaire, credits, NOVA, loot, competences et raffinage vraiment autoritaires cote serveur ;
- validation serveur des tirs, degats, distances, recompenses et couts ;
- anti-triche minimum ;
- tests serveur pour groupe, quetes, portails, loot et progression ;
- extraction progressive du code multijoueur hors de `combat.js`.

Position recommandee : continuer a avancer avec ce prototype, mais transformer les parties critiques en systemes serveur propres avant de le considerer comme le "vrai MMO".

## Architecture recommandee

Le jeu actuel reste le client navigateur.

Il faut ajouter :

- un serveur Node.js dedie au temps reel ;
- Socket.IO pour synchroniser joueurs, groupes, monstres et degats ;
- plus tard une base de donnees pour comptes, sauvegardes serveur, quetes et progression multi.

Structure conseillee :

```txt
voidsector_game/
  index.html
  src/
    ...
    multiplayer/
      client.js
      multiplayerState.js
      multiplayerUi.js
  server/
    package.json
    src/
      index.js
      rooms.js
      groups.js
      instances.js
      enemies.js
```

## Pourquoi un serveur est obligatoire

Pour que les monstres soient vraiment les memes pour les deux joueurs, le serveur doit etre la source de verite.

Le client peut envoyer :

- ma position ;
- mon angle ;
- je tire ;
- j'utilise une munition ;
- je touche tel monstre ;
- je veux inviter tel joueur ;
- je veux lancer une instance.

Le serveur doit valider et renvoyer :

- positions des autres joueurs ;
- creation/suppression des monstres ;
- PV/bouclier des monstres ;
- morts des monstres ;
- recompenses ;
- etat du groupe ;
- etat de l'instance.

## Phase 1 - Connexion et presence

A faire :

- creer un serveur Socket.IO ;
- connecter le client au serveur ;
- demander un pseudo temporaire ;
- afficher la liste des joueurs connectes ;
- synchroniser la position du joueur local ;
- afficher les autres joueurs sur la map.

Resultat attendu :

- toi et ton pote etes connectes chacun depuis votre PC ;
- vous vous voyez bouger dans le jeu.

## Phase 2 - Groupe en jeu

A faire :

- creer un groupe ;
- inviter un joueur connecte ;
- accepter/refuser une invitation ;
- afficher les membres du groupe ;
- definir un chef de groupe ;
- quitter le groupe.

Regles simples pour commencer :

- groupe limite a 2 joueurs au debut ;
- le chef peut lancer une instance ;
- si le chef quitte, le groupe est dissous pour le MVP.

Plus tard :

- groupe 3-4 joueurs ;
- transfert du chef ;
- invitations hors ligne ;
- amis.

## Phase 3 - Instance coop test

A faire :

- le chef lance une instance coop test ;
- le serveur cree une instance pour le groupe ;
- le serveur genere une petite vague de monstres ;
- les monstres ont un `id` unique serveur ;
- les deux clients recoivent la meme liste de monstres ;
- les deux clients affichent les memes monstres.

Version simple :

- une seule zone coop test ;
- 5 monstres ;
- pas encore de portail complet ;
- pas encore de boss obligatoire.

## Phase 4 - Degats et morts synchronises

A faire :

- quand un joueur touche un monstre, envoyer l'action au serveur ;
- le serveur calcule les degats ou valide les degats envoyes ;
- le serveur retire les PV ;
- le serveur diffuse les nouveaux PV a tout le groupe ;
- si le monstre meurt, le serveur diffuse sa mort.

Version MVP :

- le client peut encore calculer le tir ;
- le serveur garde au minimum les PV officiels ;
- le serveur refuse les hits sur un monstre deja mort.

Version finale :

- le serveur calcule plus de choses lui-meme pour eviter la triche.

## Phase 5 - Recompenses coop

A faire apres les PV synchronises :

- donner une recompense simple quand un monstre meurt ;
- envoyer la recompense aux membres du groupe presents dans l'instance ;
- afficher un toast cote client.

Regle possible au debut :

- chaque joueur du groupe recoit 100% de la recompense ;
- plus tard, ajuster selon contribution, distance, niveau ou type de contenu.

## Phase 6 - Brancher sur les vrais portails

A faire apres l'instance test :

- permettre de lancer un portail en groupe ;
- le serveur utilise le portail choisi ;
- le serveur cree les vagues ;
- les deux joueurs combattent la meme vague ;
- le serveur donne les recompenses du portail ;
- le clear du portail est sauvegarde pour les joueurs eligibles.

Attention :

- ne pas commencer par tous les portails ;
- commencer par le portail Bleu en coop ;
- etendre ensuite Violet, Rouge, Emeraude, Neant, Ancestral.

## Donnees a synchroniser en premier

Priorite haute :

- `playerId`
- `displayName`
- `x`
- `y`
- `angle`
- `hp`
- `shield`
- `groupId`
- `instanceId`
- monstres : `id`, `kind`, `x`, `y`, `hp`, `shield`, `dead`

Plus tard :

- equipement exact ;
- lasers actifs ;
- munitions ;
- drone positions ;
- buffs/debuffs ;
- quetes ;
- loot detaille ;
- progression serveur.

## Interface a ajouter

Minimum :

- bouton "Multi" ou panneau dans le hangar/profil ;
- champ pseudo ;
- bouton connexion ;
- liste joueurs connectes ;
- bouton inviter ;
- notification invitation ;
- panneau groupe ;
- bouton lancer instance coop.

Plus tard :

- chat groupe ;
- statut pret/pas pret ;
- choix portail ;
- resultat d'instance ;
- quetes groupe.

## Hebergement

Vercel peut garder le client.

Le serveur Socket.IO doit plutot etre heberge sur :

- Railway ;
- Render ;
- Fly.io ;
- VPS ;
- ou temporairement sur le PC local avec un tunnel type Cloudflare Tunnel/ngrok pour tester vite.

Pour demain, le plus rapide est :

- serveur en local pour coder/tester ;
- puis hebergement Railway ou Render si le prototype marche.

## Points techniques importants

- Ne pas casser le solo existant.
- Le multi doit etre optionnel.
- Si le serveur est deconnecte, le jeu solo doit continuer.
- Ne pas essayer de tout convertir au serveur d'un coup.
- Garder les monstres solo actuels pour le mode solo.
- Ajouter un mode `coopInstance` separe du mode solo.
- Les donnees critiques doivent progressivement passer cote serveur.

## Risques

- Le combat actuel est pense local, donc il faudra isoler ce qui appartient au solo et ce qui appartient au multi.
- Si on synchronise trop de choses trop vite, on risque de casser le jeu.
- Les sauvegardes actuelles sont locales, donc la progression multi definitive demandera une base de donnees.
- Il faudra choisir une politique anti-triche plus tard.

## Plan de travail recommande

1. Ajouter le serveur Node.js + Socket.IO.
2. Ajouter le client Socket.IO dans le jeu.
3. Connecter deux navigateurs avec pseudo.
4. Afficher les autres joueurs.
5. Ajouter creation/invitation de groupe.
6. Creer une instance coop test.
7. Generer les monstres cote serveur.
8. Afficher les monstres serveur cote client.
9. Synchroniser les degats/PV/morts.
10. Ajouter recompenses simples.
11. Brancher le portail Bleu en coop.

## Definition du prototype pret

On considere que le prototype est pret quand :

- deux joueurs a distance peuvent rejoindre le meme serveur ;
- ils peuvent etre dans le meme groupe ;
- ils voient les memes monstres ;
- ils peuvent tuer les memes monstres ;
- les PV et morts de monstres sont identiques chez les deux joueurs ;
- le solo reste jouable sans serveur.
