This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Analytics

This project uses [Simple Analytics](https://simpleanalytics.com/) for privacy-first,
cookie-less web analytics (no cookie banner required). The [`@simpleanalytics/next`](https://www.npmjs.com/package/@simpleanalytics/next)
package is wired up as follows:

- `next.config.ts` wraps the config with the `withSimpleAnalytics` plugin, which
  proxies client-side tracking requests so ad blockers can't interfere.
- `src/app/layout.tsx` renders the `<SimpleAnalytics />` component, which injects
  the tracking script and collects pageviews automatically.
- Set the site's domain (the one shown in the Simple Analytics dashboard) via the
  `NEXT_PUBLIC_SIMPLE_ANALYTICS_HOSTNAME` / `SIMPLE_ANALYTICS_HOSTNAME` env vars
  — copy `.env.local.example` to `.env.local` and fill them in.

Optional server-side pageview and event tracking is available through
`@simpleanalytics/next/server` (`trackPageview`, `trackEvent`), e.g. in Edge
Middleware, Server Components, Server Actions, and Route Handlers. See the
package docs for details.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
