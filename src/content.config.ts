import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

/**
 * 内容管理（内容模型见 docs/technical-design.md §3）。
 * 产品条目由 Markdown frontmatter 维护；published=false 的草稿不进入列表与详情路由。
 * 事实字段一律允许「【待提供】」占位，禁止虚构（BR-5/BR-15）。
 */
const products = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/products' }),
  schema: z.object({
    name: z.string(),
    enTag: z.string(),
    order: z.number().int(),
    tagline: z.string(),
    description: z.string(),
    scenes: z.array(z.string()).default([]),
    params: z.array(z.object({ label: z.string(), value: z.string() })).default([]),
    listImageId: z.string(),
    detailImageId: z.string(),
    published: z.boolean().default(true),
  }),
});

export const collections = { products };
