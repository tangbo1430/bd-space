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

/**
 * 招聘职位（PRD v0.4 FR-29~31 / BR-26）。
 * 职位须由 HR 确认后发布；占位职位显式 placeholder:true。
 */
const jobs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/jobs' }),
  schema: z.object({
    title: z.string(),
    department: z.string(),
    location: z.string(),
    type: z.string(),
    summary: z.string().default(''),
    responsibilities: z.array(z.string()).default([]),
    requirements: z.array(z.string()).default([]),
    placeholder: z.boolean().default(false),
    published: z.boolean().default(true),
    order: z.number().int().default(0),
  }),
});

export const collections = { products, jobs };
