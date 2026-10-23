# Mini-carte panoramique — 23 octobre 2026

La mini-carte conserve un format horizontal pour tous les secteurs. Le minimum passe de 220 x 237 a 300 x 192 pixels et la taille par defaut devient 380 x 228. Les anciennes largeurs inferieures a 300 sont migrees automatiquement. Les boutons +/- et les reglages sauvegardes gardent ce format.

La surface de navigation utilise un ratio hauteur/largeur de 9/20, defini dans `miniMapLayout.js`, avec un en-tete de 40 pixels et une barre de coordonnees de 24 pixels. Les clics couvrent toujours l'integralite des coordonnees du secteur, quels que soient ses dimensions et le format du widget.

Helion-01 charge `assets/maps/minimaps/helion-01-wide.png`, une capture fixe 1200 x 540 du decor reel, recomposee pour ce format. Les autres fonds et les batiments compensent l'echelle verticale pour conserver les proportions des illustrations. Le radar suit une ellipse correspondant a sa portee reelle sur la carte.

Cache : `20261023-minimap5`. Correction frontend, sans modification du gameplay ni des donnees serveur. Les tests verifient la migration, les dimensions au minimum, les clics aux bords et la conservation des proportions des illustrations.
