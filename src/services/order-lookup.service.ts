import { OrderRepository } from '../repositories/order.repository';
import { ProductModel } from '../models';
import { OrderLookupResult, CancelOrderRequest } from '../types/cancellation.types';
import { AuthContext } from '../types/auth.types';

export class OrderLookupService {
  private orderRepository: OrderRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
  }

  /**
   * Lookup order by identifier and validate access
   */
  async lookupOrder(
    payload: CancelOrderRequest,
    authContext: AuthContext
  ): Promise<OrderLookupResult> {
    try {
      // 1. Find order by PNR and email
      const order = await this.findOrderByIdentifier(payload.orderIdentifier);
      
      if (!order) {
        return {
          order: null,
          canAccess: false,
          accessReason: 'Order not found'
        };
      }

      // 2. Validate access permissions
      const accessValidation = this.validateAccess(order, payload, authContext);
      
      if (!accessValidation.canAccess) {
        return {
          order,
          canAccess: false,
          accessReason: accessValidation.reason || 'Access denied'
        };
      }

      // 3. If productId is provided, validate it belongs to the order
      let product = null;
      if (payload.productId) {
        product = await this.validateProductInOrder(order, payload.productId);
        
        if (!product) {
          return {
            order,
            canAccess: true,
            accessReason: 'Product not found in order'
          };
        }
      }

      return {
        order,
        product,
        canAccess: true
      };

    } catch (error) {
      console.error('Order lookup error:', error);
      return {
        order: null,
        canAccess: false,
        accessReason: `Lookup error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Find order by PNR and email
   */
  private async findOrderByIdentifier(orderIdentifier: { pnr: string; email?: string }): Promise<any> {
    const { pnr, email } = orderIdentifier;

    if (email) {
      // Find by PNR and email (for customer requests)
      return await this.orderRepository.findByPnrAndEmail(pnr, email);
    } else {
      // Find by PNR only (for admin/partner/system requests)
      // Note: In a real implementation, you might want to add a findByPnr method to the repository
      const orders = await this.orderRepository['model'].find({ pnr });
      return orders.length > 0 ? orders[0] : null;
    }
  }

  /**
   * Validate access permissions based on auth context and request source
   */
  private validateAccess(
    order: any,
    payload: CancelOrderRequest,
    authContext: AuthContext
  ): { canAccess: boolean; reason?: string } {
    const { requestSource } = payload;
    const { type: authType, userRole, metadata } = authContext;

    // Admin, customer service, and system users can access any order
    if (['admin', 'customer_service', 'system'].includes(userRole || '')) {
      return { canAccess: true };
    }

    // Partner users can access orders (with potential restrictions)
    if (userRole === 'partner') {
      // In a real implementation, you might want to add partner-specific validation
      // For example, checking if the order was created by this partner
      return { canAccess: true };
    }

    // Customer users can only access their own orders
    if (authType === 'jwt' && userRole === 'customer') {
      const customerEmail = metadata?.email;
      const orderEmail = order.customer?.email;

      if (customerEmail && orderEmail && customerEmail === orderEmail) {
        return { canAccess: true };
      } else {
        return {
          canAccess: false,
          reason: 'Customer can only access their own orders'
        };
      }
    }

    return {
      canAccess: false,
      reason: 'Insufficient permissions to access this order'
    };
  }

  /**
   * Validate that a product belongs to the order
   */
  private async validateProductInOrder(order: any, productId: string): Promise<any> {
    // Check if product is in the order's products array
    if (!order.products.includes(productId)) {
      return null;
    }

    // Get the product details
    const product = await ProductModel.findOne({ id: productId });
    return product;
  }

  /**
   * Get all products in an order
   */
  async getOrderProducts(orderId: string): Promise<any[]> {
    try {
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        return [];
      }

      const products = await ProductModel.find({ id: { $in: order.products } });
      return products;
    } catch (error) {
      console.error('Error getting order products:', error);
      return [];
    }
  }

  /**
   * Validate order status for cancellation
   */
  validateOrderStatus(order: any): { canCancel: boolean; reason?: string } {
    const validStatuses = ['confirmed', 'pending'];
    
    if (!validStatuses.includes(order.status)) {
      return {
        canCancel: false,
        reason: `Order status '${order.status}' does not allow cancellation`
      };
    }

    return { canCancel: true };
  }

  /**
   * Validate product status for cancellation
   */
  validateProductStatus(product: any): { canCancel: boolean; reason?: string } {
    const validStatuses = ['confirmed', 'pending'];
    
    if (!validStatuses.includes(product.status)) {
      return {
        canCancel: false,
        reason: `Product status '${product.status}' does not allow cancellation`
      };
    }

    return { canCancel: true };
  }
} 