// src/content.config.ts

import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const blogCollection = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    pubDate: z.coerce.date(),
    category: z.string(),
    image: z.string(),
    image_caption: z.string().optional(),
    author: z.string().default('Author Name'),
    authorSlug: z.string().optional(),
    tags: z.array(z.string()).optional(),
    ai_summary: z.string().optional(),
  }),
});

export const collections = {
  'blog': blogCollection,
};