# Ready To Bet

> Les paris entre amis, organisés simplement.

Ready To Bet est une petite application pour créer des paris amicaux, recueillir les choix de chaque joueur et décider du résultat à la date prévue.

## ✨ Fonctionnalités

- Créez un pari avec son contexte, ses joueurs et leurs choix.
- Fixez une échéance et ajoutez des tags pour retrouver vos paris facilement.
- Recherchez, filtrez et triez les paris par date de création ou d’échéance.
- Ouvrez une fiche récapitulative en cliquant sur un pari, puis clôturez-le avec le choix gagnant.
- Choisissez l’interface en français, coréen ou anglais.
- Les paris, tags et préférences sont sauvegardés dans le `localStorage` du navigateur.

## 🧰 Technologies

React · TypeScript · Vite

## 🚀 Installation et développement

Prérequis : Node.js 22 et npm.

```bash
git clone https://github.com/Austin-William/ready-to-bet.git
cd ready-to-bet
npm ci
npm run dev
```

Vite affiche ensuite l’adresse locale à ouvrir dans le navigateur.

Pour créer et prévisualiser une version de production :

```bash
npm run build
npm run preview
```

## 🌐 Déploiement sur GitHub Pages

Deux méthodes sont configurées. Choisissez **une seule source de publication** dans **Settings → Pages**.

### Publication automatique avec GitHub Actions

Dans **Settings → Pages**, sélectionnez **GitHub Actions** comme source. Le workflow `.github/workflows/deploy-pages.yml` construit et publie l’application à chaque push sur `main`. Vous pouvez aussi le lancer depuis l’onglet **Actions** du dépôt.

### Publication manuelle avec `gh-pages`

Dans **Settings → Pages**, sélectionnez la branche `gh-pages` et le dossier `/(root)`. Puis lancez :

```bash
npm run deploy
```

La commande `predeploy` lance automatiquement le build avant de publier le dossier `dist`.

L’application est publiée à l’adresse suivante après le premier déploiement :

<https://austin-william.github.io/ready-to-bet/>
