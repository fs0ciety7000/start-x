# INIT — startpage personnelle

Startpage privée et configurable avec favoris, espace WORK, tableaux de départs/arrivées SNCB et carte belge des trains en direct.

## Stack

- Next.js 16 App Router, React 19 et TypeScript.
- PostgreSQL 17 + Drizzle ORM pour la configuration et les sessions.
- Better Auth pour la connexion administrateur.
- Motion pour quelques transitions d’interface ; Canvas 2D pour afficher le réseau ferroviaire léger.
- Docker Compose, déployé sur Coolify.

## Développement local

1. Copier `.env.example` en `.env`, puis remplacer les valeurs secrètes et utiliser `BETTER_AUTH_URL=http://localhost:3000` en local.
2. Lancer PostgreSQL localement ou via `docker compose up -d db`.
3. Installer les dépendances avec `npm ci`.
4. Lancer `npm run db:migrate`, puis `npm run db:seed`.
5. Démarrer `npm run dev` et ouvrir `http://localhost:3000`.
6. La première ouverture va sur `/setup`. Utiliser `BOOTSTRAP_SETUP_TOKEN` et créer le compte administrateur. Cette inscription se ferme après le premier compte.

## Configuration

Voir [`.env.example`](.env.example) et [le guide Coolify](docs/DEPLOYMENT.md). La base PostgreSQL doit garder son volume `init_postgres` entre les déploiements.

## Documentation

- [Architecture et intégration ferroviaire](docs/ARCHITECTURE.md)
- [Guide de déploiement](docs/DEPLOYMENT.md)
- [Système visuel](DESIGN.md)
- [Brief produit](PRODUCT.md)
