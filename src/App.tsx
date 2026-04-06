import React, { useState } from 'react';
import { LayoutDashboard, ArrowRightLeft, CreditCard, BrainCircuit, LineChart } from 'lucide-react';
import { Transaction, Debt, DebtPayment, UserProfile } from './types';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Debts } from './components/Debts';
import { AIAdvisor } from './components/AIAdvisor';
import { Forecast } from './components/Forecast';

// --- Mock Data for initial state ---
const initialTransactions: Transaction[] = [
  { id: '1', type: 'income', amount: 3500, date: '2026-04-01', category: 'Salario', description: 'Sueldo mensual' },
  { id: '2', type: 'expense', amount: 800, date: '2026-04-02', category: 'Vivienda', description: 'Alquiler de habitación' },
  { id: '3', type: 'expense', amount: 300, date: '2026-04-05', category: 'Alimentación', description: 'Supermercado' },
];

const initialDebts: Debt[] = [
  { 
    id: '1', name: 'Tarjeta de Crédito Visa', type: 'credit_card', paymentType: 'installments', 
    totalAmount: 2500, remainingAmount: 1500, monthlyPayment: 250, installmentsTotal: 10, installmentsPaid: 4,
    paymentHistory: []
  },
];

type TabType = 'dashboard' | 'transactions' | 'debts' | 'forecast' | 'ai';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions);
  const [debts, setDebts] = useState<Debt[]>(initialDebts);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    initialSavings: 1000,
    savingsTarget: 500,
    savingsGoals: [],
    budgets: []
  });
  const [customIncomeCategories, setCustomIncomeCategories] = useState<string[]>([]);

  const handleUpdateBudget = (category: string, amount: number) => {
    const currentBudgets = userProfile.budgets || [];
    const existingIndex = currentBudgets.findIndex(b => b.category === category);
    let newBudgets;
    if (existingIndex >= 0) {
      newBudgets = [...currentBudgets];
      newBudgets[existingIndex] = { category, amount };
    } else {
      newBudgets = [...currentBudgets, { category, amount }];
    }
    setUserProfile({ ...userProfile, budgets: newBudgets });
  };

  const handleAddTransaction = (t: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...t, id: Math.random().toString(36).substr(2, 9) };
    setTransactions([...transactions, newTransaction]);
  };

  const handleDeleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const handleAddDebt = (d: Omit<Debt, 'id'>) => {
    const newDebt = { ...d, id: Math.random().toString(36).substr(2, 9) };
    setDebts([...debts, newDebt]);
  };

  const handleUpdateDebt = (updatedDebt: Debt) => {
    setDebts(debts.map(d => d.id === updatedDebt.id ? updatedDebt : d));
  };

  const handleDeleteDebt = (id: string) => {
    setDebts(debts.filter(d => d.id !== id));
  };

  const handleAddDebtPayment = (debtId: string, payment: Omit<DebtPayment, 'id'>) => {
    setDebts(debts.map(debt => {
      if (debt.id === debtId) {
        const newPayment = { ...payment, id: Math.random().toString(36).substr(2, 9) };
        const newRemaining = Math.max(0, debt.remainingAmount - payment.amount);
        const newInstallmentsPaid = debt.paymentType === 'installments' && debt.installmentsPaid !== undefined
          ? debt.installmentsPaid + 1
          : debt.installmentsPaid;

        return {
          ...debt,
          remainingAmount: newRemaining,
          installmentsPaid: newInstallmentsPaid,
          paymentHistory: [...(debt.paymentHistory || []), newPayment]
        };
      }
      return debt;
    }));
  };

  const handleToggleDebtReminder = (debtId: string, enabled: boolean) => {
    setDebts(debts.map(debt => 
      debt.id === debtId ? { ...debt, reminderEnabled: enabled } : debt
    ));
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard transactions={transactions} debts={debts} userProfile={userProfile} onUpdateProfile={setUserProfile} onAddTransaction={handleAddTransaction} />;
      case 'transactions':
        return <Transactions 
          transactions={transactions} 
          onAddTransaction={handleAddTransaction} 
          onDeleteTransaction={handleDeleteTransaction}
          customIncomeCategories={customIncomeCategories}
          onAddCustomIncomeCategory={(cat) => setCustomIncomeCategories([...customIncomeCategories, cat])}
          budgets={userProfile.budgets}
          onUpdateBudget={handleUpdateBudget}
        />;
      case 'debts':
        return <Debts debts={debts} onAddDebt={handleAddDebt} onDeleteDebt={handleDeleteDebt} onUpdateDebt={handleUpdateDebt} onAddDebtPayment={handleAddDebtPayment} onToggleReminder={handleToggleDebtReminder} />;
      case 'forecast':
        return <Forecast transactions={transactions} debts={debts} />;
      case 'ai':
        return <AIAdvisor data={{ transactions, debts, profile: userProfile }} />;
      default:
        return <Dashboard transactions={transactions} debts={debts} userProfile={userProfile} onUpdateProfile={setUserProfile} onAddTransaction={handleAddTransaction} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600 flex items-center">
            <BrainCircuit className="mr-2" />
            Finanzas IA
          </h1>
        </div>
        <nav className="px-4 pb-6 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <LayoutDashboard className="mr-3" size={20} />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <ArrowRightLeft className="mr-3" size={20} />
            Transacciones
          </button>
          <button
            onClick={() => setActiveTab('debts')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'debts' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <CreditCard className="mr-3" size={20} />
            Deudas
          </button>
          <button
            onClick={() => setActiveTab('forecast')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'forecast' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <LineChart className="mr-3" size={20} />
            Pronóstico
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'ai' ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <BrainCircuit className="mr-3" size={20} />
            Asesor IA
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
