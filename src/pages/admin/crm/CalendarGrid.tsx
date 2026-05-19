import Icon from '@/components/ui/icon';
import { CrmEvent, MONTHS_RU, DAYS_RU, TYPE_META, buildCalendarDays, toLocalDateStr } from './calendarTypes';

interface Props {
  year: number;
  month: number;
  selected: string | null;
  eventsByDate: Record<string, CrmEvent[]>;
  isLoading: boolean;
  todayStr: string;
  onSelectDay: (ds: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export default function CalendarGrid({
  year, month, selected, eventsByDate, isLoading, todayStr,
  onSelectDay, onPrevMonth, onNextMonth,
}: Props) {
  const calDays = buildCalendarDays(year, month);

  return (
    <div className="lg:col-span-2 bg-white rounded-2xl border border-border p-5">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onPrevMonth} className="p-2 rounded-xl hover:bg-muted transition">
          <Icon name="ChevronLeft" size={18} />
        </button>
        <span className="font-display font-700 text-lg">{MONTHS_RU[month]} {year}</span>
        <button onClick={onNextMonth} className="p-2 rounded-xl hover:bg-muted transition">
          <Icon name="ChevronRight" size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 mb-1">
        {DAYS_RU.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {calDays.map((date, i) => {
            if (!date) return <div key={i} />;
            const ds = toLocalDateStr(date);
            const dayEvents = eventsByDate[ds] || [];
            const isToday    = ds === todayStr;
            const isSelected = ds === selected;
            return (
              <button
                key={ds}
                onClick={() => onSelectDay(ds)}
                className={`relative min-h-[52px] rounded-xl p-1.5 text-left transition border ${
                  isSelected
                    ? 'bg-brand-blue border-brand-blue text-white'
                    : isToday
                    ? 'border-brand-blue/40 bg-brand-blue/5'
                    : 'border-transparent hover:bg-muted'
                }`}
              >
                <span className={`text-xs font-semibold ${isSelected ? 'text-white' : isToday ? 'text-brand-blue' : ''}`}>
                  {date.getDate()}
                </span>
                <div className="flex flex-wrap gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map(e => (
                    <span key={e.id} className={`w-1.5 h-1.5 rounded-full ${
                      e.is_done         ? 'bg-muted-foreground opacity-40'
                      : e.event_type === 'note'     ? 'bg-yellow-400'
                      : e.event_type === 'event'    ? 'bg-blue-500'
                      : 'bg-purple-500'
                    }`} />
                  ))}
                  {dayEvents.length > 3 && (
                    <span className={`text-[9px] font-bold ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                      +{dayEvents.length - 3}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
        {Object.entries(TYPE_META).map(([type, meta]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2 h-2 rounded-full ${type === 'note' ? 'bg-yellow-400' : type === 'event' ? 'bg-blue-500' : 'bg-purple-500'}`} />
            {meta.label}
          </div>
        ))}
      </div>
    </div>
  );
}
