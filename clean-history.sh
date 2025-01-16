#!/bin/bash

git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch serveur-node-js/.env" \
  --prune-empty --tag-name-filter cat -- --all

# Forcer le garbage collector de Git à supprimer les objets non référencés
git for-each-ref --format="delete %(refname)" refs/original | git update-ref --stdin
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Créer une nouvelle branche pour la récupération
git checkout -b recovery_branch

# Récupérer le commit fantôme
git update-ref refs/heads/recovery_branch 99a1ae583d818ef6219e8fd8fa2a985574fdf065

# Créer une branche temporaire pour les modifications actuelles
git checkout -b temp_branch

# Appliquer les modifications du TimeGrid.tsx
git checkout recovery_branch -- src/components/reservations/TimeGrid.tsx

# Appliquer les modifications du WelcomeAI.tsx
git checkout recovery_branch -- src/components/welcome/WelcomeAI.tsx

# Créer un nouveau commit avec ces modifications
git add src/components/reservations/TimeGrid.tsx src/components/welcome/WelcomeAI.tsx
git commit -m "Récupération des modifications perdues"

# Retourner sur main
git checkout main

# Appliquer les modifications
git cherry-pick temp_branch

# Nettoyer les branches temporaires
git branch -D recovery_branch temp_branch
