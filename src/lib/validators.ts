import { z } from "zod";
import {
  CURRENCIES,
  EXPENSE_CATEGORIES,
  EXPENSE_TYPES,
  FREQUENCIES,
  INCOME_SOURCES,
  PAYMENT_METHODS,
  SECURITY_QUESTIONS,
  SPLIT_TYPES,
} from "./constants";

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

export const expenseSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number" }),
  category: z.enum(EXPENSE_CATEGORIES),
  date: z.coerce.date().refine((d) => d <= new Date(Date.now() + 5 * 60 * 1000), {
    message: "Expense date cannot be in the future",
  }),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(500).optional().nullable(),
  type: z.enum(EXPENSE_TYPES),
});

export const incomeSchema = z.object({
  amount: z.coerce.number().positive({ message: "Amount must be a positive number" }),
  source: z.enum(INCOME_SOURCES),
  date: z.coerce.date().refine((d) => d <= new Date(Date.now() + 5 * 60 * 1000), {
    message: "Income date cannot be in the future",
  }),
  notes: z.string().max(500).optional().nullable(),
});

export const recurringSchema = z.object({
  amount: z.coerce.number().positive(),
  category: z.enum(EXPENSE_CATEGORIES),
  frequency: z.enum(FREQUENCIES),
  nextDueDate: z.coerce.date(),
  paymentMethod: z.enum(PAYMENT_METHODS),
  notes: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional(),
});

export const savingSchema = z.object({
  amount: z.coerce.number(),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
  notes: z.string().max(500).optional().nullable(),
});

export const savingsGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.coerce.number().positive(),
  currentAmount: z.coerce.number().min(0).optional(),
  deadline: z.coerce.date().optional().nullable(),
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
  splits: z
    .array(
      z.object({
        userId: z.string().uuid(),
        amount: z.coerce.number().min(0),
        percentage: z.coerce.number().min(0).optional(),
      }),
    )
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
  profilePhoto: z.string().optional().nullable(),
});

export const addMemberByIdSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
});
