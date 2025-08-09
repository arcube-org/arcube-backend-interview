import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { CancellationService } from './services/cancellation-service';
import { CancellationRequest, CancellationResponse } from './types';
import { sampleProducts } from './data/sample-products';

const app = express();
const PORT = process.env['PORT'] || 3002;

// Initialize services
const cancellationService = new CancellationService();

// Mock data store for tracking cancellations
const cancellationStore = new Map<string, any>();

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());

// Helper function to generate cancellation ID
const generateCancellationId = (): string => {
  return `CXL_DP_${Math.floor(Math.random() * 1000000000)}`;
};

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    service: 'dragonpass-mock-api',
    timestamp: new Date().toISOString()
  });
});

// DragonPass cancellation endpoint
app.post('/api/v1/cancellations', (req: Request, res: Response) => {
  try {
    const request: CancellationRequest = req.body;
    
    // Validate request
    const validation = cancellationService.validateCancellationRequest(request);
    if (!validation.isValid) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request',
        errors: validation.errors
      });
    }

    // Process cancellation
    const result = cancellationService.processCancellation(request);
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const { product, calculation } = result;

    // Generate cancellation ID
    const cancellation_id = generateCancellationId();

    // Create cancellation response
    const cancellationResponse: CancellationResponse = {
      status: "success",
      cancellation_id: cancellation_id,
      booking_id: request.booking_id || product.metadata.bookingId || '',
      lounge_id: request.lounge_id || product.metadata.loungeId || undefined,
      refund_amount: calculation.refund_amount,
      cancellation_fee: calculation.cancellation_fee,
      currency: product.price.currency,
      refund_policy: calculation.refund_policy,
      estimated_refund_time: "5-7 business days",
      message: calculation.message
    };

    // Store cancellation record
    cancellationStore.set(cancellation_id, {
      ...cancellationResponse,
      product_id: product.id,
      product_title: product.title,
      provider: product.provider,
      service_date_time: product.serviceDateTime,
      created_at: new Date().toISOString(),
      calculation_details: calculation
    });

    // Return response
    res.status(200).json(cancellationResponse);

  } catch (error) {
    console.error('Error processing cancellation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
  return;
});

// Get cancellation status endpoint
app.get('/api/v1/cancellations/:cancellation_id', (req: Request, res: Response) => {
  try {
    const { cancellation_id } = req.params;
    
    if (!cancellation_id) {
      return res.status(400).json({
        status: 'error',
        message: 'cancellation_id is required'
      });
    }
    
    const cancellation = cancellationStore.get(cancellation_id);
    
    if (!cancellation) {
      return res.status(404).json({
        status: 'error',
        message: 'Cancellation not found'
      });
    }

    res.status(200).json(cancellation);

  } catch (error) {
    console.error('Error retrieving cancellation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
  return;
});

// List all cancellations (for debugging)
app.get('/api/v1/cancellations', (_req: Request, res: Response) => {
  try {
    const cancellations = Array.from(cancellationStore.values());
    res.status(200).json({
      status: 'success',
      count: cancellations.length,
      cancellations: cancellations
    });
  } catch (error) {
    console.error('Error listing cancellations:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Get all sample products (for debugging)
app.get('/api/v1/products', (_req: Request, res: Response) => {
  try {
    res.status(200).json({
      status: 'success',
      count: sampleProducts.length,
      products: sampleProducts.map(product => ({
        id: product.id,
        title: product.title,
        provider: product.provider,
        type: product.type,
        price: product.price,
        status: product.status,
        cancellationPolicy: product.cancellationPolicy,
        serviceDateTime: product.serviceDateTime,
        metadata: {
          bookingId: product.metadata.bookingId,
          loungeId: product.metadata.loungeId,
          loungeName: product.metadata.loungeName
        }
      }))
    });
  } catch (error) {
    console.error('Error listing products:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
});

// Test cancellation policy endpoint
app.post('/api/v1/test-cancellation', (req: Request, res: Response) => {
  try {
    const { product_id, booking_time } = req.body;
    
    if (!product_id) {
      return res.status(400).json({
        status: 'error',
        message: 'product_id is required'
      });
    }

    const request: CancellationRequest = {
      product_id,
      booking_time,
      booking_id: product_id // Use product_id as booking_id for testing
    };

    const result = cancellationService.processCancellation(request);
    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Product not found'
      });
    }

    const { product, calculation } = result;
    const currentTime = new Date();
    const hoursBeforeService = (product.serviceDateTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60);

    res.status(200).json({
      status: 'success',
      product: {
        id: product.id,
        title: product.title,
        provider: product.provider,
        price: product.price,
        serviceDateTime: product.serviceDateTime
      },
      calculation: calculation,
      hours_before_service: hoursBeforeService,
      current_time: currentTime.toISOString()
    });

  } catch (error) {
    console.error('Error testing cancellation:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error'
    });
  }
  return;
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    status: 'error',
    message: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 DragonPass Mock API server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Cancellation endpoint: http://localhost:${PORT}/api/v1/cancellations`);
  console.log(`📦 Products endpoint: http://localhost:${PORT}/api/v1/products`);
  console.log(`🧪 Test cancellation: http://localhost:${PORT}/api/v1/test-cancellation`);
});

export default app; 