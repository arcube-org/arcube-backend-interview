# DragonPass Mock API Service

A TypeScript Express.js API service that simulates DragonPass cancellation responses with intelligent cancellation policy checking for testing purposes.

## Features

- 🚀 Mock DragonPass cancellation API with TypeScript
- ⏰ Intelligent time-based refund policies based on product cancellation windows
- 📊 Health check endpoint
- 🔍 Cancellation status tracking
- 🛡️ Security middleware (helmet, CORS)
- 📝 Request logging
- 🧪 Built-in testing endpoints
- 📦 Sample products with realistic cancellation policies

## Setup

1. **Install dependencies:**
   ```bash
   cd external/vendor-service
   npm install
   ```

2. **Build TypeScript:**
   ```bash
   npm run build
   ```

3. **Start the server:**
   ```bash
   # Production mode
   npm start
   
   # Development mode (with auto-restart)
   npm run dev
   ```

The server will start on port 3002 by default. You can change this by setting the `PORT` environment variable.

## Sample Products

The service includes 5 DragonPass lounge access products with different cancellation policies:

1. **PROD-001**: JFK Terminal 4 Centurion Lounge - 4h/24h windows
2. **PROD-002**: LAX Tom Bradley Centurion Lounge - 2h/12h/24h windows  
3. **PROD-003**: ORD Terminal 3 Priority Pass - 6h window only
4. **PROD-004**: LHR Terminal 5 Plaza Premium - 24h/6h/2h windows
5. **PROD-005**: CDG Terminal 2E Air France - 12h/24h/48h windows

## API Endpoints

### Health Check
```
GET /health
```
Returns service health status.

### Get All Products
```
GET /api/v1/products
```
Returns all sample products with their cancellation policies.

### Test Cancellation Policy
```
POST /api/v1/test-cancellation
```

**Request Body:**
```json
{
  "product_id": "PROD-001",
  "booking_time": "2024-01-15T10:00:00Z"
}
```

**Response:**
```json
{
  "status": "success",
  "product": {
    "id": "PROD-001",
    "title": "JFK Terminal 4 Centurion Lounge Access",
    "provider": "dragonpass",
    "price": {
      "amount": 45,
      "currency": "USD"
    },
    "serviceDateTime": "2025-08-06T16:04:25.537Z"
  },
  "calculation": {
    "refund_amount": 0,
    "cancellation_fee": 45,
    "refund_policy": "no_refund_window_expired",
    "message": "Cancellation window has expired"
  },
  "hours_before_service": 1.99,
  "current_time": "2025-08-06T14:04:54.484Z"
}
```

### Cancel Lounge Access
```
POST /api/v1/cancellations
```

**Request Body:**
```json
{
  "booking_id": "DP-456789012",
  "lounge_id": "JFK-T4-CENTURION",
  "booking_time": "2024-01-15T10:00:00Z",
  "product_id": "PROD-001"
}
```

**Response Examples:**

**Full Refund:**
```json
{
  "status": "success",
  "cancellation_id": "CXL_DP_987654321",
  "booking_id": "DP-456789012",
  "lounge_id": "JFK-T4-CENTURION",
  "refund_amount": 45.00,
  "cancellation_fee": 0,
  "currency": "USD",
  "refund_policy": "full_refund",
  "estimated_refund_time": "5-7 business days",
  "message": "Full refund if cancelled within 4 hours of service time"
}
```

**Partial Refund:**
```json
{
  "status": "success",
  "cancellation_id": "CXL_DP_987654322",
  "booking_id": "DP-456789012",
  "refund_amount": 22.50,
  "cancellation_fee": 22.50,
  "currency": "USD",
  "refund_policy": "50_percent_refund",
  "estimated_refund_time": "5-7 business days",
  "message": "50% refund if cancelled between 4-24 hours before service time"
}
```

**No Refund:**
```json
{
  "status": "success",
  "cancellation_id": "CXL_DP_987654323",
  "booking_id": "DP-456789012",
  "refund_amount": 0,
  "cancellation_fee": 45.00,
  "currency": "USD",
  "refund_policy": "no_refund",
  "estimated_refund_time": "5-7 business days",
  "message": "Cancellation window has expired"
}
```

### Get Cancellation Status
```
GET /api/v1/cancellations/:cancellation_id
```

Returns the status of a specific cancellation.

### List All Cancellations (Debug)
```
GET /api/v1/cancellations
```

Returns all stored cancellations (useful for debugging).

## Cancellation Policy Logic

The service implements intelligent cancellation policies based on:

1. **Time Windows**: Each product has multiple cancellation windows with different refund percentages
2. **Service Time**: Calculates hours before service to determine applicable window
3. **Activation Status**: For eSIM products, checks if activated
4. **Cancellation Conditions**: Respects product-specific conditions

### Example Policy Windows:
- **≤ 4 hours**: Full refund (100%)
- **4-24 hours**: 50% refund
- **> 24 hours**: No refund (0%)

## Testing Examples

### Test Full Refund (LHR Lounge)
```bash
curl -X POST http://localhost:3002/api/v1/test-cancellation \
  -H "Content-Type: application/json" \
  -d '{"product_id": "PROD-004"}'
```

### Test Partial Refund (LAX Lounge)
```bash
curl -X POST http://localhost:3002/api/v1/test-cancellation \
  -H "Content-Type: application/json" \
  -d '{"product_id": "PROD-002"}'
```

### Test Actual Cancellation
```bash
curl -X POST http://localhost:3002/api/v1/cancellations \
  -H "Content-Type: application/json" \
  -d '{"product_id": "PROD-004", "booking_id": "DP-456789015"}'
```

### Get All Products
```bash
curl -X GET http://localhost:3002/api/v1/products
```

## Environment Variables

- `PORT`: Server port (default: 3002)

## Dependencies

- **express**: Web framework
- **cors**: Cross-origin resource sharing
- **helmet**: Security middleware
- **morgan**: HTTP request logger
- **typescript**: TypeScript compiler
- **ts-node-dev**: Development TypeScript runner (dev dependency)
- **@types/***: TypeScript type definitions

## Project Structure

```
src/
├── types/
│   └── index.ts          # TypeScript interfaces
├── data/
│   └── sample-products.ts # Sample products with policies
├── services/
│   └── cancellation-service.ts # Cancellation logic
├── server.ts             # Main server file
└── test-examples.ts      # Test examples
```

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run in development mode
npm run dev

# Run tests
node dist/test-examples.js
``` 