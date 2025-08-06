import { Request, Response, NextFunction } from 'express';
import { WebhookRegistryService } from '../services/webhook-registry.service';
import { WebhookEventRepository } from '../repositories/webhook-event.repository';
import { ApiResponse } from '../types';
import { AuthContext } from '../types/auth.types';
import { 
  CreateWebhookRequest, 
  UpdateWebhookRequest,
  WebhookDeliveryStatus 
} from '../types/webhook.types';

// Extend Request to include authContext
declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
}

const webhookRegistryService = new WebhookRegistryService();
const webhookEventRepository = new WebhookEventRepository();

/**
 * Register a new webhook
 */
export const registerWebhook = async (
  req: Request<{}, ApiResponse<any>, CreateWebhookRequest>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    const createdBy = authContext.userId || 'system';
    const webhook = await webhookRegistryService.registerWebhook(req.body, createdBy);

    res.status(201).json({
      success: true,
      data: webhook
    });

  } catch (error) {
    console.error('Error registering webhook:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to register webhook',
      data: null
    });
  }
};

/**
 * Get all webhooks
 */
export const getWebhooks = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    // If user is not admin, only show their own webhooks
    const createdBy = authContext.userRole === 'admin' ? undefined : authContext.userId;
    const webhooks = await webhookRegistryService.getWebhooks(createdBy);

    res.status(200).json({
      success: true,
      data: webhooks
    });

  } catch (error) {
    console.error('Error getting webhooks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhooks',
      data: null
    });
  }
};

/**
 * Get webhook by ID
 */
export const getWebhook = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    const { id } = req.params;
    const webhook = await webhookRegistryService.getWebhook(id);

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
        data: null
      });
      return;
    }

    // Check if user has access to this webhook
    if (authContext.userRole !== 'admin' && webhook.createdBy !== authContext.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        data: null
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: webhook
    });

  } catch (error) {
    console.error('Error getting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook',
      data: null
    });
  }
};

/**
 * Update webhook
 */
export const updateWebhook = async (
  req: Request<{ id: string }, ApiResponse<any>, UpdateWebhookRequest>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    const { id } = req.params;
    
    // Check if webhook exists and user has access
    const existingWebhook = await webhookRegistryService.getWebhook(id);
    if (!existingWebhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
        data: null
      });
      return;
    }

    if (authContext.userRole !== 'admin' && existingWebhook.createdBy !== authContext.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        data: null
      });
      return;
    }

    const updatedWebhook = await webhookRegistryService.updateWebhook(id, req.body);

    res.status(200).json({
      success: true,
      data: updatedWebhook
    });

  } catch (error) {
    console.error('Error updating webhook:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update webhook',
      data: null
    });
  }
};

/**
 * Delete webhook
 */
export const deleteWebhook = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    const { id } = req.params;
    
    // Check if webhook exists and user has access
    const existingWebhook = await webhookRegistryService.getWebhook(id);
    if (!existingWebhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
        data: null
      });
      return;
    }

    if (authContext.userRole !== 'admin' && existingWebhook.createdBy !== authContext.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        data: null
      });
      return;
    }

    await webhookRegistryService.deleteWebhook(id);

    res.status(200).json({
      success: true,
      data: null
    });

  } catch (error) {
    console.error('Error deleting webhook:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete webhook',
      data: null
    });
  }
};

/**
 * Test webhook
 */
export const testWebhook = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    const { id } = req.params;
    
    // Check if webhook exists and user has access
    const existingWebhook = await webhookRegistryService.getWebhook(id);
    if (!existingWebhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
        data: null
      });
      return;
    }

    if (authContext.userRole !== 'admin' && existingWebhook.createdBy !== authContext.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        data: null
      });
      return;
    }

    const testResult = await webhookRegistryService.testWebhook(id);

    res.status(200).json({
      success: true,
      data: testResult
    });

  } catch (error) {
    console.error('Error testing webhook:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to test webhook',
      data: null
    });
  }
};

/**
 * Get webhook delivery history
 */
export const getWebhookDeliveries = async (
  req: Request<{ id: string }>,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    const { id } = req.params;
    
    // Check if webhook exists and user has access
    const existingWebhook = await webhookRegistryService.getWebhook(id);
    if (!existingWebhook) {
      res.status(404).json({
        success: false,
        error: 'Webhook not found',
        data: null
      });
      return;
    }

    if (authContext.userRole !== 'admin' && existingWebhook.createdBy !== authContext.userId) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        data: null
      });
      return;
    }

    const deliveries = await webhookEventRepository.findByWebhookId(id);

    res.status(200).json({
      success: true,
      data: deliveries
    });

  } catch (error) {
    console.error('Error getting webhook deliveries:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook deliveries',
      data: null
    });
  }
};

/**
 * Get webhook statistics
 */
export const getWebhookStats = async (
  req: Request,
  res: Response<ApiResponse<any>>,
  next: NextFunction
): Promise<void> => {
  try {
    const authContext = req.authContext;
    if (!authContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        data: null
      });
      return;
    }

    // Only admins can view statistics
    if (authContext.userRole !== 'admin') {
      res.status(403).json({
        success: false,
        error: 'Access denied',
        data: null
      });
      return;
    }

    const [webhookStats, deliveryStats] = await Promise.all([
      webhookRegistryService.getWebhookStats(),
      webhookEventRepository.getDeliveryStats()
    ]);

    res.status(200).json({
      success: true,
      data: {
        webhooks: webhookStats,
        deliveries: deliveryStats
      }
    });

  } catch (error) {
    console.error('Error getting webhook statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve webhook statistics',
      data: null
    });
  }
}; 