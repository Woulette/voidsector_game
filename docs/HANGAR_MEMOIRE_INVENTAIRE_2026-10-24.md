# Hangar : conserver l'inventaire lors des changements d'onglet

Date : 24 octobre 2026. Statut : publie sur https://avosoma.absyrion.com/.
Versions : `20261024-hangar-memory1`, puis `20261024-hangar-memory2`.

Un passage de l'inventaire d'un vaisseau vers Drones, Competences ou Profil,
puis vers Vaisseaux, retrouve maintenant le meme inventaire. Le bouton
« Retour aux vaisseaux » ferme toujours volontairement l'inventaire.
Une liste laissee ouverte reste une liste au retour.

## Correction

- `src/app.js` : le changement d'onglet ne remet plus `hangarDetailOpen` a faux.
- `src/app/profileController.js` : la selection d'un vaisseau encore possede est
  conservee pendant les synchronisations dans tous les onglets du hangar.
  Le vaisseau actif et les donnees de jeu continuent de venir du serveur.
- `index.html` : seuls les alias de cache de ces deux modules sont actualises.

La memoire concerne la navigation au sein du hangar dans la session courante.
Le chargement initial, la connexion a un autre compte et la navigation principale
gardent leurs comportements existants.

## Validation

Le parcours initial a ete reproduit sur le navigateur public avant modification.
Les trois allers-retours et le retour volontaire ont ensuite ete controles dans
un rendu local isole avec les gestionnaires extraits du code reel.

39 tests existants hangar, inventaire, profil et tutoriel passent. Le test de
synchronisation de profil a ete etendu aux quatre onglets, inventaire ouvert
et ferme, avec trois revisions serveur successives. Il reproduisait la perte du
vaisseau selectionne dans Drones avant la correction du controleur.
Le controleur candidat de production est identique au controleur teste localement.

Verification sur le jeu public authentifie : inventaire du Velox consulte pendant
que le Razorion reste equipe ; retours depuis Drones, Competences et Profil sur
le meme inventaire. Un second clic sur Vaisseaux le conserve. Le bouton de retour
ferme l'inventaire et un nouvel aller-retour conserve ensuite la liste des vaisseaux.
Le navigateur a finalement ete replace sur l'inventaire du Razorion.

## Publication et preuves

Deux overlays limites a deux fichiers chacun, prepares depuis les fichiers de
production. Trois fichiers frontend distincts au total ; aucun fichier serveur
publie. Archives, fichiers candidats et fichiers publics controles par SHA-256,
page d'entree publiee en dernier. Service actif, PID `928637`, `NRestarts=0`,
PostgreSQL disponible et aucune nouvelle ligne d'erreur pendant les installations.

Sauvegardes distantes : `/opt/avosoma-backups/20261024-hangar-memory1` et
`/opt/avosoma-backups/20261024-hangar-memory2`.

Preuves locales : `output/hangar-navigation-2026-10-24/`, notamment les deux
`review.diff`, `manifest.json`, `deployment-result.json`, `public-verification.json`
et le sous-dossier `sync-followup/` pour la seconde publication.
Parcours navigateur : `browser-verification.json` ; capture publique :
`inventaire-memorise-public.png`. Aucune erreur console relevee pendant le
controle final.
