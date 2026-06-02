import { z } from "zod";

export const partSchema = z.object({
  code: z.string().min(1, "编码不能为空"),
  name: z.string().min(1, "名称不能为空"),
  category: z.string().default(""),
  package: z.string().default(""),
  brand: z.string().default(""),
  model: z.string().default(""),
  unit: z.string().default("pcs"),
  minStock: z.coerce.number().int().min(0).default(0),
  location: z.string().default(""),
  note: z.string().default(""),
  image: z.string().default(""),
});

export const movementSchema = z.object({
  partId: z.string().min(1),
  type: z.enum(["IN", "OUT", "ADJUST"]),
  quantity: z.coerce.number().int().min(1, "数量必须大于0"),
  operator: z.string().default(""),
  reason: z.string().default(""),
  code: z.string().default(""),
});

export const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  package: z.string().optional(),
  location: z.string().optional(),
  brand: z.string().optional(),
  stockMin: z.coerce.number().int().min(0).optional(),
  stockMax: z.coerce.number().int().min(0).optional(),
  hasStock: z.coerce.boolean().optional(),
  lowStock: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type SearchParams = z.infer<typeof searchSchema>;
