---
name: spendclan-design
description: |
  High-Level and Low-Level Design (HLD & LLD) specifications for the SpendClan project.
  Includes database models, balance and debt simplification algorithms, Next.js revalidation caching, and AI advisor prompts.
---

# High-Level & Low-Level Design Specifications (Spec-Driven Dev Resource)

This specification defines the production-level system design of **SpendClan**, a responsive personal finance manager and shared pocket split settlement app. It serves as the definitive reference document for Spec-Driven Development (SDD), leaving no API contract, database constraint, or algorithmic invariant undefined.

---

## 1. High-Level Design (HLD)

### 1.1 Architecture Tier Design
SpendClan uses a 3-tier Serverless-first architecture optimized for the Vercel edge/serverless runtime, Next.js App Router (React Server Components), PostgreSQL database engines, and Google Gemini API.

```
┌────────────────────────────────────────────────────────┐
│                      Client Tier                       │
│  - React 19 Client components, Tailwind CSS 4          │
│  - HSL-driven glassmorphism custom variables           │
│  - Mobile Bottom Tab Bar & responsive top navigations  │
└───────────────────────────┬────────────────────────────┘
                            │ HTTPS (Restful APIs / JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│                    Application Tier                    │
│  - Next.js App Router API Route Handlers (Node.js)     │
│  - Zod validation engine for input sanitation          │
│  - NextAuth.js JWT credential-based session guards     │
└───────────────────────────┬────────────────────────────┘
                            ├────────────────────────────┐
                            │ TCP Connection Pool        │ HTTPS
                            ▼                            ▼
┌────────────────────────────────────────────────────────┐ ┌────────────────────────┐
│                       Data Tier                        │ │     AI Inference       │
│  - PostgreSQL 16 Relational Engine                     │ │  - Google Gemini 3.5   │
│  - Prisma ORM Query Builder                            │ │    Flash API Client    │
└────────────────────────────────────────────────────────┘ └────────────────────────┘
```

---

### 1.2 Core Data Flows

#### 1.2.1 Group Expense Splitting & Cache Invalidation Pipeline
Updates to group transactions immediately trigger an invalidation pipeline to keep users' cached dashboard views up to date:

```
[Group Member Adds Expense]
           │
           ▼
[API: /api/groups/:id/expenses] ──(Validates splits/amounts)
           │
           ▼
[DB: PostgreSQL Transaction] ──(Inserts GroupExpense & GroupSplits in one atomic step)
           │
           ▼
[Cache Invalidation Engine] ──(Queries all group member IDs from DB)
           │
           ▼
[Next.js Tag Cache Invalidator] ──(Calls revalidateTag("dashboard-{memberId}") for each member)
           │
           ▼
[Client Refetch] ──(Subsequent page visits load fresh, up-to-date data)
```

#### 1.2.2 AI Advisor Context Compilation Flow
Ensures the LLM receives structured, deterministic contextual financial snapshots:

```
[User visits /advisor]
           │
           ▼
[API: /api/ai/insights]
           │
           ▼
[Auth Verification] ──(Checks session JWT for userId)
           │
           ▼
[DB Aggregation Pipeline] ──(Gathers personal logs, recurring lists, and group balances)
           │
           ▼
[Prompt Assembler] ──(Formats system context and enforces JSON schema output)
           │
           ▼
[Gemini Client Handler] ──(Sends payload to Google AI API with exponential backoff on 429 errors)
           │
           ▼
[Cache Store & Return] ──(Saves response to local cache key and returns JSON payload to client)
```

---

## 2. Low-Level Design (LLD)

### 2.1 Database & DDL Schemas (Prisma Specifications)

The following schema maps direct PostgreSQL data-store layouts, including cascade delete behaviors and critical indexing requirements.

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum Role {
  USER
  ADMIN
}

enum Currency {
  INR
  USD
  EUR
  GBP
}

enum PaymentMethod {
  CASH
  UPI
  CARD
}

enum ExpenseType {
  DAILY
  MONTHLY
  LARGE
}

enum IncomeSource {
  Salary
  Freelance
  Business
  Other
}

enum Frequency {
  DAILY
  WEEKLY
  MONTHLY
}

enum GroupRole {
  ADMIN
  MEMBER
}

enum SplitType {
  EQUAL
  PERCENTAGE
  CUSTOM
}

model User {
  id                      String               @id @default(uuid())
  name                    String
  email                   String               @unique
  mobileNumber            String               @unique
  hashedPassword          String
  currency                Currency             @default(INR)
  role                    Role                 @default(USER)
  securityQuestion        String?
  securityAnswer          String?
  lastActive              DateTime?
  emailVerified           Boolean              @default(false)
  mobileVerified          Boolean              @default(false)
  verificationToken       String?
  verificationTokenExpires DateTime?
  profilePhoto            String?
  verificationAttempts    Int                  @default(0)
  lastVerificationSentAt  DateTime?
  passwordResetAttempts   Int                  @default(0)
  lastPasswordResetSentAt DateTime?
  failedAttempts          Int                  @default(0)
  createdAt               DateTime             @default(now())
  updatedAt               DateTime             @updatedAt

  personalExpenses        PersonalExpense[]
  incomes                 Income[]
  savings                 Saving[]
  savingsGoals            SavingsGoal[]
  recurringExpenses       RecurringExpense[]
  groupMembers            GroupMember[]
  paidExpenses            GroupExpense[]       @relation("PaidBy")
  groupSplits             GroupSplit[]
  settlementsFrom         Settlement[]         @relation("SettlementFrom")
  settlementsTo           Settlement[]         @relation("SettlementTo")
  passwordResetTokens     PasswordResetToken[]
}

model PersonalExpense {
  id            String        @id @default(uuid())
  amount        Float
  category      String
  date          DateTime
  paymentMethod PaymentMethod
  notes         String?
  type          ExpenseType
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
  @@index([userId, date])
  @@index([userId, category])
}

model Income {
  id        String       @id @default(uuid())
  amount    Float
  source    IncomeSource
  date      DateTime
  notes     String?
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  @@index([userId])
  @@index([userId, date])
}

model Saving {
  id        String   @id @default(uuid())
  amount    Float
  month     Int
  year      Int
  notes     String?
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, month, year])
}

model SavingsGoal {
  id            String    @id @default(uuid())
  name          String
  targetAmount  Float
  currentAmount Float     @default(0)
  deadline      DateTime?
  userId        String
  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model RecurringExpense {
  id            String        @id @default(uuid())
  amount        Float
  category      String
  frequency     Frequency
  nextDueDate   DateTime
  paymentMethod PaymentMethod
  notes         String?
  isActive      Boolean       @default(true)
  userId        String
  user          User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt     DateTime      @default(now())
  updatedAt     DateTime      @updatedAt

  @@index([userId])
}

model Group {
  id          String         @id @default(uuid())
  name        String
  description String?
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  members     GroupMember[]
  expenses    GroupExpense[]
  settlements Settlement[]
  invitations GroupInvitation[]
}

model GroupMember {
  id       String    @id @default(uuid())
  role     GroupRole @default(MEMBER)
  userId   String
  groupId  String
  joinedAt DateTime  @default(now())
  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  group    Group     @relation(fields: [groupId], references: [id], onDelete: Cascade)

  @@unique([userId, groupId])
  @@index([groupId])
}

model GroupExpense {
  id          String       @id @default(uuid())
  amount      Float
  description String
  date        DateTime
  splitType   SplitType
  paidById    String
  groupId     String
  paidBy      User         @relation("PaidBy", fields: [paidById], references: [id])
  group       Group        @relation(fields: [groupId], references: [id], onDelete: Cascade)
  splits      GroupSplit[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@index([groupId])
  @@index([paidById])
}

model GroupSplit {
  id             String       @id @default(uuid())
  amount         Float
  groupExpenseId String
  userId         String
  groupExpense   GroupExpense @relation(fields: [groupExpenseId], references: [id], onDelete: Cascade)
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([groupExpenseId])
  @@index([userId])
}

model Settlement {
  id        String   @id @default(uuid())
  amount    Float
  fromId    String
  toId      String
  groupId   String
  from      User     @relation("SettlementFrom", fields: [fromId], references: [id])
  to        User     @relation("SettlementTo", fields: [toId], references: [id])
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@index([groupId])
  @@index([fromId])
  @@index([toId])
}

model PasswordResetToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([token])
}

model GroupInvitation {
  id        String   @id @default(uuid())
  email     String
  groupId   String
  invitedBy String
  group     Group    @relation(fields: [groupId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([email, groupId])
  @@index([email])
  @@index([groupId])
}
```

---

### 2.2 API Contract Specifications

Every endpoint validates payload inputs against strict schemas using Zod. Request/Response structures are defined as follows:

#### 2.2.1 Auth Service Contracts
- **`POST /api/auth/register`**
  - **Description**: Registers a new credentials-based user.
  - **Request Body**:
    ```typescript
    {
      name: string;             // Length: 2 to 100
      email: string;            // Validated email shape
      mobileNumber: string;     // Length: 8 to 20
      password: string;         // Length: 8 to 100
      currency: "INR" | "USD" | "EUR" | "GBP";
      securityQuestion: string; // One of 8 predefined questions
      securityAnswer: string;   // Hashed and stored
    }
    ```
  - **Responses**:
    - `200 OK`: `{ message: "User registered successfully", userId: string }`
    - `400 Bad Request`: Validation errors or email/mobile already in use.

- **`POST /api/auth/forgot-password`**
  - **Description**: Requests a token-based reset link (SMTP-driven).
  - **Request Body**: `{ email: string }`
  - **Responses**:
    - `200 OK`: `{ message: "If matching account exists, a reset link has been sent" }`

- **`POST /api/auth/reset-password`**
  - **Description**: Resets password using an active token.
  - **Request Body**: `{ token: string, password: string }`
  - **Responses**:
    - `200 OK`: `{ message: "Password updated successfully" }`
    - `400 Bad Request`: Token expired or already deleted.

- **`GET /api/auth/reset-password-qa`**
  - **Description**: Checks for user's question.
  - **Query Params**: `?email=user@domain.com`
  - **Responses**:
    - `200 OK`: `{ question: string }`
    - `404 Not Found`: User not found.

- **`POST /api/auth/reset-password-qa`**
  - **Description**: Resets password using Security Answer.
  - **Request Body**: `{ email: string, answer: string, password?: string }`
  - **Responses**:
    - `200 OK`: `{ correct: true, message?: string }` (if password omitted, validates answer; if password provided, updates database).
    - `401 Unauthorized`: Incorrect security answer.

#### 2.2.2 Personal Finance Suite Contracts
- **`GET /api/personal/expenses`**
  - **Query Params**: `?month=number&year=number&category=string&type=DAILY|LARGE`
  - **Responses**: `200 OK`: `{ expenses: PersonalExpense[] }`

- **`POST /api/personal/expenses`**
  - **Request Body**: `{ amount: number, category: string, date: Date, paymentMethod: string, type: "DAILY"|"LARGE", notes?: string }`
  - **Responses**: `200 OK`: `{ expense: PersonalExpense }`

- **`GET /api/personal/savings/calculate`**
  - **Query Params**: `?month=number&year=number`
  - **Responses**:
    - `200 OK`: `{ calculatedSaving: number, manualSaving: number | null, incomesTotal: number, expensesTotal: number }`

#### 2.2.3 Shared Group Splitting (Pockets) Contracts
- **`POST /api/groups`**
  - **Request Body**: `{ name: string, description?: string, memberEmails?: string }` (comma-separated existing user emails).
  - **Responses**: `200 OK`: `{ group: Group }`

- **`POST /api/groups/[id]/expenses`**
  - **Request Body**:
    ```typescript
    {
      amount: number;
      description: string;
      date: Date;
      splitType: "EQUAL" | "PERCENTAGE" | "CUSTOM";
      paidById: string; // UUID
      splits?: Array<{ userId: string, amount: number, percentage?: number }>;
    }
    ```
  - **Responses**: `200 OK`: `{ expense: GroupExpense }`

- **`POST /api/groups/[id]/settle`**
  - **Request Body**: `{ amount: number, toId: string }`
  - **Responses**: `200 OK`: `{ settlement: Settlement }`

---

### 2.3 Mathematical System Invariants & Algorithms

#### 2.3.1 Debt Simplification Invariant
SpendClan groups leverage a greedy matching logic on net balances to settle transactions. Net balances sum to zero across the group ($\sum b_i = 0$).
Let:
- $C = \{b_i \mid b_i > 0\}$ sorted descending (Creditors)
- $D = \{-b_j \mid b_j < 0\}$ sorted descending (Debtors)
At each step, transaction value is:
$$T_{k} = \min(D_{0}, C_{0})$$
A settlement link is drawn from Debtor to Creditor with value $T_{k}$. This matching loop reduces individual transaction nodes down to at most $N-1$ paths.

#### 2.3.2 Exact Cents Equal Splits Invariant
To prevent fractional dollar loss (such as $\$10.00 / 3 = 3.3333...$), splits are calculated using floor mathematics in cent values.
Let:
- $T$ = total amount, $N$ = total split members.
- Base share: $S_{base} = \lfloor \frac{T}{N} \times 100 \rfloor / 100$
- Rounding offset remainder: $R = T - (S_{base} \times N)$
The first element in the split set is allocated the remainder:
$$S_0 = S_{base} + R$$
$$S_i = S_{base} \quad (\forall i > 0)$$

#### 2.3.3 Next.js Cache Tag Dictionary
- `dashboard-${userId}`: Invalidated upon logs edits, goal changes, or when group transactions occur.
- `group-detail-${groupId}`: Cache key representing overall balances inside a pocket.

---

### 2.4 Data Security & Session Isolation Invariants
1. **Row-Level Query Injection Isolation**: Every server-side Prisma lookup enforces direct session boundaries, mapping:
   `where: { userId: session.user.id }`
2. **Strict Membership Validation**: Group endpoints verify that the current user exists in `GroupMember` for the requested `groupId` before querying transactional split trees.
3. **Password Security**: Credentials passwords are hashed using `bcryptjs` with a cost factor of 12. Security answers are normalized (lowercased/trimmed) and compared after hashing to prevent timing attacks.
4. **Token Life Cycle**: Reset tokens are deleted atomically using `basePrisma.$transaction` during retrieval to block concurrent replay submissions.
