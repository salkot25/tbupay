# React + Vite

## Environment Setup

Create a `.env` file in the `frontend` folder and set:

```
VITE_GAS_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
```

You can copy from `.env.example`.

## Performance and Offline Cache

The app uses an adapter-level cache strategy for read endpoints:

- Fast load from local cache when data is still fresh (TTL-based)
- Automatic network sync when cache is stale
- Offline fallback: returns cached data if network is unavailable
- Incremental merge by ID for append-heavy data (transactions, tickets, news)

Cache is handled in `src/infrastructure/adapters/cacheStore.js`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
