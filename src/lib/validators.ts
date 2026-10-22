import { z } from "zod";
import { CURRENCIES, SECURITY_QUESTIONS, SPLIT_TYPES } from "./constants";

export const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  mobileNumber: z.string().min(8).max(20),
  password: z.string().min(8).max(100),
  currency: z.enum(CURRENCIES),
  securityQuestion: z.enum(SECURITY_QUESTIONS),
  securityAnswer: z.string().min(2).max(200),
});

export const loginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().min(1),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
});

export const resetPasswordQaSchema = z.object({
  email: z.string().min(1),
  answer: z.string().min(1).optional(),
  password: z.string().min(8).max(100).optional(),
});

export const groupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  memberEmails: z.string().optional(),
  members: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        email: z.string().email().optional(),
      })
    )
    .optional(),
});

export const groupExpenseSchema = z.object({
  amount: z.coerce.number().positive(),
  description: z.string().min(1).max(200),
  date: z.coerce.date(),
  splitType: z.enum(SPLIT_TYPES),
  paidById: z.string().uuid(),
  // EQUAL only: who shares the expense. Defaults to every active member.
  participantIds: z.array(z.string().uuid()).min(1).max(100).optional(),
  // PERCENTAGE / CUSTOM: one entry per person involved (a subset of members is allowed)
  splits: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amount: z.coerce.number().min(0),
        percentage: z.coerce.number().min(0).optional(),
      }),
    )
    .max(100)
    .optional(),
});

export const settlementSchema = z.object({
  amount: z.coerce.number().positive(),
  toId: z.string().uuid(),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
});

export const userSearchSchema = z.object({
  q: z.string().min(2),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  mobileNumber: z.string().min(8).max(20).optional().nullable(),
  currency: z.enum(CURRENCIES).optional(),
  securityQuestion: z.enum(SECURITY_QUESTIONS).optional().nullable(),
  securityAnswer: z.string().min(2).max(200).optional().nullable(),
  password: z.string().min(8).max(100).optional().nullable(),
  profilePhoto: z.string().optional().nullable(),
});

export const addMemberByIdSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
});
