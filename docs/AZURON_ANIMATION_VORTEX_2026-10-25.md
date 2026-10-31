# Azuron — charge dédiée au vortex

Publié le **25 octobre 2026 à 19 h 22, heure de Paris**, sous `20261025-azuron-vortex1`.

À la demande du créateur, Azuron utilise une activation dédiée : pendant les quatre secondes d’entrée ou de continuation, le vortex accélère progressivement et son centre blanc bleuté s’élargit. Le petit éclat radial hérité des portes de changement de secteur est retiré pour Azuron.

## Rendu

`src/game/render/azuronPortalActivation.js` porte la progression, le champ d’énergie et le cœur lumineux. La rotation supplémentaire dépend de la progression absolue de la charge, avec une accélération cubique ; elle ne dépend pas du nombre d’images rendues. À la fin, la charge a ajouté environ 4,46 tours et la vitesse atteint environ 4,46 tours par seconde. Le rayon du cœur atteint 68 % de celui de l’ouverture, avec un halo plus large. Des traînées courbes accompagnent le mouvement. Le cadre, sa forme ovale, son épaisseur et les deux PNG validés sont conservés.

`sectorPortalVisual.js` accepte un renderer d’énergie optionnel, utilisé uniquement par l’adaptateur d’Azuron. Le chemin par défaut des autres portes conserve son rendu. Le cœur d’Azuron est aussi dessiné au-dessus du vaisseau, avec le même découpage dans l’ouverture. En mode allégé, la rotation de charge et le cœur restent visibles ; les traînées supplémentaires sont omises.

Les quatre secondes, les commandes de navigation et les validations serveur ne changent pas.

## Vérification et publication

- **63 tests dans 10 fichiers** passent sur le candidat final, le staging et les sources réellement déployées. Ils couvrent notamment l’accélération sur des intervalles égaux, l’agrandissement du cœur, les effets réduits, l’absence de rayons de secteur dans Azuron, la projection, la navigation et les délais de 3,999 / 4 secondes.
- Le vrai client et un serveur isolé ont confirmé l’entrée, puis la charge de continuation et le démarrage de la vague 6. Une fixture de QA a ouvert les portes en nettoyant la première série ; ce contrôle n’est pas une partie complète jouée en production. Aucun avertissement ni erreur dans la console de la session.
- Quatre fichiers frontend livrés : trois modules et l’index publié en dernier ; six alias actualisés. Quatre empreintes HTTPS et 590 gardes conformes, **586 fichiers contrôlés hors livraison préservés**.
- Une publication concurrente des ennemis a été détectée avant installation ; le candidat a été reconstruit depuis la nouvelle capture publique et revérifié. Aucun changement indépendant du workspace n’est inclus dans la livraison.
- Aucun redémarrage : PID **2510150**, `NRestarts=0`, service actif, PostgreSQL prêt, aucun nouveau journal d’erreur au contrôle.
- Sauvegarde : `/opt/avosoma-backups/20261025-azuron-vortex1-182211`.

![Charge proche de sa fin dans le client isolé](../output/azuron-vortex-charge-2026-10-25/browser-continue-charge.png)

Manifestes et journaux : [verification.json](../output/azuron-vortex-charge-2026-10-25/verification.json).
