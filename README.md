# Trippit Travel App - Bolt Hackathon

Trippit is a lightweight web app built during the Bolt Hackathon to make planning your first big trip less stressful and a lot more fun. It combines a simple itinerary builder with bite-sized challenges and crowdsourced tips so you can travel smarter and enjoy the adventure.

## Features

- **Trip creation** - Add destinations and travel dates to keep everything organized in one place.
- **Reddit-powered tips** - Pulls real advice from Reddit so you can learn from experienced travelers.
- **Dare-style bucket list** - A playful checklist that encourages you to try new things on your journey.
- **Packing helper** - Create categories and items to ensure you never forget the essentials.
- **Travel scenario game** - A short "Where'd I Go?" game that helps you practice what to do when things go wrong.

Behind the scenes Trippit is built with React, TypeScript, Tailwind CSS and Supabase for database storage and serverless functions.

## How we built it

We built Trippit using a modern tech stack focused on developer experience and performance:

1. **Frontend**: React with TypeScript for type safety, Vite for fast development, and Tailwind CSS for styling
2. **Backend**: Supabase for authentication, database, and serverless edge functions
3. **API Integration**: Reddit API for sourcing real travel tips from experienced travelers
4. **AI Integration**: Google's Gemini API for generating personalized travel itineraries
5. **Deployment**: Netlify for hosting with continuous deployment

The application follows a component-based architecture with custom hooks for state management. We implemented real-time features using Supabase's subscription capabilities, allowing for collaborative trip planning.

## Challenges we ran into

1. **Reddit API Integration**: Working with Reddit's API was challenging due to rate limits and authentication complexities. We had to implement sophisticated caching and fallback mechanisms.

2. **Edge Function Limitations**: Supabase edge functions have specific constraints that required careful architecture decisions, especially for the AI-powered itinerary generation.

3. **Trip Sharing Logic**: Implementing the invitation system with proper security was complex, requiring careful database design and RLS policies to prevent data leakage.

4. **Badge System**: Creating a flexible achievement system that tracks progress across different activities required intricate database relationships and triggers.

5. **Mobile Responsiveness**: Ensuring the pixel-art style UI worked well across all device sizes required extensive CSS tweaking and responsive design patterns.

## Accomplishments that we're proud of

1. **Seamless Reddit Integration**: Successfully pulling relevant travel tips from Reddit and presenting them in a user-friendly way.

2. **Engaging Game Mechanics**: Creating a fun "Where'd I Go?" scenario game that actually teaches practical travel skills.

3. **Collaborative Features**: Implementing a robust invitation system that allows friends to plan trips together.

4. **Pixel-Perfect Design**: Achieving a cohesive pixel-art aesthetic throughout the application while maintaining usability.

5. **Performance Optimization**: Building a responsive application that loads quickly even with complex data relationships.

## What we learned

1. **Edge Function Architecture**: We gained expertise in designing serverless functions that work within platform constraints.

2. **Supabase RLS Policies**: We learned how to implement complex row-level security policies for multi-user data access.

3. **React Performance Optimization**: We improved our skills in component memoization and state management for smoother UX.

4. **API Integration Patterns**: We developed better strategies for working with external APIs, including caching and fallback mechanisms.

5. **Collaborative Development**: We enhanced our workflow for parallel development on shared components and features.

## What's next for Trippit

1. **Mobile App**: Develop native mobile applications for iOS and Android to provide offline access to trip information.

2. **AI Trip Recommendations**: Expand AI capabilities to suggest destinations based on user preferences and budget.

3. **Social Features**: Add the ability to share completed trips and itineraries with the community.

4. **Integration with Travel Services**: Connect with booking APIs to allow users to book flights, accommodations, and activities directly.

5. **Expanded Game Scenarios**: Add more location-specific scenarios to the "Where'd I Go?" game for a richer learning experience.

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