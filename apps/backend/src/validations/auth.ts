import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-z0-9_]+$/, 'Username must be lowercase alphanumeric or underscore'),
  displayName: z.string().min(1, 'Display name is required').max(50),
  email: z.string().email('Invalid email format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100)
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-z0-9_]+$/, 'Username must be lowercase alphanumeric or underscore');

const avatarUrlSchema = z
  .string()
  .trim()
  .max(500, 'Avatar URL is too long')
  .refine(
    (value) => value === '' || /^https?:\/\/\S+$/i.test(value),
    'Avatar URL must start with http:// or https://',
  );

export const updateProfileSchema = z
  .object({
    displayName: z.string().trim().min(1, 'Display name is required').max(50).optional(),
    username: usernameSchema.optional(),
    bio: z.string().trim().max(500, 'Bio must be at most 500 characters').optional(),
    avatarUrl: avatarUrlSchema.optional(),
  })
  .strict()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(100).optional(),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100)
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
  })
  .strict();

export const deleteAccountSchema = z
  .object({
    username: z.string().trim().min(1, 'Username confirmation is required'),
  })
  .strict();

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

// Optional: the token normally travels in the httpOnly cookie
// (see utils/refreshCookie.ts). The body is the legacy fallback.
export const refreshSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1).optional(),
});
