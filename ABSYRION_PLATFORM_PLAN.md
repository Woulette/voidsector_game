# Absyrion - Plan plateforme

Objectif : Absyrion doit devenir la plateforme qui regroupe tous les jeux, un peu comme un portail studio / mini launcher web.

## Principe principal

Ne pas creer un compte different pour chaque jeu.

Modele recommande :

```txt
1 compte Absyrion
-> plusieurs profils de jeux
```

Exemple :

```txt
Compte Absyrion
- id
- email
- pseudo
- mot de passe
- securite
- support
- historique d'achats

Profil VoidSector
- accountId Absyrion
- credits
- NOVA
- vaisseaux
- inventaire
- quetes
- progression MMO

Profil autre jeu
- accountId Absyrion
- progression propre au jeu
- inventaire propre au jeu
```

Le compte est global. La progression reste separee par jeu.

## Pourquoi ce modele

- Le joueur cree un seul compte pour tous les jeux Absyrion.
- Le support est plus simple : un compte, tous les jeux.
- Les achats sont plus faciles a tracer.
- La plateforme peut afficher "Mes jeux".
- Les futurs systemes communs deviennent possibles : amis, succes, news, support, historique d'achat, launcher.
- Chaque jeu garde sa progression separee et ne pollue pas les autres jeux.

## Structure recommandee

Court terme :

```txt
voidsector_game/
absyrion-website/
```

Garder VoidSector dans son projet actuel tant que le MMO est encore en stabilisation.

Plus tard, si la plateforme grossit :

```txt
absyrion/
  platform/
  games/
    voidsector/
    autre-jeu/
  shared/
```

Ne pas deplacer VoidSector trop tot. Finir d'abord les bases MMO importantes.

## Flux utilisateur cible

```txt
absyrion.com
-> accueil plateforme
-> liste des jeux
-> page VoidSector
-> bouton Jouer
-> connexion / inscription Absyrion si necessaire
-> lobby VoidSector
-> hangar / profil / magasin / equipement
-> lancement combat MMO
```

La page actuelle de VoidSector avec hangar, profil, magasin et equipement ne doit pas etre supprimee.
Elle deviendra le lobby du jeu apres connexion.

## Authentification cible

Le compte doit devenir un compte Absyrion.

Schema logique :

```txt
accounts
- id
- email
- username
- passwordHash
- role
- createdAt

voidsector_profiles
- accountId
- credits
- nova
- ships
- inventory
- quests
- progression

game_profiles_x
- accountId
- progression propre a l'autre jeu
```

Le serveur VoidSector doit charger le profil VoidSector via `accountId`, pas via un pseudo libre.

## Achats integres

Regle importante : le client ne doit jamais pouvoir s'ajouter de la NOVA.

Modele cible :

```txt
Joueur paie sur Absyrion
-> paiement valide cote serveur / prestataire
-> Absyrion enregistre la transaction
-> VoidSector recoit ou lit le credit NOVA valide
-> le profil serveur est mis a jour
```

Les achats, factures, remboursements, support et pages legales appartiennent plutot a la plateforme Absyrion.
Les effets gameplay appartiennent au serveur du jeu.

## Regle pour les futures IA

Ne pas transformer `voidsector_game` en portail Absyrion complet sans demande explicite.

Si une fonctionnalite concerne :

- le gameplay VoidSector ;
- le MMO ;
- les monstres ;
- les quetes ;
- les vaisseaux ;
- la progression ;

elle reste dans `voidsector_game`.

Si une fonctionnalite concerne :

- la liste de tous les jeux ;
- le compte global ;
- le support global ;
- les pages legales ;
- les paiements communs ;
- la page publique Absyrion ;

elle doit aller dans un projet plateforme separe, par exemple `absyrion-website`.
