# Boutique Avosoma — 24 octobre 2026

La présentation validée conserve le fond, l’en-tête et le cadre commun du launcher. La boutique NOVA/Crédits montre six offres à la fois ; les packs de départ regroupent vaisseau et contenu sur une ligne ; le calendrier OR affiche ses 28 jours et une fiche sélectionnée.

## Offres validées

| Formule | 7 jours | 30 jours |
|---|---:|---:|
| Premium classique, sans calendrier | 1,99 € | 6,99 € |
| Premium OR, avec calendrier | 2,99 € | 10,99 € |

Tous les abonnements sont désormais affichés uniquement en euros, dans la Boutique comme dans le Magasin. Les paiements restent en préparation : aucune commande ne simule un achat en euros.

| Prix | NOVA |
|---|---:|
| 1,99 € | 3 500 |
| 5,99 € | 12 000 |
| 10,99 € | 24 000 |
| 24,99 € | 60 000 |
| 49,99 € | 125 000 |
| 99,99 € | 265 000 |

Les tarifs et contenus des crédits, des packs de départ et des récompenses n’ont pas été rééquilibrés. Les packs bêta restent inchangés.

## Droits et compatibilité

- Les huit avantages communs restent accessibles aux deux formules. Le calendrier mensuel nécessite un terme OR actif.
- `premiumUntil` conserve l’échéance générale ; `premiumGoldUntil` porte l’échéance du calendrier. Un zéro explicite distingue le classique ; l’absence du champ conserve l’ancien abonnement comme OR jusqu’à son terme.
- Un renouvellement classique prolonge les avantages communs sans prolonger le calendrier. Un renouvellement OR ajoute sa durée au terme OR et au terme général.
- Le nouveau champ est protégé et synchronisé avec la progression serveur. Une sauvegarde de profil client ne peut pas le remplacer.
- L’ancien événement `shop:buy-premium-pack`, l’action de profil et l’action client refusent tout achat en NOVA, y compris avec un ancien identifiant ou un prix falsifié. Aucun portefeuille n’est débité.

## Modules et illustrations

`supportStore.js` garde la navigation, les interactions et les fiches natives. `supportStorePanels.js` porte les trois collections. Les sélections de monnaie, de formule et de jour restent hors du profil canonique.

Les deux atlas PNG transparents de six illustrations proviennent de l’outil intégré ImageGen : `assets/store/nova-packs-atlas.png` et `assets/store/credits-packs-atlas.png`. Ils utilisent une grille de trois colonnes et deux rangées, affichée par CSS. Les vaisseaux, armes, munitions et icônes des récompenses proviennent du catalogue du jeu.

Direction ImageGen : atlas de six objets isolés sur fond transparent, pièce seule puis piles croissantes et coffres, emblème N doré pour NOVA et C bleu argent pour les crédits, rendu métallique cohérent avec la maquette, sans texte ni décor. Les prompts complets et sources sont conservés dans `output/boutique-official-20261024/asset-prompts.json` et `asset-report.json`.

## Validation

1 702 tests passent dans les 261 suites serveur locales, avec 16 contrôles syntaxiques. Ils comprennent les droits classique/OR, la conservation des anciens termes, le refus de l’achat NOVA par un vrai échange Socket.IO, la protection contre une sauvegarde falsifiée et les rendus des catalogues.

Le navigateur a vérifié les trois collections, les deux formules, les prix et les fiches désactivées, les droits du calendrier et les formats bureau, 1 024 px et 390 px. Les rapports et captures restent dans le dossier de publication. La version `20261024-boutique3` est publiée : 158 tests ciblés réussis sur la copie de production, 22 empreintes de fichiers vérifiées par HTTPS ou SSH, PostgreSQL prêt et service actif sans redémarrage inattendu. Le navigateur public confirme les prix NOVA, les quatre abonnements en euros dans les deux boutiques, les fiches de paiement à venir et les 28 jours OR. Sauvegarde de retour : `/opt/avosoma-backups/20261024-boutique3`.
