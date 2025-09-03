export interface CreateDonation {
  amount: number;
  currency: string;
  status: 'SUCCEEDED' | 'FAILED' | 'PENDING';
  transactionId: string;
  donationType: 'USER' | 'PLATFORM' | 'ORGANIZATION';
  userId?: number | null;
  organizationId?: number | null;
  message?: string | null;
  name?: string | null;
  receiptUrl?: string | null;
}
