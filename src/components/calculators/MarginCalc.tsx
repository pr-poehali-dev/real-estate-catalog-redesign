import { useState } from 'react';
import { NumberField, ResultRow, fmtRub, fmtPct } from './utils';

// Маржинальный анализ и наценка
export default function MarginCalc() {
  const [cost, setCost] = useState(1000);
  const [price, setPrice] = useState(1500);
  const [volume, setVolume] = useState(100);

  const margin = price - cost;
  const markup = cost > 0 ? (margin / cost) * 100 : 0;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;
  const revenueTotal = price * volume;
  const profitTotal = margin * volume;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <NumberField label="Себестоимость, ₽" value={cost} onChange={setCost} step={50} />
        <NumberField label="Цена продажи, ₽" value={price} onChange={setPrice} step={50} />
        <NumberField label="Объём продаж, ед." value={volume} onChange={setVolume} step={10} />
      </div>
      <div className="bg-muted/40 rounded-xl p-3 space-y-1">
        <ResultRow label="Маржа на единицу" value={fmtRub(margin)} color={margin >= 0 ? 'green' : 'red'} />
        <ResultRow label="Наценка (markup)" value={fmtPct(markup)} color="blue" hint="К себестоимости" />
        <ResultRow label="Маржинальность" value={fmtPct(marginPct)} color="blue" hint="К цене" />
        <ResultRow label="Выручка (общая)" value={fmtRub(revenueTotal)} color="blue" />
        <ResultRow label="Прибыль (общая)" value={fmtRub(profitTotal)} color={profitTotal >= 0 ? 'green' : 'red'} />
      </div>
    </div>
  );
}
