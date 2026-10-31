# Vitesse des lasers, enchaînement X6 et variantes — 24 octobre 2026

> Mise à jour à 20 h 24 : la variante B est retenue et publiée ; les fissures persistantes ont été retirées. Le bouclier est visible uniquement lors des impacts. Voir `VFX_BOUCLIER_X6_B_2026-10-24.md`. Le contenu ci-dessous décrit la version précédente.

Correctif technique publié à 18 h 13 (Paris), version `20261024-laser-input1`. Les trois nouvelles propositions artistiques X6 et la refonte des cinq monstres restent dans l'atelier local.

## Défauts reproduits et correction

- Les X1 à X4 avaient été allongés de 200 à 280 ms, avec une longueur de trait passée de 130 à 170. Le rendu partagé retrouve exactement 200 ms et 130, avec ses deux passages. L'atelier réutilise également le vrai trajet du jeu pour les lasers ordinaires, au lieu de sa progression linéaire proposée.
- La séparation de recharge X6 préparée dans `COMBAT_LISIBILITE_X6_2026-10-24.md` n'était pas encore publiée. Le client et le serveur utilisent maintenant une clé X6 indépendante. Les quatre munitions normales conservent leur recharge commune ; changer de munition normale ne la réinitialise pas.
- En local, deux activations dans la même image pouvaient remplacer la sélection X6 avant l'envoi. La demande X6 part maintenant dès son activation, puis le tir normal reprend sans attendre l'accusé serveur. Une confirmation de la munition normale dans les 300 ms suivant cette transition ne désactive pas involontairement le slot rétabli. L'appui suivant, ou un appui après ce bref délai, conserve l'arrêt habituel.
- Le rendu X6 pouvait hériter de la transparence du laser ordinaire dessiné juste avant lui. Reproduction : opacité de 0,01125 au lieu de 1 à la fin d'un laser normal. Chaque faisceau réinitialise désormais son alpha et son flou d'ombre avant son dessin.

Le serveur reste seul responsable des dégâts et du débit des munitions. La X6 conserve une recharge de trois secondes et un seul débit par salve. Les quatre passages restent visuels. Les réponses tardives ne remplacent pas une sélection plus récente et ne relancent pas un tir arrêté.

## Photo et protection de la cible

La capture fournie montre le mode bouclier : le cercle bleu reçoit l'impact avant le corps de l'Orbe. L'atelier distingue maintenant explicitement « Bouclier actif » et « Sans bouclier · coque », avec une explication visible. Le second mode retire le cercle et montre le contact avec le corps et les marques déjà disponibles. Les règles réelles d'absorption du bouclier ne sont pas modifiées.

## Trois propositions X6 locales

Dans `tools/vfx-lab/`, sélectionner M-6 affiche le rendu actuel et trois candidats synchronisés : A, lances polarisées ; B, filaments croisés ; C, anneaux de phase. Les candidats lancent quatre impulsions de 120 ms aux départs 0, 90, 180 et 270 ms, depuis l'avant et ses deux côtés, toutes les trois secondes. Les impacts suivent chaque signature. Le ralenti et la pause permettent de les comparer.

Ces candidats sont composés dans `x6Variants.js`, sans remplacement du dessinateur X6 publié. Aucun nouveau style n'a été choisi ou publié à la place du créateur.

## Validation et publication

- Trois défauts ont été reproduits avant correction : perte du X6 entre deux sélections dans la même image, attente du X6 avant le tir normal, transparence héritée d'un laser normal.
- Contrôle navigateur des quatre lasers ordinaires sur bouclier et sur coque, puis des trois variantes X6 synchronisées : aucune erreur affichée ou console, quatre cadres visibles sans débordement horizontal. Chaque impulsion proposée reste visible à 30, 60 et 144 images/s dans la vérification temporelle.
- 103 tests ciblés passent sur les sources fraîches de production avec l'overlay exact. Ils comprennent les quatre munitions normales dans les deux ordres, appuis rapides, réponses retardées/inversées, retour automatique, arrêt explicite, stock et cadence, contrôles de sécurité, bonus élite, PvP et un échange Socket.IO avec attaquant et spectateur. Les deux demandes partent avant le premier accusé réseau ; chaque salve est débitée et appliquée une seule fois.
- Neuf fichiers installés et huit ressources publiques concordent par SHA-256. Les 515 autres fichiers du runtime contrôlés sont conservés, y compris la mise à jour simultanée détectée lors du premier essai. L'installation avait été arrêtée avant toute écriture, puis recomposée depuis cette nouvelle base.
- Un redémarrage pour la nouvelle clé serveur : PID 1222927, `NRestarts=0`, service actif, PostgreSQL prêt et aucune nouvelle erreur pertinente dans les journaux. Aucun joueur connecté au début de l'installation.
- Les modules réellement installés ont ensuite été exercés avec des objets éphémères : huit paires X6/munition normale acceptées au même instant, recharge et consommation indépendantes, durée X1–X4 de 200 ms, longueur 130 et opacité X6 de 1 pendant le chevauchement. Aucun compte, état du monde ou stockage de joueur n'est modifié par cette sonde. Aucune session MMO authentifiée n'est présentée comme vérifiée.

Preuves : `output/vfx-laser-rework-2026-10-24/`. La publication finale et les empreintes sont dans `release/rebase1/` ; le premier candidat est conservé séparément. Sauvegarde distante : `/opt/avosoma-backups/20261024-laser-input1`.
