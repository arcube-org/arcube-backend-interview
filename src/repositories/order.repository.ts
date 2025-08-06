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
      }).populate('products').populate('userId');
    } catch (error) {
      throw new Error(`Failed to find order by PNR and email: ${error}`);
    }
  }

  async findProductById(orderId: string, productId: string): Promise<any> {
    try {
      const order = await this.model.findById(orderId).populate('products');
      if (!order) {
        return null;
      }
      
      // Find the specific product in the order's products array
      const product = order.products.find((product: any) => product.id === productId);
      return product || null;
    } catch (error) {
      throw new Error(`Failed to find product by id: ${error}`);
    }
  }

  async updateProductStatus(orderId: string, productId: string, status: string): Promise<OrderDocument | null> {
    try {
      return await this.model.findOneAndUpdate(
        { 
          _id: orderId,
          'products': { $elemMatch: { id: productId } }
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
} 