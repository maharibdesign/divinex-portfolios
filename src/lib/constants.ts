// This now reads the contact link from a public environment variable.
// It includes a fallback link for local development.
export const TELEGRAM_CONTACT_LINK = 
  import.meta.env.PUBLIC_TELEGRAM_CONTACT_LINK || 'https://t.me/telegram';