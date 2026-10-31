# Collection de titres et ascension unique — 23 octobre 2026

Le bas du dossier du pilote retrouve deux accès toujours utilisables : « Collection de titres » et la présentation détaillée de l'ascension. Les cartes portent des emblèmes dédiés, les états réels et la progression du pilote. Le reste du dossier, les grades, les statistiques et le vaisseau actif restent composés par leurs modules existants.

## Collection de titres

La collection présente toutes les entrées du catalogue actuel, même verrouillées : état, condition, bonus et commandes d'équipement, de retrait et de visibilité. Il contient actuellement un seul titre pris en charge par le serveur : « Système stellaire colonisé ». Il exige Le Cœur de l'Éternel terminé et apporte +5 % aux dégâts lasers, roquettes et missiles lorsqu'il est équipé. Masquer le titre en jeu conserve le bonus.

L'ancienne collection de vingt titres locaux de succès avait été retirée avant la refonte du profil. Cette correction d'interface ne réintroduit pas ces anciens déblocages ni de nouvelles récompenses. Les états affichés proviennent du profil canonique et des définitions partagées.

## Ascension

La fenêtre présente les neuf portails distincts avec leurs noms et leur validation, ainsi que le niveau requis. Répéter un portail ne remplace pas un autre portail. Le Cœur de l'Éternel demeure une épreuve à venir dans le contenu actuel ; la présentation le signale sans ouvrir ce portail.

L'action serveur reste unique : niveau 50 et chacun des neuf portails terminé. Elle remet le niveau à 1 et l'XP courante à 0, ouvre le plafond 100 et conserve les compétences investies, les possessions, les monnaies, les titres et les portails. Les points de compétences disponibles sont recalculés. L'ouverture de la fenêtre n'envoie aucune commande ; une confirmation distincte précède l'action réelle. Les erreurs de commande permettent de réessayer.

## Organisation et validation

`renderProfile.js` compose le dossier et son footer. `profilePresentation.js` projette les données du jeu. `profileMilestones.js` porte les fenêtres et leur état d'interface, `profileMilestoneEmblems.js` les emblèmes SVG, et `profileMilestones.css` le style limité à ce domaine. `app.js` délègue les interactions et conserve les commandes MMO existantes.

Le serveur et la sauvegarde des comptes de production ne sont pas modifiés. Les essais utilisent des comptes locaux jetables pour les états verrouillé, partiel, débloqué, équipé, masqué, prêt et accompli. Ils vérifient les commandes canoniques, la persistance, les refus et la confirmation unique. Le paquet frontend est construit sur les fichiers LIVE frais, avec conservation des changements parallèles et contrôle des empreintes publiques. Version : `20261023-profilemilestones1`.
