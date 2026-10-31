# Azuron — sortie à la mort et reprise des survivants

Publié le **25 octobre 2026 à 14 h 49, heure de Paris**, version `20261025-azuron-death1`.

## Règles actives

- Une mort dans Azuron retire une vie et renvoie automatiquement le pilote sur la carte de départ de sa firme, avec le respawn gratuit habituel à 20 % des PV. Aucune question de résurrection n’apparaît et aucune continuation sur place n’est proposée.
- Tant qu’une vie reste, le même portail est remis sur la carte extérieure. Revenir dedans conserve l’identifiant de tentative, ses vies, ses séries validées et les éliminations déjà enregistrées. Cela ne consomme aucun nouveau fragment ni l’exemplaire suivant assemblé en réserve.
- La reprise recommence à la première vague de la série de cinq sauvegardée : 1, 6, 11, 16, 21 ou 26. Les séries précédentes ne sont pas rejouées.
- Toutes les vagues de cette série gardent leur calendrier : première immédiatement, puis +15, +30, +45 et +60 secondes. Une vague entièrement nettoyée reste vide pendant son créneau ; une vague partielle fait réapparaître uniquement ses survivants, avec leurs indices stables. Leurs PV et boucliers sont ceux d’une nouvelle apparition.
- Exemple : mort à la vague 3 après avoir nettoyé 1 et 2 et éliminé quatre ennemis de 3. Au retour : vague 1 vide, vague 2 vide après quinze secondes, puis six ennemis en vague 3 après trente secondes. Mort en vague 7 : reprise depuis 6 ; mort en vague 16 après validation de 1–15 : reprise depuis 16.
- La troisième mort supprime la tentative et son portail. Un exemplaire déjà assemblé ensuite reste disponible. Les autres portails conservent leurs choix de retour existants.

## Implémentation

Seul `server/src/players/playerLifecycle.js` change dans le runtime. Il envoie une mort sans choix pour Azuron puis applique le retour serveur existant, marque le checkpoint `parked` et ferme l’instance temporaire. Le paquet de respawn et le snapshot vide effacent l’ancienne scène côté client.

Le registre protégé `azuronProgress.defeated`, les reçus de récompense et le constructeur de vagues filtrant les indices déjà éliminés existaient déjà. Ils sont conservés : aucune seconde sauvegarde parallèle ni modification des vagues, du décor, des récompenses ou des délais de sortie.

## Vérification

- **388 tests sur 388**, sans exclusion ni test ignoré, sur le candidat final, le staging distant puis les sources effectivement déployées. Syntaxe du fichier serveur et `git diff --check` du périmètre validés.
- Les cas de mort en vagues 3, 7 et 16 utilisent le vrai gestionnaire de profils, écrivent la sauvegarde puis créent de nouveaux gestionnaires. Vérifications à 14 999/15 000 ms, six survivants exacts après quatre éliminations, absence de gains sur les créneaux vides et anciennes minuteries inopérantes après la sortie.
- Un cas non consécutif nettoie la vague 1 et quatre ennemis de 3, mais laisse la vague 2 vivante : reprise avec 0, puis 10, puis 16 survivants cumulés. La sauvegarde est donc individuelle à chaque ennemi.
- Échanges Socket.IO réels en **WebSocket et polling** : 24 éliminations réparties sur 1–3, mort sans choix, sortie et nettoyage de l’état client, reprise avec 1 et 2 vides puis les indices 5 à 10 de la vague 3. Le parcours continue jusqu’aux 30 vagues, avec 250 récompenses uniques et une seule victoire. L’horloge de jeu est accélérée dans ces tests.
- Trois morts avec deux retours par l’entrée, fermeture finale, conservation de la réserve payée et isolement d’un autre propriétaire testés. Ricky/Deadly et les autres portails restent couverts par la suite.
- Navigateur connecté à une **copie isolée** avec son propre compte : mort déclenchée par un bouton QA, retour automatique à la base sans panneau de résurrection, vies diminuées et reprise par le portail extérieur à la première vague de la série. La console ne contient ni erreur ni avertissement. Le scénario exact des six survivants est vérifié par les tests réseau et de persistance ci-dessus ; ce n’est pas une partie gagnée manuellement sur le MMO public. Aucun profil public n’a été modifié pour la QA.

Capture du retour après la première mort : `output/azuron-death-resume-2026-10-25/browser-auto-return.png`. La session isolée a été fermée et ses deux processus arrêtés après contrôle.

## Publication et preuves

Un seul fichier serveur livré, sauvegarde des sources et de PostgreSQL avant modification : `/opt/avosoma-backups/20261025-azuron-death1-134939`, avec `postgres-before.dump`. L’archive de livraison exclut tests, comptes, outils QA et secrets.

Contrôle de **573 empreintes**, dont **572 fichiers préservés**, et de quatre réponses HTTPS publiques conformes. Les publications concurrentes des effets de moteurs/ennemis et de la mini-carte ont été détectées avant installation ; le candidat a été reconstruit sur leur dernière base. Aucun frontend ni index livré dans cette correction.

`avosoma-beta.service` actif, nouveau PID **2458909**, `NRestarts=0`, PostgreSQL prêt et santé serveur correcte. Aucune nouvelle erreur dans le journal du processus au contrôle. Les 388 tests passent aussi via les liens vers le runtime réellement déployé.

Manifestes, copies des bases successives, archive, sauvegarde locale et rapports : `output/azuron-death-resume-2026-10-25/`, notamment `candidate.patch`, `manifest.json`, `source-guards.json`, `preflight-result.json`, `deploy-result.json`, `verify-result.json`, `candidate-tests.log` et `browser-console.json`.
