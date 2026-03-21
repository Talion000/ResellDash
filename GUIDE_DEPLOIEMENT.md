# 🚀 Guide de déploiement — Resell App

## Ce dont tu as besoin (tout gratuit)
- Un compte **GitHub** → github.com
- Un compte **Supabase** → supabase.com (à créer)
- Un compte **Vercel** → tu l'as déjà ✅

---

## ÉTAPE 1 — Créer un projet Supabase

1. Va sur **supabase.com** → clique "Start your project"
2. Connecte-toi avec GitHub
3. Clique **"New project"**
4. Remplis :
   - **Name** : `resell-app`
   - **Database Password** : crée un mot de passe fort (note-le)
   - **Region** : `West EU (Ireland)` (le plus proche)
5. Clique **"Create new project"** et attends ~2 minutes

---

## ÉTAPE 2 — Créer la base de données

1. Dans ton projet Supabase, clique sur **"SQL Editor"** dans le menu de gauche
2. Clique **"New query"**
3. Ouvre le fichier `supabase_schema.sql` fourni
4. **Copie tout son contenu** et colle-le dans l'éditeur
5. Clique **"Run"** (bouton vert)
6. Tu devrais voir "Success" ✅

---

## ÉTAPE 3 — Récupérer tes clés Supabase

1. Dans Supabase, clique sur **"Project Settings"** (icône engrenage en bas à gauche)
2. Clique sur **"API"**
3. Note ces deux valeurs :
   - **Project URL** → ressemble à `https://xxxx.supabase.co`
   - **anon public key** → longue chaîne qui commence par `eyJ...`

---

## ÉTAPE 4 — Mettre le code sur GitHub

1. Va sur **github.com** → connecte-toi
2. Clique sur **"New repository"** (bouton vert ou "+" en haut à droite)
3. Nom : `resell-app`, laisse tout par défaut, clique **"Create repository"**
4. GitHub va te montrer une page avec des instructions
5. Télécharge **GitHub Desktop** sur desktop.github.com si tu ne l'as pas
6. Dans GitHub Desktop :
   - Clique **"Add an Existing Repository from your Hard Drive"**
   - Sélectionne le dossier `resell-app` que tu as téléchargé
   - Clique **"Publish repository"** → sélectionne le repo que tu viens de créer

> ⚠️ IMPORTANT : avant de publier, crée un fichier `.env` dans le dossier `resell-app` avec ce contenu (remplace par tes vraies clés de l'étape 3) :
> ```
> VITE_SUPABASE_URL=https://xxxx.supabase.co
> VITE_SUPABASE_ANON_KEY=eyJ...
> ```
> Ce fichier `.env` est dans le `.gitignore` donc il ne sera PAS publié sur GitHub (tes clés restent privées).

---

## ÉTAPE 5 — Déployer sur Vercel

1. Va sur **vercel.com** → connecte-toi
2. Clique **"Add New Project"**
3. Clique **"Import Git Repository"** → sélectionne `resell-app`
4. Avant de valider, clique sur **"Environment Variables"** et ajoute :
   - `VITE_SUPABASE_URL` → colle ta Project URL
   - `VITE_SUPABASE_ANON_KEY` → colle ta anon public key
5. Clique **"Deploy"** et attends 1-2 minutes
6. Vercel te donne une URL du style `resell-app-xxx.vercel.app` 🎉

---

## ÉTAPE 6 — Activer l'authentification Supabase

1. Dans Supabase, va dans **"Authentication"** → **"Providers"**
2. Vérifie que **"Email"** est activé (il l'est par défaut)
3. Va dans **"Authentication"** → **"URL Configuration"**
4. Dans **"Site URL"**, colle ton URL Vercel : `https://resell-app-xxx.vercel.app`
5. Clique **"Save"**

---

## C'est fini ! 🎉

Ton site est en ligne. Tu peux :
- Créer un compte via la page de connexion
- Ajouter tes items
- Importer tes données depuis Excel manuellement

## Problèmes fréquents

**"Invalid API key"** → Vérifie que les variables d'environnement sont bien renseignées dans Vercel

**"Row level security"** → Assure-toi d'avoir bien exécuté le fichier SQL complet

**Pas de mail de confirmation** → Va dans Supabase > Authentication > Email Templates et désactive la confirmation email pour les tests
