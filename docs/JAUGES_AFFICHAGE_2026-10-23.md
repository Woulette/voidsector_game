# Affichage des jauges Vie, Bouclier et XP

Chaque jauge du panneau pilote est un bouton qui fait defiler trois formats independants :

- `value` : nom et valeur actuelle, avec la barre.
- `fraction` : nom et valeur actuelle / maximum, avec la barre.
- `bar` : uniquement la barre coloree, sans libelle, valeur, pourcentage ou infobulle numerique visibles.

L'affichage initial reste valeur / maximum. Le cycle est valeur seule -> valeur / maximum -> barre seule -> valeur seule. Chaque jauge memorise son propre choix dans le navigateur, avec la cle `voidsector-combat-meter-modes`. La restauration et l'ecriture tolerent un stockage indisponible, plein ou invalide.

Le module UI `src/game/ui/combatMeterModes.js` normalise les formats, fait defiler le choix et gere cette preference locale. Le coordinateur charge les choix une fois ; les clics passent par le gestionnaire d'entrees existant ; `hud.js` continue d'actualiser le remplissage reel dans les trois modes. Aucun chiffre de combat ni profil serveur ne change.

Le style est isole dans `src/styles/combatMeterModes.css`. Il definit uniquement les jauges actives et reste compatible avec le HUD historique et le HUD actuellement publie, sans embarquer de refonte globale dans ce changement.

Les boutons natifs restent accessibles au clavier : Entree ou Espace changent le format sans declencher le raccourci de jeu correspondant. La description accessible garde les vraies valeurs et indique le format suivant, y compris lorsque seule la barre est visible.

## Verification

Les tests fonctionnels couvrent le cycle complet, l'independance des trois jauges, la persistance, les erreurs du stockage, le rendu, les valeurs limites et les interactions clavier/souris. Les suites HUD, barre d'action, navigation et notifications de butin sont egalement executees.

Le controle navigateur isole utilise le vrai HTML du panneau, `updateCombatMeter` et `installCombatInputHandlers`, avec des chiffres fictifs et sans serveur de jeu. Neuf clics verifient les trois cycles ; Entree et Espace ne declenchent aucune action de jeu ; apres rechargement Vie conserve valeur seule, Bouclier conserve valeur / maximum et XP conserve barre seule. Aucun avertissement/erreur console.

28/28 tests et quatre controles de syntaxe valides sur le candidat exact de production. Preuves : `output/combat-meter-modes-20261023/validation/`.

Publication restreinte `20261023-meter-modes1` effectuee : sept empreintes HTTPS concordent, les 118 cibles d'import publiques repondent correctement et l'application publique charge sans avertissement/erreur console. Les quatre modules JS utilisent cette version. Sauvegarde : `/opt/avosoma-backups/20261023-meter-modes1`, manifestes dans `release/`.

Le suivi CSS `20261023-meter-modes2` isole ensuite le style des jauges dans son fichier autonome : quatre empreintes HTTPS concordent et 118 cibles d'import restent disponibles. Tous les alias JS sont conserves. Le fichier global `combatHud.css` retrouve exactement son contenu anterieur a ce changement. Le controle navigateur confirme les trois modes, le clavier et les hauteurs de barre sans erreur console. Le serveur conserve le PID 4003944 sans redemarrage, PostgreSQL reste pret. Sauvegarde : `/opt/avosoma-backups/20261023-meter-modes2`, manifestes dans `release-css2/`.

Le candidat Git isole est construit sur la derniere branche principale, avec uniquement les neuf fichiers de cette fonctionnalite. Les 19 tests disponibles sur cette base sont distincts des 28 tests du candidat de production, qui comprend deja une refonte HUD plus recente. Le changement Git n'embarque pas cette refonte globale.

La partie de jeu active du joueur n'a pas ete rechargee ni interrompue pour ces controles. Les interactions des jauges ont ete verifiees dans l'aperçu isole ; la disponibilite des fichiers et le chargement de l'application ont ete verifies sur l'adresse publique.
