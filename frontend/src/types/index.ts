export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  walletBalance: number;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  transactions: WalletTransaction[];
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
  description?: string;
  reference?: string;
  createdAt: string;
}

export interface PaymentInitResponse {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
}

export interface PaymentTransaction {
  id: string;
  userId: string;
  amount: number;
  reference: string;
  provider: 'PAYSTACK' | 'MONEYFIRE';
  providerRef?: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export type Network = 'MTN' | 'AIRTEL' | 'GLO' | 'NINE_MOBILE';
export type ValueType = 'AIRTIME' | 'DATA';

export interface DataPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  validity: string;
  dataSize: string;
}

export interface DistributionBatch {
  id: string;
  userId: string;
  network: Network;
  valueType: ValueType;
  amount?: number;
  dataPlanId?: string;
  dataPlanName?: string;
  totalCost: number;
  recipientCount: number;
  successCount: number;
  failedCount: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'PARTIAL';
  createdAt: string;
  recipients?: RecipientTransaction[];
}

export interface RecipientTransaction {
  id: string;
  batchId: string;
  phoneNumber: string;
  amount: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED';
  providerRef?: string;
  errorMessage?: string;
  processedAt?: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
