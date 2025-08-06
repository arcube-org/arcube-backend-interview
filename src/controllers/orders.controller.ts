import { NextFunction, Request, Response } from 'express';
import { CancellationService } from '../services/cancellation/cancellation.service';
import { CancelOrderRequest } from '../types/cancellation.types';
import { ApiResponse } from '../types';
import { CancelOrderRequestSchema } from '../validations/cancel-order.validation';

const cancellationService = new CancellationService();

export const cancelOrder = async (
  req: Request<{}, ApiResponse<any>, any>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    // Validate request body using Zod
    const validationResult = CancelOrderRequestSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      const errors = validationResult.error.issues.map((err: any) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        data: { validationErrors: errors }
      });
      return;
    }

    const payload = validationResult.data as CancelOrderRequest;
    const authContext = req.authContext;

    if (!authContext) {
      res.status(401).json({ 
        success: false, 
        error: 'Authentication required' 
      });
      return;
    }

    const result = await cancellationService.cancelOrder(payload, authContext);
    
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (e) {
    next(e);
  }
};

export const getCancellationAuditTrail = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const auditTrail = cancellationService.getAuditTrail();
    res.json({ 
      success: true, 
      data: auditTrail 
    });
  } catch (e) {
    next(e);
  }
};

export const getCancellationAuditTrailByCorrelationId = async (
  req: Request<{ correlationId: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { correlationId } = req.params;
    
    if (!correlationId) {
      res.status(400).json({ 
        success: false, 
        error: 'correlationId is required' 
      });
      return;
    }

    const auditTrail = cancellationService.getAuditTrailByCorrelationId(correlationId);
    res.json({ 
      success: true, 
      data: auditTrail 
    });
  } catch (e) {
    next(e);
  }
};