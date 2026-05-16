import { useState } from 'react';
import { NumberField, ResultRow, fmtRub, fmtPct } from './utils';

// Налоговое планирование
export default function TaxCalc() {
  const [revenue, setRevenue] = useState(12_000_000);
  const [expenses, setExpenses] = useState(7_000_000);
  const [salaryFund, setSalaryFund] = useState(2_000_000);

  // УСН 6% (доходы)
  const usn6 = revenue * 0.06;
  // УСН 15% (доходы минус расходы)
  const usn15base = Math.max(0, revenue - expenses);
  const usn15 = usn15base * 0.15;
  // НДС (общая 20%)
  const vat = revenue * 0.20 / 1.20;
  // Налог на прибыль (20%)
  const profit = revenue - expenses;
  const incomeTax = Math.max(0, profit) * 0.20;
  // Взносы на ФОТ (30%)
  const social = salaryFund * 0.30;

  const total6 = usn6 + social;
  const total15 = usn15 + social;
  const totalOsno = vat + incomeTax + social;

  const best = Math.min(total6, total15, totalOsno);
  const bestName = best === total6 ? 'УСН 6%' : best === total15 ? 'УСН 15%' : 'ОСНО';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberField label="Выручка / год, ₽" value={revenue} onChange={setRevenue} step={100000} />
        <NumberField label="Расходы / год, ₽" value={expenses} onChange={setExpenses} step={100000} />
        <NumberField label="Фонд оплаты труда, ₽" value={salaryFund} onChange={setSalaryFund} step={50000} />
      </div>
      <div className="bg-muted/40 rounded-xl p-3 space-y-1">
        <ResultRow label="УСН 6% (доходы)" value={fmtRub(total6)} color="blue" hint={`Налог: ${fmtRub(usn6)} + взносы`} />
        <ResultRow label="УСН 15% (доходы − расходы)" value={fmtRub(total15)} color="blue" hint={`Налог: ${fmtRub(usn15)} + взносы`} />
        <ResultRow label="ОСНО (НДС + налог на прибыль)" value={fmtRub(totalOsno)} color="blue" hint={`НДС: ${fmtRub(vat)} + Прибыль: ${fmtRub(incomeTax)}`} />
        <ResultRow label={`Оптимальный режим: ${bestName}`} value={fmtRub(best)} color="green" />
        <ResultRow label="Доля налогов от выручки" value={fmtPct((best / revenue) * 100)} color="orange" />
      </div>
    </div>
  );
}
