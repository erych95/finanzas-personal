import React, { useState } from 'react';
import { FinancialData } from '../types';
import { GoogleGenAI } from '@google/genai';
import { BrainCircuit, Loader2, AlertCircle, TrendingUp, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import Markdown from 'react-markdown';

interface AIAdvisorProps {
  data: FinancialData;
}

export function AIAdvisor({ data }: AIAdvisorProps) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalIncome = data.transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = data.transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
  const totalDebt = data.debts.reduce((acc, curr) => acc + curr.remainingAmount, 0);
  const monthlyDebtPayment = data.debts.reduce((acc, curr) => acc + curr.monthlyPayment, 0);

  const getAdvice = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key de Gemini no configurada.");
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
Actúa como un asesor financiero experto. Analiza los siguientes datos financieros de un usuario:

- Ingresos Totales del mes: ${formatCurrency(totalIncome)}
- Gastos Totales del mes: ${formatCurrency(totalExpense)}
- Balance Actual: ${formatCurrency(totalIncome - totalExpense)}
- Deuda Total Restante: ${formatCurrency(totalDebt)}
- Pago Mensual de Deudas Estimado: ${formatCurrency(monthlyDebtPayment)}

Detalle de deudas:
${data.debts.map(d => `- ${d.name} (${d.type === 'credit_card' ? 'Tarjeta' : d.type}): Resta ${formatCurrency(d.remainingAmount)}, Pago mensual: ${formatCurrency(d.monthlyPayment)}`).join('\n')}

Por favor proporciona:
1. Un cálculo predictivo y recomendación de cuánto es lo máximo que debería gastar el resto de este mes para no afectar su economía el próximo mes, considerando sus pagos de deuda (como alquiler, tarjetas, etc.).
2. Consejos específicos y detallados sobre cómo manejar estas deudas actuales para cuidar y mejorar su sistema crediticio (historial crediticio).
3. Una breve evaluación de su salud financiera actual.

Responde en formato Markdown, usando viñetas y negritas para resaltar lo importante. Sé directo, profesional y empático.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setAdvice(response.text || "No se pudo generar una respuesta.");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Ocurrió un error al obtener las recomendaciones.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Asesor Financiero IA</h2>
          <p className="text-gray-500 mt-1">Obtén recomendaciones personalizadas basadas en tus datos actuales.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 rounded-xl shadow-md text-white">
            <div className="flex items-center space-x-3 mb-4">
              <BrainCircuit size={28} className="text-indigo-100" />
              <h3 className="text-xl font-semibold">Análisis Inteligente</h3>
            </div>
            <p className="text-indigo-100 text-sm mb-6">
              Nuestra IA analiza tus ingresos, gastos y deudas para proyectar tu salud financiera y darte consejos sobre tu historial crediticio.
            </p>
            <button
              onClick={getAdvice}
              disabled={isLoading}
              className="w-full bg-white text-indigo-600 font-semibold py-3 px-4 rounded-lg hover:bg-indigo-50 transition-colors flex justify-center items-center disabled:opacity-70"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin mr-2" />
                  Analizando...
                </>
              ) : (
                'Generar Recomendaciones'
              )}
            </button>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
              <TrendingUp size={18} className="mr-2 text-blue-500" />
              Datos Enviados
            </h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex justify-between"><span>Ingresos:</span> <span className="font-medium">{formatCurrency(totalIncome)}</span></li>
              <li className="flex justify-between"><span>Gastos:</span> <span className="font-medium">{formatCurrency(totalExpense)}</span></li>
              <li className="flex justify-between"><span>Deudas:</span> <span className="font-medium">{formatCurrency(totalDebt)}</span></li>
              <li className="flex justify-between"><span>Pago Mensual:</span> <span className="font-medium">{formatCurrency(monthlyDebtPayment)}</span></li>
            </ul>
          </div>
        </div>

        <div className="lg:col-span-2">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start mb-6">
              <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {advice ? (
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-100 prose prose-indigo max-w-none">
              <div className="markdown-body">
                <Markdown>{advice}</Markdown>
              </div>
            </div>
          ) : (
            <div className="h-full min-h-[300px] bg-white rounded-xl shadow-sm border border-gray-100 border-dashed flex flex-col items-center justify-center text-gray-400 p-8 text-center">
              <ShieldCheck size={48} className="mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Listo para analizar</h3>
              <p className="max-w-md">Haz clic en "Generar Recomendaciones" para que la IA procese tus datos y te brinde un plan de acción para este mes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
