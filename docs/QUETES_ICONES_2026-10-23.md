# Pictogrammes de catégories de quêtes

Publié le 23 octobre 2026 à 11:23:49 (Europe/Paris), version `20261023-quest-icons1`.

Les neuf silhouettes simples validées sont intégrées au relais : combat, récolte, vaisseau, drone, laser, amélioration, exploration, livraison et portail. Les géométries SVG intégrées ont été comparées aux neuf fichiers de l’aperçu approuvé.

`src/game/ui/questCategories.js` centralise les dessins et l’association entre objectifs et catégorie principale. Une quête de combat comportant aussi des déplacements garde les épées. Les variantes des quatre firmes partagent la même catégorie. Une future quête mixte peut préciser une catégorie principale avec `activityCategory`, parmi les neuf catégories existantes.

La liste conserve le pictogramme de catégorie lorsque la quête est verrouillée, active, prête à réclamer ou terminée. Les objectifs utilisent les symboles correspondants : les lasers, les améliorations, la récolte, la livraison et les portails ont désormais un dessin dédié.

La fonction d’affichage des conditions est identique à la version précédente. Aucun nouvel indicateur de dégâts n’a été ajouté ; sa présentation reste à reprendre avec le créateur. Les règles d’échec et la progression serveur ne sont pas modifiées.

Validation :

- 49 tests ciblés réussis ; syntaxe des trois modules et vérification du diff réussies.
- Contrôle du moteur de rendu réel dans une page locale isolée : catégories, états de quête, tutoriel, mission longue, quatre firmes et formats 1635 × 962 / 1366 × 768.
- Aucun débordement horizontal, image manquante ou erreur de console pendant les contrôles.
- Quatre fichiers publiés, index en dernier. Les quatre empreintes publiques HTTPS correspondent au lot vérifié. PostgreSQL sain, service actif, PID inchangé `2856426`, `NRestarts=0`.

La publication est un déploiement ciblé sur le serveur ; aucun commit ni push Git n’a été effectué. Les autres modifications du checkout sont conservées.

Preuves : `output/quest-icons-2026-10-23/`. Lot de publication : `tmp/quest-icons1/`.

Sauvegardes :

- Locale : `C:/Users/Ntmav/.codex/backups/voidsector_game/20261023-quest-icons1-before`.
- Serveur : `/opt/avosoma-backups/quest-icons1-20261023`.
