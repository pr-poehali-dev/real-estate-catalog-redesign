import { useState, useEffect } from 'react';
import { NumberField, ResultRow, fmtRub, fmtPct } from './utils';

interface Props {
  price: number;
}

// Ипотечный калькулятор
export default function MortgageCalc({ price }: Props) {
  const [propertyPrice, setPropertyPrice] = useState(price);
  useEffect(() => { setPropertyPrice(price); }, [price]);
  const [downPaymentPct, setDownPaymentPct] = useState(20);
  const [rate, setRate] = useState(17);
  const [years, setYears] = useState(15);

  const downPayment = propertyPrice * (downPaymentPct / 100);
  const loan = propertyPrice - downPayment;
  const months = years * 12;
  const monthlyRate = rate / 100 / 12;
  const monthlyPayment = monthlyRate > 0
    ? loan * (monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1)
    : loan / months;
  const totalPaid = monthlyPayment * months;
  const overpay = totalPaid - loan;
  const overpayPct = loan > 0 ? (overpay / loan) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <NumberField label="Стоимость объекта, ₽" value={propertyPrice} onChange={setPropertyPrice} step={100000} />
        <NumberField label="Первонач. взнос, %" value={downPaymentPct} onChange={setDownPaymentPct} step={1} />
        <NumberField label="Ставка, % годовых" value={rate} onChange={setRate} step={0.1} />
        <NumberField label="Срок, лет" value={years} onChange={setYears} step={1} />
      </div>
      <div className="bg-muted/40 rounded-xl p-3 space-y-1">
        <ResultRow label="Первоначальный взнос" value={fmtRub(downPayment)} color="blue" />
        <ResultRow label="Сумма кредита" value={fmtRub(loan)} color="blue" />
        <ResultRow label="Ежемесячный платёж" value={fmtRub(monthlyPayment)} color="orange" />
        <ResultRow label="Итого выплат" value={fmtRub(totalPaid + downPayment)} color="blue" />
        <ResultRow label="Переплата" value={fmtRub(overpay)} color="red" hint={fmtPct(overpayPct)} />
      </div>
    </div>
  );
}