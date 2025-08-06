import express, { Application, NextFunction, Request, Response } from "express";
import { db } from "./config/database";
import ordersRouter from "./routes/orders.route";

const app: Application = express();

// Initialize database connection
const initializeDatabase = async (): Promise<void> => {
  try {
    await db.connect();
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
};

// Initialize database on app startup
initializeDatabase();

app.use(express.json());
app.use("/orders", ordersRouter);

app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err);
  res.status(500).json({
    success: false,
    error: "Internal server error",
  });
});

export default app;
