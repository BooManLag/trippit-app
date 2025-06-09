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