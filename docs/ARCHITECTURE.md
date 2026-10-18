# Architecture

## Choix de stack

| Couche | Choix | Rôle |
|---|---|---|
| Application web | Next.js 16 App Router, React 19, TypeScript | Rendu serveur de la page privée et routes BFF |
| Authentification | Better Auth | Sessions et première inscription à jeton unique ; une fois l’admin créé, toute création de compte est refusée |
| Données | PostgreSQL 17 + Drizzle | Sessions, liens, catégories, thème et gare choisie |
| Animation | Motion | Entrée légère et interactions brèves, réduites avec la préférence système |
| Carte | Canvas 2D | Réseau des voies et positions du flux sans moteur 3D lourd |
| Hébergement | Docker Compose sur Coolify | App Next.js + PostgreSQL avec volume persistant |

Le produit est une startpage personnelle mono-administrateur. PostgreSQL garde les réglages entre appareils et redéploiements. Un second service de cache, une file de tâches et une base vectorielle ne sont pas nécessaires.

## Données d’application

`dashboard_config` garde un document JSON validé par Zod : catégories, liens, marqueurs WORK, thème, station et ordre. Better Auth utilise ses tables `user`, `session`, `account`, `verification`.

Les raccourcis initiaux sont des exemples modifiables. Aucun identifiant de service privé n’est supposé.

## Protection des routes

- Toutes les pages de contenu et routes `/api/config`, `/api/rail/*` exigent une session admin.
- `/setup` ne s’affiche que lorsque la table utilisateurs est vide.
- La route de création Better Auth exige `BOOTSTRAP_SETUP_TOKEN` et refuse l’inscription dès qu’un utilisateur existe.
- Les secrets restent dans l’environnement Coolify ; ils ne sont jamais envoyés dans les props du navigateur.

## API ferroviaire

Le projet `reseau-en-direct` expose déjà les contrats nécessaires. L’application utilise `RAIL_API_BASE_URL` côté serveur et sert uniquement ces routes protégées :

| Route Start-X | Source | Cadence client |
|---|---|---:|
| `GET /api/rail/stations` | `/api/stations` | au chargement / cache 5 min |
| `GET /api/rail/stations/{id}/board` | `/api/stations/{id}/board` | 45 s |
| `GET /api/rail/health` | `/api/health` | 20 s |
| `GET /api/rail/network` | `/api/network` (binaire) | au chargement / cache 1 h |
| `GET /api/rail/snapshot` | `/api/snapshot` (binaire) | 3 s |

Les demandes passent par le serveur Start-X : pas de CORS ni de clé d’API côté navigateur. Les horaires dépendent de la source et de la fraîcheur fournie par le service. Le snapshot contient un manifeste et une frame little-endian décrits dans le protocole source ; le client décode les voies, stations, slots et positions. Une position absente ou une frame en échec ne devient jamais un faux train en direct.

## Carte

La carte source est une géométrie binaire projetée sur la bbox Belgique 2.0–7.0 E / 49.2–51.9 N. Le Canvas dessine les polylignes et gares, puis les positions courantes. Les états de retard, annulation et données théoriques sont affichés par forme/couleur et légende textuelle.

## Routes locales

- `/`: page startpage protégée.
- `/login`: connexion.
- `/setup`: inscription du premier administrateur.
- `/api/auth/*`: Better Auth.
- `/api/config`: lecture et sauvegarde des réglages admin.
- `/api/rail/*`: proxy serveur-authentifié vers `reseau-en-direct`.
