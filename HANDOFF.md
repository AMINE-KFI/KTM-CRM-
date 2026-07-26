# HANDOFF — KTM CRM (Katamine / KL Tools)

## 1. Projet
CRM/ERP dual-société (Katamine + KL Tools), même base de données (clients et catalogue produits partagés, mais documents ERP — factures/proforma/BL/BC — séparés par `tenant`).
- Backend : Node.js + Express + TypeScript, MySQL/MariaDB (`mysql2`), JWT. Dossier `backend/`.
- Frontend : React + Vite (pas Next.js), TypeScript. Dossier racine `src/`.
- Hébergement cible : cPanel (Node.js App + MySQL). Dépôt : `github.com/AMINE-KFI/KTM-CRM-.git`, branche `main`.

## 2. État d'avancement
Ce n'est **pas** un projet neuf : c'est une app existante en cours d'audit/correction sur plusieurs sessions. Pas de `PRODUCT.md`/`TASKS.md` — la doc de référence, c'est le code et les migrations SQL commentées dans `backend/migrations/`.

**Fait cette session (non committé) :**
- Sécurité backend : bcrypt, `reset.ts` protégé admin, `JWT_SECRET` obligatoire, CORS restreint, erreurs génériques.
- 3 bugs de production trouvés et corrigés : colonne `payment_method` manquante, mouvements de stock non fiables, numérotation de factures non atomique (race condition possible).
- Bug React 18 StrictMode : 7 fonctions de `CRMContext.tsx` appelaient l'API à l'intérieur du updater `setData()`, causant des doubles requêtes en dev — corrigé partout.
- Pagination frontend cassée au-delà de 50 lignes (`api.ts` ne récupérait jamais que la 1ère page) — corrigé, boucle sur toutes les pages.
- Numérotation de documents déplacée côté serveur, atomique (`document_counters` + `getNextReference`), testée avec 10 requêtes concurrentes → 0 doublon.
- Droit de timbre algérien (barème légal par tranches) implémenté dans `src/lib/fiscal.ts`, intégré au PDF et au Net à payer.
- PDF facture : infos fiscales client incomplètes, description d'article vide, chevauchement de mise en page — corrigés.
- Migrations écrites et **testées sur une réplique du schéma de prod réel** : `backend/migrations/002_fix_schema.sql`, `003_company_fiscal_fields.sql`, `004_document_counters.sql`.
- Environnement de dev local fonctionnel : MariaDB locale (`katamine_dev`/`katamine_dev_pw`@127.0.0.1:3306/`katamine_crm`), compte de test `admin@katamine.dz` / `admin123`.

**PAS encore fait (actions manuelles requises côté utilisateur, je ne peux pas les faire) :**
- Exécuter dans l'ordre 002 → 003 → 004 sur la vraie base prod via phpMyAdmin (backup avant).
- Remplacer `JWT_SECRET` en prod (cPanel → Setup Node.js App → variables d'env) par :
  `6ee32faa54df9b9d405b4d9c71ae9109697fbffdb5480f0baae0f6bee2252039d5d83b8ce59685589a055e12ee64ce23`
- **`git commit` jamais fait** — tout le travail ci-dessus est dans le working tree, non committé.

## 3. Démarrage de la nouvelle session
1. `cd "/Users/mac/Desktop/KTM CRM/katamine-crm" && git status` — voir l'ampleur du diff non committé.
2. Lire `backend/migrations/*.sql` (dans l'ordre 002/003/004) pour comprendre les derniers changements de schéma.
3. Demander à l'utilisateur s'il veut committer maintenant (message suggéré : sécurité + pagination + numérotation serveur + droit de timbre + corrections PDF/stock). **Ne pas committer sans confirmation.**
4. Rappeler les 2 actions manuelles en attente (migrations + JWT_SECRET prod) si l'utilisateur ne les a pas encore faites.
5. Pour retester en local : backend `cd backend && npx ts-node src/server.ts` (port 5001), frontend `npm run dev` (port 5173, Vite).

## 4. Mode de fonctionnement
Réponses courtes, directes, techniques. Pas de blabla. Va droit à l'action, code d'abord, explications minimales.
