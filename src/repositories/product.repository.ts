import { BaseRepositoryImpl } from './base.repository';
import { ProductModel, ProductDocument } from '../models';
import { ProductType } from '../types';

export class ProductRepository extends BaseRepositoryImpl<ProductDocument> {
  constructor() {
    super(ProductModel);
  }

  /**
   * Find multiple products by their IDs
   */
  async findByIds(productIds: string[]): Promise<ProductDocument[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }
      
      return await this.model.find({ id: { $in: productIds } });
    } catch (error) {
      throw new Error(`Failed to find products by IDs: ${error}`);
    }
  }

  /**
   * Find products by provider
   */
  async findByProvider(provider: string): Promise<ProductDocument[]> {
    try {
      return await this.model.find({ provider });
    } catch (error) {
      throw new Error(`Failed to find products by provider: ${error}`);
    }
  }

  /**
   * Find products by type
   */
  async findByType(type: ProductType): Promise<ProductDocument[]> {
    try {
      return await this.model.find({ type });
    } catch (error) {
      throw new Error(`Failed to find products by type: ${error}`);
    }
  }

  /**
   * Find products by provider and type
   */
  async findByProviderAndType(provider: string, type: ProductType): Promise<ProductDocument[]> {
    try {
      return await this.model.find({ provider, type });
    } catch (error) {
      throw new Error(`Failed to find products by provider and type: ${error}`);
    }
  }
} 