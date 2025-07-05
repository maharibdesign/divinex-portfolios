import { z, defineCollection } from 'astro:content';

const productCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(), description: z.string(),
    category: z.enum(['Watches', 'Laptops', 'Phones', 'Accessories']),
    price: z.number(), image: z.string(), images: z.array(z.string()),
    isDraft: z.boolean().default(false),
  }),
});

export const collections = { products: productCollection };