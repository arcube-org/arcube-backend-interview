export { UserModel, type UserDocument } from './user.model';
export { ProductModel, type ProductDocument } from './product.model';
export { OrderModel, type OrderDocument } from './order.model';
export { CancellationRecordModel, type CancellationRecordDocument } from './cancellation-record.model';

export type {
  User,
  Product,
  Order,
  CancellationRecord,
  UserRole,
  ProductType,
  ProductStatus,
  OrderStatus,
  Price,
  CancellationPolicy,
  CancellationWindow,
  CustomerInfo,
  FlightSegment,
} from '../types'; 