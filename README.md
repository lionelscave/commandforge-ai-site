# CommandForge AI Website

Public marketing site for **CommandForge AI** — custom personal AI teams and AI-native command centers for founders, executives, and teams.

## Pages

- `/` — homepage
- `/courses` — course catalog
- `/courses/:slug` — course detail
- `/services` — consulting offers
- `/intake` — AI Command Center intake (lead capture)
- `/audit` — AI operating-system readiness audit
- `/success` — post-submission next step

## Stack

- React
- TypeScript
- Vite

## Local development

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
```

## Vercel settings

- Framework preset: Vite
- Install command: `npm install`
- Build command: `npm run build`
- Output directory: `dist`

## Contact

All intake and audit submissions route to hello@commandforgeai.com. There is no server-side API, payment processing, or credential handling in this repository — it is a static marketing site.
