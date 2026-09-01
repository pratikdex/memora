import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { httpLogger } from './middleware/logger.middleware';
import { errorMiddleware } from './middleware/error.middleware';

// Feature routes
import authRoutes from './features/auth/auth.routes';
import remindersRoutes from './features/reminders/reminders.routes';
import notesRoutes from './features/notes/notes.routes';
import aiRoutes from './features/ai/ai.routes';


const app = express();

// ─── Global Middleware ───────────────────────────────────────────────────────

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:"],
        connectSrc: ["'self'"],
      },
    },
  })
);
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(httpLogger);

// ─── Static Files (Frontend UI) ─────────────────────────────────────────────

app.use(express.static(path.join(__dirname, '..', 'public')));

// ─── Health Check ────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'memora',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ─── API Routes ──────────────────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/reminders', remindersRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/ai', aiRoutes);

// ─── SPA Fallback — serve index.html for non-API routes ─────────────────────

app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── API 404 Handler (for unmatched /api/* routes) ───────────────────────────
// Note: this is now handled implicitly — non-API GETs hit the SPA fallback,
// and POST/PATCH/DELETE to unknown routes will hit Express's default handler.

// ─── Global Error Handler ────────────────────────────────────────────────────

app.use(errorMiddleware);

export default app;
