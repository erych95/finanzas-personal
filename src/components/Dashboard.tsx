import React, { useState, useEffect } from 'react';
import { Transaction, Debt, UserProfile } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowDownCircle, ArrowUpCircle, CreditCard, Wallet, AlertTriangle, Bell, Settings, Check, PiggyBank, UserCircle, Target, Plus, Trash2 } from 'lucide-react';

interface DashboardProps {
  transactions: Transaction[];
  debts: Debt[];
  userProfile?: UserProfile;
  onUpdateProfile?: (profile: UserProfile) => void;
  onAddTransaction?: (t: Omit<Transaction, 'id'>) => void;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export function Dashboard({ transactions, debts, userProfile, onUpdateProfile, onAddTransaction }: DashboardProps) {
  const [lowBalanceThreshold, setLowBalanceThreshold] = useState(200);
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [tempThreshold, setTempThreshold] = useState(lowBalanceThreshold.toString());

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
  const [isAddingIncome, setIsAddingIncome] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ amount: '', description: '' });

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [tempProfile, setTempProfile] = useState<UserProfile>(userProfile || {
    initialSavings: 0,
    savingsTarget: 0,
    savingsGoals: []
  });

  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({ name: '', targetAmount: '', currentAmount: '', deadline: '' });

  const [loanCalc, setLoanCalc] = useState({ amount: '', tea: '', months: '', extraPayment: '' });
  const [calculatedPayment, setCalculatedPayment] = useState<{payment: number, totalInterest: number, savings: number} | null>(null);

  const calculateLoan = () => {
    const P = parseFloat(loanCalc.amount);
    const tea = parseFloat(loanCalc.tea) / 100;
    const n = parseInt(loanCalc.months);
    const extra = parseFloat(loanCalc.extraPayment) || 0;
    
    if (isNaN(P) || isNaN(tea) || isNaN(n)) return;
    
    const monthlyRate = Math.pow(1 + tea, 1 / 12) - 1;
    const payment = P * (monthlyRate * Math.pow(1 + monthlyRate, n)) / (Math.pow(1 + monthlyRate, n) - 1);
    const totalInterest = (payment * n) - P;
    
    // Simple estimation for savings with extra payments
    const newPayment = payment + extra;
    const newN = Math.log(newPayment / (newPayment - P * monthlyRate)) / Math.log(1 + monthlyRate);
    const totalInterestWithExtra = (newPayment * newN) - P;
    const savings = totalInterest - totalInterestWithExtra;

    setCalculatedPayment({ payment, totalInterest, savings });
  };

  const monthlyTransactions = transactions.filter(t => t.date.startsWith(selectedMonth));
  
  const totalIncome = monthlyTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = monthlyTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  
  const savingsTarget = userProfile?.savingsTarget || 0;
  const initialSavings = userProfile?.initialSavings || 0;

  const availableIncome = totalIncome - savingsTarget;
  const balance = availableIncome - totalExpense;
  const totalSavings = initialSavings + savingsTarget;

  const totalDebt = debts.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const monthlyDebtPayment = debts.reduce((acc, curr) => acc + curr.monthlyPayment, 0);

  // Alerts logic
  const currentMonth = new Date().toISOString().slice(0, 7);
  const upcomingBills = debts.filter(debt => {
    if (debt.remainingAmount <= 0 || debt.monthlyPayment <= 0) return false;
    if (debt.reminderEnabled === false) return false; // Respect the reminder setting
    const paidThisMonth = debt.paymentHistory?.some(p => p.date.startsWith(currentMonth));
    return !paidThisMonth;
  });

  const isLowBalance = balance < lowBalanceThreshold;

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const notifiedDebts = JSON.parse(localStorage.getItem('notifiedDebts') || '[]');
    upcomingBills.forEach(debt => {
      if (Notification.permission === 'granted' && !notifiedDebts.includes(debt.id)) {
        new Notification(`Recordatorio de pago: ${debt.name}`, {
          body: `Tu pago de ${formatCurrency(debt.monthlyPayment)} vence próximamente.`,
        });
        localStorage.setItem('notifiedDebts', JSON.stringify([...notifiedDebts, debt.id]));
      }
    });
  }, [upcomingBills]);

  const handleSaveThreshold = () => {
    const val = Number(tempThreshold);
    if (!isNaN(val) && val >= 0) {
      setLowBalanceThreshold(val);
    }
    setIsEditingThreshold(false);
  };

  const handleSaveProfile = () => {
    if (onUpdateProfile) {
      onUpdateProfile(tempProfile);
    }
    setIsEditingProfile(false);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoal.name || !newGoal.targetAmount) return;

    const goal = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGoal.name,
      targetAmount: Number(newGoal.targetAmount),
      currentAmount: Number(newGoal.currentAmount) || 0,
      deadline: newGoal.deadline
    };

    const updatedProfile = {
      ...tempProfile,
      savingsGoals: [...(tempProfile.savingsGoals || []), goal]
    };

    setTempProfile(updatedProfile);
    if (onUpdateProfile) {
      onUpdateProfile(updatedProfile);
    }

    setIsAddingGoal(false);
    setNewGoal({ name: '', targetAmount: '', currentAmount: '', deadline: '' });
  };

  const handleDeleteGoal = (id: string) => {
    const updatedProfile = {
      ...tempProfile,
      savingsGoals: (tempProfile.savingsGoals || []).filter(g => g.id !== id)
    };
    setTempProfile(updatedProfile);
    if (onUpdateProfile) {
      onUpdateProfile(updatedProfile);
    }
  };

  const exportToCSV = () => {
    const csvRows = [];
    
    // Transactions
    csvRows.push(['--- Transacciones ---']);
    csvRows.push(['ID', 'Tipo', 'Monto', 'Fecha', 'Categoría', 'Descripción']);
    transactions.forEach(t => csvRows.push([t.id, t.type, t.amount, t.date, t.category, t.description]));
    
    // Debts
    csvRows.push(['--- Deudas ---']);
    csvRows.push(['ID', 'Nombre', 'Tipo', 'Monto Total', 'Monto Restante', 'Pago Mensual']);
    debts.forEach(d => csvRows.push([d.id, d.name, d.type, d.totalAmount, d.remainingAmount, d.monthlyPayment]));
    
    // Profile
    csvRows.push(['--- Perfil ---']);
    csvRows.push(['Ahorro Inicial', 'Meta de Ahorro']);
    csvRows.push([userProfile?.initialSavings || 0, userProfile?.savingsTarget || 0]);

    const csvString = csvRows.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'finanzas_personales.csv';
    a.click();
  };

  const handleUpdateGoalAmount = (id: string, amount: number) => {
    const updatedProfile = {
      ...tempProfile,
      savingsGoals: (tempProfile.savingsGoals || []).map(g => 
        g.id === id ? { ...g, currentAmount: amount } : g
      )
    };
    setTempProfile(updatedProfile);
    if (onUpdateProfile) {
      onUpdateProfile(updatedProfile);
    }
  };

  const handleAddIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.amount || !onAddTransaction) return;
    
    onAddTransaction({
      type: 'income',
      amount: Number(incomeForm.amount),
      date: new Date().toISOString().split('T')[0],
      category: 'Salario / Ingreso Extra',
      description: incomeForm.description || 'Ingreso del mes'
    });
    
    setIsAddingIncome(false);
    setIncomeForm({ amount: '', description: '' });
  };

  // Data for charts
  const expensesByCategory = monthlyTransactions
    .filter(t => t.type === 'expense')
    .reduce((acc, curr) => {
      const existing = acc.find(item => item.name === curr.category);
      if (existing) {
        existing.value += curr.amount;
      } else {
        acc.push({ name: curr.category, value: curr.amount });
      }
      return acc;
    }, [] as { name: string; value: number }[]);

  // Group transactions by month for bar chart (simplified to just show recent transactions by date for now)
  const recentTransactions = [...monthlyTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-10);
  const barChartData = recentTransactions.map(t => ({
    date: t.date,
    ingresos: t.type === 'income' ? t.amount : 0,
    gastos: t.type === 'expense' ? t.amount : 0,
  }));

  const totalTargetAmount = userProfile?.savingsGoals?.reduce((sum, g) => sum + g.targetAmount, 0) || 0;
  const totalCurrentAmount = userProfile?.savingsGoals?.reduce((sum, g) => sum + g.currentAmount, 0) || 0;
  const savingsRate = userProfile?.savingsTarget || 0;
  const monthsToGoal = savingsRate > 0 ? Math.ceil((totalTargetAmount - totalCurrentAmount) / savingsRate) : Infinity;

  const monthlyExpenses = transactions.filter(t => t.date.startsWith(selectedMonth) && t.type === 'expense');
  const budgetSummary = (userProfile?.budgets || []).map(b => {
    const spent = monthlyExpenses.filter(t => t.category === b.category).reduce((sum, t) => sum + t.amount, 0);
    return { ...b, spent };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Resumen Financiero</h2>
        <div className="flex items-center gap-2">
          <button onClick={exportToCSV} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700">
            Exportar Datos (CSV)
          </button>
          <div className="flex items-center space-x-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-100">
            <span className="text-sm text-gray-500 font-medium">Mes:</span>
            <input 
              type="month" 
              className="text-sm font-medium text-indigo-700 outline-none bg-transparent cursor-pointer"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Metas de Ahorro</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Progreso Total</span>
              <span className="text-xl font-bold text-indigo-600">
                {totalTargetAmount > 0 ? Math.round((totalCurrentAmount / totalTargetAmount) * 100) : 0}%
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-3">
              <div className="bg-indigo-500 h-3 rounded-full" style={{ width: `${totalTargetAmount > 0 ? (totalCurrentAmount / totalTargetAmount) * 100 : 0}%` }}></div>
            </div>
            <p className="text-sm text-gray-600">
              Estimación para alcanzar todas las metas: <span className="font-semibold">{monthsToGoal === Infinity ? 'N/A' : `${monthsToGoal} meses`}</span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Resumen de Presupuestos</h3>
          <div className="space-y-4">
            {budgetSummary.map(b => (
              <div key={b.category} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>{b.category}</span>
                  <span>{formatCurrency(b.spent)} / {formatCurrency(b.amount)}</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2">
                  <div className={cn("h-2 rounded-full", b.spent > b.amount ? "bg-red-500" : "bg-green-500")} style={{ width: `${Math.min(100, (b.spent / b.amount) * 100)}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Alerts Section */}
      {upcomingBills.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
          <h3 className="text-amber-800 font-semibold mb-2 flex items-center">
            <AlertTriangle className="mr-2" size={20} />
            Pagos Pendientes este mes
          </h3>
          <ul className="list-disc list-inside text-amber-700 text-sm">
            {upcomingBills.map(debt => (
              <li key={debt.id}>{debt.name}: {formatCurrency(debt.monthlyPayment)}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Calculadora de Préstamo Consolidado</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input type="number" placeholder="Monto (S/)" className="border rounded-md px-3 py-2" value={loanCalc.amount} onChange={e => setLoanCalc({...loanCalc, amount: e.target.value})} />
          <input type="number" placeholder="TEA (%)" className="border rounded-md px-3 py-2" value={loanCalc.tea} onChange={e => setLoanCalc({...loanCalc, tea: e.target.value})} />
          <input type="number" placeholder="Meses" className="border rounded-md px-3 py-2" value={loanCalc.months} onChange={e => setLoanCalc({...loanCalc, months: e.target.value})} />
          <input type="number" placeholder="Pago Extra (S/)" className="border rounded-md px-3 py-2" value={loanCalc.extraPayment} onChange={e => setLoanCalc({...loanCalc, extraPayment: e.target.value})} />
          <button onClick={calculateLoan} className="bg-indigo-600 text-white rounded-md px-4 py-2 hover:bg-indigo-700 col-span-full">Calcular</button>
        </div>
        {calculatedPayment !== null && (
          <div className="mt-4 p-3 bg-indigo-50 rounded-md text-indigo-800 font-semibold space-y-2">
            <div>Cuota mensual estimada: {formatCurrency(calculatedPayment.payment)}</div>
            <div>Interés total pagado: {formatCurrency(calculatedPayment.totalInterest)}</div>
            {calculatedPayment.savings > 0 && (
              <div className="text-green-700">Ahorro estimado con pagos extra: {formatCurrency(calculatedPayment.savings)}</div>
            )}
          </div>
        )}
      </div>

      {/* Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <UserCircle className="mr-2 text-indigo-600" size={24} />
              Mi Perfil Financiero
            </h3>
            {!isEditingProfile ? (
              <button 
                onClick={() => setIsEditingProfile(true)}
                className="text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200 transition-colors flex items-center"
              >
                <Settings size={16} className="mr-1" />
                Configurar
              </button>
            ) : (
              <div className="flex space-x-2">
                <button 
                  onClick={() => {
                    setTempProfile(userProfile || { initialSavings: 0, savingsTarget: 0, savingsGoals: [] });
                    setIsEditingProfile(false);
                  }}
                  className="text-sm text-gray-600 px-3 py-1.5 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveProfile}
                  className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors flex items-center"
                >
                  <Check size={16} className="mr-1" />
                  Guardar
                </button>
              </div>
            )}
          </div>

          {isEditingProfile ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Ahorros Actuales (S/)</label>
                <input 
                  type="number" 
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500"
                  value={tempProfile.initialSavings}
                  onChange={(e) => setTempProfile({ ...tempProfile, initialSavings: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Monto a Separar para Ahorro (S/)</label>
                <input 
                  type="number" 
                  className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 outline-none focus:border-indigo-500"
                  value={tempProfile.savingsTarget}
                  onChange={(e) => setTempProfile({ ...tempProfile, savingsTarget: Number(e.target.value) })}
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                <p className="text-xs text-gray-500">Ahorros Actuales</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(initialSavings)}</p>
              </div>
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                <p className="text-xs text-indigo-600 font-medium">Monto Separado (Ahorro)</p>
                <p className="text-lg font-bold text-indigo-700">{formatCurrency(savingsTarget)}</p>
              </div>
            </div>
          )}
        </div>

                    {/* Savings Goals Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Target className="mr-2 text-emerald-600" size={24} />
              Metas de Ahorro
            </h3>
            <button 
              onClick={() => setIsAddingGoal(!isAddingGoal)}
              className="text-sm bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-md hover:bg-emerald-100 transition-colors flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Nueva Meta
            </button>
          </div>

          {isAddingGoal && (
            <form onSubmit={handleAddGoal} className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nombre de la Meta</label>
                  <input 
                    type="text" required
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 outline-none focus:border-emerald-500"
                    value={newGoal.name} onChange={e => setNewGoal({...newGoal, name: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Monto Objetivo (S/)</label>
                  <input 
                    type="number" required min="1"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 outline-none focus:border-emerald-500"
                    value={newGoal.targetAmount} onChange={e => setNewGoal({...newGoal, targetAmount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ahorro Actual (S/)</label>
                  <input 
                    type="number" min="0"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 outline-none focus:border-emerald-500"
                    value={newGoal.currentAmount} onChange={e => setNewGoal({...newGoal, currentAmount: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha Límite (Opcional)</label>
                  <input 
                    type="date"
                    className="w-full text-sm border border-gray-300 rounded-md px-3 py-1.5 outline-none focus:border-emerald-500"
                    value={newGoal.deadline} onChange={e => setNewGoal({...newGoal, deadline: e.target.value})}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <button type="button" onClick={() => setIsAddingGoal(false)} className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded-md">Cancelar</button>
                <button type="submit" className="text-xs px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-md">Guardar Meta</button>
              </div>
            </form>
          )}

          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {(!tempProfile.savingsGoals || tempProfile.savingsGoals.length === 0) && !isAddingGoal ? (
              <p className="text-sm text-gray-500 text-center py-4">No tienes metas de ahorro configuradas.</p>
            ) : (
              tempProfile.savingsGoals?.map(goal => {
                const progress = Math.min(100, Math.round((goal.currentAmount / goal.targetAmount) * 100));
                const remaining = goal.targetAmount - goal.currentAmount;
                const monthsToGoal = savingsRate > 0 ? Math.ceil(remaining / savingsRate) : Infinity;
                const estimatedDate = monthsToGoal !== Infinity 
                  ? new Date(new Date().setMonth(new Date().getMonth() + monthsToGoal)).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })
                  : 'N/A';

                return (
                  <div key={goal.id} className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium text-gray-800 text-sm">{goal.name}</h4>
                        <p className="text-xs text-gray-500">
                          Meta: {formatCurrency(goal.targetAmount)} | Estimado: {estimatedDate}
                        </p>
                      </div>
                      <button onClick={() => handleDeleteGoal(goal.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-medium text-emerald-600">{progress}% completado</span>
                      <span className="text-gray-500">{formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Always show balance alert box if editing, or if low balance */}
        {(isLowBalance || isEditingThreshold) && (
          <div className={`p-4 rounded-r-lg flex items-start border-l-4 ${isLowBalance ? 'bg-red-50 border-red-500' : 'bg-gray-50 border-gray-400'}`}>
            <AlertTriangle className={`${isLowBalance ? 'text-red-500' : 'text-gray-500'} mr-3 mt-0.5 flex-shrink-0`} size={20} />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className={`${isLowBalance ? 'text-red-800' : 'text-gray-800'} font-medium text-sm`}>
                  {isLowBalance ? 'Alerta de Saldo Bajo' : 'Configurar Alerta de Saldo'}
                </h3>
                {!isEditingThreshold && (
                  <button onClick={() => setIsEditingThreshold(true)} className="text-gray-400 hover:text-gray-600">
                    <Settings size={14} />
                  </button>
                )}
              </div>
              
              {isEditingThreshold ? (
                <div className="mt-2 flex items-center space-x-2">
                  <span className="text-xs text-gray-600">Umbral: S/</span>
                  <input 
                    type="number" 
                    className="w-20 text-xs border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                    value={tempThreshold}
                    onChange={(e) => setTempThreshold(e.target.value)}
                  />
                  <button onClick={handleSaveThreshold} className="bg-indigo-100 text-indigo-700 p-1 rounded hover:bg-indigo-200">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <p className={`${isLowBalance ? 'text-red-700' : 'text-gray-600'} text-xs mt-1`}>
                  Tu balance actual ({formatCurrency(balance)}) está por debajo del umbral de seguridad ({formatCurrency(lowBalanceThreshold)}).
                </p>
              )}
            </div>
          </div>
        )}
        
        {upcomingBills.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg flex items-start">
            <Bell className="text-amber-500 mr-3 mt-0.5 flex-shrink-0" size={20} />
            <div>
              <h3 className="text-amber-800 font-medium text-sm">Recordatorio de Pagos ({upcomingBills.length})</h3>
              <ul className="text-amber-700 text-xs mt-1 space-y-1">
                {upcomingBills.slice(0, 3).map(bill => (
                  <li key={bill.id}>
                    • {bill.name}: {formatCurrency(bill.monthlyPayment)}
                    {bill.dueDate && <span className="font-medium ml-1">(Vence el día {bill.dueDate})</span>}
                  </li>
                ))}
                {upcomingBills.length > 3 && <li>• ...y {upcomingBills.length - 3} más</li>}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-6 rounded-xl shadow-md text-white flex items-center space-x-4 lg:col-span-2">
          <div className="p-3 bg-white/20 rounded-full">
            <Wallet size={32} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-blue-100 font-medium">Balance Disponible</p>
            <p className="text-4xl font-bold">{formatCurrency(balance)}</p>
            <p className="text-xs text-blue-200 mt-1">Excluye ahorro separado</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-xl shadow-md text-white flex items-center space-x-4 lg:col-span-2">
          <div className="p-3 bg-white/20 rounded-full">
            <PiggyBank size={32} className="text-white" />
          </div>
          <div>
            <p className="text-sm text-emerald-100 font-medium">Ahorros Totales</p>
            <p className="text-4xl font-bold">{formatCurrency(totalSavings)}</p>
            <p className="text-xs text-emerald-200 mt-1">Ahorros actuales + Monto separado</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <div className="flex items-center space-x-4 mb-3">
            <div className="p-3 bg-green-100 text-green-600 rounded-full">
              <ArrowUpCircle size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalIncome)}</p>
            </div>
          </div>
          
          {!isAddingIncome ? (
            <button 
              onClick={() => setIsAddingIncome(true)}
              className="text-xs bg-green-50 text-green-700 hover:bg-green-100 py-1.5 px-3 rounded-md transition-colors font-medium text-center w-full"
            >
              + Registrar Ingreso
            </button>
          ) : (
            <form onSubmit={handleAddIncome} className="mt-2 space-y-2">
              <input 
                type="number" 
                step="0.01"
                required
                placeholder="Monto (S/)"
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-green-500"
                value={incomeForm.amount}
                onChange={e => setIncomeForm({...incomeForm, amount: e.target.value})}
              />
              <input 
                type="text" 
                placeholder="Descripción (opcional)"
                className="w-full text-xs border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-green-500"
                value={incomeForm.description}
                onChange={e => setIncomeForm({...incomeForm, description: e.target.value})}
              />
              <div className="flex space-x-2">
                <button type="button" onClick={() => setIsAddingIncome(false)} className="flex-1 text-xs py-1.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 text-xs py-1.5 text-white bg-green-600 hover:bg-green-700 rounded transition-colors">Guardar</button>
              </div>
            </form>
          )}
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-full">
            <ArrowDownCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Gastos Totales</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalExpense)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 lg:col-span-2">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
            <CreditCard size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Deuda Total</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalDebt)}</p>
            <p className="text-xs text-gray-400 mt-1">Pago mensual: {formatCurrency(monthlyDebtPayment)}</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Flujo de Caja Reciente</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} tickFormatter={(val) => `S/ ${val}`} />
                <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Gastos por Categoría</h3>
          <div className="h-72">
            {expensesByCategory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={expensesByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {expensesByCategory.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No hay gastos registrados
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Reports Section */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold mb-4">Reporte Mensual: {selectedMonth}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm text-green-600 font-medium">Ingresos</p>
            <p className="text-2xl font-bold text-green-800">{formatCurrency(totalIncome)}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-lg">
            <p className="text-sm text-red-600 font-medium">Gastos</p>
            <p className="text-2xl font-bold text-red-800">{formatCurrency(totalExpense)}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-600 font-medium">Ahorro</p>
            <p className="text-2xl font-bold text-blue-800">{formatCurrency(totalIncome - totalExpense)}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-purple-600 font-medium">Progreso Deuda</p>
            <p className="text-2xl font-bold text-purple-800">{formatCurrency(monthlyDebtPayment)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
