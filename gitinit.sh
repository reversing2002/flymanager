#!/bin/bash
git init
git add .
git commit -am "first commit"
git branch -M main
git remote add origin https://github.com/reversing2002/flymanager.git
git push --set-upstream origin main --force