# Tutoriel : refonte du 22 octobre 2026

## État de livraison

**Lot validé par l'utilisateur après essai.** Le résultat lui convient et il souhaite poursuivre l'audit sur un autre chantier. Cette acceptation ne constitue pas une certification d'absence de défauts ; les limites des contrôles restent consignées.

La version publique du tutoriel est **`20261022-tutorial4`**, publiée le **22 octobre 2026 à 20:55:16 (Europe/Paris)**. Elle corrige les à-coups des flèches en synchronisant leur projection avec les images du jeu. Le panneau conserve son placement automatique gauche/droite, confirmé par l'utilisateur. La livraison précédente `20261022-tutorial3` à 20:36:32 et son contrôle de reprise du compte restent consignés ci-dessous.

### Suivi des repères — `20261022-tutorial4`

Le rendu de combat notifie le guidage après avoir dessiné la scène. Le guidage reprojette alors la destination choisie avec cette caméra ; la recherche des routes, le choix de cible et la validation restent sur le tick de 100 ms. Les snapshots de validation ne sont pas modifiés. Les positions sous-pixel sont conservées, les ennemis invalides et les anciennes cartes cessent immédiatement d'être suivis. Les menus et le masquage du tutoriel interrompent ce suivi.

152 tests ciblés et 40 tests client passent. Le contrôle navigateur local et ses mesures sont détaillés dans `docs/TUTORIEL_RETOURS_2026-10-22.md`. Livraison de 4 fichiers front, 4 empreintes installées et 4 fichiers publics conformes, caches Hélion hub3 préservés. Aucun redémarrage ni changement de progression. Sauvegarde `/opt/avosoma-backups/20261022-tutorial4` ; preuves sous `output/tutorial-refonte-2026-10-22/release4/`.

### Livraison des retours — `20261022-tutorial3`

Publication ciblée de **14 fichiers** : les 12 fichiers applicatifs du lot, `index.html` et `styles.css`. Avant installation, 24 contrôles de garde ont comparé une base distante fraîche intégrant les travaux Hélion hub2. La sauvegarde du code se trouve sous `/opt/avosoma-backups/20261022-tutorial3` ; les 14 empreintes installées sont conformes.

Au contrôle après publication, `avosoma-beta.service` est actif, avec PID `2789980` et `NRestarts=0`. PostgreSQL est prêt et la capacité reste de 50 joueurs. Les neuf fichiers publics contrôlés répondent HTTP 200 avec les empreintes SHA-256 normalisées attendues ; `/health` confirme l'état de PostgreSQL et la capacité. Les alias du hub Hélion et de son entrée de jeu hub2 sont préservés, sans nouvel alias des modules uniques d'état ou de connexion. Preuve : `output/tutorial-refonte-2026-10-22/release3/public-verification.json`.

La remise à zéro demandée concerne uniquement le profil de jeu ciblé, avec sauvegarde privée en mode `0600`. Le compte Absyrion, le pseudo et les autres profils sont conservés ; cinq références personnelles dans les données de firme ont été nettoyées, et aucune ne subsiste pour ce profil au contrôle final. L'état persisté est `pending`, version 3, étape `launcher_orion`, révision 0, récompense non réclamée.

Dans le navigateur public : rechargement, connexion avec Absyrion, puis écran de choix des quatre firmes sans sélection et profil de départ, sans avancer le tutoriel. Capture : `output/tutorial-refonte-2026-10-22/release3/account-reset-ready.png`.

### Livraison initiale — `20261022-tutorial2`

Publiée sur `https://avosoma.absyrion.com/` le 22 octobre 2026 à 19:44:12 (Europe/Paris), à la demande de l'utilisateur. Version client `20261022-tutorial2`. Les travaux de décor Hélion menés en parallèle et les autres constats de l'audit général restent hors de cette modification ; le décor public courant est conservé.

Publication ciblée de 23 fichiers, comparaison préalable avec la version serveur, sauvegarde `/opt/avosoma-backups/20261022-tutorial2` et restauration automatique prévue en cas d'échec. Les 23 empreintes installées et les 16 fichiers client servis en HTTPS correspondent au paquet. Le service `avosoma-beta.service` a redémarré, reste actif avec `NRestarts=0`, et la santé publique confirme PostgreSQL disponible et la limite de 50 joueurs. Aucun avertissement dans le journal systemd au contrôle suivant la publication.

Le chargement public du hangar avec la session Absyrion existante a été vérifié : profil synchronisé, nouveau contrôleur présent dans le DOM, nouvelle feuille de style et version du module racine, aucune erreur ou alerte console relevée. L'onglet de vol public a ensuite été rechargé : secteur Hélion-01 affiché au QG, position reprise depuis le serveur, aucune erreur ou alerte console relevée. Capture : `output/tutorial-refonte-2026-10-22/release/public-game.png`. Lors de cette livraison initiale, aucun pilote existant n'avait été remis à zéro pour les essais.

Le cache des modules modifiés est renouvelé par un `importmap` placé avant le module racine dans `index.html`. Toutes les variantes d'import utilisées pointent vers une seule URL par module modifié ; les modules uniques du magasin d'état et de la connexion multijoueur conservent leurs URL. Le CSS racine et le CSS du tutoriel portent aussi la nouvelle version. Les éléments de publication et les preuves sont dans `output/tutorial-refonte-2026-10-22/release/`.

## Parcours commun aux quatre firmes

Six chapitres : prise en main du hangar, première mission et réparation, achat/équipement du Velox, raffinerie et stockage, seconde sortie de combat, passage vers le secteur 2 et conclusion. Les objectifs restent identiques ; interlocuteur, identifiants de quête, relais et destinations suivent la firme : Hélion pour Astra, Nereid pour Cygnus, Aureon pour Solarys, Sylva pour Verdantis.

La livraison publique initiale conserve les 45 identifiants d'étapes existants pour reprendre les sauvegardes. Les profils actifs hérités passent par une revue unique de leurs objectifs durables. Un ancien profil abandonné ou terminé ne redémarre pas. Les récompenses, prix et quantités des missions existantes restent ceux du jeu.

Le lot publié dans `20261022-tutorial3` porte l'état du tutoriel en version 3 et ajoute quatre identifiants avant la chasse aux Vorak : `game_open_quick_shop`, `game_buy_rockets`, `game_bind_laser` et `game_bind_rockets`, soit 49 étapes. Les états actifs concernés sont migrés vers cette leçon ; les états terminés ou abandonnés restent définitifs, hors remise à zéro ciblée explicitement demandée et sauvegardée.

## Guidage et reprise

- Panneau compact avec chapitre, objectif, progression et bouton de réduction. Les dialogues ne bloquent plus toute l'interface.
- Surlignage du contrôle utile et recours au bon menu si le joueur se trouve ailleurs. Récupération après déséquipement, mauvaise page ou fermeture d'une fenêtre.
- Cible de combat conservée tant qu'elle reste utile et vivante. Changement vers une autre famille uniquement si l'objectif correspondant est déjà atteint.
- Flèche hors écran avec destination et distance, routes via les portails réellement ouverts et cartes de la firme. Aucun cercle supplémentaire autour d'un monstre visible, à la demande de l'utilisateur.
- Progression commune au tableau de bord et au vol. Une fermeture, une reconnexion ou une réduction du guide ne constitue pas un abandon.
- Abandon explicite, confirmation claire, irréversible pour le pilote. Les récompenses déjà reçues restent acquises.

## Retours utilisateur publiés — `20261022-tutorial3`

Le détail cumulatif des retours et de leur statut est dans `docs/TUTORIEL_RETOURS_2026-10-22.md`.

Le manifeste `output/tutorial-refonte-2026-10-22/feedback-local-manifest.json` conserve le périmètre de préparation : 12 fichiers applicatifs et leurs empreintes comparés au paquet `20261022-tutorial2`. Il ne constitue pas lui-même une preuve de déploiement. La livraison effective ajoute `index.html` et `styles.css` pour le cache ; ses preuves d'installation et de service public sont sous `output/tutorial-refonte-2026-10-22/release3/`.

- Consigne principale courte dans un cadre « À FAIRE », avec l'accueil et les explications en aide secondaire. Les hints des menus nomment l'action utile, par exemple « Clique sur ton Orion » ou « Clique sur DÉPART ».
- Point pulsant ancré au contrôle réel. Si celui-ci est hors vue, une flèche indique le sens du défilement ; le point ne dérive pas vers le bord du panneau et aucun défilement automatique n'est imposé.
- Relais, QG et portails signalés par des triangles de destination. Aucun cercle supplémentaire autour des monstres visibles.
- Avant les Vorak, découverte de **+ → Magasin**, achat réel d'un pack de **100 Roquettes R-1**, puis M-1 en case 1 et R-1 en case 2. Le prix de base du pack est de 10 000 crédits ; l'interface du magasin affiche le prix applicable. Le serveur conserve une preuve d'achat distincte du stock restant.
- Explication de la barre propre au Velox : elle commence vide, mais les canons restent équipés. Le guidage montre la munition à déplacer et sa destination ; une bordure intérieure rend cette case visible malgré son `clip-path`.
- Récupération en cas de changement de vaisseau, de retrait de matériel, de raccourci laser déplacé ou de stock de munitions épuisé. Les achats restent payants ; une seule R-1 restante suffit pour configurer le raccourci après l'achat validé. Placer le drone en case 9 est une aide facultative.
- La visite du deuxième secteur reste validée après un retour au premier. La mission jaune guide les cibles restantes sur les cartes 1 ou 2 de la firme, conformément aux zones de ses objectifs, sans imposer une nouvelle visite du secteur 2.
- La clé de rendu du contrôleur inclut le mode, l'objectif et le message de récupération, pour actualiser les consignes même lorsque l'étape sauvegardée ne change pas.
- La reprise après une pause ne permet plus de contourner la formation en acceptant et terminant la mission Vorak entre-temps : sans preuve d'achat des 100 R-1, le guide revient au magasin de combat. Les états version 2 déjà plus avancés restent préservés.

## Protections vérifiées

- Étape/révision attendues : double clic, demande retardée ou second onglet ne font pas avancer deux fois.
- Achats, équipement, réparation, quêtes, secteur et proximité du QG contrôlés côté serveur ; une simple action visuelle ne remplace pas ces preuves.
- Quêtes de la bonne firme uniquement ; refus d'une quête étrangère sans abandon implicite.
- Récompense finale unique et refus de la réclamer avant les quatre missions.
- Protection du matériel indispensable et de la réserve nécessaire aux achats/au stockage, sans nouvelle monnaie offerte. Les rachats utiles d'un ancien équipement vendu restent permis.
- Production réactivable pendant la construction du stockage ; information sur les ressources manquantes.
- Le compteur de raffinerie figé a été reproduit dans le navigateur puis corrigé : lecture serveur périodique tant que la page est visible, avec authentification et limites de fréquence. La production reste entièrement calculée sur le serveur.

## Preuves et limites

La livraison initiale était consignée avec 1 130 tests serveur et 40 tests client réussis. Les journaux à la racine du dossier de preuves ont depuis été remplacés par les résultats de la passe locale ci-dessous ; ils ne sont plus un instantané des tests de `20261022-tutorial2`. Le paquet de livraison et ses contrôles publics restent dans `output/tutorial-refonte-2026-10-22/release/`.

- `output/tutorial-refonte-2026-10-22/server-tests.log` actuel : **1 167 tests**, 1 167 réussis, aucun échec, annulation ou test ignoré. Les quatre nouveaux tests de pause/reprise reproduisent l'acceptation, les trois kills et l'attribution serveur de la mission Vorak pendant la pause, puis vérifient le retour à la leçon avec preuve d'achat à zéro.
- `output/tutorial-refonte-2026-10-22/client-tests.log` actuel : **40 tests**, 40 réussis, aucun ignoré.
- `output/tutorial-refonte-2026-10-22/tutorial-feedback-tests.log` : **48 tests** UI, parcours et guidage monde, tous réussis.
- `output/tutorial-refonte-2026-10-22/verify-tutorial-economy.mjs` et son journal actuel : scénario utilisant les transactions du jeu en mémoire pour les quatre firmes, jusqu'à l'étape de conclusion. Il inclut l'achat des 100 R-1 à 10 000 crédits ; solde après les quatre missions : **176 835 crédits** pour chaque firme. Les ressources nécessaires au stockage prennent environ deux minutes dans cet état de test.
- Navigateur réel, compte local Cygnus : création du pilote, sélection d'Orion, départ, relais propre à Cygnus, acceptation de mission, trois ennemis détruits et récompense reçue, reprise de position et du compteur après rechargement, réduction du guide et retrait du cercle. Activation réelle du drone de réparation, retour au QG de Nereid-01 et passage confirmé au chapitre 3, Le magasin. Aperçu du panneau et de la flèche dégagée des barres de vie : `output/tutorial-refonte-2026-10-22/tutorial-flight-preview.png`.
- Compte local de scénario boutique : ouverture du magasin, choix du Velox, détour volontaire par la raffinerie puis retour guidé, achat effectif du Velox et du MK-I, solde 140 000 crédits et passage au transfert d'équipement.
- Compte local de scénario raffinerie Solarys : ouverture du stockage, détection de l'extraction Titane arrêtée, fermeture de la confirmation et réactivation guidée. Après correction du rafraîchissement, le compteur passe de 0 à 12, 25, 37 puis 50 unités sans action utilisateur. Le bouton Lancer devient disponible ; son utilisation consomme les ressources, démarre le chantier, attribue la mission et passe au chapitre 5. Solde observé : 101 835 crédits après coût de 48 165 et récompense de 10 000. Aperçu : `output/tutorial-refonte-2026-10-22/tutorial-refinery-ready.png`.
- Abandon confirmé sur un compte jetable, reconnexion puis contrôle : panneau absent et état serveur `abandoned`. Le générateur de scénarios a ensuite réinitialisé uniquement ce compte de test pour vérifier la correction de la raffinerie ; le jeu ne propose aucune reprise après abandon.
- Nouvelle passe locale sur un pilote Astra : accueil et point pulsant contrôlés dans le vrai client, puis DÉPART hors vue avec flèche « Plus haut » et relais signalé par un triangle. Captures : `output/tutorial-refonte-2026-10-22/tutorial-clarity-welcome.png`, `tutorial-clarity-scroll.png` et `tutorial-clarity-relay.png` dans le même dossier.
- Nouvelle passe locale sur un pilote Solarys : menu +, Magasin, achat des 100 R-1 (**101 835 → 91 835 crédits**), glisser-déposer de M-1 en case 1, rechargement avec cette case conservée, placement de R-1 en case 2 par clic, puis passage à la chasse aux Vorak. Après un second rechargement : M-1 et R-1 toujours configurés, stock de 100 R-1, solde de 91 835 crédits, preuve d'achat persistée dans le profil JSON et guide toujours sur l'étape Vorak ; aucune erreur console relevée lors de ce contrôle. Captures : `output/tutorial-refonte-2026-10-22/tutorial-rockets-shop.png`, `tutorial-rockets-binding.png` et `tutorial-rockets-ready.png` dans le même dossier. Le glisser-déposer de R-1 par automatisation n'a pas fourni de résultat concluant ; cet essai ne valide pas ce geste et ne démontre pas un bug du jeu.

La revue finale indépendante du lot est achevée. Le contournement par pause/reprise qu'elle a confirmé est corrigé et testé ; aucun autre blocage n'a été confirmé dans son périmètre. **Le lot est publié et ses contrôles d'installation, HTTPS et navigateur public sont terminés.**

Les simulations par firme ne sont pas quatre parties entièrement jouées à la main. Le parcours navigateur jusqu'à la récompense finale n'a pas été joué intégralement lors de cette passe, et le glisser-déposer de R-1 reste non concluant par automatisation. Ce sont les limites des essais réalisés, pas des corrections supplémentaires déclarées nécessaires. Ces résultats ne constituent pas une garantie globale d'absence de bugs.

## Aperçu local

L'environnement local a été fermé et son API arrêtée après le contrôle du rechargement avec les deux raccourcis. La commande suivante recopie le code courant et relance cet environnement isolé.

Lancer `node output/tutorial-refonte-2026-10-22/start-tutorial-sandbox.mjs` depuis la racine. Le lanceur copie uniquement le code, utilise des données sous `output/tutorial-refonte-2026-10-22/sandbox/server/data`, écoute sur les ports de boucle locale 3317/3318 et sert les fichiers client actuels sans cache. Il ne charge ni les données ni les secrets de production.

URL : `http://127.0.0.1:3318/?serverUrl=http%3A%2F%2F127.0.0.1%3A3317`.

Les identifiants des comptes jetables restent dans les fichiers locaux de l'environnement de test et ne doivent pas être livrés en production. Les copies des fichiers avant modification se trouvent sous `output/tutorial-refonte-2026-10-22/before/` ; elles permettent une comparaison ciblée sans écraser les autres changements du répertoire.
