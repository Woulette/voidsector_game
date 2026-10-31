# Quetes : images partagees avec le jeu — 24 octobre 2026

Demande : remplacer le laser simplifie par celui du magasin, ameliorer les portails et les ressources des quetes, et eviter les variantes d'un meme objet entre les interfaces.

## References

- Laser : `equipment[laser_mk1].img`, actuellement `assets/equipment/laser_mk1_mk1_slot_v2.png` ; ce pictogramme represente l'objectif d'equipement de lasers, sans imposer le MK-I pour sa validation.
- Materiaux : `rawMaterialCatalog[].img`, actuellement les PNG `assets/materials/refinery-v2/`. Memes images pour les objectifs, les paires de materiaux et les gains.
- Portails connus : `portals[].img`, selon l'identifiant de l'objectif. Le Space Caster garde Azuron comme symbole general. Ricky ne possede pas d'illustration dans ce catalogue : son objectif utilise l'anneau de porte existant `assets/portals/sector-travel/gate-rim-v1.png` comme symbole, sans l'identifier a tort a Azuron.
- Recoltes : image de l'objet reel (`itemImg`) lorsqu'elle existe, plutot qu'un cristal generique. Aucun nouvel asset n'est genere.

## Implementation

Le module de presentation `src/game/ui/questObjectiveVisuals.js` centralise ces references. Les vues de categories, le relais, la liste de missions, l'icone du journal et les objectifs du journal l'utilisent. Les autres categories approuvees gardent leurs symboles existants.

Les compteurs, conditions, commandes d'acceptation, abandon et validation ne changent pas. Aucun code serveur ni donnees de compte modifies. Les imports des modules touches et la feuille du relais ont une nouvelle version de cache `20261024-quest-assets1`.

## Validation

47 tests cibles : categories, relais, raccourcis du journal, mission des huit lasers, abandon, synchronisation des gains. Assertions des references sur tous les materiaux et portails du catalogue.

Apercu isole avec les vrais renderers du candidat de production : laser, trois materiaux a ameliorer, echantillons, Space Caster et portail de Ricky. Les images du relais et du journal ont les memes references ; aucune image manquante, requete en erreur ou erreur JavaScript. Captures a 1662 px, puis laser a 1366 px et 390 px, sans debordement horizontal. Le comportement mobile existant masque le petit symbole d'objectif et conserve l'illustration principale. Ces essais visuels ne sont pas une session MMO authentifiee.

Preuves et lot de publication : `output/quest-icons-2026-10-24/`. Le candidat provient du client actuellement servi avec uniquement les changements de ce lot. Manifest restreint a neuf fichiers frontend, sauvegarde et garde d'empreintes pour preserver les publications concurrentes.

## Publication

Publie `20261024-quest-assets1` le 24 octobre a 15:55 Europe/Paris. Le premier preflight a bloque une divergence de `index.html` publiee en parallele, avant toute ecriture en production. Le client candidat a ete actualise sur cette production puis les changements de ce lot reappliques ; les autres publications sont conservees.

Neuf empreintes locales, de staging, de fichiers actifs et HTTPS concordantes. Le meme controle des cinq quetes et des tailles 1662 / 1366 / 390 px a ete rejoue avec les modules, feuilles et images du domaine public ; seul le document de montage de l'apercu est local. Aucune requete en echec, image manquante ou erreur JavaScript. Cela reste un apercu isole, sans session MMO authentifiee.

Service actif, PID 1074811 et `NRestarts=0` inchanges pendant cette publication frontend. PostgreSQL pret et aucune erreur fraiche dans le journal du service. Sauvegarde : `/opt/avosoma-release-backups/20261024-quest-assets1-20261024T135531Z`.
