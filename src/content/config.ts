import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
    type: 'content',
    schema: z.object({
        title: z.string(),
        date: z.coerce.date(),
        author: z.string().default('dronelabadmin'),
        category: z.string().default('Uncategorized'),
        featuredImage: z.string(),
        featuredImageAlt: z.string().default(''),
        excerpt: z.string().optional(),
    }),
});

export const collections = { blog };
