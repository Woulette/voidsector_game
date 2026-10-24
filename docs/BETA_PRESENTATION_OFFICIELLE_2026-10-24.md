# Présentation Bêta alignée sur la boutique officielle — 24 octobre 2026

Les packs Bêta reprennent les lignes horizontales des Packs officiels : vaisseau à gauche, objets avec quantités au centre, prix blanc et bouton à droite. Les trois offres, les dix-huit éléments de contenu, les tarifs 1,49 / 4,99 / 9,99 € et les bonus de lancement restent identiques. Les identifiants d'achat historiques restent utilisés.

`betaStoreCalendar.js` compose les 25 jours avec les mêmes classes et la même fiche latérale que le calendrier officiel OR (`storeCollections.css`). La sélection ne modifie que `store.betaCalendarDay` et n'ouvre plus de dialogue. Les jours spéciaux restent 5, 10, 15, 20 et 25. Le jour 15 montre les trois vaisseaux réels et précise l'attribution aléatoire.

Le calendrier reste celui de la Bêta : aucune exigence Premium OR, aucun remplacement par les 28 récompenses officielles ni remise à zéro mensuelle. L'éligibilité provient toujours de `getBetaRewardStatus`. Le bouton de récupération n'existe que pour le prochain jour sélectionné lorsque `canClaim` est vrai ; la commande serveur existante conserve l'autorité. Les anciens dialogues restent compatibles.

## Validation

36 tests ciblés passent localement : catalogue Bêta, propriété historique, progression quotidienne, sélection/fiches futures, calendrier terminé et absence d'action anticipée. Six contrôles de format de 390 à 1 912 px confirment les trois lignes de 4/7/7 objets et les 25 cases sans débordement. La sélection du jour 15 affiche le détail latéral et aucune action de récupération anticipée.

Publication frontend `20261024-beta-layout1`, limitée aux deux modules Bêta, leur CSS et la composition/cache. Aucun code serveur, tarif ou gain modifié. Rapports et captures : `output/beta-official-layout-20261024/`.

Publication vérifiée : 36 tests réussis sur la copie de production, six empreintes HTTPS conformes, grille et fiche du jour 15 contrôlées sur la page publique, fiche du pack Valkyrie vérifiée. Le processus serveur est resté identique pendant l'installation (PID 1144897), sans redémarrage. PostgreSQL est prêt. Sauvegarde : `/opt/avosoma-backups/20261024-beta-layout1`. Aucune commande d'achat ou de récupération n'a été exécutée pendant le contrôle public.
