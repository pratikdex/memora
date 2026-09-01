# 🧠 Memora — AI-Powered Reminder & Notes App

> Revolutionize how you capture reminders and notes. Memora uses AI to ask intelligent follow-up questions, generate rich summaries, auto-categorize content, and make your reminders actually useful.

## ✨ Features

- **🤖 AI-Powered Questioning** — Type "Doctor appointment" and Memora asks: *"Which doctor? Anything to bring? Want a pre-reminder?"*
- **📝 Smart Summaries** — AI synthesizes your input + answers into rich, actionable descriptions
- **🏷️ Auto-Categorization** — Automatically categorizes reminders/notes and suggests tags
- **📋 Note Enhancement** — Extracts key points and generates structured summaries from raw notes
- **🔄 Multi-Provider AI** — Swap between OpenAI, Anthropic (Claude), or Google Gemini via config
- **🔐 JWT Authentication** — Secure multi-user support
- **📊 Full REST API** — Complete CRUD for reminders, notes, tags, and AI conversations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 22+ |
| Language | TypeScript 5.x |
| Framework | Express.js |
| Database | PostgreSQL 16 |
| ORM | Prisma 6 |
| Validation | Zod |
| Auth | JWT + bcrypt |
| AI | OpenAI / Anthropic / Google Gemini |
| Logging | Winston |

## 🚀 Quick Start

### Prerequisites

- Node.js 22+
- Docker (for PostgreSQL) or a PostgreSQL instance
- An API key for at least one AI provider

### 1. Clone & Install

```bash
cd memora
npm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

### 3. Configure Environment

```bash
cp .env.example .env
# Edit .env and add your AI provider API key
```

### 4. Run Database Migrations

```bash
npm run db:migrate
```

### 5. Seed Sample Data (Optional)

```bash
npm run db:seed
```

### 6. Start Development Server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## 📡 API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register a new user |
| `POST` | `/api/auth/login` | Login and receive JWT |
| `GET` | `/api/auth/me` | Get current user profile |

### Reminders

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/reminders` | Create a reminder |
| `GET` | `/api/reminders` | List reminders (with filters) |
| `GET` | `/api/reminders/:id` | Get reminder details |
| `PATCH` | `/api/reminders/:id` | Update a reminder |
| `DELETE` | `/api/reminders/:id` | Delete a reminder |
| `POST` | `/api/reminders/:id/complete` | Mark as completed |
| `POST` | `/api/reminders/:id/snooze` | Snooze a reminder |

**Query Parameters for listing:**
- `status` — Filter by status (PENDING, COMPLETED, SNOOZED, CANCELLED)
- `priority` — Filter by priority (LOW, MEDIUM, HIGH, URGENT)
- `category` — Filter by category
- `search` — Full-text search across title, input, and summary
- `page`, `limit` — Pagination
- `sortBy`, `sortOrder` — Sorting

### Notes

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/notes` | Create a note |
| `GET` | `/api/notes` | List notes (with filters) |
| `GET` | `/api/notes/:id` | Get note details |
| `PATCH` | `/api/notes/:id` | Update a note |
| `DELETE` | `/api/notes/:id` | Delete a note |

### AI

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/ai/ask` | Get AI follow-up questions |
| `POST` | `/api/ai/answer` | Submit answers, optionally get summary |
| `POST` | `/api/ai/summarize` | Generate summary from conversation |
| `POST` | `/api/ai/categorize` | Auto-categorize input |
| `POST` | `/api/ai/enhance-note` | Enhance a note with AI |
| `GET` | `/api/ai/conversation/:id` | Get conversation history |

---

## 🧪 Example: AI-Powered Reminder Flow

### Step 1: Create a reminder

```bash
curl -X POST http://localhost:3000/api/reminders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Doctor appointment",
    "rawInput": "Doctor appointment next Tuesday",
    "remindAt": "2025-01-14T10:00:00Z"
  }'
```

### Step 2: Ask AI for follow-up questions

```bash
curl -X POST http://localhost:3000/api/ai/ask \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Doctor appointment next Tuesday",
    "type": "reminder",
    "reminderId": "REMINDER_ID"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [
      "Which doctor or specialist is the appointment with?",
      "What's the clinic/hospital name and address?",
      "Do you need to bring any documents (insurance card, reports)?",
      "Is there any preparation needed (fasting, paperwork)?",
      "Would you like a pre-appointment reminder?"
    ],
    "type": "reminder"
  }
}
```

### Step 3: Answer questions & generate summary

```bash
curl -X POST http://localhost:3000/api/ai/answer \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reminderId": "REMINDER_ID",
    "answers": [
      {"question": "Which doctor?", "answer": "Dr. Smith, dentist"},
      {"question": "Clinic name?", "answer": "Bright Smile Dental"},
      {"question": "Documents?", "answer": "Insurance card and last X-ray"}
    ],
    "generateSummary": true
  }'
```

**The AI generates a rich summary like:**

> 🏥 **Annual Dentist Checkup — Dr. Smith**
>
> Scheduled cleaning at Bright Smile Dental Clinic.
>
> **Preparation:**
> - Bring insurance card
> - Bring previous X-ray reports
>
> **Pre-reminder:** Set for 1 hour before appointment.

---

## 🔧 Configuration

### AI Provider

Set `AI_PROVIDER` in `.env` to switch providers:

```env
AI_PROVIDER=openai      # Uses OpenAI (GPT-4o-mini)
AI_PROVIDER=anthropic   # Uses Anthropic (Claude)
AI_PROVIDER=gemini      # Uses Google Gemini
```

Each provider requires its own API key:

```env
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=AI...
```

---

## 📁 Project Structure

```
memora/
├── src/
│   ├── config/          # Environment, database, AI config
│   ├── features/
│   │   ├── auth/        # Authentication (register, login, JWT)
│   │   ├── reminders/   # Reminders CRUD
│   │   ├── notes/       # Notes CRUD
│   │   └── ai/          # AI service & providers
│   │       └── providers/  # OpenAI, Anthropic, Gemini
│   ├── middleware/       # Auth, error, validation, logging
│   ├── utils/           # Logger, error classes, async handler
│   ├── app.ts           # Express app assembly
│   └── server.ts        # Entry point
├── prisma/
│   ├── schema.prisma    # Database schema
│   └── seed.ts          # Sample data
├── docker-compose.yml   # PostgreSQL container
└── package.json
```

---

## 📜 License

MIT
