# Mariage de Justin & Nahomie — Invitations & Confirmations

Application web élégante pour inviter vos convives et suivre leurs réponses.
« **Grace and Love for a Fresh Start** » — 22 août 2026, Yamoussoukro.

Deux espaces :

- **Espace des fiancés** (`/admin`, protégé par mot de passe) : ajouter des
  invités, partager un lien personnel par **WhatsApp** ou **e-mail** (message
  déjà rédigé), suivre les statuts (confirmé / en attente / décliné) et
  **exporter** la liste officielle (Excel/CSV).
- **Page d'invitation** (`/rsvp/[lien]`) : chaque invité reçoit un lien unique,
  découvre le faire-part et confirme (ou décline) sa présence.

Construit avec **Next.js 16**, **React 19** et **Tailwind CSS 4**. Prêt pour un
déploiement sur **Vercel**.

---

## 1. Lancer en local

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000 → vous êtes redirigé vers l'espace des fiancés.
Mot de passe par défaut en local : **`mariage2026`** (défini dans `.env.local`).

> Sans base de données, l'application fonctionne en **mode démonstration** :
> les invités sont stockés dans un fichier local (`.data/guests.json`) et ne
> sont **pas** conservés une fois déployé. Configurez une base Postgres pour la
> production (voir ci-dessous).

---

## 2. Déployer sur Vercel

### Étape 1 — Mettre le projet sur Vercel

Le plus simple : poussez ce dossier sur un dépôt GitHub, puis sur
[vercel.com](https://vercel.com) → **Add New… → Project** → importez le dépôt.
(ou, avec le CLI : `npm i -g vercel` puis `vercel` à la racine du projet.)

Vercel détecte automatiquement Next.js — aucune configuration de build requise.

### Étape 2 — Ajouter une base de données Postgres (gratuite)

Dans votre projet Vercel : onglet **Storage → Create Database → Postgres**
(fourni par **Neon**, offre gratuite suffisante). Reliez-la au projet :
Vercel injecte automatiquement les variables `DATABASE_URL` / `POSTGRES_URL`.
L'application crée la table des invités toute seule au premier lancement.

### Étape 3 — Définir les variables d'environnement

Onglet **Settings → Environment Variables** du projet :

| Variable          | Valeur                                              |
| ----------------- | --------------------------------------------------- |
| `ADMIN_PASSWORD`  | Le mot de passe de l'espace des fiancés (à choisir) |
| `SESSION_SECRET`  | Une longue chaîne aléatoire (sécurité de session)   |

`DATABASE_URL` est déjà là grâce à l'étape 2.

### Étape 4 — Déployer

Cliquez **Deploy** (ou faites un nouveau commit). Votre site est en ligne 🎉
Les liens d'invitation utiliseront automatiquement votre domaine Vercel
(ou votre domaine personnalisé si vous en ajoutez un).

---

## 3. Utilisation

1. Connectez-vous à `/admin` avec votre mot de passe.
2. **Ajouter un invité** : nom, catégorie, nombre de places, téléphone, e-mail.
3. Sur chaque fiche : bouton **WhatsApp** (message pré-rempli), **e-mail**, ou
   **copier le lien** pour partager l'invitation.
4. Les invités répondent depuis leur lien → les statuts se mettent à jour ici.
5. **Exporter** : téléchargez la liste (tous / confirmés / déclinés) en fichier
   qui s'ouvre directement dans Excel ou Google Sheets.

---

## 4. Personnalisation

- **Infos du mariage** (date, lieu, programme, message d'invitation) :
  `lib/wedding.ts`.
- **Photo du couple** du faire-part : `public/couple.jpg` (remplacez le fichier
  en gardant le même nom).
- **Couleurs & styles** : `app/globals.css` (palette émeraude / terracotta / or).

---

## Structure

```
app/
  login/            Connexion de l'espace des fiancés
  admin/            Tableau de bord (ajout, partage, suivi, export)
  rsvp/[token]/     Page d'invitation vue par l'invité
  api/              Routes serveur (auth, invités, RSVP, export CSV)
lib/
  wedding.ts        Informations du mariage & message d'invitation
  db.ts             Accès données (Postgres en prod, fichier en local)
  auth.ts           Authentification par mot de passe
public/couple.jpg   Portrait du couple
```
