import React, { useState } from 'react';
import { Debt, DebtPayment } from '../types';
import { formatCurrency } from '../lib/utils';
import { Plus, Trash2, CreditCard, Banknote, Landmark, FileText, History, Calculator, Bell, BellOff } from 'lucide-react';

interface DebtsProps {
  debts: Debt[];
  onAddDebt: (d: Omit<Debt, 'id'>) => void;
  onDeleteDebt: (id: string) => void;
  onUpdateDebt: (d: Debt) => void;
  onAddDebtPayment: (debtId: string, payment: Omit<DebtPayment, 'id'>) => void;
  onToggleReminder?: (debtId: string, enabled: boolean) => void;
}

const DEBT_TYPES = [
  { id: 'credit_card', label: 'Tarjeta de Crédito', icon: CreditCard },
  { id: 'cash', label: 'Efectivo / Personal', icon: Banknote },
  { id: 'loan', label: 'Préstamo Bancario', icon: Landmark },
  { id: 'other', label: 'Otro', icon: FileText },
];

export function Debts({ debts, onAddDebt, onDeleteDebt, onUpdateDebt, onAddDebtPayment, onToggleReminder }: DebtsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [expandedHistory, setExpandedHistory] = useState<string | null>(null);
  const [addingPaymentFor, setAddingPaymentFor] = useState<string | null>(null);
  const [simulatingFor, setSimulatingFor] = useState<string | null>(null);
  const [simulationAmount, setSimulationAmount] = useState<string>('');
  const [simulationCount, setSimulationCount] = useState<string>('1');
  const [calculatedSimulation, setCalculatedSimulation] = useState<number | null>(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: new Date().toISOString().split('T')[0] });
  const [debtToDelete, setDebtToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'amount' | 'dueDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const totalDebts = debts.length;
  const totalOwed = debts.reduce((sum, debt) => sum + debt.remainingAmount, 0);
  const totalMonthly = debts.reduce((sum, debt) => sum + debt.monthlyPayment, 0);

  const [formData, setFormData] = useState({
    name: '',
    type: 'credit_card' as Debt['type'],
    paymentType: 'installments' as Debt['paymentType'],
    totalAmount: '',
    remainingAmount: '',
    monthlyPayment: '',
    installmentsTotal: '',
    installmentsPaid: '0',
    dueDate: '',
    reminderEnabled: true,
    notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.totalAmount || !formData.remainingAmount) return;
    
    onAddDebt({
      name: formData.name,
      type: formData.type,
      paymentType: formData.paymentType,
      totalAmount: Number(formData.totalAmount),
      remainingAmount: Number(formData.remainingAmount),
      monthlyPayment: Number(formData.monthlyPayment) || 0,
      installmentsTotal: formData.paymentType === 'installments' ? Number(formData.installmentsTotal) : undefined,
      installmentsPaid: formData.paymentType === 'installments' ? Number(formData.installmentsPaid) : undefined,
      paymentHistory: [],
      dueDate: formData.dueDate ? Number(formData.dueDate) : undefined,
      reminderEnabled: formData.reminderEnabled,
      notes: formData.notes
    });
    
    setIsAdding(false);
    setFormData({
      name: '', type: 'credit_card', paymentType: 'installments', 
      totalAmount: '', remainingAmount: '', monthlyPayment: '', 
      installmentsTotal: '', installmentsPaid: '0', dueDate: '', reminderEnabled: true, notes: ''
    });
  };

  const handlePaymentSubmit = (e: React.FormEvent, debtId: string) => {
    e.preventDefault();
    if (!paymentForm.amount || isNaN(Number(paymentForm.amount))) return;
    
    onAddDebtPayment(debtId, { 
      amount: Number(paymentForm.amount), 
      date: paymentForm.date 
    });
    
    setAddingPaymentFor(null);
    setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Control de Deudas</h2>
        <div className="flex space-x-3">
          <select
            className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [by, order] = e.target.value.split('-');
              setSortBy(by as any);
              setSortOrder(order as any);
            }}
          >
            <option value="name-asc">Nombre (A-Z)</option>
            <option value="name-desc">Nombre (Z-A)</option>
            <option value="amount-desc">Monto Restante (Mayor a Menor)</option>
            <option value="amount-asc">Monto Restante (Menor a Menor)</option>
            <option value="dueDate-asc">Día de Pago (Próximos)</option>
            <option value="dueDate-desc">Día de Pago (Lejanos)</option>
          </select>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center text-sm font-medium transition-colors"
          >
            <Plus size={16} className="mr-2" />
            Nueva Deuda
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm text-gray-500 mb-1">Total de Deudas</span>
          <span className="text-2xl font-bold text-gray-900">{totalDebts}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm text-gray-500 mb-1">Deuda Total Restante</span>
          <span className="text-2xl font-bold text-red-600">{formatCurrency(totalOwed)}</span>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm text-gray-500 mb-1">Pago Mensual Total</span>
          <span className="text-2xl font-bold text-orange-600">{formatCurrency(totalMonthly)}</span>
        </div>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold mb-4">Registrar Deuda</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre / Descripción</label>
              <input 
                type="text" 
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Tarjeta Visa BCP"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Deuda</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              >
                {DEBT_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Modalidad de Pago</label>
              <select 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.paymentType}
                onChange={(e) => setFormData({ ...formData, paymentType: e.target.value as any })}
              >
                <option value="installments">En Cuotas</option>
                <option value="direct">Pago Directo / Revolvente</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Total Original (S/)</label>
              <input 
                type="number" 
                step="0.01"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.totalAmount}
                onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto Restante Actual (S/)</label>
              <input 
                type="number" 
                step="0.01"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.remainingAmount}
                onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pago Mensual Estimado (S/)</label>
              <input 
                type="number" 
                step="0.01"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.monthlyPayment}
                onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Día de Pago (1-31)</label>
              <input 
                type="number" 
                min="1"
                max="31"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                placeholder="Ej. 15"
              />
            </div>

            <div className="flex items-center mt-6">
              <input 
                type="checkbox" 
                id="reminderEnabled"
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                checked={formData.reminderEnabled}
                onChange={(e) => setFormData({ ...formData, reminderEnabled: e.target.checked })}
              />
              <label htmlFor="reminderEnabled" className="ml-2 block text-sm text-gray-700">
                Activar recordatorio de pago en el Dashboard
              </label>
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Detalles Adicionales</label>
              <textarea 
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-y"
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Ej. Pagar antes del 15 para evitar penalidad, o detalles del préstamo..."
              />
            </div>

            {formData.paymentType === 'installments' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total de Cuotas</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.installmentsTotal}
                    onChange={(e) => setFormData({ ...formData, installmentsTotal: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cuotas Pagadas</label>
                  <input 
                    type="number" 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    value={formData.installmentsPaid}
                    onChange={(e) => setFormData({ ...formData, installmentsPaid: e.target.value })}
                  />
                </div>
              </>
            )}

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
                Guardar Deuda
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {debts.length === 0 ? (
          <div className="col-span-full bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
            No tienes deudas registradas. ¡Excelente!
          </div>
        ) : (
          [...debts].sort((a, b) => {
            let comparison = 0;
            if (sortBy === 'name') {
              comparison = a.name.localeCompare(b.name);
            } else if (sortBy === 'amount') {
              comparison = a.remainingAmount - b.remainingAmount;
            } else if (sortBy === 'dueDate') {
              const dayA = a.dueDate || 99;
              const dayB = b.dueDate || 99;
              comparison = dayA - dayB;
            }
            return sortOrder === 'asc' ? comparison : -comparison;
          }).map((debt) => {
            const TypeIcon = DEBT_TYPES.find(t => t.id === debt.type)?.icon || FileText;
            const progress = debt.totalAmount > 0 ? ((debt.totalAmount - debt.remainingAmount) / debt.totalAmount) * 100 : 0;
            
            return (
              <div key={debt.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col relative overflow-hidden">
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <TypeIcon size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 line-clamp-1">{debt.name}</h3>
                      <p className="text-xs text-gray-500">
                        {debt.paymentType === 'installments' ? 'En Cuotas' : 'Pago Directo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {onToggleReminder && (
                      <button 
                        onClick={() => onToggleReminder(debt.id, debt.reminderEnabled === false ? true : false)}
                        className={`p-1.5 rounded-md transition-colors ${debt.reminderEnabled !== false ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-400 bg-gray-50 hover:bg-gray-100'}`}
                        title={debt.reminderEnabled !== false ? "Desactivar recordatorio" : "Activar recordatorio"}
                      >
                        {debt.reminderEnabled !== false ? <Bell size={16} /> : <BellOff size={16} />}
                      </button>
                    )}
                    <button 
                      onClick={() => setDebtToDelete(debt.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1.5"
                      title="Eliminar deuda"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-500">Progreso de pago</span>
                    <span className="font-medium text-indigo-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2.5">
                    <div className="bg-indigo-500 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
                  </div>
                  {debt.paymentType === 'installments' && debt.installmentsTotal && debt.installmentsTotal > 0 && (
                    <div className="text-xs text-gray-500 mt-1.5 text-right font-medium">
                      {debt.installmentsPaid || 0}/{debt.installmentsTotal} cuotas pagadas
                    </div>
                  )}
                </div>

                <div className="space-y-3 flex-grow">
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500">Deuda Restante</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(debt.remainingAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500">Monto Original</span>
                    <span className="text-sm font-medium text-gray-700">{formatCurrency(debt.totalAmount)}</span>
                  </div>

                  <div className="flex justify-between items-end">
                    <span className="text-sm text-gray-500">Pago Mensual</span>
                    <span className="text-sm font-bold text-orange-600">{formatCurrency(debt.monthlyPayment)}</span>
                  </div>

                  {debt.dueDate && (
                    <div className="flex justify-between items-end">
                      <span className="text-sm text-gray-500">Día de Pago</span>
                      <span className="text-sm font-medium text-gray-700">Día {debt.dueDate}</span>
                    </div>
                  )}

                  {debt.id === '1' && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm text-gray-500">TEA (%)</span>
                      <input 
                        type="number" 
                        step="0.1"
                        className="w-20 text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500"
                        value={debt.tea || ''}
                        onChange={(e) => onUpdateDebt({...debt, tea: Number(e.target.value)})}
                      />
                    </div>
                  )}

                  {debt.paymentType === 'installments' && (
                    <>
                      {debt.installmentsTotal && debt.installmentsTotal > 0 && debt.monthlyPayment > 0 && (debt.monthlyPayment * debt.installmentsTotal >= debt.totalAmount) ? (
                        <div className="flex flex-col gap-1 mt-1 pl-3 border-l-2 border-orange-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Abono a Capital</span>
                            <span className="text-xs text-gray-600">{formatCurrency(debt.totalAmount / debt.installmentsTotal)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Interés Estimado</span>
                            <span className="text-xs text-gray-600">{formatCurrency(debt.monthlyPayment - (debt.totalAmount / debt.installmentsTotal))}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 mt-1 pl-3 border-l-2 border-gray-200">
                          <span className="text-xs text-gray-500 italic">Desglose de capital/interés no determinable.</span>
                        </div>
                      )}
                      {debt.installmentsTotal && debt.installmentsTotal > 0 && (
                        <div className="pt-3 mt-3 border-t border-gray-100">
                          <div className="flex justify-between items-center text-sm">
                            <span className="text-gray-500">Progreso de cuotas</span>
                            <span className="font-medium text-gray-700">{debt.installmentsPaid} / {debt.installmentsTotal}</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {debt.notes && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <h4 className="text-xs font-semibold text-gray-700 mb-1">Notas</h4>
                      <p className="text-xs text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded-md border border-gray-100">
                        {debt.notes}
                      </p>
                    </div>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center flex-wrap gap-2">
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setExpandedHistory(expandedHistory === debt.id ? null : debt.id);
                          setAddingPaymentFor(null);
                          setSimulatingFor(null);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                      >
                        <History size={16} className="mr-1" />
                        Historial
                      </button>
                      <button
                        onClick={() => {
                          setSimulatingFor(simulatingFor === debt.id ? null : debt.id);
                          setExpandedHistory(null);
                          setAddingPaymentFor(null);
                          setSimulationAmount('');
                          setSimulationCount('1');
                          setCalculatedSimulation(null);
                        }}
                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
                      >
                        <Calculator size={16} className="mr-1" />
                        Simulador
                      </button>
                    </div>
                    <button
                      onClick={() => {
                        setAddingPaymentFor(addingPaymentFor === debt.id ? null : debt.id);
                        setExpandedHistory(null);
                        setSimulatingFor(null);
                        setPaymentForm({ amount: '', date: new Date().toISOString().split('T')[0] });
                      }}
                      className="text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-md hover:bg-indigo-100 font-medium transition-colors"
                    >
                      Registrar Pago
                    </button>
                  </div>

                  {addingPaymentFor === debt.id && (
                    <form onSubmit={(e) => handlePaymentSubmit(e, debt.id)} className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Nuevo Pago</h4>
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Monto (S/)</label>
                          <input type="number" step="0.01" required className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500" value={paymentForm.amount} onChange={e => setPaymentForm({...paymentForm, amount: e.target.value})} />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Fecha</label>
                          <input type="date" required className="w-full text-sm border border-gray-300 rounded px-2 py-1 outline-none focus:border-indigo-500" value={paymentForm.date} onChange={e => setPaymentForm({...paymentForm, date: e.target.value})} />
                        </div>
                      </div>
                      <div className="flex justify-between items-center space-x-2 mt-3">
                        <button 
                          type="button" 
                          onClick={() => setPaymentForm({...paymentForm, amount: debt.remainingAmount.toString()})} 
                          className="text-xs px-2 py-1.5 text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors font-medium border border-indigo-100"
                        >
                          Pagar Totalidad
                        </button>
                        <div className="flex space-x-2">
                          <button type="button" onClick={() => setAddingPaymentFor(null)} className="text-xs px-3 py-1.5 text-gray-600 hover:bg-gray-200 rounded transition-colors">Cancelar</button>
                          <button type="submit" className="text-xs px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">Guardar</button>
                        </div>
                      </div>
                    </form>
                  )}

                  {expandedHistory === debt.id && (
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Historial de Pagos</h4>
                      {(!debt.paymentHistory || debt.paymentHistory.length === 0) ? (
                        <p className="text-xs text-gray-500">No hay pagos registrados.</p>
                      ) : (
                        <ul className="space-y-2 max-h-32 overflow-y-auto pr-1">
                          {[...debt.paymentHistory].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
                            <li key={payment.id} className="flex justify-between items-center text-sm border-b border-gray-200 pb-1.5 last:border-0 last:pb-0">
                              <span className="text-gray-600">{payment.date}</span>
                              <span className="font-medium text-green-600">+{formatCurrency(payment.amount)}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {simulatingFor === debt.id && (
                    <div className="mt-4 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                      <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center">
                        <Calculator size={16} className="mr-2" />
                        Simulador de Pagos Extra
                      </h4>
                      <div className="mb-4 space-y-3">
                        <div>
                          <label className="block text-xs text-indigo-700 mb-1 font-medium">Monto Extra a Pagar (S/)</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            className="w-full text-sm border border-indigo-200 rounded-md px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                            value={simulationAmount} 
                            onChange={e => {
                              setSimulationAmount(e.target.value);
                              setCalculatedSimulation(null);
                            }} 
                            placeholder="Ej. 500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-indigo-700 mb-1 font-medium">Número de Pagos Extra</label>
                          <div className="flex space-x-2">
                            <input 
                              type="number" 
                              min="1"
                              className="w-full text-sm border border-indigo-200 rounded-md px-3 py-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                              value={simulationCount} 
                              onChange={e => {
                                setSimulationCount(e.target.value);
                                setCalculatedSimulation(null);
                              }} 
                              placeholder="Ej. 1"
                            />
                            <button
                              onClick={() => setCalculatedSimulation(Number(simulationAmount) * Number(simulationCount))}
                              disabled={!simulationAmount || Number(simulationAmount) <= 0 || !simulationCount || Number(simulationCount) < 1}
                              className="bg-indigo-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              Calcular
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {calculatedSimulation !== null && calculatedSimulation > 0 && (
                        <div className="space-y-2 bg-white p-3 rounded-md border border-indigo-100">
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-gray-500">Nuevo Saldo Restante</span>
                            <span className="text-sm font-bold text-gray-900">
                              {formatCurrency(Math.max(0, debt.remainingAmount - calculatedSimulation))}
                            </span>
                          </div>
                          {debt.monthlyPayment > 0 && (
                            <>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Tiempo Actual</span>
                                <span className="text-xs text-gray-700">{Math.ceil(debt.remainingAmount / debt.monthlyPayment)} meses</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-xs text-gray-500">Nuevo Tiempo</span>
                                <span className="text-xs font-medium text-green-600">
                                  {Math.ceil(Math.max(0, debt.remainingAmount - calculatedSimulation) / debt.monthlyPayment)} meses
                                </span>
                              </div>
                              <div className="pt-2 mt-2 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-medium text-indigo-700">Tiempo Ahorrado</span>
                                <span className="text-xs font-bold text-indigo-700">
                                  {Math.ceil(debt.remainingAmount / debt.monthlyPayment) - Math.ceil(Math.max(0, debt.remainingAmount - calculatedSimulation) / debt.monthlyPayment)} meses
                                </span>
                              </div>
                              {(() => {
                                const timeSaved = Math.ceil(debt.remainingAmount / debt.monthlyPayment) - Math.ceil(Math.max(0, debt.remainingAmount - calculatedSimulation) / debt.monthlyPayment);
                                // More accurate interest calculation assuming simple interest approximation
                                const monthlyInterest = debt.installmentsTotal && debt.installmentsTotal > 0 
                                  ? (debt.monthlyPayment - (debt.totalAmount / debt.installmentsTotal)) 
                                  : (debt.monthlyPayment * 0.2); // Fallback estimate if not installments
                                const interestSaved = timeSaved * monthlyInterest;
                                
                                const newTimeRemaining = Math.ceil(Math.max(0, debt.remainingAmount - calculatedSimulation) / debt.monthlyPayment);
                                const newPayoffDate = new Date();
                                newPayoffDate.setMonth(newPayoffDate.getMonth() + newTimeRemaining);

                                return (
                                  <>
                                    {interestSaved > 0 && (
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-medium text-green-700">Interés Ahorrado (Aprox)</span>
                                        <span className="text-xs font-bold text-green-700">
                                          {formatCurrency(interestSaved)}
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex justify-between items-center">
                                      <span className="text-xs font-medium text-blue-700">Nueva Fecha de Pago</span>
                                      <span className="text-xs font-bold text-blue-700 capitalize">
                                        {newPayoffDate.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}
                                      </span>
                                    </div>
                                  </>
                                );
                              })()}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {debtToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar deuda?</h3>
            <p className="text-gray-600 mb-6">
              Esta acción no se puede deshacer. Se eliminará la deuda y todo su historial de pagos.
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setDebtToDelete(null)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={() => {
                  onDeleteDebt(debtToDelete);
                  setDebtToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
