# Déploiement Coolify

## Ressource

Créer une ressource **Docker Compose** depuis le dépôt `fs0ciety7000/start-x`, branche de déploiement, fichier `docker-compose.yml`. Publier le service `app` sur le port `3000` avec le domaine `https://init.fs0ciety.org`. Le service `db` reste interne au réseau Compose.

## Variables d’environnement

Configurer les variables de `.env.example` dans l’environnement Coolify, avec des valeurs aléatoires uniques :

- `POSTGRES_PASSWORD`
- `BETTER_AUTH_SECRET`
- `BOOTSTRAP_SETUP_TOKEN`
- `BETTER_AUTH_URL=https://init.fs0ciety.org`
- `POSTGRES_DB=init`, `POSTGRES_USER=init`
- `RAIL_API_BASE_URL=https://reseau.fs0ciety.org`

Générer deux secrets distincts (`openssl rand -hex 32`). Ne pas mettre ces valeurs dans le dépôt ni dans les logs.

## Premier démarrage

Compose attend la disponibilité de PostgreSQL, applique les migrations puis ajoute les raccourcis par défaut sans écraser la configuration existante. Ouvrir `/setup`, entrer le jeton `BOOTSTRAP_SETUP_TOKEN`, puis créer l’utilisateur admin. Après création, l’inscription est verrouillée.

Conserver le volume `init_postgres` lors des redéploiements. Les sauvegardes régulières doivent couvrir ce volume ou un dump PostgreSQL externe.

## DNS Cloudflare

Créer le record DNS `init` pointant vers l’hôte ou le proxy public utilisé par Coolify, puis activer le proxy Cloudflare selon la configuration TLS du serveur. Dans Coolify, attacher le domaine au service `app` et laisser le proxy gérer le certificat HTTPS.

## Santé

Coolify surveille `GET /api/healthz`. Le statut réel SNCB est exposé dans `GET /api/rail/health` et dans l’interface. Les pannes de l’API ferroviaire n’empêchent pas l’ouverture des raccourcis.
