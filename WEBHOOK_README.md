# Webhook System Documentation

## Overview

The webhook system provides real-time notifications for order cancellation events. It implements the **Observer Pattern** with an event-driven architecture, allowing admins to register webhooks that will be notified when specific cancellation events occur.

## Architecture

### Core Components

1. **Event Bus Service** (`src/services/event-bus.service.ts`)
   - Implements the Observer Pattern
   - Manages event subscriptions and publishing
   - Singleton pattern for global event management

2. **Webhook Registry Service** (`src/services/webhook-registry.service.ts`)
   - Manages webhook registrations (CRUD operations)
   - Validates webhook configurations
   - Provides webhook testing capabilities

3. **Webhook Dispatcher Service** (`src/services/webhook-dispatcher.service.ts`)
   - Handles webhook delivery with retry logic
   - Manages delivery status tracking
   - Implements HMAC signature verification

4. **Event Types** (`src/types/webhook.types.ts`)
   - `cancellation.started` - When cancellation process begins
   - `cancellation.completed` - When cancellation succeeds
   - `cancellation.failed` - When cancellation fails
   - `cancellation.partial` - When partial cancellation occurs
   - `refund.processed` - When refund is processed
   - `audit.updated` - When audit trail is updated

## Features

### ✅ Implemented Features

- **Event-Driven Architecture**: Real-time event publishing and subscription
- **Webhook Registration**: API and CLI for registering webhooks
- **Retry Logic**: Automatic retry with exponential backoff
- **Security**: HMAC signature verification for webhook payloads
- **Rate Limiting**: Built-in rate limiting for webhook operations
- **Authentication**: Multi-tier authentication (JWT, API Key, Service Token)
- **Delivery Tracking**: Complete audit trail of webhook deliveries
- **CLI Management**: Command-line interface for webhook management
- **Statistics**: Comprehensive webhook and delivery statistics
- **Validation**: URL validation, event type validation, and duplicate prevention

### 🔧 Configuration

The webhook system is configured through `src/config/webhook.config.ts`:

```typescript
export const webhookConfig = {
  delivery: {
    maxRetries: 3,
    retryDelay: 5000, // milliseconds
    backoffMultiplier: 2,
    timeout: 10000, // milliseconds
    batchSize: 5
  },
  security: {
    minSecretLength: 16,
    allowedDomains: ['example.com', 'api.example.com'],
    maxUrlLength: 2048
  },
  rateLimit: {
    webhookRegistration: { windowMs: 15 * 60 * 1000, max: 10 },
    webhookTesting: { windowMs: 60 * 1000, max: 5 }
  }
};
```

## API Endpoints

### Webhook Management

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/webhooks` | Register a new webhook | `manage_webhooks` |
| `GET` | `/webhooks` | List all webhooks | `view_webhooks` |
| `GET` | `/webhooks/:id` | Get webhook details | `view_webhooks` |
| `PUT` | `/webhooks/:id` | Update webhook | `manage_webhooks` |
| `DELETE` | `/webhooks/:id` | Delete webhook | `manage_webhooks` |
| `POST` | `/webhooks/:id/test` | Test webhook | `manage_webhooks` |
| `GET` | `/webhooks/:id/deliveries` | Get delivery history | `view_webhooks` |
| `GET` | `/webhooks/stats/overview` | Get statistics | `view_audit_trail` |

### Authentication

The webhook system supports multi-tier authentication:

- **JWT**: For customer applications
- **API Key**: For partner integrations
- **Service Token**: For internal/admin systems

### Permissions

- `manage_webhooks`: Register, update, delete webhooks
- `view_webhooks`: View webhook details and delivery history
- `view_audit_trail`: Access webhook statistics

## CLI Usage

The webhook system includes a comprehensive CLI tool for management:

### Installation

```bash
npm install
```

### Available Commands

#### List Available Events
```bash
npm run webhook events
```

#### Register a Webhook
```bash
npm run webhook register \
  --name "Failed Cancellations" \
  --url "https://your-app.com/webhooks/cancellations" \
  --events "cancellation.failed,cancellation.partial" \
  --secret "your-secret-key-here" \
  --created-by "admin-123"
```

#### List Webhooks
```bash
# List all webhooks
npm run webhook list

# Filter by creator
npm run webhook list --created-by "admin-123"

# Filter by event type
npm run webhook list --event "cancellation.failed"
```

#### Test a Webhook
```bash
npm run webhook test --id "webhook-id-here"
```

#### Delete a Webhook
```bash
npm run webhook delete --id "webhook-id-here"
```

#### Get Statistics
```bash
npm run webhook stats
```

## Webhook Payload Format

When a cancellation event occurs, webhooks receive a POST request with the following payload:

```json
{
  "event": {
    "type": "cancellation.failed",
    "data": {
      "orderId": "order-123",
      "productId": "product-456",
      "reason": "Customer request",
      "errorCode": "PROVIDER_ERROR",
      "errorMessage": "External service unavailable"
    },
    "timestamp": "2024-01-15T10:30:00.000Z",
    "correlationId": "correlation-123"
  },
  "timestamp": 1705312200000,
  "signature": "hmac-signature-if-secret-configured"
}
```

### Headers

The webhook request includes these headers:

- `Content-Type: application/json`
- `User-Agent: Arcube-Webhook-Dispatcher/1.0`
- `X-Webhook-Id: webhook-id`
- `X-Event-Type: cancellation.failed`
- `X-Correlation-Id: correlation-123`
- `X-Test-Event: true` (for test events)

### HMAC Signature

If a secret is configured, the webhook includes an HMAC-SHA256 signature:

```
signature = HMAC-SHA256(secret, JSON.stringify(event))
```

## Integration with Cancellation Service

The webhook system is fully integrated with the cancellation service. Events are automatically published at key points:

1. **Cancellation Started**: When cancellation process begins
2. **Cancellation Completed**: When cancellation succeeds
3. **Cancellation Failed**: When cancellation fails (with error details)
4. **Cancellation Partial**: When partial cancellation occurs

### Example Integration

```typescript
// In cancellation service
await this.publishCancellationEvent(
  CancellationEventType.CANCELLATION_FAILED,
  {
    orderId: order.id,
    productId: product.id,
    reason: payload.reason,
    errorCode: 'PROVIDER_ERROR',
    errorMessage: 'External service unavailable'
  },
  correlationId
);
```

## Error Handling

### Retry Logic

- **Max Retries**: Configurable (default: 3)
- **Retry Delay**: Exponential backoff (default: 5s, 10s, 20s)
- **Timeout**: Configurable (default: 10s)

### Delivery Status

- `pending`: Initial state
- `delivered`: Successfully delivered
- `failed`: Failed after max retries
- `retrying`: Currently retrying

### Error Tracking

All delivery attempts are tracked with:
- Attempt count
- Last attempt timestamp
- Error messages
- Response status codes

## Security Considerations

### URL Validation
- Validates URL format
- Configurable allowed domains
- Maximum URL length limits

### Authentication
- Multi-tier authentication system
- Role-based permissions
- API key management

### Payload Security
- HMAC signature verification
- Configurable secret requirements
- Payload size limits

### Rate Limiting
- Webhook registration limits
- Testing limits
- Delivery rate limits

## Monitoring and Observability

### Statistics Endpoint
```bash
GET /webhooks/stats/overview
```

Returns comprehensive statistics:
- Total webhooks (active/inactive)
- Webhooks by event type
- Delivery statistics (success rate, pending, failed)
- Performance metrics

### Logging
The system logs:
- Event publishing
- Webhook delivery attempts
- Error conditions
- Performance metrics

### Audit Trail
Complete audit trail for:
- Webhook registrations
- Delivery attempts
- Configuration changes
- Access patterns

## Best Practices

### Webhook Implementation
1. **Idempotency**: Handle duplicate events gracefully
2. **Quick Response**: Respond within 5 seconds
3. **Error Handling**: Return appropriate HTTP status codes
4. **Signature Verification**: Verify HMAC signatures
5. **Logging**: Log all received events

### Security
1. **HTTPS Only**: Use HTTPS for webhook URLs
2. **Secret Management**: Use strong, unique secrets
3. **Access Control**: Implement proper authentication
4. **Rate Limiting**: Respect rate limits
5. **Input Validation**: Validate all incoming data

### Monitoring
1. **Health Checks**: Monitor webhook endpoint health
2. **Success Rates**: Track delivery success rates
3. **Response Times**: Monitor webhook response times
4. **Error Alerts**: Set up alerts for delivery failures
5. **Usage Metrics**: Track webhook usage patterns

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook is active
   - Verify event types are subscribed
   - Check URL accessibility

2. **Delivery Failures**
   - Check webhook endpoint health
   - Verify response time < 10s
   - Check HTTP status codes

3. **Authentication Issues**
   - Verify API key/JWT validity
   - Check permission assignments
   - Confirm request source mapping

### Debug Commands

```bash
# Check webhook status
npm run webhook list

# Test webhook delivery
npm run webhook test --id "webhook-id"

# View delivery history
curl -H "Authorization: Bearer token" \
  "http://localhost:3000/webhooks/webhook-id/deliveries"

# Check statistics
npm run webhook stats
```

## Future Enhancements

### Planned Features
- **Webhook Templates**: Pre-configured webhook templates
- **Advanced Filtering**: Event filtering by order/product criteria
- **Webhook Scheduling**: Delayed webhook delivery
- **Bulk Operations**: Bulk webhook management
- **Webhook Analytics**: Advanced analytics and reporting
- **Webhook Marketplace**: Pre-built webhook integrations

### Performance Optimizations
- **Batch Processing**: Batch webhook deliveries
- **Connection Pooling**: Optimized HTTP connections
- **Caching**: Webhook configuration caching
- **Async Processing**: Background webhook processing
- **Load Balancing**: Distributed webhook delivery

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review webhook delivery logs
3. Use the CLI tools for debugging
4. Check webhook statistics for patterns
5. Contact the development team

---

**Note**: This webhook system is designed to be production-ready with comprehensive error handling, security measures, and monitoring capabilities. 