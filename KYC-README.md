# KYC Verification Service

This service handles Know Your Customer (KYC) verification using Onfido and Cloudinary for document verification and storage.

## Features

- Document upload and storage with Cloudinary
- Identity verification with Onfido
- KYC status tracking
- Webhook integration for real-time updates

## Prerequisites

- Node.js 16+
- PostgreSQL
- Cloudinary account
- Onfido account

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   - Copy `.env.example` to `.env`
   - Update the values with your configuration

3. **Database setup**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Start the server**
   ```bash
   npm run dev
   ```

## API Endpoints

### Submit KYC Documents
```
POST /api/kyc/verify
Content-Type: multipart/form-data
Authorization: Bearer <token>

Fields:
- nationalId: File (required) - National ID or Passport
- selfie: File (required) - Selfie holding the ID
```

### Check KYC Status
```
GET /api/kyc/status
Authorization: Bearer <token>
```

### Webhook (Onfido Callback)
```
POST /api/kyc/webhook
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PORT` | Server port |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT secret key |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `ONFIDO_API_TOKEN` | Onfido API token |
| `ONFIDO_REGION` | Onfido region (EU/US) |
| `WEBHOOK_BASE_URL` | Base URL for webhook callbacks |

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

## Security Considerations

- Always use HTTPS in production
- Keep your API keys and secrets secure
- Implement rate limiting
- Validate all user inputs
- Set appropriate CORS policies

## License

MIT
