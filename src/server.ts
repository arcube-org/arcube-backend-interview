import app from "./app";
import { env } from "./config/environment";
import { db } from "./config/database";

const startServer = async (): Promise<void> => {
  try {
    // Ensure database is connected before starting server
    if (!db.isDatabaseConnected()) {
      console.log('⏳ Waiting for database connection...');
      await db.connect();
    }

    app.listen(env.PORT, (): void => {
      console.log(`🚀 Server running on http://${env.HOST}:${env.PORT}`);
      console.log(`📊 Environment: ${env.NODE_ENV}`);
      console.log(`🗄️ Database: ${db.getConnectionStatus().name}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
