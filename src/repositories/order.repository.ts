import { BaseRepositoryImpl } from './base.repository';
import { OrderModel, OrderDocument } from '../models';

export class OrderRepository extends BaseRepositoryImpl<OrderDocument> {
  constructor() {
    super(OrderModel);
  }

  async findByPnrAndEmail(pnr: string, email: string): Promise<OrderDocument | null> {
    try {
      return await this.model.findOne({
        pnr,
        'customer.email': email
      });
    } catch (error) {
      throw new Error(`Failed to find order by PNR and email: ${error}`);
    }
  }

  async findProductById(orderId: string, productId: string): Promise<any> {
    try {
      const order = await this.model.findOne({ id: orderId });
      if (!order) {
        return null;
      }
      
      // Find the specific product in the order's products array
      const product = order.products.find((product: any) => product === productId);
      return product || null;
    } catch (error) {
      throw new Error(`Failed to find product by id: ${error}`);
    }
  }

  async updateProductStatus(orderId: string, productId: string, status: string): Promise<OrderDocument | null> {
    try {
      return await this.model.findOneAndUpdate(
        { 
          id: orderId,
          'products': { $elemMatch: { $eq: productId } }
        },
        { 
          $set: { 'products.$.status': status }
        },
        { new: true }
      );
    } catch (error) {
      throw new Error(`Failed to update product status: ${error}`);
    }
  }

  /**
   * Find orders with filter, sorting, and pagination
   */
  async findWithFilter(filter: any, options: { sort?: any; skip?: number; limit?: number } = {}): Promise<OrderDocument[]> {
    try {
      let query = this.model.find(filter);
      
      if (options.sort) {
        query = query.sort(options.sort);
      }
      
      if (options.skip) {
        query = query.skip(options.skip);
      }
      
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      return await query.exec();
    } catch (error) {
      throw new Error(`Failed to find orders with filter: ${error}`);
    }
  }

  /**
   * Count orders with filter
   */
  async countWithFilter(filter: any): Promise<number> {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw new Error(`Failed to count orders with filter: ${error}`);
    }
  }
} 