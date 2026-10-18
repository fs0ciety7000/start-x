# Déploiement Coolify

## Déploiement CI

Le workflow `.github/workflows/deploy-coolify.yml` provisionne le projet et la ressource Coolify depuis le dépôt public, branche `codex/startpage`, puis demande un déploiement à chaque push sur cette branche. Il cible le serveur sur lequel Coolify lui-même tourne. S’il y en a plusieurs, définis la variable de dépôt `COOLIFY_SERVER_UUID` avant de relancer le workflow.

Le workflow utilise le secret GitHub `COOLIFY_API_KEY` et l’API de `https://coolify.fs0ciety.org/api/v1`. La ressource est Docker Compose, fichier `docker-compose.yml`; l’application est routée sur `https://init.fs0ciety.org` et la base reste privée au réseau Compose.

## Variables d’environnement

Dans Coolify, les valeurs magiques ci-dessous sont générées et conservées par ressource Compose. Le jeton `SERVICE_HEX_64_SETUP` sert une seule fois à créer l’admin : copie sa valeur depuis les variables d’environnement de la ressource avant d’ouvrir `/setup`.

- `SERVICE_PASSWORD_64_POSTGRES`
- `SERVICE_HEX_64_AUTH`
- `SERVICE_HEX_64_SETUP`

Les noms sont prévus par le générateur d’environnements Compose de Coolify. En local, copie `.env.example` et remplace ces trois valeurs par des secrets uniques (`openssl rand -hex 32` convient pour les trois).

Le workflow enregistre aussi les variables applicatives non secrètes sur la ressource :

- `BETTER_AUTH_URL=https://init.fs0ciety.org`
- `POSTGRES_DB=init`, `POSTGRES_USER=init`
- `RAIL_API_BASE_URL=https://reseau.fs0ciety.org`

## Premier démarrage

Compose attend la disponibilité de PostgreSQL, applique les migrations puis ajoute les raccourcis par défaut sans écraser la configuration existante. Ouvrir `/setup`, entrer le jeton `BOOTSTRAP_SETUP_TOKEN`, puis créer l’utilisateur admin. Après création, l’inscription est verrouillée.

Conserver le volume `init_postgres` lors des redéploiements. Les sauvegardes régulières doivent couvrir ce volume ou un dump PostgreSQL externe.

## DNS Cloudflare

Le CNAME proxifié `init` pointe vers le domaine racine, qui dessert déjà Coolify. Le workflow ne modifie pas ce DNS. Coolify attache `https://init.fs0ciety.org` au service `app`, route le trafic vers le port conteneur `3000` et gère le certificat HTTPS.

## Santé

Coolify surveille `GET /api/healthz`. Le statut réel SNCB est exposé dans `GET /api/rail/health` et dans l’interface. Les pannes de l’API ferroviaire n’empêchent pas l’ouverture des raccourcis.
