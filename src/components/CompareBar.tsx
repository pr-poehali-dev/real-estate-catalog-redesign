import Icon from '@/components/ui/icon';

interface CompareBarProps {
  count: number;
  onCompare: () => void;
  onClear: () => void;
}

export default function CompareBar({ count, onCompare, onClear }: CompareBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 compare-bar px-4 py-3 animate-fade-in-up">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl btn-orange flex items-center justify-center">
            <Icon name="GitCompare" size={20} className="text-white" />
          </div>
          <div>
            <div className="font-display font-700 text-sm text-foreground">
              Сравнение объектов
            </div>
            <div className="text-xs text-muted-foreground">
              Выбрано {count} из 3 объектов
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all duration-200
                  ${i < count
                    ? 'border-brand-orange bg-brand-orange/10'
                    : 'border-border bg-muted'
                  }`}
              >
                {i < count && <Icon name="Check" size={14} className="text-brand-orange" />}
              </div>
            ))}
          </div>
          <button
            onClick={onClear}
            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
          >
            <Icon name="X" size={18} />
          </button>
          <button
            onClick={onCompare}
            disabled={count < 2}
            className="btn-blue text-white px-4 py-2 rounded-lg text-sm font-semibold font-display disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сравнить →
          </button>
        </div>
      </div>
    </div>
  );
}
