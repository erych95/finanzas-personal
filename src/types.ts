export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  category: string;
  description: string;
}

export type DebtType = 'credit_card' | 'cash' | 'loan' | 'other';
export type PaymentType = 'installments' | 'direct';

export interface DebtPayment {
  id: string;
  date: string;
  amount: number;
}

export interface Debt {
  id: string;
  name: string;
  type: DebtType;
  paymentType: PaymentType;
  totalAmount: number;
  remainingAmount: number;
  monthlyPayment: number;
  installmentsTotal?: number;
  installmentsPaid?: number;
  paymentHistory?: DebtPayment[];
  dueDate?: number;
  reminderEnabled?: boolean;
  notes?: string;
  tea?: number; // Tasa Efectiva Anual
  termInMonths?: number;
}

export interface SavingsGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

export interface Budget {
  category: string;
  amount: number;
}

export interface UserProfile {
  initialSavings: number;
  savingsTarget: number;
  savingsGoals?: SavingsGoal[];
  budgets?: Budget[];
}

export interface FinancialData {
  transactions: Transaction[];
  debts: Debt[];
  profile?: UserProfile;
  customIncomeCategories?: string[];
}
