# Double tir laser Avosoma — 21 octobre 2026

[Paquet Netcup prêt à appliquer](avosoma-laser-netcup-20261021.zip)

Le double tir validé contient deux impulsions espacées de 120 ms, sur 265 ms au total. Une attaque laser déclenche un seul effet sonore, avec les volumes Général/Effets et le mute existants.

## État du déploiement

Le paquet est préparé et testé, mais n'a pas été appliqué à Netcup : le PC utilisé ne possède pas l'accès SSH habituel.

La version publique du client est plus récente que `main` (dernier commit accessible : 29 juin 2026). **Ne pas redéployer toute cette branche à la place de la production.** L'archive Netcup conserve les modules publics en ligne au 21 octobre, avec les seules modifications nécessaires à l'audio. Elle attend notamment la confirmation serveur d'une attaque avant de jouer le son.

Depuis une session SSH déjà autorisée, décompresser l'archive hors du dossier public, lire `LISEZ-MOI.txt`, puis vérifier la vraie racine du jeu :

```sh
python3 apply-update.py --root /chemin/reel/du/jeu
```

Si la vérification réussit, ajouter `--apply`. Le script valide toutes les empreintes avant d'écrire, sauvegarde les originaux, installe les dépendances avant le point d'entrée et contrôle les nouveaux fichiers. Il refuse les versions divergentes. Il ne touche ni au serveur MMO, ni aux comptes, ni à la base de données et ne nécessite pas de redémarrage du service.

## Vérifications

- 28 tests ciblés sur le dépôt : audio, cadence, autorité MMO, effets distants et réglages.
- 3 tests supplémentaires sur les armes réellement servies en production : tir accepté, refus/roquette silencieux, cadence et confirmations dédoublonnées.
- Syntaxe JavaScript de tous les modules modifiés.
- Installateur : simulation, application et empreintes, fichiers hors périmètre préservés, réapplication, refus d'une version serveur différente.
- La vérification dans le navigateur local reste limitée par une connexion localhost inaccessible ; elle ne constitue pas une validation en combat sur le serveur public.
