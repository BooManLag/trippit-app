# Trippit Travel App - Bolt Hackathon

Trippit is a lightweight web app built during the Bolt Hackathon to make planning your first big trip less stressful and a lot more fun. It combines a simple itinerary builder with bite-sized challenges and crowdsourced tips so you can travel smarter and enjoy the adventure.

## Features

- **Trip creation** - Add destinations and travel dates to keep everything organized in one place.
- **Reddit-powered tips** - Pulls real advice from Reddit so you can learn from experienced travelers.
- **Dare-style bucket list** - A playful checklist that encourages you to try new things on your journey.
- **Packing helper** - Create categories and items to ensure you never forget the essentials.
- **Travel scenario game** - A short "Where'd I Go?" game that helps you practice what to do when things go wrong.

Behind the scenes Trippit is built with React, TypeScript, Tailwind CSS and Supabase for database storage and serverless functions.

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure Supabase**
   Create a `.env` file in the project root:
   ```env
   VITE_SUPABASE_URL=<your-supabase-url>
   VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
   ```
   These values come from your Supabase dashboard.
3. **Run the development server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:5173` in your browser to see Trippit in action.
4. **Build for production**
   ```bash
   npm run build
   ```
   You can then preview the compiled build locally with `npm run preview`.

## Project Structure

```
src/             React components, pages and utilities
supabase/        Edge functions and database migrations
index.html       Single-page app entry point
vite.config.ts   Vite configuration
```

You are welcome to explore each folder to see how things fit together.

## Contributing

This project was created for a hackathon and has plenty of room to grow. Pull requests are welcome if you'd like to experiment or improve the app. Just be sure to install the recommended development dependencies and run `npm run lint` before submitting a patch.

## Deployment


Trippit is a single-page application. When hosting the built files you need to ensure every route is served by `index.html` so the client side router can resolve the URL. The included `404.html` page automatically redirects unknown routes back to the app and preserves the path, allowing shared links like `/trip/123` to open correctly. Configure your hosting provider to serve both `index.html` and `404.html` for unknown routes. The build script automatically copies `404.html` into the `dist` directory so it can be deployed alongside `index.html`.
If you're using Netlify, set the build command to `npm run build` and use `dist` as the publish directory so the redirect rule works correctly.

For Netlify deployments create a `netlify.toml` file in the project root with:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

Alternatively, add a `_redirects` file under `public` containing the same rule:

```
/* /index.html 200
```

Vite automatically copies the `public` directory during `npm run build` so the `_redirects` file is included in the final `dist` output.

## Security Policies

The database uses row level security to keep data private. Alongside standard
ownership rules, authenticated users may view basic profile details for other
users if they share a trip or have exchanged a trip invitation. Only the
`id`, `display_name` and `email` fields are intended to be accessed under this
policy.

## Pee-Chart Game

This repository includes everything needed to run the community pee-chart on Reddit. The feature counts how many trips start in each city and shows the totals in a custom Devvit post.

1. **Supabase migration** – creates `city_visits` table and an `increment_city_visit` function.
2. **Edge function** – `log_visit` increments the count whenever a trip is created.
3. **Reddit bot** – located under `devvit/pee-chart-game` and renders a live bar chart post.

### Deploying the Devvit app

```bash
# log in once
npx devvit login
# push to /r/trippit (or another subreddit)
cd devvit/pee-chart-game && npx devvit deploy --subreddit trippit
```

Moderators can then choose **Create / Update Pee Chart** from the subreddit menu to post the chart. A scheduler refreshes the post every five minutes using the latest Supabase counts.