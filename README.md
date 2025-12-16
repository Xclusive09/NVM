# NVM Wallet - Bulk Airtime & Data Distribution Platform

A wallet-based bulk airtime and data distribution web platform for Nigeria. The system allows authenticated users to fund an internal wallet, select a mobile network, and send airtime or mobile data to multiple phone numbers at once.

## Features

### Authentication
- User signup and login
- JWT-based authentication
- Protected routes

### Wallet System
- Wallet balance management
- Transaction history (credit/debit)
- Secure balance tracking

### Payment Integration
- Paystack payment gateway integration
- Webhook handling for payment confirmation
- Transaction reference verification

### Airtime & Data Distribution
- Support for Nigerian networks: MTN, Airtel, Glo, 9mobile
- Airtime distribution with custom amounts
- Data plan selection per network
- CSV upload support for phone numbers
- Comma-separated phone number input
- Phone number validation
- Batch processing with BullMQ
- Per-recipient success/failure tracking

### Transaction Logs
- Wallet funding history
- Distribution batch history
- Per-recipient transaction status

## Tech Stack

### Backend
- **Node.js** with **NestJS** framework
- **PostgreSQL** database
- **Prisma ORM**
- **Redis** for queues
- **BullMQ** for batch processing
- **Paystack** for payments

### Frontend
- **React.js** with TypeScript
- **Tailwind CSS** for styling
- **React Router** for navigation
- **PWA support** (offline shell, installable)

## Project Structure

```
NVM/
├── backend/                 # NestJS backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── wallet/         # Wallet management
│   │   ├── payment/        # Payment processing
│   │   ├── distribution/   # Airtime/data distribution
│   │   ├── prisma/         # Database service
│   │   └── common/         # Shared utilities
│   └── prisma/
│       └── schema.prisma   # Database schema
│
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── context/        # React context
│   │   ├── lib/            # API client
│   │   └── types/          # TypeScript types
│   └── public/
│       ├── manifest.json   # PWA manifest
│       └── sw.js           # Service worker
│
└── README.md
```

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL
- Redis

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file and configure:
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. Generate Prisma client:
   ```bash
   npx prisma generate
   ```

5. Run database migrations:
   ```bash
   npx prisma migrate dev
   ```

6. Start the development server:
   ```bash
   npm run start:dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Environment Variables

### Backend (.env)
| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| JWT_SECRET | Secret key for JWT tokens |
| JWT_EXPIRES_IN | Token expiration time |
| PAYSTACK_SECRET_KEY | Paystack secret key |
| REDIS_HOST | Redis host |
| REDIS_PORT | Redis port |
| AIRTIME_PROVIDER_API_KEY | Airtime provider API key |
| AIRTIME_PROVIDER_BASE_URL | Airtime provider base URL |

### Frontend (.env)
| Variable | Description |
|----------|-------------|
| VITE_API_URL | Backend API URL |

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user

### Wallet
- `GET /api/wallet` - Get wallet details
- `GET /api/wallet/balance` - Get wallet balance
- `GET /api/wallet/transactions` - Get transaction history

### Payment
- `POST /api/payment/initialize` - Initialize payment
- `GET /api/payment/verify` - Verify payment
- `POST /api/payment/webhook` - Paystack webhook
- `GET /api/payment/history` - Payment history

### Distribution
- `POST /api/distribution` - Create distribution batch
- `GET /api/distribution/batches` - List distribution batches
- `GET /api/distribution/batches/:id` - Get batch details
- `GET /api/distribution/data-plans/:network` - Get data plans

## Architecture Rules

1. **Wallet balance lives only in the backend** - Frontend cannot modify wallet directly
2. **Every wallet operation creates a transaction record** - For audit trail
3. **Payment webhooks are idempotent** - Prevents duplicate processing
4. **Wallet balance can never be negative** - Enforced at database level
5. **Wallet debit happens before disbursement** - Ensures funds availability
6. **A batch uses one network and one value type** - No mixing networks
7. **External API failures don't corrupt wallet state** - Atomic transactions

## Database Models

- **User** - User account information
- **Wallet** - User wallet with balance
- **WalletTransaction** - Credit/debit records
- **PaymentTransaction** - Payment gateway transactions
- **DistributionBatch** - Bulk distribution batches
- **RecipientTransaction** - Per-recipient status
- **DataPlan** - Available data plans

## License

MIT