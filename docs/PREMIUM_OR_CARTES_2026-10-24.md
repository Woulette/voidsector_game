# Cartes Premium OR — 24 octobre 2026

Les cartes du Premium OR utilisent désormais une face et un cadre en métal doré, à partir du modèle existant. Les images standards, le logo, les durées, les prix et les droits restent conservés.

## Images

- `assets/store/premium-or-7.png` : carte OR 7 jours.
- `assets/store/premium-or-30.png` : carte OR 30 jours.
- `assets/store/premium-pass-7.png` et `premium-pass-30.png` : cartes standards conservées à l'identique, empreintes vérifiées.

Les variantes proviennent du mode intégré ImageGen, par édition des PNG standards, avec transparence réelle conservée. Aucun traitement d'image secondaire. Dimensions/alpha/sources : `output/premium-gold-art-20261024/asset-report.json`.

## Intégration

Le helper de présentation `src/ui/premiumPassArtwork.js` choisit le PNG doré uniquement pour une offre OR 7 ou 30 jours ; sinon il conserve l'image du catalogue. `premiumPassStore.js` l'utilise dans ses lignes et fiches ; `shopProductModel.js` transmet la même image aux cartes et fiches du Magasin. Les pass standards inclus dans les packs gardent leur image existante. Aucun catalogue partagé, serveur, paiement, durée ou droit n'est modifié.

38 tests existants passent localement et sur la copie de production. Publication limitée à six fichiers frontend (deux PNG, trois modules UI, importmap), version `20261024-gold-art1`, sans redémarrage serveur.

Publication vérifiée : six empreintes HTTPS conformes, images standards publiques identiques, cartes OR et fiches contrôlées dans les deux boutiques. Serveur inchangé (PID 1125928), PostgreSQL prêt. Sauvegarde : `/opt/avosoma-backups/20261024-gold-art1`. Capture : `output/premium-gold-art-20261024/public-premium-or.png`.

## Prompts des deux éditions

### 7J

Edit the supplied existing Avosoma premium pass card. This is a precise recolor, not a redesign. Keep the exact single card shape, cut corners, tilted perspective, proportions, orientation, center A/hexagon logo shape, chip position, engraved panel lines, and the exact text PREMIUM and 7J, in the same positions. Make this a distinctly GOLD edition of the SAME card: recolor its entire navy-blue face and metallic frame into rich brushed champagne gold and antique gold, with deep bronze grooves and dark charcoal inset areas for contrast. Replace every cyan/blue illuminated edge and logo rim by warm golden light. Retain the silver-white A logo and highly legible PREMIUM lettering. The result must look genuinely golden over the main broad card body, not just a gold border around a blue card. Keep the detailed sci-fi metal finish and crisp silhouette. Same framing and ample transparent margin as the source, whole card visible. Preserve a real transparent background, no floor, backdrop, additional objects, layout, or text.

### 30J

Edit the supplied existing Avosoma premium pass card. This is a precise recolor, not a redesign. Keep the exact single card shape, cut corners, tilted perspective, proportions, orientation, center A/hexagon logo shape, chip position, engraved panel lines, and the exact text PREMIUM and 30J, in the same positions. Make this a distinctly GOLD edition of the SAME card: recolor its entire navy-blue face and metallic frame into rich brushed champagne gold and antique gold, with deep bronze grooves and dark charcoal inset areas for contrast. Replace every cyan/blue illuminated edge and logo rim by warm golden light. Retain the silver-white A logo and highly legible PREMIUM lettering. The result must look genuinely golden over the main broad card body, not just a gold border around a blue card. Keep the detailed sci-fi metal finish and crisp silhouette. Same framing and ample transparent margin as the source, whole card visible. Preserve a real transparent background, no floor, backdrop, additional objects, layout, or text.
