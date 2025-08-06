import { NextFunction, Request, Response } from 'express';
import * as orderService from '../services/orders.service';
import { ApiResponse, CancelOrderRequest, CancelOrderResponse } from '../types';

export const cancelOrder = async (
  req: Request<{}, ApiResponse<CancelOrderResponse>, CancelOrderRequest>,
  res: Response<ApiResponse<CancelOrderResponse>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId, reason } = req.body;
    
    if (!orderId) {
      res.status(400).json({ 
        success: false, 
        error: 'orderId required' 
      });
      return;
    }

    const result = await orderService.cancel(orderId, reason);
    res.json({ 
      success: true, 
      data: result 
    });
  } catch (e) {
    next(e);
  }
};

export const cancelProduct = async (
  req: Request<{ orderId: string; productId: string }, ApiResponse<any>, { reason?: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const { orderId, productId } = req.params;
    const { reason } = req.body;
    
    if (!orderId || !productId) {
      res.status(400).json({ 
        success: false, 
        error: 'orderId and productId are required' 
      });
      return;
    }

    const result = await orderService.cancelProduct(orderId, productId, reason);
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
    const auditTrail = orderService.getCancellationAuditTrail();
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

    const auditTrail = orderService.getCancellationAuditTrailByCorrelationId(correlationId);
    res.json({ 
      success: true, 
      data: auditTrail 
    });
  } catch (e) {
    next(e);
  }
};