import React, { useMemo } from 'react';
import { Transaction, Debt } from '../types';
import { formatCurrency } from '../lib/utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line } from 'recharts';
import { TrendingUp, AlertTriangle, CalendarClock, Calculator, Lightbulb, TrendingDown } from 'lucide-react';

interface ForecastProps {
  transactions: Transaction[];
  debts: Debt[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#f43f5e', '#0ea5e9'];

export function Forecast({ transactions, debts }: ForecastProps) {
  const forecastData = useMemo(() => {
    const expenses = transactions.filter(t => t.type === 'expense');
    
    // Determine the number of unique months in the transaction history to calculate averages
    const uniqueMonths = new Set(expenses.map(t => t.date.substring(0, 7))).size;
    const monthsCount = Math.max(1, uniqueMonths); // Avoid division by zero

    // Sum expenses by category
    const categoryTotals = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>);

    // Calculate monthly average per category
    const averages = Object.entries(categoryTotals).map(([name, total]) => ({
      name,
      value: total / monthsCount
    }));

    // Add active debt monthly payments
    const activeDebtsMonthly = debts
      .filter(d => d.remainingAmount > 0)
      .reduce((acc, curr) => acc + curr.monthlyPayment, 0);

    if (activeDebtsMonthly > 0) {
      averages.push({
        name: 'Pago de Deudas (Fijo)',
        value: activeDebtsMonthly
      });
    }

    // Sort by value descending
    return averages.sort((a, b) => b.value - a.value);
  }, [transactions, debts]);

  const totalForecast = forecastData.reduce((acc, curr) => acc + curr.value, 0);

  // Calculate average monthly income for comparison
  const averageIncome = useMemo(() => {
    const incomes = transactions.filter(t => t.type === 'income');
    const uniqueMonths = new Set(incomes.map(t => t.date.substring(0, 7))).size;
    const monthsCount = Math.max(1, uniqueMonths);
    const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
    return totalIncome / monthsCount;
  }, [transactions]);

  const remainingAfterForecast = averageIncome - totalForecast;

  const last6MonthsData = useMemo(() => {
    const data = [];
    const today = new Date();
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7); // YYYY-MM
      
      const monthTransactions = transactions.filter(t => t.date.startsWith(monthStr));
      const income = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
      const expense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
      
      const categoryBreakdown = monthTransactions
        .filter(t => t.type === 'expense')
        .reduce((acc, t) => {
          acc[t.category] = (acc[t.category] || 0) + t.amount;
          return acc;
        }, {} as Record<string, number>);
      
      const monthName = MONTHS[d.getMonth()];
      const displayMonth = `${monthName} ${d.getFullYear()}`;
      
      data.push({
        month: monthStr,
        displayMonth,
        Ingresos: income,
        Gastos: expense,
        categoryBreakdown
      });
    }
    return data;
  }, [transactions]);

  const predictions = useMemo(() => {
    if (last6MonthsData.length < 2) return [];
    
    let totalIncomeGrowth = 0;
    let totalExpenseGrowth = 0;
    let validMonths = 0;
    
    for (let i = 1; i < last6MonthsData.length; i++) {
      totalIncomeGrowth += (last6MonthsData[i].Ingresos - last6MonthsData[i-1].Ingresos);
      totalExpenseGrowth += (last6MonthsData[i].Gastos - last6MonthsData[i-1].Gastos);
      validMonths++;
    }
    
    const avgIncomeGrowth = validMonths > 0 ? totalIncomeGrowth / validMonths : 0;
    const avgExpenseGrowth = validMonths > 0 ? totalExpenseGrowth / validMonths : 0;
    
    const lastMonth = last6MonthsData[last6MonthsData.length - 1];
    let currentIncome = lastMonth.Ingresos || averageIncome;
    let currentExpense = lastMonth.Gastos || totalForecast;
    
    const futureData = [];
    const today = new Date();
    const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    for (let i = 1; i <= 3; i++) {
      currentIncome = Math.max(0, currentIncome + avgIncomeGrowth);
      currentExpense = Math.max(0, currentExpense + avgExpenseGrowth);
      
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      futureData.push({
        displayMonth: `${MONTHS[d.getMonth()]} ${d.getFullYear()} (Est.)`,
        Ingresos: currentIncome,
        Gastos: currentExpense,
      });
    }
    
    return futureData;
  }, [last6MonthsData, averageIncome, totalForecast]);

  const recommendations = useMemo(() => {
    const recs = [];
    const discretionaryCategories = ['Entretenimiento', 'Otros Gastos', 'Alimentación', 'Transporte'];
    
    const sortedExpenses = [...forecastData]
      .filter(d => d.name !== 'Pago de Deudas (Fijo)')
      .sort((a, b) => b.value - a.value);
      
    if (remainingAfterForecast < 0) {
      recs.push({
        title: 'Déficit Proyectado',
        desc: `Estás proyectando un déficit de ${formatCurrency(Math.abs(remainingAfterForecast))}. Considera pausar gastos no esenciales este mes.`,
        type: 'critical'
      });
    } else if (remainingAfterForecast < averageIncome * 0.1) {
      recs.push({
        title: 'Margen de Ahorro Bajo',
        desc: `Tu saldo proyectado es menor al 10% de tus ingresos. Intenta reducir gastos para fortalecer tu fondo de emergencia.`,
        type: 'warning'
      });
    }
    
    const topDiscretionary = sortedExpenses.find(d => discretionaryCategories.includes(d.name));
    if (topDiscretionary && topDiscretionary.value > 0) {
      const potentialSavings = topDiscretionary.value * 0.2;
      recs.push({
        title: `Oportunidad en ${topDiscretionary.name}`,
        desc: `Tu gasto proyectado es alto (${formatCurrency(topDiscretionary.value)}). Reducirlo un 20% te ahorraría ${formatCurrency(potentialSavings)}.`,
        type: 'suggestion'
      });
    }
    
    if (sortedExpenses.length > 0 && sortedExpenses[0].name !== topDiscretionary?.name) {
      const top = sortedExpenses[0];
      recs.push({
        title: `Revisa tu gasto en ${top.name}`,
        desc: `Es tu mayor categoría de gasto (${formatCurrency(top.value)}). Revisa si hay suscripciones o compras que puedas optimizar.`,
        type: 'suggestion'
      });
    }
    
    return recs;
  }, [forecastData, remainingAfterForecast, averageIncome]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-4 border border-gray-100 shadow-xl rounded-xl z-50">
          <p className="font-bold text-gray-800 mb-3 border-b pb-2">{label}</p>
          <div className="space-y-1 mb-3">
            <p className="text-emerald-600 font-medium flex justify-between">
              <span>Ingresos:</span> <span className="ml-4">{formatCurrency(data.Ingresos)}</span>
            </p>
            <p className="text-red-600 font-medium flex justify-between">
              <span>Gastos:</span> <span className="ml-4">{formatCurrency(data.Gastos)}</span>
            </p>
          </div>
          {data.categoryBreakdown && Object.keys(data.categoryBreakdown).length > 0 && (
            <div className="bg-gray-50 p-2 rounded-lg">
              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Principales Gastos:</p>
              <ul className="space-y-1.5">
                {Object.entries(data.categoryBreakdown)
                  .sort(([,a]: any, [,b]: any) => b - a)
                  .slice(0, 3)
                  .map(([cat, amt]: any) => (
                    <li key={cat} className="text-xs flex justify-between items-center">
                      <span className="text-gray-600 truncate max-w-[100px]">{cat}</span>
                      <span className="font-medium text-gray-800 ml-2">{formatCurrency(amt)}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Pronóstico Mensual</h2>
        <p className="text-gray-500 mt-1">Proyección de tus gastos para el próximo mes basada en tu historial y deudas actuales.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Calculator size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Gasto Proyectado</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalForecast)}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Ingreso Promedio</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(averageIncome)}</p>
          </div>
        </div>

        <div className={`bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center space-x-4 ${remainingAfterForecast < 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`p-3 rounded-full ${remainingAfterForecast < 0 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
            {remainingAfterForecast < 0 ? <AlertTriangle size={24} /> : <CalendarClock size={24} />}
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Saldo Proyectado</p>
            <p className={`text-2xl font-bold ${remainingAfterForecast < 0 ? 'text-red-600' : 'text-gray-900'}`}>
              {formatCurrency(remainingAfterForecast)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Distribución del Gasto Proyectado</h3>
          <div className="h-80">
            {forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={forecastData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {forecastData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" align="center" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No hay suficientes datos para proyectar
              </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Desglose por Categoría</h3>
          <div className="h-80">
            {forecastData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={forecastData} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#888'}} tickFormatter={(val) => `S/ ${val}`} />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#4b5563'}} width={100} />
                  <Tooltip cursor={{fill: '#f9fafb'}} formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="value" name="Monto Proyectado" radius={[0, 4, 4, 0]}>
                    {forecastData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No hay suficientes datos para proyectar
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Historial (Últimos 6 meses)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6MonthsData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} tickFormatter={(val) => `S/${val}`} width={60} />
                <Tooltip content={<CustomTooltip />} cursor={{fill: '#f9fafb'}} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Predicción (Próximos 3 meses)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[last6MonthsData[last6MonthsData.length - 1], ...predictions]} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="displayMonth" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#888'}} tickFormatter={(val) => `S/${val}`} width={60} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="Ingresos" stroke="#10b981" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="Gastos" stroke="#ef4444" strokeWidth={3} dot={{r: 4, strokeWidth: 2}} activeDot={{r: 6}} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      <div className="bg-indigo-50 p-6 rounded-xl border border-indigo-100 mt-6">
        <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center">
          <Lightbulb className="mr-2 text-indigo-600" size={24} />
          Recomendaciones Personalizadas
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <div key={idx} className="bg-white p-4 rounded-lg shadow-sm border border-indigo-50 flex items-start">
              <div className={`p-2 rounded-full mr-3 flex-shrink-0 ${rec.type === 'critical' ? 'bg-red-100 text-red-600' : rec.type === 'warning' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
                {rec.type === 'critical' ? <AlertTriangle size={20} /> : rec.type === 'warning' ? <AlertTriangle size={20} /> : <TrendingDown size={20} />}
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 text-sm">{rec.title}</h4>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{rec.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
