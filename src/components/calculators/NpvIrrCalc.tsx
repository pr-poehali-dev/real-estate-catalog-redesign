import { useState, useEffect } from 'react';
import { NumberField, ResultRow, fmtRub, fmtPct, fmtMonths } from './utils';

interface Props {
  invest: number;
  yearCashFlow: number;
}

function npv(rate: number, flows: number[]): number {
  return flows.reduce((acc, cf, t) => acc + cf / Math.pow(1 + rate, t), 0);
}

function irr(flows: number[]): number {
  let low = -0.99;
  let high = 10;
  for (let i = 0; i < 100; i++) {
    const mid = (low + high) / 2;
    const v = npv(mid, flows);
    if (Math.abs(v) < 1) return mid * 100;
    if (v > 0) low = mid;
    else high = mid;
  }
  return ((low + high) / 2) * 100;
}

// NPV + IRR + срок окупаемости
export default function NpvIrrCalc({ invest, yearCashFlow }: Props) {
  const [inv, setInv] = useState(invest);
  const [cf, setCf] = useState(yearCashFlow);
  const [rate, setRate] = useState(15);
  const [years, setYears] = useState(10);
  useEffect(() => { setInv(invest); }, [invest]);
  useEffect(() => { setCf(yearCashFlow); }, [yearCashFlow]);

  const flows: number[] = [-inv];
  for (let i = 1; i <= years; i++) flows.push(cf);

  const npvValue = npv(rate / 100, flows);
  const irrValue = irr(flows);
  const ppMonths = cf > 0 ? (inv / cf) * 12 : Infinity;
  // Дисконтированный срок окупаемости
  let accumPv = 0;
  let dpp = Infinity;
  for (let t = 1; t <= 100; t++) {
    const pv = cf / Math.pow(1 + rate / 100, t);
    accumPv += pv;
    if (accumPv >= inv) {
      dpp = (t - 1 + (inv - (accumPv - pv)) / pv) * 12;
      break;
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
        <NumberField label="Инвестиции, ₽" value={inv} onChange={setInv} step={100000} />
        <NumberField label="Денежный поток / год, ₽" value={cf} onChange={setCf} step={100000} />
        <NumberField label="Ставка дисконт., %" value={rate} onChange={setRate} step={0.5} />
        <NumberField label="Горизонт, лет" value={years} onChange={setYears} step={1} />
      </div>
      <div className="bg-muted/40 rounded-xl p-3 space-y-1">
        <ResultRow label="NPV (чистая привед. стоимость)" value={fmtRub(npvValue)} color={npvValue >= 0 ? 'green' : 'red'} hint="> 0 — проект выгоден" />
        <ResultRow label="IRR (внутр. норма доходности)" value={fmtPct(irrValue)} color={irrValue >= rate ? 'green' : 'red'} hint={`Барьер: ${rate}%`} />
        <ResultRow label="Простой срок окупаемости (PP)" value={fmtMonths(ppMonths)} color="orange" />
        <ResultRow label="Дисконтир. срок окуп. (DPP)" value={fmtMonths(dpp)} color="orange" />
      </div>
    </div>
  );
}