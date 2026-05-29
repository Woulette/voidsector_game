# VoidSector - Multi a distance gratuit

Objectif : jouer avec un pote qui n'est pas chez toi, sans hebergement payant.

## Option recommandee : Tailscale

Tailscale cree un reseau prive entre ton PC et le PC de ton pote. Ton serveur reste lance chez toi, mais ton pote peut y acceder comme s'il etait sur le meme reseau.

### 1. Installer Tailscale

Installe Tailscale sur les deux PC :

```txt
https://tailscale.com/download
```

Connectez-vous au meme compte Tailscale, ou invite ton pote dans ton tailnet.

### 2. Recuperer ton IP Tailscale

Sur ton PC, ouvre Tailscale et copie ton IP Tailscale. Elle ressemble souvent a :

```txt
100.x.y.z
```

### 3. Lancer les serveurs sur ton PC

Dans le dossier du jeu :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game\server
npm start
```

Dans un deuxieme terminal :

```powershell
cd C:\Users\Ntmav\Desktop\voidsector_game
python -m http.server 5500
```

### 4. Ton pote ouvre le jeu

Ton pote ouvre dans son navigateur :

```txt
http://TON_IP_TAILSCALE:5500
```

Exemple :

```txt
http://100.64.12.34:5500
```

### 5. Connexion multi dans le jeu

Dans le panneau groupe / multi, ton pote met comme URL serveur :

```txt
http://TON_IP_TAILSCALE:3001
```

Toi, tu peux utiliser :

```txt
http://localhost:3001
```

ou aussi :

```txt
http://TON_IP_TAILSCALE:3001
```

### 6. Pare-feu Windows

Si ton pote ne peut pas ouvrir le jeu, autorise Python et Node.js dans le pare-feu Windows.

Ports utilises :

```txt
5500 : serveur web du jeu
3001 : serveur Socket.IO multijoueur
```

## A savoir

- Le serveur tourne sur ton PC, donc si tu fermes ton PC, ton pote ne peut plus jouer.
- C'est gratuit et suffisant pour tester avec un pote.
- Plus tard, pour un vrai serveur public permanent, il faudra heberger `server/` sur un VPS, Render, Railway, Fly.io ou autre.
