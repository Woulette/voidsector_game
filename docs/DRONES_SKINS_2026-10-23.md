# Skins de drones équipables — 23 octobre 2026

Le Noyau Overdrive devient un skin avec bonus qui occupe un emplacement distinct du laser ou du générateur de bouclier. Il reste un objet individuel de l'inventaire : l'équiper l'affecte à un drone ; le retirer libère exactement le même exemplaire dans l'inventaire. Un remplacement ou un transfert ne modifie pas l'arme ou le bouclier du drone.

Dans le hangar, chaque drone possède un petit emplacement de skin et sa fiche présente les deux équipements séparément. Les noyaux disponibles apparaissent dans les cases de l'inventaire et le filtre « Skins ». Un emplacement vide affiche « Aucun skin équipé », sans prétendre que le joueur possède un noyau. Le clic sélectionne un objet ; le double clic ou le glisser-déposer l'équipe. La fiche de sélection sous l'inventaire est supprimée afin de laisser toute la place aux cases. Le retrait utilise le bouton du skin dans l'équipement du drone.

Les règles de progression et les bonus sont conservés : terminer La Faille de Vesper permet d'équiper le Noyau Overdrive ; il apporte +50 % aux dégâts laser ou à la capacité du bouclier du drone, sans bonus de régénération. Si le prérequis disparaît, le skin reste récupérable mais son bonus est inactif.

## Sauvegarde et migration

`droneSkinLoadout` contient les UID des skins affectés aux drones ; `droneSkinLoadoutVersion: 1` distingue ce format des anciennes installations consommées. Le serveur est autoritaire. `dronePermanentUpgrades` reste un miroir de compatibilité calculé à partir des objets équipés, sans autorité propre. L'ancienne commande d'amélioration est un alias de l'équipement récupérable.

Lors du chargement d'un ancien profil, chaque installation valide est convertie une seule fois en un véritable noyau équipé, avec UID déterministe et gestion des collisions. Les noyaux déjà libres restent libres. Un profil moderne, même avec une liste vide, n'est jamais remigré. Les demandes de sauvegarde du client ne peuvent pas créer, consommer ou déplacer les skins protégés ; les mutations d'équipement passent par le gestionnaire transactionnel existant.

La validation couvre l'équipement, le remplacement, le déplacement, le retrait, les doublons, les refus, les bonus, l'échec de sauvegarde, la reconnexion et le redémarrage. Les essais visuels et Socket utilisent uniquement des comptes locaux de démonstration. La publication s'effectue depuis un overlay limité sur le code réellement servi, avec sauvegarde du runtime et vérification des empreintes.
