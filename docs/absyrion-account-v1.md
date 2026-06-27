# Absyrion Account V1

## Objectif

Absyrion devient le compte maitre pour Avosoma et les prochains jeux. Un joueur cree un seul compte avec son email, puis chaque jeu charge son propre profil de jeu avec le meme identifiant de compte.

## Separation V1

- `absyrion.com` reste le portail public du studio.
- Avosoma reste heberge sur le serveur de jeu netcup.
- Le backend Avosoma expose temporairement les routes HTTP `/platform/auth/*` pour servir de socle compte Absyrion V1.
- Les profils Avosoma restent dans `player_profiles`; les comptes globaux restent dans `accounts`.
- Les futurs jeux devront utiliser le meme identifiant global, sans copier les mots de passe.

## Routes disponibles

Toutes les routes repondent en JSON.

- `POST /platform/auth/register`
  - body: `{ "email": "...", "username": "...", "password": "..." }`
  - cree le compte global et renvoie une session.

- `POST /platform/auth/login`
  - body: `{ "login": "...", "password": "..." }`
  - accepte email ou pseudo, puis renvoie une session.

- `GET /platform/auth/session`
  - header: `Authorization: Bearer <token>`
  - valide une session existante.

- `POST /platform/auth/session`
  - body: `{ "token": "..." }`
  - alternative pour valider une session existante.

- `POST /platform/auth/logout`
  - header: `Authorization: Bearer <token>` ou body `{ "token": "..." }`
  - supprime la session.

## Prochaine etape

Quand les sous-domaines seront prets, configurer:

- `https://absyrion.com` pour le portail.
- `https://avosoma.absyrion.com` pour le client Avosoma.
- `https://api.absyrion.com` ou `https://auth.absyrion.com` pour l'auth V1, meme si le service tourne physiquement sur netcup au debut.

Le serveur devra alors avoir `CLIENT_ORIGIN` avec les origines autorisees, par exemple:

```text
CLIENT_ORIGIN=https://absyrion.com,https://avosoma.absyrion.com
```

