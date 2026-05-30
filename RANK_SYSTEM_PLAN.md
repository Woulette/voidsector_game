# Systeme de grades competitifs

Ce document pose la base du futur systeme de grades multijoueur.

Objectif principal : garder des grades hauts rares et competitifs, meme avec peu de joueurs, tout en permettant au classement de s'adapter quand la population serveur augmente.

## Principe general

Le grade final d'un joueur dependra de deux choses :

1. Ses points de grade.
2. Sa position dans le classement serveur.

Les points servent de condition de progression minimale. Le classement sert a limiter les places pour les grades importants.

## Classement global serveur

Le classement des grades se fait sur la totalite du serveur, toutes firmes confondues.

Les firmes pourront rester importantes pour l'identite du joueur, les guerres, les recompenses ou les statistiques, mais elles ne bloquent plus directement les places de grades.

## Grades hauts

Les grades hauts utilisent un systeme en pourcentage avec une place minimale garantie quand le serveur n'a pas encore assez de joueurs, et un cap maximum pour eviter que les places de generaux deviennent trop nombreuses sur un gros serveur.

| Grade | Regle principale | Minimum garanti | Cap maximum |
|---|---:|---:|---:|
| Marechal | Joueur #1 serveur | 1 | 1 |
| General d'armee | Top 0.4% serveur | 1 | 4 |
| General de corps d'armee | Top 0.8% serveur | 1 | 8 |
| General de division | Top 1% serveur | 1 | 12 |
| General de brigade | Top 1.5% serveur | 1 | 20 |

Exemple avec peu de joueurs :

| Position serveur | Grade possible |
|---:|---|
| #1 | Marechal |
| #2 | General d'armee |
| #3 | General de corps d'armee |
| #4 | General de division |
| #5 | General de brigade |

Quand la population devient assez grande, les pourcentages prennent le dessus jusqu'au cap maximum.

Regle de calcul :

```txt
quota = min(cap maximum, max(minimum garanti, floor(joueurs serveur x pourcentage)))
```

## Exemple de quotas

| Population serveur | Marechal | General d'armee 0.4%, cap 4 | General de corps 0.8%, cap 8 | General de division 1%, cap 12 | General de brigade 1.5%, cap 20 |
|---:|---:|---:|---:|---:|---:|
| 100 joueurs | 1 | 1 | 1 | 1 | 1 |
| 250 joueurs | 1 | 1 | 2 | 2 | 3 |
| 500 joueurs | 1 | 2 | 4 | 5 | 7 |
| 1000 joueurs | 1 | 4 | 8 | 10 | 15 |
| 5000 joueurs | 1 | 4 | 8 | 12 | 20 |

Note : les quotas sont arrondis vers le bas, limites par le minimum garanti, puis bloques par le cap maximum.

## Grades et seuils de points

Ces seuils sont une premiere base. Les grades bas ont ete remontes pour eviter une progression trop rapide.

| Grade | Seuil points |
|---|---:|
| Recrue | 0 |
| Pilote debutant | 500 |
| Pilote | 1 500 |
| Pilote confirme | 3 500 |
| Soldat spatial | 6 000 |
| Soldat d'elite | 9 000 |
| Caporal | 13 000 |
| Caporal-chef | 18 000 |
| Sergent | 25 000 |
| Sergent-chef | 35 000 |
| Adjudant | 50 000 |
| Adjudant-chef | 70 000 |
| Aspirant | 95 000 |
| Sous-lieutenant | 130 000 |
| Lieutenant | 180 000 |
| Capitaine | 250 000 |
| Commandant | 350 000 |
| Lieutenant-colonel | 500 000 |
| Colonel | 700 000 |
| Colonel d'elite | 950 000 |
| General de brigade | 1 300 000 |
| General de division | 1 850 000 |
| General de corps d'armee | 2 600 000 |
| General d'armee | 3 700 000 |
| Marechal | 5 000 000 |

## Attribution prevue

1. Calculer les points de grade de chaque joueur.
2. Trier tous les joueurs du serveur par points de grade.
3. Donner Marechal au joueur #1 s'il atteint le seuil minimum du grade.
4. Pour chaque grade haut, calculer le quota avec le pourcentage serveur, le minimum garanti et le cap maximum.
5. Attribuer les grades hauts dans l'ordre du classement, uniquement aux joueurs qui ont le seuil de points necessaire.
6. Pour les autres joueurs, attribuer le meilleur grade atteint par seuil de points.

## Calcul des points de grade

Base ajoutee :

```txt
1 monstre tue = reputation gagnee equivalente a 10% de l'XP gagnee sur ce monstre
```

Exemples :

| XP du monstre | Reputation gagnee |
|---:|---:|
| 350 XP | 35 |
| 500 XP | 50 |
| 1 700 XP | 170 |
| 3 000 XP | 300 |
| 20 000 XP | 2 000 |

Formule actuelle du jeu :

```txt
points =
  floor(XP totale / 100 000)
+ floor(reputation totale / 10 000)
+ points historiques des monstres tues
+ niveaux gagnes x 1 000
+ portails termines x 2 500
```

## Points historiques des monstres

Les points de monstre sont calcules au moment du kill et stockes dans le profil joueur.

Important : si un joueur niveau 1 tue un monstre niveau 1, il gagne le bareme du niveau 1. Quand il sera niveau 50, ce kill restera au meme nombre de points. Seuls les prochains kills utiliseront son nouveau niveau.

| Ecart joueur - monstre | Points gagnes |
|---:|---:|
| Monstre niveau egal ou superieur au joueur | 1 / 10 |
| 0 a 4 niveaux au-dessus du monstre | 1 / 10 |
| 5 a 9 niveaux au-dessus du monstre | 1 / 25 |
| 10 a 14 niveaux au-dessus du monstre | 1 / 100 |
| 15 a 19 niveaux au-dessus du monstre | 1 / 150 |
| 20 a 24 niveaux au-dessus du monstre | 1 / 200 |
| 25 a 29 niveaux au-dessus du monstre | 1 / 300 |
| 30 a 34 niveaux au-dessus du monstre | 1 / 500 |
| 35 a 39 niveaux au-dessus du monstre | 1 / 700 |
| 40+ niveaux au-dessus du monstre | 1 / 1 000 |
