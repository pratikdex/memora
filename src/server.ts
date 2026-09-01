import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './config/database';

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error('❌ Failed to connect to database:', error);
    process.exit(1);
  }

  // Start server
  const server = app.listen(env.PORT, () => {
    logger.info(`
╔══════════════════════════════════════════╗
║                                          ║
║   🧠 Memora API Server                   ║
║                                          ║
║   Environment: ${env.NODE_ENV.padEnd(24)}║
║   Port:        ${String(env.PORT).padEnd(24)}║
║   AI Provider: ${env.AI_PROVIDER.padEnd(24)}║
║                                          ║
║   Health: http://localhost:${String(env.PORT).padEnd(13)}║
║   API:    http://localhost:${String(env.PORT)}/api${' '.repeat(6)}║
║                                          ║
╚══════════════════════════════════════════╝
    `);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed. Database disconnected.');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  logger.error('Fatal error during startup:', error);
  process.exit(1);
});
