import { Document, Model, FilterQuery, UpdateQuery } from 'mongoose';

export interface BaseRepository<T extends Document> {
  findById(id: string): Promise<T | null>;
  create(data: Partial<T>): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T | null>;
}

export abstract class BaseRepositoryImpl<T extends Document> implements BaseRepository<T> {
  constructor(protected model: Model<T>) {}

  async findById(id: string): Promise<T | null> {
    try {
      return await this.model.findOne({ id });
    } catch (error) {
      throw new Error(`Failed to find document by id: ${error}`);
    }
  }

  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save();
    } catch (error) {
      throw new Error(`Failed to create document: ${error}`);
    }
  }

  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      return await this.model.findOneAndUpdate({ id }, data, { new: true });
    } catch (error) {
      throw new Error(`Failed to update document: ${error}`);
    }
  }
} 