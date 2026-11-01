# GymTrax

Personal gym tracker PWA for iPhone: routine rotation, workout logger, rest timer, dumbbell variations and a progressive overload engine. 100% client-side (React + Vite); data stays on the device (IndexedDB), with JSON/CSV backup.

Live: https://moneyrobot84.github.io/gymtrax/ (Safari, Share, Add to Home Screen)

## Develop
```
npm install
npm run icons   # generate home-screen icons
npm run dev
```

## Deploy
Every push to `main` builds and publishes to GitHub Pages via `.github/workflows/deploy.yml` (Settings, Pages, Source: GitHub Actions).
