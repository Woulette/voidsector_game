# Avosoma — passage progressif en 3D

Le pilotage de l’Asterion a été validé à 100 % par le joueur le 31 octobre : vue inclinée à 45°, rotation progressive, roulis dans les virages et retour amorti à plat. Ce comportement reste la référence pour les autres vaisseaux.

## Ordre de travail

1. Observer DarkOrbit en vol sur le PC, puis réaliser l’Orion depuis son image actuelle.
2. Construire une scène Three.js commune sur Hélion-01 : caméra, éclairage, profondeur, vaisseaux et premiers ennemis.
3. Convertir le QG, les bâtiments de service et les repères de navigation ; vérifier les interactions réelles.
4. Adapter les rayons laser à la scène commune, puis les autres effets de combat.
5. Vérifier les joueurs distants, les changements de carte, les réglages graphiques et les performances.
6. Étendre ensuite le catalogue de vaisseaux et d’ennemis, puis les autres secteurs et les arènes de portail.

## Réalisé dans cette étape

- Observation native de DarkOrbit : déplacement depuis le QG, suivi du vaisseau au centre, relief des installations, sortie de la zone de non-agression et réglage à la molette. Retour près du QG avant le redémarrage annoncé du serveur DarkOrbit.
- Orion généré avec Meshy 7.1, puis préparé sous Blender : orientation, retrait de la flamme solide générée, fermeture de la tuyère, quatre petites surfaces cyan et textures adaptées au navigateur.
- Orion disponible dans le vol d’essai avec un sélecteur Orion/Asterion ; modèle automatiquement utilisé en combat lorsque les vaisseaux 3D sont activés.
- Parcours réel du compte local isolé : Orion sélectionné et équipé, canon MK-I acheté avec des crédits de test et monté, mission lancée avec 5 000 points de coque et un laser.
- Première scène 3D commune pour Hélion-01 : coques, éclairage, QG, relais de quêtes, raffinerie et anneaux de portail. Le décor de fond d’origine est rétabli après le retour du joueur.
- Vorak rusher converti depuis son illustration actuelle. Les essais 3D de l’Orbe n’ont pas été validés par le joueur : son animation d’origine est rétablie en jeu. Les fichiers expérimentaux sont conservés, mais son modèle est désactivé et exclu du lot public. La future conversion doit respecter exactement son identité visuelle.
- Trois Orion observés ensemble dans la scène, dont deux pilotes de test connectés par de vrais clients Socket.IO. Chaque coque conserve sa propre pose et ses réacteurs.
- Relais de quêtes ouvert par un clic sur le bâtiment 3D, avec la liste et les détails de mission fonctionnels.
- Les positions, dégâts, collisions, déplacements et accès aux secteurs restent décidés par les systèmes MMO existants. Les tests de projection comparent les repères de carte et les poses de coque à une véritable caméra Three.js.

- Combat réel vérifié : première Orbe détruite, M-1 de 2 500 à 2 480, +800 crédits, +1 NOVA et +400 XP ; les dégâts reçus sont également visibles. Les tirs gardent leur décision de toucher et leurs récompenses côté serveur.
- Aller-retour réel Hélion-01 → Hélion-02 → Hélion-01 avec la touche J et le transfert de quatre secondes : rendu classique sur Hélion-02, scène commune réactivée au retour.
- Réglage Secteur 3D désactivé puis réactivé en partie ; limite de 60 FPS appliquée et observée sur ce PC.

## Modèles et coût

Les huit tâches Meshy de cette étape ont réussi, à 30 crédits chacune : **240 crédits**. Les deux premières tentatives d’ennemis utilisaient des images historiques ; elles sont conservées en v1 comme prototypes. Les deux modèles v2 utilisés en jeu reprennent les illustrations actuelles. L’essai sphérique de l’Orbe a ensuite été fait gratuitement sous Blender, puis écarté à la demande du joueur. Les sources 4K, les fichiers Blender et les GLB de jeu sont conservés avec leurs empreintes dans les dossiers `assets/*/models/*-meshy-v1/`.

| Élément | Triangles de jeu | Textures de jeu |
|---|---:|---:|
| Orion | 19 468 | 2K |
| QG Couronne | 30 610 | 2K |
| Relais de quêtes | 14 215 | 2K |
| Raffinerie | 14 004 | 2K |
| Orbe — prototype désactivé | 10 372 | 1K |
| Raider astral | 11 758 | 1K |

Les originaux restent disponibles pour produire ultérieurement d’autres niveaux de détail. L’Asterion validé est conservé sans modification de son modèle.

## Vérification de l’étape

- [x] Géométrie, textures intégrées, limites de poids et empreintes des modèles.
- [x] Équiper l’Orion depuis le hangar et lancer la mission.
- [x] Ouvrir le relais de quêtes en cliquant sur sa géométrie visible.
- [x] Observer deux joueurs distants animés avec le pilote local.
- [x] Combat réel, dégâts, consommation de M-1 et récompenses ; échantillonnage des rayons 3D testé séparément.
- [x] Retour au rendu classique, réglage 3D en partie et aller-retour entre les deux secteurs.
- [x] Captures du multijoueur, de la scène au QG et de la coque sphérique conservées dans `docs/previews/`.
- [x] 52 vérifications ciblées réussies : projection réelle Three.js, modèles, sphère de l’Orbe, remplacement des sprites, lasers, moteurs, boucliers, réglages et rendu.
- Sauvegarde sur la branche `codex/avosoma-3d-helion01-20261031` ; les fichiers des travaux simultanés sur les portails ne font pas partie du commit 3D.

## Limites de cette première tranche

La scène complète concerne Hélion-01. Les autres secteurs utilisent leur rendu actuel, avec les coques 3D disponibles. Le réglage **Secteur 3D (Hélion-01)** permet de comparer les rendus ; le réglage **Vaisseaux 3D** reste indépendant. Les interfaces et la mini-carte restent superposées pour garder leur lisibilité.

Les Orbes gardent leur animation originale en 2D. Les rayons ordinaires disposent du nouveau rendu 3D. Les PNJ de quête et les portails spéciaux préparés gardent leur représentation actuelle et leurs interactions pendant cette première tranche ; les noms et états verrouillés des portails ordinaires restent affichés. Le M-6 conserve provisoirement son apparence noire et blanche validée ; les particules, impacts, drones et projectiles spécialisés restent à convertir progressivement. La planète, les astéroïdes, les épaves et les nébuleuses conservent leur rendu d’origine sous la scène 3D.

La première tranche est publiée sur https://avosoma.absyrion.com/ le 31 octobre 2026, avec le correctif de compatibilité final `20261031-sector3d-live3` à 17 h 32 Europe/Paris. Les 37 fichiers publics finaux ont été comparés par SHA-256, 604 sources surveillées et 52 tests réussis sur la copie du serveur. Le processus MMO reste inchangé (PID 2224513, zéro redémarrage), PostgreSQL est prêt et aucune écriture ne reste en attente.

Le rendu et les textures du QG ont été observés dans une vraie mission publique ; aucun nouvel avertissement ou erreur navigateur après le correctif. La bibliothèque est servie dans `assets/vendor/three-r187/`. Son chargement d’images passe par TextureLoader pour respecter la politique de sécurité existante. Les essais de combat automatisés continuent d’utiliser exclusivement le compte et les données locales isolés. Les travaux simultanés sur les portails sont conservés.

La correction `20261031-zoom-orion2` ajoute la molette avec une limite de dézoom à la vue d’origine, rétablit le décor antérieur et atténue le bruit de surface de l’Orion. Voir `docs/ZOOM_ORION_2026-10-31.md`.
