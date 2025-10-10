# Divinex Mini-App

Divinex   is a high-performance product catalog built with Astro, designed to function as a standalone website and a seamless Telegram Mini App. It features a dynamic backend powered by Supabase for product management and is deployed on Vercel.

Live Application: [https://storeka-app.vercel.app](https://storeka-app.vercel.app)

---

## Core Features

- Dynamic Product Catalog: Products are fetched in real-time from a Postgres database managed by Supabase.
- Interactive Filtering: Includes client-side search and category filtering for instant results.
- Full Admin Panel: A secure  route allows for complete CRUD (Create, Read, Update, Delete) management of products.
- Direct Image Uploads: The admin panel supports direct file uploads to Supabase Storage, removing the need for manual URL entry.
- Telegram Mini App Ready: Integrates with Telegram's Web App API for native theme adaptation and back-button functionality.

## Tech Stack

- Framework: Astro (SSR Mode)
- Database: Supabase (Postgres)
- File Storage: Supabase Storage
- Deployment: Vercel
- Languages: TypeScript, HTML, CSS

---

## Local Development Setup

### Prerequisites

- Node.js (v18 or higher)
- A Supabase account (free tier)

### 1. Clone Repository

```bash
git clone https://github.com/YourUsername/storeka-app.git
cd storeka-app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a file named  in the project root by copying the example:

```bash
cp .env.example .env
```

Then, fill in the required values in your new  file:

```
# Get from your Supabase Project -> Settings -> API
SUPABASE_URL="YOUR_SUPABASE_PROJECT_URL"
SUPABASE_SERVICE_KEY="YOUR_SUPABASE_SERVICE_ROLE_SECRET_KEY"

# Your numeric Telegram ID (get from @userinfobot on Telegram)
ADMIN_TELEGRAM_ID="YOUR_TELEGRAM_ID"

# The contact link for the "Order" button
PUBLIC_TELEGRAM_CONTACT_LINK="https://t.me/YourTelegramUsername"
```

### 4. Set Up Supabase Database & Storage

- Database: In your Supabase project's Table Editor, create a  table with a schema that matches the application's needs (id, title, description, category, price, image, images).
- Storage: In your Supabase project's Storage section, create a new public bucket named .

### 5. Run the Dev Server

```bash
npm run dev
```

The app will be available at .

---

## Deployment

This project is optimized for deployment on Vercel.

1.  Push your code to a GitHub repository.
2.  Import the repository into Vercel.
3.  In the Vercel project settings, configure the same environment variables as listed in the  section above.
4.  Deploy. Vercel automatically handles the build process. Subsequent pushes to the  branch will trigger automatic redeployments.
