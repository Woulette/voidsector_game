# Azuron — portail ovale et animation

Publié le **25 octobre 2026 à 16 h 03, heure de Paris**, sous `20261025-azuron-gate1`.

**Actualisation à 19 h 22 :** l’éclat initial est remplacé par une animation dédiée, avec accélération du vortex et agrandissement du cœur lumineux. Le cadre présenté ici est conservé. Voir [AZURON_ANIMATION_VORTEX_2026-10-25.md](AZURON_ANIMATION_VORTEX_2026-10-25.md).

Le portail bleu validé reprend la forme et le volume du portail de sortie : même projection ovale, même légère inclinaison et même épaisseur. Il remplace l’apparence de l’entrée préparée d’Azuron et de la porte gauche entre les séries.

## Rendu et activation

Le cadre cobalt et métal reste fixe ; le vortex bleu est une texture indépendante qui tourne et pulse. Les quatre émetteurs cyan, les particules et l’éclat autour du vaisseau accompagnent la charge. La projection réutilise `sectorPortalVisual.js` : rotation de −0,045 radian, échelles 0,74 / 1,04 et cinq tranches pour la profondeur. Le cache des tranches arrière est désormais associé à chaque image afin d’éviter sa reconstruction lorsque les deux cadres sont affichés ensemble.

L’entrée et la continuation attendent **quatre secondes** avant l’envoi de la commande existante au serveur. Le texte indique l’entrée dans Azuron ou la série suivante. Le serveur conserve la validation de la tentative, des vies et du checkpoint ; aucun changement local de carte n’anticipe sa réponse. Une mort, un départ hors portée ou un changement de mode invalide la transition. Les doubles interactions pendant la charge sont ignorées.

La porte droite conserve son animation et son délai autoritaires de quatre secondes. Les autres portails à fragments conservent leur comportement actuel. Les réglages graphiques allégés gardent les deux textures et réduisent les effets supplémentaires.

## Assets et provenance

Images générées avec **imagegen intégré**, en deux couches RGBA distinctes, chacune de **1 254 × 1 254 pixels** :

- [Cadre transparent](../assets/portals/azuron-v2/gate-rim.png) et [prompt exact](../output/azuron-gate-animated-2026-10-25/prompt-rim.md).
- [Vortex indépendant](../assets/portals/azuron-v2/vortex.png) et [prompt exact](../output/azuron-gate-animated-2026-10-25/prompt-vortex.md).

La source circulaire est projetée par le renderer du portail de secteur, ce qui produit la même perspective sans écraser deux fois une ellipse. Le centre du cadre et ses quatre coins sont transparents. À la plus grande taille prévue, le sprite mesure 373,75 pixels logiques, soit 747,5 pixels à densité ×2, sous sa résolution native. L’audit des dimensions, alphas et empreintes est conservé dans [asset-metadata.json](../output/azuron-gate-animated-2026-10-25/asset-metadata.json).

## Vérification

Les **326 tests pertinents, dans 42 fichiers**, passent sur le candidat final, le staging et les sources réellement déployées. Huit nouveaux tests couvrent le choix d’Azuron, le préchargement des cartes de base, la projection commune, la séparation cadre/vortex, le rendu allégé, les délais à 3,999 et 4 secondes, l’unicité des commandes, les annulations et la conservation des autres chemins de portail.

Un passage plus large de 504 tests a relevé deux assertions préexistantes de `combat-compact-hud.test.js` : elles attendent encore l’ancien chemin `low_vorak_03.png`, alors que le sprite public de Vorak a changé. Les deux échecs ont été reproduits sur la capture publique antérieure, sans cette livraison. Les journaux sont `broad-candidate-tests.log` et `baseline-compact-hud.log` dans le dossier de preuve.

Le navigateur a utilisé une **copie isolée du vrai client et du serveur**, avec un compte de QA niveau 50, sans modifier de profil public. L’entrée a montré sa charge « ENTRÉE DANS AZURON · 4S », puis l’arène confirmée par le serveur. Une commande de fixture a nettoyé la première série pour contrôler les deux portes ; le passage par J a montré « CONTINUER · VAGUES 6–10 · 4S », puis les vagues de cette série ont démarré. Ce contrôle ne constitue pas une victoire complète jouée en production. Le mode graphique allégé a été vérifié par le test de rendu. Aucun avertissement ni erreur dans la console de cette session.

![Deux portes dans le client isolé](../output/azuron-gate-animated-2026-10-25/browser-gate-idle.png)

![Charge de continuation](../output/azuron-gate-animated-2026-10-25/browser-gate-charge.png)

## Publication et périmètre

La livraison contient **13 fichiers frontend** : deux PNG, dix modules et l’index, publié en dernier. Les 37 alias concernés de l’importmap ont été actualisés. Les empreintes des treize fichiers servis en HTTPS sont conformes, ainsi que les 587 gardes de publication ; 574 fichiers contrôlés hors livraison sont préservés.

Les changements concurrents de sprites, d’ennemis et de rendu présents dans la capture publique ont été conservés par fusion ciblée. Les ajouts locaux indépendants de préchargement `TRACKER_VISUAL_PROFILES` dans `combatAssets.js` restent dans le workspace et ne font pas partie de cette livraison. Le décor en 17 morceaux lointains, les récompenses, les règles de tentatives et de reprise sont conservés.

Aucun redémarrage serveur : PID **2510150**, `NRestarts=0`, service actif, PostgreSQL prêt et aucun nouveau journal d’erreur au contrôle. Sauvegarde avant publication : `/opt/avosoma-backups/20261025-azuron-gate1-150306`.

Manifestes, garde des sources, fusion, journaux et vérifications : [dossier de preuve](../output/azuron-gate-animated-2026-10-25/verification.json).
