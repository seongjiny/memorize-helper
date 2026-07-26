# Git Branch Strategy (AI-Friendly)

## Branches

main

- stable branch
- always deployable
- no direct commit if possible

feature/\*

- new features

fix/\*

- bug fixes

refactor/\*

- structure/code cleanup without feature change

experiment/\*

- temporary testing or PoC

## Naming Examples

feature/login

feature/chat-widget

fix/token-refresh

refactor/api-service

experiment/new-ui

## Workflow

1. update main

git checkout main
git pull origin main

2. create branch

git checkout -b feature/example

3. commit changes

git add .
git commit -m "feat: add example feature"

4. merge into main

git checkout main
git merge feature/example
git push origin main

5. delete branch

git branch -d feature/example

## Commit Convention

feat: new feature

fix: bug fix

refactor: internal cleanup

docs: documentation

style: formatting only

chore: config/build/dependency

test: test related

## Rules

- one feature = one branch
- keep branches short-lived
- merge small changes frequently
- keep main runnable
- avoid large long-running branches

## Recommended Personal Project Setup

main
feature/_
fix/_
refactor/_
experiment/_
