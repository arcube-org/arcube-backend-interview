import express, { Application, NextFunction, Request, Response } from "express";
import { db } from "./config/database";
import ordersRouter from "./routes/orders.route";
import webhookRouter from "./routes/webhook.route";
import { seedDatabase, checkSeedStatus } from "./utils/seed-database";

const app: Application = express();

// Initialize database connection and seed data
const initializeDatabase = async (): Promise<void> => {
  try {
    await db.connect();
    console.log('✅ Database initialized successfully');
    
    // Seed database with default users
    await seedDatabase();
    
    // Check and display database status
    await checkSeedStatus();
    
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
};

// Initialize database on app startup
initializeDatabase();

app.use(express.json());
app.use("/orders", ordersRouter);
app.use("/webhooks", webhookRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

export default app;
