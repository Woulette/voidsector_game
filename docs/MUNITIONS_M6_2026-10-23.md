# M-6 — magasin et fabrication du 23 octobre 2026

La M-6 est retirée du magasin principal. Elle était déjà exclue du magasin en partie et des achats autorisés par le serveur ; son catalogue de combat et son stock restent utilisables.

La recette n'existait pas. Après correction de son premier choix de matériaux, l'utilisateur définit cette recette provisoire :

- 10 000 unités par fabrication, en 60 secondes ;
- 15 000 NOVA, sans paiement alternatif en crédits ;
- 2 **filaments cosmiques** (`filament_cosmique`) ;
- 1 **fragment de noyau stellaire** (`fragment_noyau_stellaire`) ;
- 4 **cristaux de phase encapsulés** (`cristal_phase_encapsule`).

La première version utilisait 1 bobine de plasma solaire, 3 cartouches de plasma condensé et 2 prismes de phase. Elle est remplacée par les matériaux ci-dessus sous `20261023-m6craft2`. Le montant de 15 000 NOVA, la sortie de 10 000 unités et les 60 secondes sont conservés. La remise Premium habituelle s'applique : 14 250 NOVA avec Premium actif ; la majoration du magasin liée à la réputation n'affecte pas la fabrication. Aucun nouveau matériau n'est créé.

## Coût provisoire et disponibilité

L'utilisateur estime le coût potentiellement excessif et reporte l'équilibrage. Aucun autre prix ni taux de butin n'est modifié.

- Le serveur consomme une munition par laser équipé, vaisseau et drones compris. À 20 lasers et une salve par seconde, 10 000 unités représentent 500 salves, soit 8 minutes 20 de tir continu. Cet exemple ne mesure pas une durée de combat jouée.
- La seule table de butin de ressources mythiques est `frontier35_50`, explicitement destinée aux futures zones LV 35–50. Aucun secteur de `WORLD_MAPS` n'utilise actuellement cette table. Le filament cosmique n'est donc pas disponible via ce butin du monde ouvert actuel ; la recette reste prévue pour le futur contenu ou des stocks déjà obtenus par d'autres moyens.
- Le fragment de noyau stellaire possède par ailleurs une récompense explicite de firme ; l'absence de butin ouvert ne signifie pas l'absence de toute autre source de tout matériau mythique.
- Dans la table future configurée : 0,1 % pour une ressource mythique tirée uniformément parmi huit, soit environ 0,0125 % pour un filament. Deux filaments seuls représenteraient environ 16 000 ennemis éligibles en moyenne, sans garantie. Ce calcul théorique n'est pas une mesure de farm actuel ; il confirme que les chances et quantités devront être revues avec les zones.

Les sources de cette analyse (`resourceDropRules.js`, `resources.js`, `definitions.js`, `resourceDrops.js`, `damage.js`) ont été comparées à la production. Preuves : `output/m6-recipe-adjust-2026-10-23/production-cost-sources-verification.json` et `verification-and-cost.json`.

## Implémentation

`renderShop.js` respecte `shop:false` pour les munitions. Le catalogue M-6 porte séparément `craft:true`. `craftingRecipes.js` autorise ce cas et conserve les coûts explicites des recettes de munitions ; les recettes ordinaires restent sans coût monétaire. La nouvelle recette `craft_ammo_ammo_x6` utilise le débit, les reçus de paiement, le délai, la sauvegarde et la récupération existants du serveur. Les 43 autres recettes sont identiques à leur état précédent.

## Vérifications

- Sept nouveaux scénarios économiques : achat refusé ; lancement accessible ; paiement et matériaux exacts ; refus d'un deuxième lancement et d'une récupération anticipée ; reprise du profil sérialisé ; attribution unique ; ressources ou NOVA insuffisants sans mutation ; remise Premium conservée malgré une réputation négative.
- 49 tests ciblés passent localement et sur une copie isolée des sources de production : fabrication, récupération/remboursement, achats et nouvelle M-6.
- Le serveur candidat démarre réellement avec un stockage JSON isolé, sans `.env` ni données de production.
- Vérification du catalogue réel du magasin : les neuf munitions vendables restent présentes, la M-6 disparaît ; son achat serveur renvoie toujours `null`.
- Vérification du rendu HTML réel de l'atelier : nom, sortie, prix, trois matériaux et bouton de lancement activé avec les ressources nécessaires. Ce contrôle n'est pas une session navigateur en production.
- La correction des matériaux repasse les 49 scénarios localement et sur une copie de production, ainsi que le démarrage isolé. Le contrôle supplémentaire d'un chantier déjà payé avec les anciens matériaux confirme qu'il se récupère une seule fois, sans payer ni exiger les nouveaux matériaux. Les 43 autres recettes restent inchangées.

## Publication

Le retrait frontend est publié sous `20261023-m6shop1`, sans redémarrage. La recette commune est publiée sous `20261023-m6craft1` : les deux fichiers du catalogue sont installés avant le redémarrage, puis l'index et ses imports sont publiés. Les autres modifications du chantier partagé et les autres versions d'import sont préservées.

Le service est actif après publication, PostgreSQL répond, PID `3849702`, `NRestarts=0`. Les empreintes publiques et les fichiers installés correspondent au paquet. Le contrôle préalable ne relève aucune session de portail active ou enregistrée. Aucun profil de production n'est utilisé pour tester un achat ou une fabrication.

Une publication parallèle `20261023-hud1` modifie ensuite l'index public. Le contrôle final confirme les empreintes exactes des trois modules M-6 et tous leurs imports versionnés ; les nouveaux imports du HUD sont conservés. L'index final a donc une nouvelle empreinte attendue, sans annuler la recette ni le retrait du magasin.

Sauvegardes de code : `/opt/avosoma-backups/20261023-m6shop1` et `/opt/avosoma-backups/20261023-m6craft1`. Sauvegarde privée des profils avant le deuxième lot : `/opt/avosoma-account-backups/20261023-m6craft1.json`, permissions `0600`. Aucun reset ni migration de profil.

Preuves : `output/m6-shop-2026-10-23/` et son sous-répertoire `craft-release/`, avec manifestes restreints, archives, résultats des tests Linux, journaux de publication et contrôles HTTPS. Un rechargement complet du navigateur récupère les nouveaux imports.

Correction des matériaux publiée ensuite sous **`20261023-m6craft2`** : paquet limité à `src/data/craftingRecipes.js` et `index.html`, empreintes HTTPS 2/2 conformes et imports des autres chantiers conservés. PostgreSQL prêt, service actif, PID `3862931`, `NRestarts=0`, aucune session de portail au contrôle préalable. Sauvegardes : `/opt/avosoma-backups/20261023-m6craft2` et profils privés `/opt/avosoma-account-backups/20261023-m6craft2.json` en `0600`. Preuves : `output/m6-recipe-adjust-2026-10-23/release/`.
