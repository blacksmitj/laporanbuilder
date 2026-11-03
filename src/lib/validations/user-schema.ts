import { z } from "zod";

export const userRoleSchema = z.enum(["admin", "operator"]);

export const createUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter"),
  email: z.string().trim().email("Format email tidak valid"),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(128, "Kata sandi maksimal 128 karakter"),
  role: userRoleSchema,
});

export const updateUserSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Nama minimal 2 karakter")
    .max(120, "Nama maksimal 120 karakter")
    .optional(),
  role: userRoleSchema.optional(),
  banned: z.boolean().optional(),
  password: z
    .string()
    .min(8, "Kata sandi minimal 8 karakter")
    .max(128, "Kata sandi maksimal 128 karakter")
    .optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
