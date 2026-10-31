# Portails de changement de carte — 24 octobre 2026

Version publiée : `20261024-sector-portals1`, sur https://avosoma.absyrion.com/.

Le portail de base choisi est en vue droite, avec un anneau métallique texturé, une ouverture sombre et des particules animées. Pendant la traversée réelle de quatre secondes, seul le portail utilisé concentre sa lumière en un point blanc/cyan. Un second passage de lumière au premier plan garde l’éclat visible lorsque le vaisseau se trouve devant le centre.

La durée, les destinations, la sécurité, les positions et la validation serveur ne changent pas. Le transfert manuel et le voyage automatique Premium alimentent la même animation. Les portails préparés de progression, les portes fermées, endommagées et Ricky conservent leur rendu. Le réglage graphique réduit conserve l’anneau et le signal de transfert en supprimant les traînées et rayons.

Modules : `src/data/sectorPortalVisuals.js` décrit les assets et les portes concernées ; `src/game/render/sectorPortalVisual.js` porte le rendu et la lecture du transfert. Les coordinateurs transmettent l’état existant. Les deux textures proviennent de l’aperçu validé sous `output/sector-portal-base-2026-10-23/` ; aucune nouvelle génération pour cette publication.

Validation : 89 tests locaux ciblés, puis 59 tests sur le candidat assemblé depuis les fichiers réellement déployés. Syntaxe vérifiée localement et sur le serveur. Dans le vrai client candidat relié à un serveur isolé, le compte QA passe d’Helion-01 à Helion-02 avec confirmation serveur ; aucune donnée de compte réel n’est utilisée.

Publication limitée à dix fichiers frontend, avec empreintes publiques contrôlées, sauvegarde sous `/opt/avosoma-backups/20261024-sector-portals1`, index publié en dernier et aucun redémarrage du serveur. Une publication concurrente a changé uniquement le jeton de la feuille de style de l’index après installation : cette modification est conservée, et les mappings des sept modules du portail sont vérifiés inchangés. Les neuf autres fichiers correspondent exactement à l’archive publiée.

Preuves et outils : `output/sector-portal-release-2026-10-24/`. La refonte du gameplay d’Azuron et son décor ne font pas partie de cette publication.
