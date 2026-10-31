# Grades, retrait de l’Impérial et achats de boosters

Lot publié sur Avosoma/Netcup le 23 octobre 2026 : `20261023-coherence1`. Les constats A07, A12 et A13 de l’audit sont traités. Le prix Premium de la Boutique, le calendrier et le secours de démonstration du classement restent hors de ce lot.

## Grades : même attribution sur les différents écrans

`server/src/players/rankAuthority.js` réutilise le calcul compétitif existant. Seuils, points et quotas sont conservés. L’attribution sert au profil personnel, aux profils publics du classement et des firmes, ainsi qu’à l’insigne de l’état de combat. Un paquet de mouvement ne peut plus choisir un nom de grade ni une image arbitraire.

Le serveur joint une petite attribution `rankAssignment` à la synchronisation du profil et envoie `rank:updated` aux joueurs connectés dont le rang ou la position change. Il conserve une projection légère des scores pendant une seconde ; une modification du propre score invalide immédiatement cette projection. La fréquence existante de diffusion du classement complet n’est pas changée. Le client utilise un cache commun dans `src/core/rankAuthorityStore.js`, avec contrôle de la clé de compte, rejet des anciens paquets et nettoyage à la déconnexion. Le mode local historique reste disponible.

La progression passe par le grade réellement attribué. Avoir les points de Maréchal ne fait plus afficher « grade maximum » à un pilote auquel les quotas attribuent un autre grade. Le prochain grade reste visible, avec « seuil atteint · place au classement requise » lorsqu’il reste une condition de placement.

## Les 25 visuels

Finition suivante, après validation des formes : **éclat renforcé publié sous `20261023-rankshine1`**. Reflets et arêtes plus lumineux, noyaux bleus ravivés, mêmes géométries. Voir `docs/GRADES_ECLAT_2026-10-23.md`. Les paragraphes suivants décrivent la première finition et le choix des silhouettes.

La première proposition à écussons a été refusée et retirée. Le créateur a confirmé : conserver les formes d’origine et améliorer encore leur relief. Les 25 fichiers SVG reprennent donc les silhouettes, quantités de galons, barrettes, étoiles, lauriers et couronne de ses anciens insignes. La finition améliore les palettes bronze/acier/or, les tranches biseautées, les reflets, les ombres et la discrète texture de métal. Les identifiants, noms et ordre des grades sont inchangés.

Les fichiers restent vectoriels, sur fond transparent. `getRankAssetPath` ajoute la version de publication pour éviter les anciens insignes en cache. Les aperçus montrent aussi la réduction à 24 px. Galerie finale : `output/imperial-ranks-2026-10-23/grades-final.png`.

## Boosters à l’unité, plafond par type

Le Magasin propose une seule unité S1 de cinq heures à chaque clic. Les choix de lots sont supprimés. Le serveur refuse également les requêtes directes comportant des quantités 10, 50, 100 ou 1 000. La file de commandes peut conserver plusieurs clics unitaires rapprochés : leur regroupement ne constitue pas une nouvelle offre de lot.

Le plafond est de 1 000 unités séparément pour dégâts, bouclier, vie et crédits. Une unité entamée compte encore dans la réserve ; la consommation complète de cinq heures libère une place. La réserve déjà supérieure à 1 000 n’est pas tronquée : elle bloque simplement les achats suivants. Le contrôle précède le débit. Si des clics regroupés dépassent la place restante, le groupe entier est refusé sans débit ni attribution partielle. Les boosters S2 de firme et d’événement ne sont pas concernés.

À la limite, la fiche affiche l’erreur et désactive l’achat. Le serveur reste l’autorité si le client a un affichage périmé. Le succès attend la sauvegarde ; en cas d’échec de stockage, le profil est restauré et seul un message d’erreur est émis.

## Impérial retiré

L’Impérial n’existe plus dans le catalogue de vaisseaux, ses recettes dérivées ni son profil de réacteurs. L’ancien fichier de vaisseau est supprimé. L’image qui servait également au Roi démon est conservée sous `assets/enemies/ancient/demon_king.png` afin de garder ce boss fonctionnel indépendamment du vaisseau retiré.

`server/src/players/retiredShips.js` traite les données historiques avant leur normalisation. Il retire la possession et les anciennes sélections, revient à Orion si nécessaire, conserve les équipements UID et transfère la soute au stockage. Un éventuel chantier Impérial est clôturé avec remboursement du reçu réellement payé ; pour les chantiers antérieurs aux reçus, seule la recette historique figée est utilisée. Un reçu explicitement invalide fait échouer le chargement plutôt que d’inventer un remboursement. Les réparations sont sauvegardées avant l’exposition des profils et ne se répètent pas.

Précontrôle de production : trois profils, un possédant l’Impérial, aucun ne le pilotant ou ne le fabriquant. Au redémarrage, un profil a été réparé et persisté. Vérification : aucune donnée de possession/sélection/chantier retiré restante, monnaies, inventaire et stockage du profil concerné conformes à la transformation attendue. Aucun remboursement réel de chantier n’était à exercer sur la production.

## Validation et publication

- Suite locale complète au contrôle final : 1 543 tests serveur réussis ; 40 tests client réussis. Le dossier partagé contient des travaux simultanés ; le nombre inclut les tests présents lors de ce contrôle.
- Lot exact superposé aux sources fraîches de production dans un candidat isolé : 88 tests ciblés réussis, 28 fichiers JS validés, démarrage serveur JSON et santé réussis.
- Régressions : attribution différente de trois joueurs ayant dépassé les seuils compétitifs, progression liée au quota, faux insigne fourni par le client, changement de compte, rafraîchissement du cache ; achat à 999 puis refus à 1 000, plafond par type, réserve partiellement consommée, refus des lots et des dépassements groupés, rollback après échec de sauvegarde ; retrait et remboursement idempotent de l’Impérial.
- Contrôle navigateur avec profils synthétiques et vrais modules publics : bouton unitaire, erreur et désactivation à 1 000 dégâts, achat bouclier encore disponible, absence de sélecteur de lots, absence d’Impérial au catalogue, 25 images chargées et condition du prochain grade affichée. Aucune erreur/alerte console relevée. Ces contrôles n’ont pas effectué d’achat sur un compte de production. Le chargement public anonyme a été vérifié séparément jusqu’à l’écran de connexion.
- 56 entrées de manifeste installées, dont 25 SVG et la suppression de l’ancien asset ; 43 réponses publiques vérifiées, dont l’ancien asset en HTTP 404. Empreintes conformes et alias des modules non concernés conservés, notamment les travaux simultanés de HUD et drones.
- `avosoma-beta.service` : PID `3917403`, actif, `NRestarts=0`, PostgreSQL prêt. Aucun avertissement ni erreur relevé dans les deux lignes du nouveau processus au contrôle initial.
- Sauvegarde runtime : `/opt/avosoma-backups/20261023-coherence1`. Sauvegarde des profils effectuée service arrêté, dans `/opt/avosoma-account-backups/20261023-coherence1.json`, droits `0600`. Aucun profil ni fichier `.env` n’est dans l’archive runtime. Aucun commit/push global du dossier partagé.

Preuves : `output/imperial-ranks-2026-10-23/release/`, en particulier le manifeste, les journaux de validation/publication, les empreintes publiques et les captures `qa-booster-cap.png` et `qa-rank-profile.png`. Les tests emploient des profils synthétiques ; ils ne constituent pas une partie complète ou un test de charge.

Dernier contrôle de compatibilité : une publication parallèle `20261023-quest-shortcuts1` a ensuite modifié cinq alias de `questTracker.js` dans la page. Les 55 autres entrées du manifeste restent strictement conformes, les 25 insignes sont servis et tous les alias possédés par ce lot sont conservés. La page répond en HTTP 200, le même PID est actif et PostgreSQL reste prêt. Preuve : `release/current-verification.json`. Ce contrôle tardif relève 26 avertissements « Player state corrected », tous sur `hp`, et aucune erreur d’application ; il ne reprend donc pas l’absence d’avertissement observée uniquement au démarrage. Leur cause n’a pas été reproduite dans ce lot ; les validations de PV n’ont pas été modifiées. Agrégat sans identité joueur : `release/log-warning-summary.json`.
