// This file defines the explicit shape of our Product data.
// It acknowledges that some fields from the database might be null.

export interface Product {
  id: number;
  created_at: string;
  title: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  image: string | null;
  // We explicitly type 'images' as an array of strings that could also be null.
  images: string[] | null; 
}