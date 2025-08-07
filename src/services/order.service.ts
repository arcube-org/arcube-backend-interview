import { OrderRepository } from '../repositories/order.repository';
import { ProductRepository } from '../repositories/product.repository';
import { OrderDocument, ProductDocument } from '../models';
import { AuthContext } from '../types/auth.types';

export interface OrderWithProducts {
  order: OrderDocument;
  products: ProductDocument[];
}

export interface GetOrdersQuery {
  page: number;
  limit: number;
  status?: 'pending' | 'confirmed' | 'cancelled' | 'refunded' | 'expired' | undefined;
  provider?: string | undefined;
  type?: 'airport_transfer' | 'lounge_access' | 'esim' | 'meal' | 'insurance' | 'transport' | undefined;
}

export class OrderService {
  private orderRepository: OrderRepository;
  private productRepository: ProductRepository;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.productRepository = new ProductRepository();
  }

  /**
   * Get orders based on user role and authentication context
   */
  async getUserOrders(authContext: AuthContext, query: GetOrdersQuery): Promise<OrderDocument[]> {
    try {
      const { page = 1, limit = 10, status, provider, type } = query;
      const skip = (page - 1) * limit;

      // Build filter based on user role
      const filter: any = {};

      // Apply role-based filtering
      if (authContext.userRole === 'admin' || authContext.userRole === 'system') {
        // Admin and system can see all orders - no additional filtering
      } else if (authContext.userRole === 'partner') {
        // Partner can only see their own orders
        if (authContext.userId) {
          filter.userId = authContext.userId;
        }
      } else {
        // User role - can only see their own orders
        if (authContext.metadata?.email) {
          filter['customer.email'] = authContext.metadata.email;
        }
      }

      // Apply status filter if provided
      if (status) {
        filter.status = status;
      }

      // Apply provider and type filters (these will be applied to products later)
      const productFilter: any = {};
      if (provider) {
        productFilter.provider = provider;
      }
      if (type) {
        productFilter.type = type;
      }

      // Get orders with pagination
      const orders = await this.orderRepository.findWithFilter(filter, { sort: { createdAt: -1 }, skip, limit });

      // If provider or type filters are applied, we need to filter orders that have matching products
      if (provider || type) {
        const filteredOrders = await this.filterOrdersByProductCriteria(orders, productFilter);
        return filteredOrders;
      }

      return orders;
    } catch (error) {
      throw new Error(`Failed to get user orders: ${error}`);
    }
  }

  /**
   * Get orders with their associated products
   */
  async getOrdersWithProducts(authContext: AuthContext, query: GetOrdersQuery): Promise<OrderWithProducts[]> {
    try {
      // First get the orders
      const orders = await this.getUserOrders(authContext, query);

      // Then enrich them with products
      return await this.enrichOrdersWithProducts(orders);
    } catch (error) {
      throw new Error(`Failed to get orders with products: ${error}`);
    }
  }

  /**
   * Enrich orders with their associated products
   */
  async enrichOrdersWithProducts(orders: OrderDocument[]): Promise<OrderWithProducts[]> {
    try {
      if (!orders || orders.length === 0) {
        return [];
      }

      // Extract all unique product IDs from all orders
      const allProductIds = new Set<string>();
      orders.forEach(order => {
        order.products.forEach(productId => {
          allProductIds.add(productId);
        });
      });

      // Fetch all products in one query
      const products = await this.productRepository.findByIds(Array.from(allProductIds));
      
      // Create a map for quick product lookup
      const productMap = new Map<string, ProductDocument>();
      products.forEach(product => {
        productMap.set(product.id, product);
      });

      // Enrich each order with its products
      const enrichedOrders: OrderWithProducts[] = orders.map(order => {
        const orderProducts = order.products
          .map(productId => productMap.get(productId))
          .filter(product => product !== undefined) as ProductDocument[];

        return {
          order,
          products: orderProducts
        };
      });

      return enrichedOrders;
    } catch (error) {
      throw new Error(`Failed to enrich orders with products: ${error}`);
    }
  }

  /**
   * Filter orders based on product criteria (provider, type)
   */
  private async filterOrdersByProductCriteria(orders: OrderDocument[], productFilter: any): Promise<OrderDocument[]> {
    try {
      if (!productFilter.provider && !productFilter.type) {
        return orders;
      }

      // Extract all product IDs from orders
      const allProductIds = new Set<string>();
      orders.forEach(order => {
        order.products.forEach(productId => {
          allProductIds.add(productId);
        });
      });

      // Find products that match the criteria
      const matchingProducts = await this.productRepository.findByIds(Array.from(allProductIds));
      // Filter by additional criteria if needed
      const filteredProducts = matchingProducts.filter(product => {
        if (productFilter.provider && product.provider !== productFilter.provider) return false;
        if (productFilter.type && product.type !== productFilter.type) return false;
        return true;
      });

      const matchingProductIds = new Set(filteredProducts.map(p => p.id));

      // Filter orders that have at least one matching product
      return orders.filter(order => 
        order.products.some(productId => matchingProductIds.has(productId))
      );
    } catch (error) {
      throw new Error(`Failed to filter orders by product criteria: ${error}`);
    }
  }

  /**
   * Get total count of orders for pagination
   */
  async getOrdersCount(authContext: AuthContext, query: GetOrdersQuery): Promise<number> {
    try {
      const { status } = query;

      // Build filter based on user role
      const filter: any = {};

      // Apply role-based filtering
      if (authContext.userRole === 'admin' || authContext.userRole === 'system') {
        // Admin and system can see all orders - no additional filtering
      } else if (authContext.userRole === 'partner') {
        // Partner can only see their own orders
        if (authContext.userId) {
          filter.userId = authContext.userId;
        }
      } else {
        // User role - can only see their own orders
        if (authContext.metadata?.email) {
          filter['customer.email'] = authContext.metadata.email;
        }
      }

      // Apply status filter if provided
      if (status) {
        filter.status = status;
      }

      return await this.orderRepository.countWithFilter(filter);
    } catch (error) {
      throw new Error(`Failed to get orders count: ${error}`);
    }
  }

  /**
   * Get a single order with its associated products
   */
  async getOrderWithProducts(orderId: string, authContext: AuthContext): Promise<OrderWithProducts> {
    try {
      // First, get the order and verify access
      const order = await this.orderRepository.findById(orderId);
      
      if (!order) {
        throw new Error('Order not found');
      }

      // Check if user has access to this order based on role
      if (authContext.userRole === 'admin' || authContext.userRole === 'system') {
        // Admin and system can access any order
      } else if (authContext.userRole === 'partner') {
        // Partner can only access their own orders
        if (authContext.userId && order.userId !== authContext.userId) {
          throw new Error('Access denied');
        }
      } else {
        // User role - can only access their own orders
        if (authContext.metadata?.email && order.customer.email !== authContext.metadata.email) {
          throw new Error('Access denied');
        }
      }

      // Get the products for this order
      const products = await this.productRepository.findByIds(order.products);

      return {
        order,
        products
      };
    } catch (error) {
      throw new Error(`Failed to get order with products: ${error}`);
    }
  }
} 