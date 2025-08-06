// Custom database error classes
export class DatabaseError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, code: string = 'DATABASE_ERROR', isOperational: boolean = true) {
    super(message);
    this.name = 'DatabaseError';
    this.code = code;
    this.isOperational = isOperational;
  }
}

export class ConnectionError extends DatabaseError {
  constructor(message: string) {
    super(message, 'CONNECTION_ERROR', true);
    this.name = 'ConnectionError';
  }
}

export class QueryError extends DatabaseError {
  constructor(message: string) {
    super(message, 'QUERY_ERROR', true);
    this.name = 'QueryError';
  }
}

export class ValidationError extends DatabaseError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', true);
    this.name = 'ValidationError';
  }
}

// Error mapping utility
export const mapMongoError = (error: any): DatabaseError => {
  if (error.name === 'ValidationError') {
    return new ValidationError(`Validation failed: ${error.message}`);
  }
  
  if (error.name === 'CastError') {
    return new ValidationError(`Invalid data type: ${error.message}`);
  }
  
  if (error.name === 'MongoServerError') {
    switch (error.code) {
      case 11000:
        return new DatabaseError('Duplicate key error', 'DUPLICATE_KEY');
      case 121:
        return new ValidationError('Document validation failed');
      default:
        return new DatabaseError(`MongoDB error: ${error.message}`, 'MONGO_ERROR');
    }
  }
  
  if (error.name === 'MongoNetworkError') {
    return new ConnectionError(`Network error: ${error.message}`);
  }
  
  return new DatabaseError(`Unknown database error: ${error.message}`, 'UNKNOWN_ERROR');
};

// Error logging utility
export const logDatabaseError = (error: DatabaseError, context?: Record<string, unknown>): void => {
  console.error('Database Error:', {
    name: error.name,
    code: error.code,
    message: error.message,
    isOperational: error.isOperational,
    context,
    timestamp: new Date().toISOString(),
  });
};

// Retry utility for database operations
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Only retry on connection errors
      if (error instanceof ConnectionError) {
        console.warn(`Database operation failed (attempt ${attempt}/${maxRetries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, delay * attempt));
      } else {
        throw lastError;
      }
    }
  }
  
  throw lastError!;
}; 