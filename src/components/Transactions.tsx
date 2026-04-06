import React, { useState } from 'react';
import { Transaction, Budget } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { Plus, Trash2, Search, Filter, Settings, PieChart } from 'lucide-react';

interface TransactionsProps {
  transactions: Transaction[];
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
  onDeleteTransaction: (id: string) => void;
  customIncomeCategories?: string[];
  onAddCustomIncomeCategory?: (cat: string) => void;
  budgets?: Budget[];
  onUpdateBudget?: (category: string, amount: number) => void;
}

const DEFAULT_CATEGORIES = {
  income: ['Salario', 'Ingreso Extra', 'Ventas', 'Inversiones', 'Otros Ingresos'],
  expense: ['Vivienda', 'Alimentación', 'Transporte', 'Servicios', 'Deudas', 'Entretenimiento', 'Salud', 'Otros Gastos']
};

export function Transactions({ transactions, onAddTransaction, onDeleteTransaction, customIncomeCategories = [], onAddCustomIncomeCategory, budgets = [], onUpdateBudget }: TransactionsProps) {
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isManagingBudgets, setIsManagingBudgets] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense');

  // Combine default and custom categories
  const categories = {
    income: [...DEFAULT_CATEGORIES.income, ...customIncomeCategories],
    expense: DEFAULT_CATEGORIES.expense
  };

  const [isAdding, setIsAdding] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<string[]>([]);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    category: categories.expense[0],
    description: ''
  });

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    
    if (newCategoryType === 'income' && onAddCustomIncomeCategory && !categories.income.includes(newCategoryName.trim())) {
      onAddCustomIncomeCategory(newCategoryName.trim());
    }
    
    setNewCategoryName('');
  };

  const toggleTransactionSelection = (id: string) => {
    setSelectedTransactionIds(prev => 
      prev.includes(id) ? prev.filter(tid => tid !== id) : [...prev, id]
    );
  };

  const toggleAllTransactions = (transactions: Transaction[]) => {
    if (selectedTransactionIds.length === transactions.length) {
      setSelectedTransactionIds([]);
    } else {
      setSelectedTransactionIds(transactions.map(t => t.id));
    }
  };

  const handleBulkDelete = () => {
    selectedTransactionIds.forEach(id => onDeleteTransaction(id));
    setSelectedTransactionIds([]);
    setIsBulkEditMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || isNaN(Number(formData.amount))) return;
    
    onAddTransaction({
      type: formData.type,
      amount: Number(formData.amount),
      date: formData.date,
      category: formData.category,
      description: formData.description
    });
    
    setIsAdding(false);
    setFormData({ ...formData, amount: '', description: '' });
  };

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    const matchesCategory = filterCategory === 'all' || t.category === filterCategory;
    const matchesStartDate = !startDate || t.date >= startDate;
    const matchesEndDate = !endDate || t.date <= endDate;
    
    return matchesSearch && matchesType && matchesCategory && matchesStartDate && matchesEndDate;
  });

  const sortedTransactions = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Transacciones</h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsBulkEditMode(!isBulkEditMode)}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
          >
            {isBulkEditMode ? 'Cancelar' : 'Edición Masiva'}
          </button>
          <button 
            onClick={() => setIsManagingBudgets(!isManagingBudgets)}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
          >
            <PieChart size={16} className="mr-2" />
            Presupuestos
          </button>
          <button 
            onClick={() => setIsManagingCategories(!isManagingCategories)}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
          >
            <Settings size={16} className="mr-2" />
            Categorías
          </button>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Nueva Transacción
          </button>
        </div>
      </div>

      {isBulkEditMode && (
        <div className="bg-indigo-50 p-4 rounded-lg flex items-center justify-between">
          <span className="text-sm text-indigo-700 font-medium">
            {selectedTransactionIds.length} seleccionadas
          </span>
          <div className="flex gap-2">
            <button onClick={handleBulkDelete} className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700">
              Eliminar
            </button>
          </div>
        </div>
      )}

      {isManagingBudgets && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4">Configurar Presupuestos Mensuales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.expense.map(cat => {
              const budget = budgets.find(b => b.category === cat)?.amount || 0;
              return (
                <div key={cat} className="flex flex-col space-y-1">
                  <label className="text-sm text-gray-600">{cat}</label>
                  <input 
                    type="number"
                    className="border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-indigo-500"
                    value={budget}
                    onChange={(e) => onUpdateBudget?.(cat, Number(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isManagingCategories && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold mb-4">Gestionar Categorías</h3>
          
          <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
            <select
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense')}
            >
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
            <input
              type="text"
              placeholder="Nueva categoría..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Agregar
            </button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-red-600 mb-3">Categorías de Gastos</h4>
              <ul className="space-y-2">
                {categories.expense.map(cat => (
                  <li key={cat} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md">
                    <span className="text-sm text-gray-700">{cat}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-green-600 mb-3">Categorías de Ingresos</h4>
              <ul className="space-y-2">
                {categories.income.map(cat => (
                  <li key={cat} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-md">
                    <span className="text-sm text-gray-700">{cat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold mb-4">Agregar Transacción</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.type}
                onChange={(e) => {
                  const type = e.target.value as 'income' | 'expense';
                  setFormData({ ...formData, type, category: categories[type][0] || '' });
                }}
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto (S/)</label>
              <input 
                type="number" 
                step="0.01"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
              <input 
                type="date" 
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              >
                {categories[formData.type].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <input 
                type="text" 
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Ej. Alquiler de habitación"
              />
            </div>

            <div className="lg:col-span-3 flex justify-end space-x-3 mt-2">
              <button 
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar transacciones..." 
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value as any);
              setFilterCategory('all');
            }}
          >
            <option value="all">Todos los tipos</option>
            <option value="income">Ingresos</option>
            <option value="expense">Gastos</option>
          </select>
          
          <select 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            <option value="all">Todas las categorías</option>
            {filterType === 'all' 
              ? [...categories.income, ...categories.expense].map(c => <option key={c} value={c}>{c}</option>)
              : categories[filterType].map(c => <option key={c} value={c}>{c}</option>)
            }
          </select>

          <input 
            type="date" 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            title="Fecha inicio"
          />
          <input 
            type="date" 
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            title="Fecha fin"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {isBulkEditMode && <th className="px-6 py-4"><input type="checkbox" onChange={() => toggleAllTransactions(sortedTransactions)} checked={selectedTransactionIds.length === sortedTransactions.length && sortedTransactions.length > 0} /></th>}
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Fecha</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Descripción</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Categoría</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600">Presupuesto</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-right">Monto</th>
                <th className="px-6 py-4 text-sm font-semibold text-gray-600 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={isBulkEditMode ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                    No hay transacciones registradas.
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((t) => {
                  const budget = budgets.find(b => b.category === t.category);
                  const spentInCategory = transactions
                    .filter(tr => tr.type === 'expense' && tr.category === t.category && tr.date.startsWith(t.date.slice(0, 7)))
                    .reduce((sum, tr) => sum + tr.amount, 0);
                  
                  return (
                    <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                      {isBulkEditMode && <td className="px-6 py-4"><input type="checkbox" checked={selectedTransactionIds.includes(t.id)} onChange={() => toggleTransactionSelection(t.id)} /></td>}
                      <td className="px-6 py-4 text-sm text-gray-600">{t.date}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{t.description}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {t.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {budget ? (
                          <div className="w-24">
                            <div className="text-xs mb-1">{formatCurrency(spentInCategory)} / {formatCurrency(budget.amount)}</div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5">
                              <div className={cn("h-1.5 rounded-full", spentInCategory > budget.amount ? "bg-red-500" : "bg-green-500")} style={{ width: `${Math.min(100, (spentInCategory / budget.amount) * 100)}%` }}></div>
                            </div>
                          </div>
                        ) : '-'}
                      </td>
                      <td className={cn(
                        "px-6 py-4 text-sm font-bold text-right",
                        t.type === 'income' ? "text-green-600" : "text-red-600"
                      )}>
                        {t.type === 'income' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => onDeleteTransaction(t.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors p-1"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
