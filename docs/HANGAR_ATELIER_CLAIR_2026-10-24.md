# Hangar — Atelier clair

La variante « Atelier clair » a été retenue par l'utilisateur après présentation d'une maquette interactive. Les pages Vaisseaux et Drones utilisent maintenant les mêmes trois colonnes : fiche à gauche, équipement au centre, inventaire à droite.

## Présentation

- Inventaire de cinq cases par ligne, y compris aux petites largeurs, avec défilement vertical. Les cases conservent leur taille lorsque la fiche d'objet est ouverte.
- Statistiques du vaisseau calculées par les getters existants, rareté, état équipé et actions natives.
- Lasers, lance-missiles et lance-roquettes, générateurs et extras gardent leurs vrais nombres d'emplacements et UID.
- Les drones conservent huit places standards. Les places historiques 9 et 10 restent utilisables lorsqu'elles sont possédées ; sinon leur mention est compacte.
- Le module et le skin restent indépendants. Les prix, limites et achats proviennent du modèle existant.
- La fiche d'objet du vaisseau apparaît sous son inventaire après sélection. Les actions d'équipement, retrait, vente, sélection multiple et glisser-déposer restent branchées aux contrôleurs existants.
- Le défilement central est conservé lors des nouveaux rendus. La mémorisation de la fiche du vaisseau entre les onglets du hangar est conservée.

## Architecture

`src/ui/hangarWorkshopMarkup.js` porte uniquement le HTML de présentation des statistiques et groupes du vaisseau. `src/ui/render.js` compose les données et conserve ses fonctions publiques. `src/ui/renderDroneBay.js` compose les trois panneaux des drones avec son modèle et ses attributs d'action actuels. `src/styles/hangarWorkshop.css` est limité au mode atelier du dashboard et chargé après les styles existants.

Aucune modification de calcul de combat, d'économie, de catalogue ou de commande serveur dans ce lot. Les images sont celles du jeu. Aucun nouvel actif graphique généré.

## Vérifications

- Syntaxe des trois modules JS modifiés ou ajoutés : conforme.
- 76 tests ciblés réussis dans le workspace, puis sur les sources fraîches de production superposées au lot : hangar, drones, skins, détails d'inventaire, synchronisation de profil, sélection multiple et accroches du tutoriel.
- Essais dans le vrai launcher connecté à une API isolée, avec comptes jetables : équiper un module de drone au double clic, équiper puis retirer un skin sans retirer le module, acheter un drone, consulter et équiper un vaisseau différent du vaisseau actif, présélectionner deux objets et tout déséquiper avec confirmation. La persistance du profil isolé a été contrôlée.
- Cas visuels avec un grand inventaire, Vesperion et ses 38 emplacements, et dix drones historiques. Cinq colonnes et absence de débordement horizontal contrôlées aux formats 1912×897, 1366×768, 768×1024, 390×844 et 320×800 selon les scénarios. Les deux dernières tailles et la tablette empilent les panneaux.
- Contrôle public authentifié des deux pages avec les vrais équipements : images chargées, mêmes dimensions de panneaux et même position de l'inventaire (x=1351, y=230, largeur=320 à 1912×897), cinq colonnes, retour Drones → Vaisseaux directement dans l'inventaire de Razorion. Aucune erreur console observée. Les contrôles publics utilisent uniquement la navigation ; aucun achat ou déplacement d'équipement de production effectué.

Les commandes d'équipement ont été exercées sur les comptes jetables ; le glisser-déposer et les commandes par lot sont couverts par leurs contrôleurs et tests existants. Ce lot ne constitue pas un essai de combat multijoueur complet.

## Publication

Version `20261024-workshop1`, six fichiers :

- `src/ui/hangarWorkshopMarkup.js`
- `src/styles/hangarWorkshop.css`
- `src/ui/render.js`
- `src/ui/renderDroneBay.js`
- `styles.css`
- `index.html`

Lot construit à partir des fichiers servis, en remplaçant uniquement les fonctions et le fragment HTML concernés. Une publication concurrente de la taille des icônes de quête a été détectée par les empreintes avant installation : le premier essai s'est arrêté sans remplacement. Le lot a été reconstruit sur cette base actualisée, puis vérifié et publié avec `index.html` en dernier.

Les six empreintes installées et les six réponses publiques HTTPS sont conformes. Service `avosoma-beta.service` actif, PID `1098285` inchangé, `NRestarts=0`, PostgreSQL prêt, aucune nouvelle erreur de journal pendant la publication. Aucun redémarrage nécessaire pour ce lot frontend.

Sauvegarde distante : `/opt/avosoma-backups/20261024-workshop1`. Manifeste, diff du lot, résultats de tests, rapports navigateur et captures dans `output/hangar-atelier-clair-2026-10-24/`.

## Ajustement des lanceurs

À la demande de l'utilisateur, le lance-roquettes est placé sous le lance-missiles. Version frontend `20261024-workshop2` : une règle CSS modifiée et les deux URL de cache actualisées, sur une base publique fraîche. Trois empreintes publiques conformes, aucun redémarrage et aucune nouvelle erreur serveur. Le navigateur public confirme les deux groupes au même x=521, le second commençant sous le premier, avec toujours cinq colonnes d'inventaire. Preuves et capture dans `output/hangar-atelier-clair-2026-10-24/launchers-vertical/` ; sauvegarde `/opt/avosoma-backups/20261024-workshop2`.
