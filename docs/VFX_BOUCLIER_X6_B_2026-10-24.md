# Impacts de bouclier et X6 B — 24 octobre 2026

Publié à 20 h 24 (Paris), version `20261024-shield-x6b1`.

La demande corrige l'interprétation précédente : aucune fissure ni brûlure persistante ne doit être ajoutée aux monstres. Le module `enemyHullDamage.js` a été supprimé du code local et son import ainsi que son appel ont été retirés du rendu publié. L'ancien fichier servi n'est plus importé par le jeu ; il ne produit plus de couche sur les sprites.

Le bouclier devient brièvement visible lorsqu'un tir effectivement reçu le touche : contour bleu léger, arc plus lumineux au contact et petite onde perpendiculaire au tir. Il disparaît après le coup. Sans bouclier, seul un flash et des étincelles apparaissent sur le corps, puis disparaissent sans laisser de marque. La couche est rendue au-dessus des monstres et respecte les réglages d'impacts, le budget commun de 28 étincelles et le filtrage des effets hors écran.

Le serveur joint `shieldBefore` aux événements de tir et de coup. Dans un coup préparé, la seconde valeur est lue immédiatement avant l'application réelle des dégâts, et non au lancement. Un dernier coup qui vide le bouclier le fait donc encore réagir ; le coup suivant atteint le corps. Les règles d'absorption, les PV et les dégâts restent inchangés et autoritaires sur le serveur.

`combatData/enemyWeaponContact.js` partage les points de contact entre faisceau et impact. `systems/combatEnemyImpacts.js` transforme uniquement les coups valides en effets temporaires, sans modifier la vie ni le bouclier. Les effets suivent la position de la cible, sont dédoublonnés par tir, limités par les pools existants et entièrement expirés. Un raté, un rejet, un vieux paquet, une autre carte et une cible joueur ne créent pas ce bouclier de monstre.

Le X6 utilise la variante B retenue, « Filaments croisés » : quatre impulsions noires et blanches de 120 ms, espacées de 90 ms, soit 390 ms pour la salve complète. Les départs alternent avant, avant gauche, avant droit, avant. La recharge réelle reste de trois secondes et une seule salve est consommée. Les X1–X4 conservent deux passages de 200 ms et la longueur 130 ; les correctifs de lancement rapproché X6 + munition normale sont conservés.

L'atelier local utilise les mêmes modules de rendu pour ce X6 et ses impacts. Il ne dessine plus de cercle permanent sur la cible ennemie ni de dégâts de coque simulés. Les cinq nouvelles animations de corps des monstres restent locales et ne font pas partie de cette publication.

Validation :

- 117 tests pertinents passent sur le candidat final composé à partir du serveur, dont coups qui brisent le bouclier, coups suivants, dédoublonnage, déplacement, disparition, réglages graphiques et tirs X6 + X1–X4 par Socket.IO.
- Vérification visuelle dans l'atelier : X6 B au contact du bouclier, disparition entre les salves, impact sur le corps sans fissure ; aucune erreur dans la console.
- Première tentative arrêtée avant toute écriture par la protection contre les changements concurrents : le module d'affichage des dégâts venait d'être publié. Une nouvelle capture a conservé cette publication ; les 117 tests passent avec elle. Le premier candidat ne contenait pas ce module et son test local a été explicitement identifié comme dépendant du travail alors non publié.
- Onze fichiers installés, dix fichiers publics vérifiés par SHA-256, 519 fichiers du runtime préservés hors correctif. Archive et syntaxe vérifiées dans le staging ; `index.html` publié en dernier.
- Service actif, PID `1346787`, `NRestarts=0`, PostgreSQL sain, aucune nouvelle erreur pertinente dans les journaux. Sauvegarde : `/opt/avosoma-backups/20261024-shield-x6b1`.
- Sonde exécutée avec les modules réellement installés, sur des objets isolés : bouclier avant impact, coup suivant sur corps, quatre contacts X6, durée X1–X4 et expiration. Aucun compte ni ennemi réel modifié par cette sonde. Aucun duel MMO authentifié n'est revendiqué pour cette validation.

Preuves : `output/vfx-shield-impact-2026-10-24/release/rebase1/` contient le manifeste final, le diff, les tests, les contrôles publics et la vérification des modules installés. Les scripts sont dans le dossier parent `release/`. Les fichiers de test et l'atelier sont exclus de l'archive publiée.
