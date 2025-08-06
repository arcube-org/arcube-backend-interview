import { Router } from 'express';
import { getHealth, getReady, getSimpleHealth, getHealthMetrics } from '../controllers/health.controller';

const router = Router();

/**
 * Health check endpoints
 * 
 * GET /health - Comprehensive health check
 * GET /ready - Readiness check
 * GET /health/simple - Simple health check
 * GET /health/metrics - Detailed health metrics (development only)
 */

// Main health check endpoint
router.get('/', getHealth);

// Readiness check endpoint
router.get('/ready', getReady);

// Simple health check for basic monitoring
router.get('/simple', getSimpleHealth);

// Health metrics endpoint (development only)
router.get('/metrics', getHealthMetrics);

export default router; 