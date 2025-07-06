// This file defines the shape of our Product data.

export interface Product {
  id: number;
  created_at: string;
  title: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  image: string | null;
  // We explicitly type 'images' as an array of strings.
  images: string[] | null; 
}