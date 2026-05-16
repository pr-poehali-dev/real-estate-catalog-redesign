import { useState } from 'react';
import { NumberField, ResultRow, fmtRub, fmtNum } from './utils';

// Юнит-экономика
export default function UnitEconomicsCalc() {
  const [cac, setCac] = useState(2000);
  const [arpu, setArpu] = useState(3000);
  const [cogs, setCogs] = useState(800);
  const [retention, setRetention] = useState(6);
  const [churn, setChurn] = useState(15);

  const cm = arpu - cogs;
  const ltv = cm * retention;
  const ltvCac = cac > 0 ? ltv / cac : 0;
  const paybackMonths = cm > 0 ? cac / cm : Infinity;
  const ltvByChurn = churn > 0 ? cm / (churn / 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberField label="CAC (привлечение), ₽" value={cac} onChange={setCac} step={100} />
        <NumberField label="ARPU (доход / клиент), ₽" value={arpu} onChange={setArpu} step={100} />
        <NumberField label="COGS (себестоимость), ₽" value={cogs} onChange={setCogs} step={100} />
        <NumberField label="Удержание, мес" value={retention} onChange={setRetention} step={1} />
        <NumberField label="Churn (отток / мес), %" value={churn} onChange={setChurn} step={1} />
      </div>
      <div className="bg-muted/40 rounded-xl p-3 space-y-1">
        <ResultRow label="Маржа на клиента (CM)" value={fmtRub(cm)} color={cm >= 0 ? 'green' : 'red'} />
        <ResultRow label="LTV (по сроку жизни)" value={fmtRub(ltv)} color="blue" />
        <ResultRow label="LTV (по оттоку)" value={fmtRub(ltvByChurn)} color="blue" />
        <ResultRow label="LTV / CAC" value={fmtNum(ltvCac, 2)} color={ltvCac >= 3 ? 'green' : ltvCac >= 1 ? 'orange' : 'red'} hint="Норма: ≥ 3" />
        <ResultRow label="Окупаемость CAC" value={`${fmtNum(paybackMonths, 1)} мес`} color="orange" />
      </div>
    </div>
  );
}
