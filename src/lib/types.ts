export interface Product {
  id: number;
  created_at: string;
  title: string | null;
  description: string | null;
  category: string | null;
  price: number | null;
  image: string | null;
  images: string[] | null; 
}