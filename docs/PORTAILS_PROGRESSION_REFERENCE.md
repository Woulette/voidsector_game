# Portails de progression — référence de conception

Les trois premiers portails et les règles de tentatives sont à jour au 25 octobre 2026. Les fiches des niveaux suivants conservent leur historique d’audit du 26 juillet. **Version actuelle :** `20261025-wave-portals1`, publiée à 20 h 34 (Paris). Détails : [PORTAILS_VAGUES_10_15_20_2026-10-25.md](PORTAILS_VAGUES_10_15_20_2026-10-25.md) et [PORTAILS_TENTATIVES_2026-10-25.md](PORTAILS_TENTATIVES_2026-10-25.md).

Ce document décrit les neuf portails de progression de VoidSector, leur fonctionnement actuel, leurs récompenses, ce qui est déjà codé et les décisions qu’il reste à prendre. Le portail Deadly est volontairement exclu : il appartient à une autre progression et son contenu est déjà considéré comme terminé.

## Légende

- ✅ **Codé** : l’épreuve est activée dans le serveur et possède son interface en jeu.
- 🟡 **Codé mais à retester ou équilibrer** : la mécanique existe, mais certaines valeurs restent provisoires ou demandent un essai en conditions réelles.
- 📝 **Conçu seulement** : le concept est décrit ici, mais l’épreuve n’est pas encore jouable.
- 🔴 **Correction nécessaire** : un écart fonctionnel est déjà identifié.
- ❓ **Décision nécessaire** : une règle doit encore être validée avant l’implémentation.

La livraison actuelle des niveaux 10, 15 et 20 passe **250 tests sur 32 fichiers**, sur candidat, staging et sources déployées, avec réseau réel et persistance. L’ancien audit des autres portails comptait 111 tests. Ces contrôles ne remplacent pas une partie complète jouée manuellement avec un équipement adapté ; les limites antérieures des tests clients sont détaillées dans la note de publication.

## Vue d’ensemble

| Niveau | ID technique | Portail | Épreuve principale | Déblocage ou gain majeur | État |
| ---: | --- | --- | --- | --- | --- |
| 10 | `blue` | Le Seuil d’Azuron | 30 vagues par séries de 5, ×1 | Compétences et recette du Laser MK-IV | ✅ Publié `20261025-wave-portals1` |
| 15 | `violet` | La Faille de Vesper | Mêmes 30 vagues qu’Azuron, ×2 | Noyau Overdrive du drone de combat | ✅ Publié `20261025-wave-portals1` |
| 20 | `red` | La Forge de Kharon | Mêmes 30 vagues qu’Azuron, ×3 | Vaisseaux élite et à compétence | ✅ Publié, cosmétique existant en attente |
| 25 | `ionis` | La Tempête d’Ionis | 40 vagues sans boss | Accès aux améliorations d’équipement | ✅ Codé |
| 30 | `emerald` | La Ruche d’Éclanite | 3 compartiments, noyaux et boss conditionnels | Recettes des lasers élite colorés | ✅ Codé |
| 35 | `void` | L’Abîme de Nox | Défense d’une station pendant 30 vagues | Chance de recevoir un laser élite coloré | ✅ Codé, équilibrage à vérifier |
| 40 | `prismatic` | Le Nexus Prismatique | 3 planètes puis trio de boss | Noyau ancestral ou Laser MK-IV | 🧪 Jouable, à équilibrer |
| 45 | `ancient` | Le Sanctuaire des Précurseurs | Sauvetage chronométré, talisman et paradis | Skin ancestral ou laser élite coloré | 📝 Conçu seulement |
| 50 | `eternal` | Le Cœur de l’Éternel | 4 énergies, tour de 5 étages et boss final | Titre, ornement, prestige et niveau maximal 100 | 📝 Conçu seulement |

## Règles communes actuellement codées

### Fragments et déverrouillage

- Tous les fragments de portail ont **0,33 % de chance** de tomber sur chaque ennemi d’une zone autorisée.
- Le Space Caster coûte **100 NOVA par tirage** et donne un fragment avec **4 % de chance**.
- Le niveau demandé et la quantité complète de fragments sont vérifiés par le serveur.
- Les fragments complets sont consommés **à chaque assemblage d’une tentative**. L’invocation consomme l’exemplaire assemblé ; aucune victoire ne rend les futures tentatives gratuites.
- Un seul exemplaire assemblé par type peut être conservé. Le joueur peut réunir des fragments puis assembler le suivant pendant que son portail est invoqué.
- Un seul portail peut être invoqué par compte, tous types confondus. La victoire, la troisième mort ou un échec propre au scénario libère l’invocation suivante ; la réserve assemblée est conservée.

✅ **Décision validée et publiée le 25 octobre :** cette règle concerne tous les portails à fragments. Les anciennes tentatives déjà préparées sont reprises ; les anciens accès permanents déjà gagnés ne donnent plus d’invocations gratuites. Ricky/Deadly conserve sa clé.

### Invocation et entrée

- L’assemblage invoque automatiquement le portail lorsqu’aucune tentative n’est en cours. Pendant une tentative, il crée uniquement la réserve suivante.
- Une tentative déjà assemblée peut être invoquée depuis l’écran **Portails** dès que l’invocation courante est terminée.
- Le portail apparaît sur la **map 1 de la firme du propriétaire**, près de son point d’apparition.
- L’instance est privée et rattachée au compte propriétaire, indépendamment de son groupe social. Un membre non-chef peut lancer son propre portail solo ; chaque membre peut avoir sa propre instance.
- Il faut s’approcher du portail préparé puis utiliser l’interaction prévue pour entrer.
- Un seul portail préparé ou actif est autorisé par compte.
- Les portails 40, 45 et 50 peuvent déjà être affichés et leurs fragments collectés, mais leur entrée est bloquée par le serveur tant que leur contenu n’est pas déclaré prêt.

✅ **Cas des groupes corrigé le 23 octobre :** les portails de progression sont solo et leur session est indépendante du groupe social. Un membre non-chef peut lancer son propre portail. Quitter ou changer de groupe conserve sa session. Deadly reste la seule exception solo/groupe ; voir `docs/PORTAILS_SESSIONS_2026-10-23.md`.

### Vies, mort et échec

- Chaque joueur commence une tentative avec **3 vies**.
- Une mort retire une vie côté serveur.
- Hors des portails 10, 15 et 20, tant qu’il reste une vie, le joueur peut revenir dans le portail avec **50 % de ses PV** et son bouclier restauré.
- La troisième mort ferme l’instance privée.
- Le choix de sortie après une mort avant épuisement des vies renvoie sur la map 1 et conserve la tentative restante. Dans Azuron, Vesper et Kharon, cette sortie est automatique et aucun choix de résurrection n’est proposé ; le retour gratuit à la base restaure 20 % des PV. La reprise par le même portail conserve la série sauvegardée, les éliminations et les vies restantes, comme la sortie intermédiaire.
- Les récompenses de fin sont attribuées et sauvegardées par le serveur.

### Corrections techniques communes

- Une ancienne fonction de lancement de portail, aujourd’hui inutilisée, existe encore à côté de la fonction réellement utilisée. Leurs règles ont déjà commencé à diverger. Il faudra supprimer cette duplication afin d’éviter de corriger le mauvais chemin plus tard.
- Il manque encore un test de bout en bout réel pour chaque portail : entrée, partie complète, victoire, récompense, sauvegarde, reconnexion.
- Les compositions d’ennemis ajoutées lorsque les détails n’étaient pas précisés doivent être considérées comme provisoires.

---

## Niveau 10 — Le Seuil d’Azuron

**État :** arène agrandie, décor industriel et reprise publiés à 12 h 32, puis corrections de tentatives, récompenses et délais à **13 h 17 (Paris)**, `20261025-portal-attempts1`. Les 891 tests ciblés passent avec les sources déployées. Détails : [AZURON_REPRISE_2026-10-25.md](AZURON_REPRISE_2026-10-25.md) et [PORTAILS_TENTATIVES_2026-10-25.md](PORTAILS_TENTATIVES_2026-10-25.md).

Depuis `20261025-wave-portals1` à 20 h 34, la récompense finale est portée à 500 000 XP et 50 000 réputation. Vesper et Kharon partagent désormais cette rencontre, respectivement à ×2 et ×3 ; la forme et la charge dédiées du portail bleu restent la référence. Voir [PORTAILS_VAGUES_10_15_20_2026-10-25.md](PORTAILS_VAGUES_10_15_20_2026-10-25.md).

### Accès

- Niveau requis : **10**.
- Coût par tentative : **15 Fragments d’Azuron**.
- Drop à 0,33 % : **maps 1, 2, 3 et 4**.
- Space Caster : 4 %.

### Déroulement actuel

1. Le portail contient **30 vagues** d’ennemis de niveau 10, statistiques adaptées à ce niveau.
2. Les vagues arrivent par **séries de 5**.
3. La première vague du groupe apparaît immédiatement.
4. Les quatre suivantes arrivent avec **15 secondes d’intervalle**, même si les précédentes ne sont pas éliminées.
5. Après la cinquième vague, tous les survivants doivent être éliminés. Deux portes s’ouvrent au point d’entrée : à gauche pour continuer les cinq vagues suivantes, à droite pour sortir et revenir à la série sauvegardée avec les vies restantes. L’entrée préparée et la continuation d’Azuron jouent quatre secondes de charge avant leur commande serveur ; la sortie joue également son animation pendant quatre secondes avant le transfert contrôlé par le serveur. Aucun compte à rebours ne lance automatiquement la suite.
6. Les vagues 1–5 contiennent chacune 10 Orbes sentinelles ; 6–10 : 10 Vorak rushers ; 11–15 : 10 Parasites astraux ; 16–20 : 10 Traqueurs abyssaux ; 21–25 : 5 Éclanites ; 26–30 : 5 Cuirasses ambrées.
7. Les ennemis apparaissent à **2 000 unités autour du centre fixe de la carte**, indépendamment de la position du pilote, puis poursuivent sans limite de distance ni expiration du verrouillage.
8. La victoire est déclenchée après élimination de la dernière série : **250 ennemis au total**, sans boss ajouté.

Depuis `20261025-azuron-death1` à 14 h 49, une mort renvoie automatiquement à la base sans panneau de résurrection. Le retour dans le même portail recommence au début de la série sauvegardée (1, 6, 11, 16, 21 ou 26), sans rejouer les séries validées. Une vague nettoyée reste vide pendant son créneau de quinze secondes ; seuls les indices encore vivants d’une vague partielle réapparaissent. Ainsi, quatre ennemis éliminés sur dix en vague 3 laissent six survivants à la reprise ; une mort en vague 7 reprend depuis 6, une mort en 16 depuis 16. Les PV des survivants sont réinitialisés à l’apparition. Voir [AZURON_MORT_REPRISE_2026-10-25.md](AZURON_MORT_REPRISE_2026-10-25.md).

Depuis `20261025-azuron-vortex1` à 19 h 22, les quatre secondes d’entrée et de continuation ont une animation dédiée : le vortex accélère et son centre blanc bleuté grandit dans l’ouverture. Le cadre reste fixe. Voir [AZURON_ANIMATION_VORTEX_2026-10-25.md](AZURON_ANIMATION_VORTEX_2026-10-25.md).

Azuron utilise une arène de **7 800 × 5 400** avec une nébuleuse bleue azur et quelques fragments glacés en profondeur. Depuis `20261025-azuron-nebula2`, publié à 15 h 26 le 25 octobre, le décor assemble **17 morceaux lointains** avec deux nouvelles textures reprenant les volumes et les lumières du panorama de la mini-carte. Des nappes plus discrètes relient les deux ensembles lumineux, au lieu de laisser un grand vide central. Les poussières proches restent retirées ; les morceaux gardent leur taille sous la résolution native jusqu’à une densité de canvas ×2. L’image d’ensemble ne sert qu’à la petite mini-carte. Depuis `20261025-azuron-gate1` à 16 h 03, l’entrée et la continuation utilisent le cadre cobalt validé et un vortex bleu animé séparément ; leur projection ovale et leur épaisseur reprennent le portail de voyage entre secteurs utilisé pour la sortie. Voir [AZURON_PORTAIL_ANIME_2026-10-25.md](AZURON_PORTAIL_ANIME_2026-10-25.md) et [AZURON_NEBULEUSE_2026-10-25.md](AZURON_NEBULEUSE_2026-10-25.md). Le décor de verre fracturé proposé en V2 reste une proposition indépendante. Les ennemis d’Azuron se placent entre 150 et 160 unités autour du pilote arrêté, à une distance stable par ennemi, y compris sur un arc intérieur près des bords. Les statistiques restent constantes dans une même famille ; aucun multiplicateur ne s’ajoute au fil des vagues. PV, boucliers, dégâts et récompenses reprennent les nouvelles bases et les paliers additifs partagés au niveau 10 ; les tirs varient de ±18 %, avec arrondi des bornes après le palier. Les effets sur coup restent désactivés dans Azuron.

### Récompenses et déblocages

- **1 000 000 crédits**.
- **500 000 XP**.
- **50 000 réputation**.
- **10 000 munitions x4**.
- **10 000 NOVA**.
- **Laser MK-IV garanti** lors de la première victoire.
- **25 % de chance** de recevoir un Laser MK-IV lors des victoires suivantes.
- La première victoire ouvre toutes les branches du tableau de compétences.
- La première victoire déverrouille la recette du Laser MK-IV.

Les gains sont crédités et sauvegardés à la victoire ; le popup de récompense finale apparaît après **sept secondes**.

### À tester ou corriger

- 🟡 Évaluer la difficulté d’un run complet avec un équipement de niveau 10 ; les tests de calendrier couvrent les 30 vagues, l’aperçu de combat utilise un compte QA de niveau 50.
- 🟡 Vérifier la chaîne complète première victoire → Laser MK-IV → sauvegarde → reconnexion.
- ✅ Les nouvelles tentatives coûtent à nouveau 15 fragments ; une tentative assemblée d’avance peut être invoquée après la fin de la précédente.

---

## Niveau 15 — La Faille de Vesper

**État :** publié le 25 octobre à 20 h 34, `20261025-wave-portals1`. Identifiant technique `violet` conservé ; couleur actuelle jaune-orange.

### Accès

- Niveau requis : **15**.
- Coût par tentative : **20 Fragments de Vesper**.
- Drop à 0,33 % : **maps 1, 2, 3 et 4** ; Space Caster : 4 %.

### Déroulement actuel

Même rencontre qu’Azuron : 30 vagues, six séries de cinq et 250 ennemis, apparition toutes les quinze secondes à 2 000 unités du centre. Les PV, boucliers, dégâts et gains des ennemis sont les valeurs d’Azuron ×2 ; les ennemis affichent le niveau 15 sans appliquer un second palier. Vitesse, portée, cadence et comportement sont identiques au bleu. Les cages, tourelles, drones alliés et Drone Géant de l’ancien scénario ne sont plus invoqués.

Les deux portes, les quatre secondes de transfert, la reprise au début de la série sauvegardée et la mémoire des ennemis éliminés sont communs aux trois portails. Une mort entraîne la sortie automatique ; la troisième ferme la tentative. Le cadre et le vortex approuvés d’Azuron sont recolorés en jaune-orange et gardent leur animation dédiée.

### Récompenses et déblocages

- **2 000 000 crédits**, **1 000 000 XP**, **100 000 réputation**.
- **20 000 munitions x4** et **20 000 NOVA**.
- **Noyau Overdrive Drone garanti** lors de la première victoire, puis **50 %**.

Le Noyau Overdrive reste réservé au Drone de Combat à un emplacement : couleur rouge, +50 % de dégâts avec un laser ou +50 % de bouclier avec un générateur. Il reste incompatible avec le futur drone ancestral à deux emplacements. Les gains sont sauvegardés à la victoire ; leur notification finale attend sept secondes.

### Vérifications restantes

- Évaluer la difficulté d’une partie complète avec un équipement de niveau 15.
- Les règles de statistiques, checkpoint, troisième mort, récompenses, bonus et persistance sont couvertes par les tests ciblés et les parcours réseau réels de cette livraison.

---

## Niveau 20 — La Forge de Kharon

**État :** publié le 25 octobre à 20 h 34, `20261025-wave-portals1`. Identifiant technique `red` conservé ; portail rouge.

### Accès

- Niveau requis : **20**.
- Coût par tentative : **35 Fragments de Kharon**.
- Drop à 0,33 % : **maps 1, 2, 3, 4 et 5** ; Space Caster : 4 %.

### Déroulement actuel

Même rencontre qu’Azuron : 30 vagues, six séries de cinq et 250 ennemis, apparition toutes les quinze secondes à 2 000 unités du centre. Les PV, boucliers, dégâts et gains des ennemis sont les valeurs d’Azuron ×3 ; les ennemis affichent le niveau 20 sans appliquer un second palier. Vitesse, portée, cadence et comportement sont identiques au bleu. Les anciens boss Vesperion, Nyxaris et Asterion et leurs bombes ne sont plus invoqués dans ce portail.

Les deux portes, les quatre secondes de transfert, la reprise après une mort et les trois vies suivent exactement Azuron. Le cadre et le vortex bleus sont recolorés en rouge et conservent l’accélération du vortex et l’agrandissement du cœur lumineux pendant la charge.

### Récompenses et déblocages

- **3 000 000 crédits**, **1 500 000 XP**, **150 000 réputation**.
- **30 000 munitions x4** et **30 000 NOVA**.
- Tirage exclusif existant : **Laser MK-IV 33 %**, **apparence de drone Kharon 33 %**, **rien 34 %**.
- La première victoire rend achetables et équipables les vaisseaux élite et les vaisseaux à compétence.

Les gains sont sauvegardés à la victoire ; leur notification finale attend sept secondes. Les bonus spéciaux sont conservés selon le choix du joueur et ne sont pas remplacés par celui du portail bleu.

### Vérifications et limite existante

- Évaluer la difficulté d’une partie complète avec un équipement de niveau 20.
- Les règles de statistiques, checkpoint, troisième mort, récompenses, bonus et persistance sont couvertes par les tests ciblés et les parcours réseau réels de cette livraison.
- Le tirage du skin Kharon conserve sa limite antérieure : le résultat cosmétique est marqué `pending`, sans apparence utilisable stockée dans le compte. Son visuel et son intégration restent à terminer séparément.

---

## Niveau 25 — La Tempête d’Ionis

**État :** ✅ codé et activé.

### Accès

- Niveau requis : **25**.
- Coût de déverrouillage : **50 Fragments d’Ionis**.
- Drop à 0,33 % : **maps 2, 3, 4, 5 et CORE**.
- Space Caster : 4 %.

### Déroulement actuel

1. Le portail contient **40 vagues**, sans boss.
2. Toutes les créatures sont de niveau 25.
3. Les vagues sont réparties en **10 groupes de 4**.
4. La première vague apparaît immédiatement, puis les trois suivantes toutes les 10 secondes.
5. Le groupe suivant attend la destruction complète du groupe en cours.
6. Les vagues commencent avec 3 ennemis et augmentent progressivement jusqu’à 7.
7. La vague 40 contient 7 ennemis élite :
   - durabilité ×1,75 ;
   - dégâts ×1,4 ;
   - taille ×1,12.

Les compositions exactes d’ennemis sont provisoires. Aucun ennemi du portail ne donne de butin individuel.

### Récompenses et déblocages

- **40 000 munitions x4**.
- **40 000 NOVA**.
- Déverrouillage de l’accès aux futures améliorations de lasers, générateurs et autres équipements.

### À tester ou corriger

- 🟡 Faire une vraie partie de 40 vagues afin de mesurer la durée totale et la fatigue du combat.
- 🟡 Vérifier les performances lorsque plusieurs vagues coexistent.
- ❓ Valider les types d’ennemis et leur montée en puissance.
- ❓ Le verrou d’accès aux améliorations existe, mais le système complet d’amélioration devra être finalisé séparément.

---

## Niveau 30 — La Ruche d’Éclanite

**État :** ✅ codé et activé.

### Accès

- Niveau requis : **30**.
- Coût de déverrouillage : **60 Fragments d’Éclanite**.
- Drop à 0,33 % : **maps 2, 3, 4, 5 et CORE**.
- Space Caster : 4 %.

### Déroulement actuel

La carte est divisée en trois compartiments :

1. zone verte ;
2. zone rouge ;
3. zone bleue.

Le joueur commence dans la première zone. Une brèche ne s’ouvre vers la suivante qu’après la réussite de la zone actuelle.

Pour chaque zone :

1. un noyau de **5 000 000 PV** est entouré de gardiens ;
2. le noyau est invulnérable tant qu’un gardien vit ;
3. un unique chronomètre de **180 secondes** couvre les gardiens puis le noyau ;
4. une fois les gardiens détruits, le noyau devient vulnérable ;
5. les dégâts reçus par le noyau sont multipliés par 5 ;
6. si le noyau est détruit à temps, aucun boss n’apparaît et la brèche suivante s’ouvre ;
7. si le temps expire, le noyau devient un boss avec les PV qui lui restaient ;
8. si les gardiens n’ont même pas été éliminés avant la fin du temps, le boss apparaît avec les 5 000 000 PV complets.

Les zones possèdent provisoirement 8, 9 puis 10 gardiens.

### Boss de chaque compartiment

Tous les boss ont :

- 8 000 à 12 000 dégâts ;
- portée 450 ;
- vitesse 300 ;
- un tir par seconde ;
- aucun bouclier.

Leur spécialité dépend de la zone :

- boss vert, équivalent à 20 lasers verts : après sa charge, 20 % de vol de vie ;
- boss rouge, équivalent à 20 lasers rouges : après sa charge, +20 % de dégâts ;
- boss bleu, équivalent à 30 lasers bleus : jusqu’à +15 % de cadence pendant la décharge.

### Récompenses et déblocages

- **5 000 munitions x6**.
- **50 000 NOVA**.
- Déverrouillage des recettes, notamment les Lasers Élite Bleu, Rouge et Vert.

### À tester ou corriger

- 🟡 Tester le passage réel des deux brèches au cours d’une session réseau complète.
- 🟡 Vérifier qu’un dégât persistant appliqué au noyau bénéficie correctement du multiplicateur ×5.
- 🟡 Tester les trois possibilités : noyau détruit, boss à PV réduits et boss à 5 millions.
- 🟡 Vérifier la sauvegarde du déblocage des recettes.
- ❓ Valider le nombre et la composition des gardiens ainsi que les coefficients des trois pouvoirs.

---

## Niveau 35 — L’Abîme de Nox

**État :** ✅ codé et activé, avec équilibrage et IA à retester.

### Accès

- Niveau requis : **35**.
- Coût de déverrouillage : **75 Fragments de Nox**.
- Drop à 0,33 % : **maps 3, 4, 5, CORE et futures zones de niveau 35 à 50**.
- Space Caster : 4 %.

### Objectif et station

Le joueur doit défendre une station placée au centre de la carte pendant 30 vagues.

La station possède :

- une barrière globale de **1 000 000 PV** ;
- un noyau de **3 000 000 PV** ;
- 2 tourelles laser ;
- 2 lance-missiles ;
- 2 invocateurs de drones.

Chaque défense possède **500 000 PV**. Tant que la barrière vit, les dégâts destinés aux défenses et au noyau sont absorbés par elle.

Les tourelles infligent 30 000 à 50 000 dégâts par seconde. Leurs portées actuelles, choisies provisoirement, sont de 1 300 pour les lasers et 1 650 pour les missiles.

Chaque invocateur :

- crée immédiatement 3 drones ;
- attend que son trio entier soit détruit ;
- respecte ensuite un délai minimal de 20 secondes avant de recréer 3 drones.

Chaque drone allié possède :

- 20 000 PV ;
- 3 000 à 5 000 dégâts par seconde ;
- portée 500 ;
- vitesse 400.

### Vagues et ennemis

- 30 vagues réparties en **6 assauts de 5**.
- 10 secondes entre les vagues d’un même assaut.
- Nettoyage complet nécessaire avant l’assaut suivant.
- Vagues 1 à 29 : entre 3 et 8 ennemis ordinaires.
- Un kamikaze apparaît toutes les trois vagues.
- Deux kamikazes apparaissent sur chaque vague multiple de cinq.

Un kamikaze possède :

- 45 000 PV, plus 1 500 PV par numéro de vague supplémentaire ;
- vitesse 520 ;
- explosion de 100 000 dégâts ;
- rayon d’explosion 150 ;
- priorité absolue aux infrastructures, sans se laisser attirer par le joueur ou les drones.

Les ennemis ordinaires cherchent d’abord les drones alliés, puis un joueur proche ou agressif, ensuite les défenses et enfin le noyau.

### Boss final

La vague 30 contient le **Dévoreur de station** :

- 5 000 000 PV ;
- 5 000 000 de bouclier ;
- 60 000 à 90 000 dégâts par seconde, valeur provisoire ;
- portée 300, valeur provisoire ;
- vitesse 285, valeur provisoire ;
- ignore le joueur et les drones pour attaquer directement le noyau.

Si le noyau atteint zéro, le portail échoue immédiatement, ne donne aucune récompense et renvoie le joueur sur sa map 1 de firme.

### Récompenses

- **10 000 munitions x6**.
- **50 000 NOVA**.
- Tirage exclusif :
  - Laser Élite Bleu : 15 % ;
  - Laser Élite Rouge : 15 % ;
  - Laser Élite Vert : 15 % ;
  - rien : 55 %.

### À tester ou corriger

- 🔴 Avec un rayon d’explosion de 150 et des structures espacées d’environ 500 ou plus, le kamikaze ne peut presque jamais toucher plusieurs structures. Son choix du « meilleur point d’impact » revient donc généralement à viser la structure la plus proche.
- 🔴 La priorité des ennemis pour les drones est actuellement globale. Un ennemi peut traverser toute la carte pour poursuivre un drone très éloigné. Une distance maximale de détection est recommandée.
- 🟡 Tester l’endurance des 30 vagues avec le vrai trafic réseau et plusieurs effets simultanés.
- 🟡 Vérifier que le boss conserve son focus sur le noyau pendant un vrai combat long.
- 🟡 Valider les dégâts, la portée et la vitesse provisoires du boss.
- ❓ Décider si les structures survivantes doivent offrir un bonus de fin ou seulement servir à la réussite.

---

## Niveau 40 — Le Nexus Prismatique

**État :** 🧪 épreuve codée et entrée activée, équilibrage réel encore nécessaire.

L’asset rond du portail, son fragment et le nouveau drone ancestral existent. Le catalogue, les fragments, la table de récompenses, la carte, les objectifs, les effets et le combat des trois boss sont reliés au serveur autoritaire et au client.

### Accès prévu

- Niveau requis : **40**.
- Coût de déverrouillage : **80 Fragments du Nexus**.
- Drop à 0,33 % : **maps 4, 5, CORE et zones de niveau 35 à 50**.
- Space Caster : 4 %.

### Déroulement conçu

#### Phase 1 — Les trois planètes

Trois planètes de 2 000 000 PV doivent être détruites :

- une planète de feu ;
- une planète d’eau ;
- une planète de cristal rouge.

Chaque planète est protégée par **3 drones ancestraux** sans réapparition. La planète reste invulnérable tant que ses trois gardiens ne sont pas détruits. Les gardiens attaquent lorsque le joueur s’approche, mais interrompent la poursuite et retournent vers leur poste si le joueur fuit hors de leur zone de garde.

Chaque drone ancestral prévu possède :

- 400 000 PV ;
- 400 000 de bouclier ;
- 3 000 à 5 000 dégâts ;
- portée 400 ;
- vitesse 400.

#### Phase 2 — Le trou noir

Lorsque les trois planètes sont détruites :

1. un trou noir apparaît au centre de la carte ;
2. le joueur entre dans le trou noir ;
3. la phase des planètes est remplacée par la phase finale sur la même carte ;
4. trois boss apparaissent simultanément et attaquent le joueur.

#### Phase 3 — Le trio prismatique

Chaque boss possède provisoirement :

- 2 000 000 PV ;
- 2 000 000 de bouclier ;
- 5 000 à 10 000 dégâts ;
- vitesse 300 ;
- portée 450.

Pouvoirs prévus :

- **boss rouge** : brûlure de 3 000 dégâts par seconde pendant 10 secondes, soit 30 000 dégâts, avec 60 secondes de recharge ;
- **boss vert** : toutes les 30 secondes, soigne uniquement les PV de l’allié vivant ayant le moins de PV, à raison de 5 000 PV par seconde pendant 10 secondes, soit 50 000 PV ;
- **boss bleu** : toutes les 60 secondes, réduit la vitesse du joueur de 50 % pendant 5 secondes.

### Récompenses prévues

- **50 000 munitions x4**.
- **50 000 NOVA**.
- Tirage exclusif :
  - Noyau de Drone Ancestral : 33 % ;
  - Laser MK-IV : 33 % ;
  - rien : 34 %.

### État technique et points à tester

- Les 3 vies et la reprise dans l’instance utilisent le système commun des portails.
- La brûlure rouge inflige directement 10 ticks de 3 000 dégâts et ne se cumule pas avec elle-même avant son prochain délai de 60 secondes.
- Le soin vert ne restaure pas le bouclier.
- Les trois boss utilisent provisoirement le même châssis ancestral, avec des couleurs et effets visuels rouge, vert et bleu distincts.
- 🟡 Les statistiques des boss ont été choisies sans connaître la puissance réelle d’un joueur de niveau 40 ; elles devront être ajustées après un premier test.
- 🟡 La portée 450 et la cadence d’attaque standard de 1 seconde sont provisoires.
- 🔴 Le « Noyau de Drone Ancestral » gagné à 33 % est désormais illustré par le bon asset, mais reste un objet réservé : la migration vers un véritable drone possédé à deux emplacements doit être faite dans une évolution séparée afin de ne pas corrompre les drones et profils existants.

---

## Niveau 45 — Le Sanctuaire des Précurseurs

**État :** 📝 concept défini, épreuve non codée et entrée bloquée.

L’asset rond du portail et son fragment existent. La récompense est enregistrée dans le catalogue, mais le skin ancestral n’a pas encore de stockage fonctionnel.

### Accès prévu

- Niveau requis : **45**.
- Coût de déverrouillage : **90 Fragments des Précurseurs**.
- Drop à 0,33 % : **map 5, CORE et zones de niveau 35 à 50**.
- Space Caster : 4 %.

### Déroulement conçu

#### Phase 1 — Recherche dans l’enfer

1. Le joueur arrive dans une carte infernale avec **5 minutes** au chronomètre.
2. La carte contient cinq salles cachées.
3. Deux salles aléatoires contiennent chacune un vaisseau ange enfermé dans une cage.
4. Les salles sont remplies de vaisseaux démoniaques très puissants.
5. L’objectif principal n’est pas de tout tuer : il faut ouvrir la cage puis s’échapper avec l’ange.
6. Libérer le premier ange ajoute 5 minutes.
7. Libérer le second ange ajoute encore 5 minutes.

Le budget maximal théorique est donc de 15 minutes, mais le temps déjà dépensé continue naturellement de compter.

#### Phase 2 — Le talisman

Parmi les trois salles ne contenant pas d’ange :

1. une salle aléatoire contient le talisman ;
2. un miniboss blanc le protège ;
3. une icône de parchemin apparaît au-dessus du miniboss ;
4. le miniboss doit obligatoirement être tué ;
5. le joueur récupère le talisman ;
6. il le place dans une balise située au centre de la carte ;
7. un portail vers le paradis apparaît.

#### Phase 3 — Le paradis corrompu

Dans le paradis, le Roi des Démons attend le joueur.

Le boss prévu possède :

- 30 000 000 PV ;
- 15 000 000 de bouclier ;
- 30 000 à 50 000 dégâts.

Des anges alliés participent au combat. Ils peuvent soigner le joueur, augmenter ses PV et l’aider à tenir face au boss.

Le boss :

- cible en priorité l’attaquant qui lui inflige le plus de dégâts ;
- invoque des monstres ;
- pose des bombes ;
- inflige 100 000 dégâts au joueur ou aux anges dans un rayon de 100 autour d’une bombe déclenchée.

Après sa défaite, le joueur rencontre le **Dieu des Vaisseaux** et le portail est terminé.

Si le chronomètre atteint zéro pendant la partie chronométrée, le joueur est expulsé et la tentative est perdue.

### Récompenses prévues

- **15 000 munitions x6**.
- **75 000 NOVA**.
- Tirage exclusif garanti :
  - skin de drone ancestral inférieur, donnant +20 % d’attaque ou de bouclier selon le module : 50 % ;
  - un Laser Élite Bleu, Rouge ou Vert choisi aléatoirement : 50 %.

### À décider ou corriger avant codage

- ❓ Choisir définitivement entre le thème anges/démons et une civilisation spatiale dominante. Le nom « Sanctuaire des Précurseurs » convient davantage à une ancienne civilisation qu’à un paradis religieux.
- ❓ Définir les statistiques du miniboss blanc.
- ❓ Définir les statistiques et les comportements des monstres des cinq salles.
- ❓ Définir si les anges libérés peuvent mourir et si leur mort fait échouer la tentative.
- ❓ Définir si les anges suivent réellement le joueur ou s’ils rejoignent automatiquement le centre.
- ❓ Définir si le chronomètre s’arrête à l’entrée du paradis ou continue pendant le boss final.
- ❓ Définir l’effet d’une mort du joueur sur le chronomètre, en plus du système normal des trois vies.
- ❓ Enregistrer la disposition aléatoire dès la création de l’instance afin d’empêcher une reconnexion de changer les salles.
- 🔴 Le skin ancestral peut être tiré par la table de récompense, mais il n’est pas encore stocké ni équipable.
- 🔴 Le Roi des Démons est annoncé comme tué ici, puis revient comme boss final du portail 50. Il faut décider s’il s’agit ici d’un avatar, d’un lieutenant, d’une fausse victoire ou d’une fuite du Roi.
- 🎨 Créer les assets des cages angéliques, des anges, des démons, du miniboss blanc, du talisman, de la balise, du paradis et du Roi des Démons.

---

## Niveau 50 — Le Cœur de l’Éternel

**État :** 📝 concept défini, épreuve non codée et entrée bloquée.

L’asset rond du portail et celui de son fragment existent. Le titre, son ornement, le bonus de 5 % et le verrou du prestige possèdent déjà une base de code. Le scénario, le cœur du Roi, les quatre sources d’énergie, la tour et le boss n’existent pas encore.

### Accès prévu

- Niveau requis : **50**.
- Coût de déverrouillage : **100 Fragments de l’Éternel**.
- Drop monde : **aucune zone définie actuellement**.
- Space Caster : 4 % et seule source prévue tant qu’aucune zone de drop n’est choisie.
- La fin des huit portails précédents est nécessaire pour effectuer ensuite le prestige.

### Déroulement conçu

#### Phase 1 — Le pacte divin

1. Le joueur retrouve le Dieu des Vaisseaux.
2. Le Dieu explique que le cœur du Roi des Démons peut offrir un pouvoir supérieur.
3. Il accompagne et bénit le joueur pour lui permettre de combattre à armes égales.

#### Phase 2 — Les quatre sources d’énergie

Quatre grandes sources d’énergie sont placées aux points cardinaux :

- est ;
- ouest ;
- sud ;
- nord.

Pour chaque source :

1. des démons protègent une grande étoile ;
2. les défenseurs doivent être éliminés ;
3. l’étoile devient attaquable ;
4. le joueur la détruit pour absorber son énergie.

Après les quatre sources :

- une aura blanche et un halo entourent le vaisseau ;
- un booster spécial affiche **+5 000 000 de vie** ;
- un second booster affiche **dégâts ×10**.

#### Phase 3 — La tour démoniaque

1. Le joueur reprend la faille démoniaque centrale.
2. Il entre au premier étage d’une tour.
3. Tous les monstres de l’étage doivent être éliminés.
4. Un portail s’ouvre vers l’étage suivant.
5. Le processus se répète jusqu’au cinquième étage.

#### Phase 4 — Le Roi des Démons

À l’étage 5, une cinématique montre le Roi des Démons entouré de feu.

Le boss prévu possède :

- 100 000 000 PV ;
- 50 000 000 de bouclier ;
- 100 000 à 200 000 dégâts par attaque.

Pouvoirs prévus :

- téléportation sur le joueur ;
- attraction du joueur ;
- ralentissement ;
- invocation de monstres ;
- bombes au sol.

Deux pouvoirs spéciaux ne peuvent jamais partir simultanément. Un délai minimal de **5 secondes** doit séparer deux sorts spéciaux.

Après la victoire :

- le joueur reçoit le Cœur du Roi des Démons ;
- le titre et l’ornement de prestige sont déverrouillés ;
- l’accès au prestige devient possible si toutes les autres conditions sont remplies ;
- la suite prévue comprend les niveaux 51 à 100, de nouvelles cartes et les portails 60, 70, 80, 90 et 100.

### Récompenses prévues et base déjà codée

- **25 000 munitions x6**.
- **100 000 NOVA**.
- Ornement animé autour du pseudo.
- Titre **« Système stellaire colonisé »**.
- Bonus de **+5 % à tous les dégâts**.
- Prestige après les neuf portails et le niveau 50.

Dans le code actuel :

- le titre et l’ornement sont déverrouillés par la victoire du portail 50 ;
- le bonus de 5 % s’applique seulement lorsque le titre est équipé ;
- le prestige demande le niveau 50 et la victoire sur les neuf portails ;
- le prestige est possible une seule fois ;
- le prestige remet le joueur au niveau 1 et augmente son niveau maximal de 50 à 100 ;
- aucun Cœur du Roi des Démons n’est encore exigé ou consommé ;
- les portails 60 à 100 et les maps 51 à 100 n’existent pas encore dans le catalogue.

### À décider ou corriger avant codage

- ❓ Définir les zones de drop des Fragments de l’Éternel.
- ❓ Confirmer que les quatre sources peuvent être faites dans n’importe quel ordre.
- ❓ Définir le nombre et les statistiques de leurs défenseurs.
- ❓ Préciser si « +5 000 000 de vie » augmente les PV maximaux, soigne de 5 millions ou fixe les PV à 5 millions.
- ❓ Confirmer que le multiplicateur ×10 concerne toutes les armes, compétences et dégâts persistants.
- ❓ Définir si les deux bénédictions sont perdues en cas de mort, de déconnexion ou de sortie du portail.
- ❓ Définir les cinq compositions d’étage et leurs éventuels miniboss.
- ❓ Définir pour chaque sort du Roi sa portée, sa durée, son avertissement visuel et son temps de recharge.
- ❓ Définir le rôle réel du Dieu des Vaisseaux : compagnon attaquable, soutien invulnérable ou simple guide narratif.
- 🔴 Ajouter l’objet Cœur du Roi, sa persistance et sa consommation si le prestige doit réellement le demander.
- 🔴 Valider le fonctionnement du prestige : retour au niveau 1 avec plafond 100, ou passage direct vers les niveaux 51 à 100.
- 🔴 Résoudre la continuité avec la mort du Roi annoncée dans le portail 45.
- 🎨 Créer les assets des quatre étoiles, de l’aura divine, du halo, du Dieu des Vaisseaux, de la tour, des étages, des failles et du boss final.

---

## Décisions globales à prendre avant de coder les portails 40 à 50

### 1. Direction artistique et scénario

Il faut choisir une seule direction avant de produire de nombreux assets :

- **anges et démons**, avec un ton plus mythologique ;
- **ancienne espèce spatiale dominante**, avec sanctuaires, précurseurs, entités stellaires et empire ennemi.

Une solution intermédiaire est possible : les « anges » et les « démons » seraient les noms donnés par les pilotes à deux civilisations spatiales très anciennes. Cela conserverait les mécaniques imaginées tout en restant cohérent avec l’univers spatial.

### 2. Fragments par tentative ou déverrouillage permanent

Le jeu utilise actuellement les fragments comme clé permanente. Cette règle doit être validée avant d’ajouter les fragments 40 à 50, sinon l’économie et le Space Caster continueront à produire des objets sans fonction.

### 3. Solo ou coopération

**Décision utilisateur du 23 octobre 2026 : tous les portails de l’onglet PORTAILS sont 100 % solo.** Une exception future nécessite une décision explicite du créateur. Les alliés de leurs scénarios sont des PNJ. Appartenir à un groupe n’empêche pas de jouer en solo et les changements de groupe ne doivent pas fermer l’instance personnelle.

**Deadly/Ricky est la seule exception actuelle : solo ou groupe (4 joueurs maximum, limite existante).** Le chef entre en premier. Chaque autre membre rejoint ensuite depuis son portail de map 2 avec J, en consommant sa propre clé. Chaque joueur dispose de 3 vies ; une mort retire une vie et la troisième le renvoie sur la map 1 de sa firme. Les reprises avec des vies restantes ne consomment pas une autre clé. Quitter le groupe abandonne sa participation à Deadly ; les autres participants continuent. Le groupe peut repartir sur une nouvelle tentative quand tous les anciens participants ont quitté ou épuisé leurs vies.

Si un autre portail est explicitement ouvert à la coopération plus tard, définir :

- la limite de joueurs ;
- le partage des récompenses ;
- l’augmentation des PV et dégâts des ennemis ;
- les vies individuelles ou communes ;
- la propriété du portail préparé.

### 4. Échelle de puissance des niveaux 40 à 50

Les valeurs de millions de PV et les multiplicateurs ×10 ne pourront être équilibrés correctement qu’avec un profil représentatif des niveaux 40, 45 et 50. Un profil de test standard devra être créé avant l’ajustement final.

### 5. Persistance et reconnexion

Les portails 45 et 50 comportent des états longs et aléatoires. Le serveur devra conserver :

- les salles déjà visitées ;
- les anges libérés ;
- le talisman récupéré ;
- le chronomètre ;
- les énergies absorbées ;
- l’étage actuel ;
- les bénédictions actives ;
- les boss et leurs PV.

### 6. Récompenses encore incomplètes

Avant de rendre les portails concernés jouables :

- stocker et équiper réellement le skin Kharon du niveau 20 ;
- créer et équiper réellement le skin ancestral du niveau 45 ;
- transformer le Noyau de Drone Ancestral du niveau 40 en véritable déblocage de drone ;
- créer le Cœur du Roi et son lien avec le prestige ;
- finaliser l’animation de l’ornement du niveau 50.

## Ordre de travail recommandé

1. Corriger les récompenses incomplètes et décider du rôle des fragments après déverrouillage.
2. Faire les essais réels des portails 10 à 35 et corriger uniquement les problèmes observés.
3. Valider le thème narratif des portails 45 et 50.
4. Construire le portail 40 comme première épreuve de niveau supérieur.
5. Équilibrer le niveau 40 avec un profil de test réaliste.
6. Construire le portail 45 avec son système de salles, de chronomètre et d’escorte.
7. Construire le portail 50 en dernier, car il dépend du scénario, du prestige, des boosters temporaires et de la future progression 51 à 100.
