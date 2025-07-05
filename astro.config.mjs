import { defineConfig } from 'astro/config';
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  // This is the crucial line that enables Server-Side Rendering (SSR).
  // It tells Astro to be a live application, not a pre-built static site.
  output: "server",

  // This adapter configures your app to run perfectly on Vercel's platform.
  adapter: vercel()
});