# Retours de test du tutoriel — 22 octobre 2026

**Validation utilisateur : lot accepté.** Après essai de `20261022-tutorial4`, l'utilisateur juge le résultat amélioré et suffisant pour passer au chantier suivant, tout en précisant qu'il n'est pas impeccable. Le tutoriel est donc clos pour ce lot ; aucun perfectionnement supplémentaire n'est engagé sans nouveau retour.

Le lot de retours est **publié et contrôlé** sous la version `20261022-tutorial3`, le 22 octobre 2026 à **20:36:32 (Europe/Paris)**. Il fait suite à `20261022-tutorial2`, publiée à 19:44. Un nouveau retour utilisateur s'ajoute à cette liste, sans remplacer les précédents.

## Suivi des flèches — correctif publié à 20:55:16

- `20261022-tutorial4` corrige les à-coups du relais : le repère était projeté toutes les 100 ms, tandis que la caméra bougeait à chaque image. La projection visuelle suit désormais le rendu réellement terminé, y compris avec une limite à 30 FPS. Les calculs de progression restent à leur cadence habituelle.
- Même correction pour QG, portails et ennemis hors écran, avec positions fractionnelles conservées. Aucun cercle ajouté ; sélection des cibles et recherche des routes conservées hors de la boucle de rendu.
- L'utilisateur confirme conserver le placement automatique du panneau à gauche ou à droite pour dégager la cible. Il n'est pas fixé à gauche.
- Validation : 152 tests ciblés tutoriel/boucle de rendu et 40 tests client réussis. Les nouveaux tests couvrent les quatre firmes, 30/60 FPS, cibles mobiles ou disparues, changements de carte, menus, masquage et destruction du guide.
- Contrôle dans le vrai jeu local sur un pilote jetable Astra : 180 lectures DOM en 1 794 ms, 57 changements de position ; médiane de 18 ms et maximum de 29 ms entre changements pendant le mouvement observé. Ce relevé mesure la cadence des positions, pas le coût CPU. Aucune erreur console relevée. Capture `tutorial-motion-relay.png` et relevé `motion-relay-samples.json` dans le dossier de preuves.
- Publication ciblée de 4 fichiers front, sans redémarrage ni changement de compte. 4 empreintes installées et 4 réponses HTTPS conformes ; caches Hélion hub3 préservés ; PostgreSQL disponible, capacité 50, PID 2796801 inchangé. Sauvegarde `/opt/avosoma-backups/20261022-tutorial4`, preuves sous `output/tutorial-refonte-2026-10-22/release4/`.
- L'API et l'onglet locaux ont été arrêtés après le contrôle. La production a été vérifiée par empreintes et santé ; le compte utilisateur n'a pas été piloté pour rejouer le scénario.

## Corrections livrées

Les corrections cochées ont été préparées et contrôlées localement, puis installées avec `20261022-tutorial3`. Les contrôles publics de cette livraison sont consignés séparément ci-dessous.

- [x] Point sur les contrôles : pulsation douce et ancrage au vrai bouton/vaisseau, sans déplacer le point vers le bord de la zone visible.
- [x] Défilement : flèches haut/bas et latérales lorsque le contrôle est hors vue, y compris dans les listes imbriquées. Aucun défilement automatique imposé.
- [x] Fiche : consigne courte en gros dans un cadre « À FAIRE », accueil et aides réduits, sans répétition. Commandes utiles et adaptation aux quatre firmes conservées.
- [x] Guidage du monde : triangles pour relais, QG et portails ; aucun cercle de tutoriel ajouté autour des ennemis visibles.
- [x] Avant les Vorak rushers : quatre étapes pour ouvrir **+ → Magasin**, acheter réellement **100 Roquettes R-1**, puis placer M-1 en case 1 et R-1 en case 2. L'achat et les raccourcis sont contrôlés côté serveur ; les configurations déjà correctes sont conservées.
- [x] Barre du Velox : explication de sa configuration propre au vaisseau, initialement vide, sans perte des canons équipés ni copie automatique de la barre Orion. Bordure intérieure de la case de destination pour rester visible malgré son découpage CSS.
- [x] Quête « Compréhension et acquisition » : visite du secteur 2 conservée après un retour au secteur 1 ; chasse guidée sur la carte courante lorsqu'elle est autorisée par la quête, parmi les cartes 1 et 2 de la firme.
- [x] Récupération des nouvelles étapes : réactivation du Velox, matériel minimal utile et réassort payant si M-1 ou R-1 est épuisé. La preuve d'achat des 100 R-1 reste acquise ; il n'est pas nécessaire d'en conserver 100. Le drone en case 9 reste facultatif.
- [x] Migration des états actifs concernés vers la leçon de munitions, sans redémarrer les tutoriels terminés ou abandonnés ; contrôles automatisés et scénario économique sur les quatre firmes.
- [x] Contournement par pause/reprise : accepter la mission Vorak, terminer ses trois cibles et recevoir sa récompense pendant la pause ne permet plus d'éviter la leçon. La reprise retourne au magasin de combat tant que la preuve d'achat manque.
- [x] Revue finale indépendante achevée : contournement par pause/reprise corrigé et testé ; aucun autre blocage confirmé dans le périmètre de cette revue.
- [x] Publication ciblée du lot, comparaison des fichiers servis en HTTPS et contrôle dans le navigateur public.

## Publication et remise à zéro ciblée

- Livraison de **14 fichiers** : 12 fichiers applicatifs, `index.html` et `styles.css`. Avant installation, 24 contrôles de garde ont comparé une base distante fraîche intégrant Hélion hub2. Sauvegarde du code : `/opt/avosoma-backups/20261022-tutorial3` ; les 14 empreintes installées sont conformes.
- Contrôle après publication : `avosoma-beta.service` actif, PID `2789980`, `NRestarts=0`, PostgreSQL prêt et capacité de 50 joueurs.
- HTTPS : **9 fichiers sur 9** répondent HTTP 200 avec les empreintes SHA-256 normalisées attendues. `/health` confirme PostgreSQL prêt et la capacité de 50 joueurs. Les alias du hub Hélion et de son entrée de jeu hub2 restent préservés, sans nouvel alias des modules uniques d'état ou de connexion. Preuve : `output/tutorial-refonte-2026-10-22/release3/public-verification.json`.
- Le profil de jeu demandé a été remis à zéro avec une sauvegarde privée en mode `0600`. Le compte Absyrion, le pseudo et les autres profils sont conservés. Les cinq références personnelles dans les données de firme ont été nettoyées ; le contrôle final n'en trouve plus pour ce profil.
- Navigateur public : rechargement puis connexion avec Absyrion, affichage du choix des quatre firmes sans sélection, profil de départ et aucun pas du tutoriel avancé. L'état persisté est `pending`, version 3, étape `launcher_orion`, révision 0 et récompense non réclamée. Capture : `output/tutorial-refonte-2026-10-22/release3/account-reset-ready.png`.

## Éléments vérifiés localement

- Pilote Astra jetable : accueil allégé et point pulsant ancré à l'Orion. Capture : `output/tutorial-refonte-2026-10-22/tutorial-clarity-welcome.png`.
- Défilement réel : DÉPART hors vue est remplacé par une flèche « Plus haut ». Capture : `output/tutorial-refonte-2026-10-22/tutorial-clarity-scroll.png`.
- Relais réel : triangle de destination, sans cercle de guidage. Capture : `output/tutorial-refonte-2026-10-22/tutorial-clarity-relay.png`.
- Pilote Solarys jetable : **+ → Magasin → achat de 100 R-1**, solde **101 835 → 91 835 crédits**, M-1 placé en case 1 par glisser-déposer, rechargement avec raccourci conservé, R-1 placé en case 2 par clic, puis passage à la chasse aux Vorak. Un second rechargement conserve les deux raccourcis, le stock de 100 R-1, le solde de 91 835 crédits, la preuve d'achat persistée et l'étape Vorak ; aucune erreur console relevée lors de ce contrôle. Captures : `tutorial-rockets-shop.png`, `tutorial-rockets-binding.png` et `tutorial-rockets-ready.png`, dans le même dossier de preuves.
- Le glisser-déposer de M-1 a fonctionné dans le navigateur. L'automatisation du glisser-déposer de R-1 n'a pas permis de conclure ; seul son placement par clic est confirmé par cet essai.
- Journaux actuels : **1 167 tests serveur**, **40 tests client** et **48 tests ciblés UI/parcours/guidage monde**, tous réussis. Quatre tests serveur reproduisent le contournement par pause/reprise pour les quatre firmes ; les profils version 2 déjà plus avancés restent préservés. Scénario économique relancé avec les actions du jeu sur les quatre firmes : **176 835 crédits** après les quatre missions, achat des 100 R-1 inclus.

Les journaux `server-tests.log`, `client-tests.log` et `verify-tutorial-economy.log` à la racine du dossier de preuves ont été actualisés pendant la préparation. Le précédent résultat de 1 130 tests serveur appartient à l'historique de `20261022-tutorial2` ; les journaux actuels décrivent les tests de ce lot. Les preuves distinctes de sa publication sont sous `release3/`.

Le manifeste `output/tutorial-refonte-2026-10-22/feedback-local-manifest.json` conserve l'inventaire des 12 fichiers applicatifs locaux comparés au paquet précédent. Cet inventaire de préparation n'est pas la preuve du déploiement ; la livraison effective ajoute les deux fichiers d'entrée et ses contrôles sont enregistrés sous `release3/`.

Cette passe concerne les retours de test du tutoriel. Elle ne constitue ni un parcours manuel intégral pour chaque firme, ni une validation globale de l'absence de bugs, ni une clôture de l'audit général.
