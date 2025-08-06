import express, { Application, NextFunction, Request, Response } from "express";
import helmet from "helmet";
import cors from "cors";
import { db } from "./config/database";
import { helmetConfig, corsConfig, bodyParserConfig } from "./config/security.config";
import ordersRouter from "./routes/orders.route";
import webhookRouter from "./routes/webhook.route";
import healthRouter from "./routes/health.route";
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

// Security middleware
app.use(helmet(helmetConfig));

// CORS middleware
app.use(cors(corsConfig));

// Body parsing middleware
app.use(express.json(bodyParserConfig.json));
app.use(express.urlencoded(bodyParserConfig.urlencoded));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${req.ip}`);
  next();
});

// Routes
app.use("/orders", ordersRouter);
app.use("/webhooks", webhookRouter);
app.use("/health", healthRouter);

// 404 handler - using a specific path instead of wildcard to avoid path-to-regexp error
app.use('/404', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Catch-all 404 handler for unmatched routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error('Global error handler:', err);
  
  // Handle CORS errors
  if (err.message === 'Not allowed by CORS') {
    res.status(403).json({
      success: false,
      error: 'CORS policy violation',
      message: 'Origin not allowed'
    });
    return;
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      message: err.message
    });
    return;
  }
  
  // Handle other errors
  res.status(500).json({
    success: false,
    error: "Internal server error",
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

export default app;
