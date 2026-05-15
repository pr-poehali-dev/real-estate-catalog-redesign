import { useState } from 'react';
import { Property } from '@/App';
import { formatPrice } from '@/components/PropertyCard';
import Icon from '@/components/ui/icon';

interface MapPageProps {
  properties: Property[];
  favorites: number[];
  compareList: number[];
  onToggleFavorite: (id: number) => void;
  onToggleCompare: (id: number) => void;
}

const TYPE_ICONS: Record<string, string> = {
  office: '🏢',
  retail: '🛒',
  warehouse: '🏭',
  restaurant: '🍽️',
  business: '💼',
  production: '⚙️',
};

export default function MapPage({ properties, favorites, compareList, onToggleFavorite, onToggleCompare }: MapPageProps) {
  const [selected, setSelected] = useState<Property | null>(null);
  const [activeType, setActiveType] = useState('all');

  const filtered = activeType === 'all' ? properties : properties.filter(p => p.type === activeType);

  const PIN_POSITIONS: Record<number, { top: string; left: string }> = {
    1: { top: '38%', left: '50%' },
    2: { top: '48%', left: '44%' },
    3: { top: '30%', left: '58%' },
    4: { top: '65%', left: '52%' },
    5: { top: '42%', left: '53%' },
    6: { top: '18%', left: '35%' },
  };

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 64px)' }}>
      {/* Top filter bar */}
      <div className="bg-white border-b border-border px-4 py-3 flex gap-2 overflow-x-auto flex-shrink-0">
        <button
          onClick={() => setActiveType('all')}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
            ${activeType === 'all' ? 'bg-brand-blue text-white' : 'bg-muted text-foreground hover:bg-brand-blue/10'}`}
        >
          Все объекты ({properties.length})
        </button>
        {Object.entries(TYPE_ICONS).map(([type, emoji]) => {
          const count = properties.filter(p => p.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setActiveType(type)}
              className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-semibold transition-all duration-200
                ${activeType === type ? 'bg-brand-blue text-white' : 'bg-muted text-foreground hover:bg-brand-blue/10'}`}
            >
              <span>{emoji}</span>
              <span>({count})</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Map area */}
        <div className="flex-1 relative bg-slate-100 map-grid overflow-hidden">
          {/* Decorative streets */}
          <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            <line x1="0" y1="300" x2="800" y2="300" stroke="#1a3a6b" strokeWidth="3" />
            <line x1="0" y1="200" x2="800" y2="200" stroke="#1a3a6b" strokeWidth="1.5" />
            <line x1="0" y1="400" x2="800" y2="400" stroke="#1a3a6b" strokeWidth="1.5" />
            <line x1="400" y1="0" x2="400" y2="600" stroke="#1a3a6b" strokeWidth="3" />
            <line x1="250" y1="0" x2="250" y2="600" stroke="#1a3a6b" strokeWidth="1.5" />
            <line x1="600" y1="0" x2="600" y2="600" stroke="#1a3a6b" strokeWidth="1.5" />
            <circle cx="400" cy="300" r="80" stroke="#1a3a6b" strokeWidth="1" fill="none" strokeDasharray="4,4" />
            <circle cx="400" cy="300" r="160" stroke="#1a3a6b" strokeWidth="1" fill="none" strokeDasharray="4,4" />
          </svg>

          {/* Center ring (МКАД) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className="w-72 h-72 rounded-full border border-brand-blue/20 border-dashed" />
          </div>

          {/* Map label */}
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm">
            <div className="text-xs font-semibold text-brand-blue font-display">📍 Москва и МО</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">Яндекс.Карты будут подключены</div>
          </div>

          {/* Property pins */}
          {filtered.map(property => {
            const pos = PIN_POSITIONS[property.id] || { top: '50%', left: '50%' };
            const isSelected = selected?.id === property.id;
            return (
              <button
                key={property.id}
                onClick={() => setSelected(isSelected ? null : property)}
                style={{ top: pos.top, left: pos.left }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-200 z-10
                  ${isSelected ? 'scale-125 z-20' : 'hover:scale-110'}`}
              >
                <div className={`relative flex flex-col items-center`}>
                  <div className={`px-2.5 py-1.5 rounded-xl shadow-lg font-display font-700 text-xs text-white whitespace-nowrap
                    ${isSelected ? 'btn-orange' : 'btn-blue'}`}>
                    <span className="mr-1">{TYPE_ICONS[property.type]}</span>
                    {formatPrice(property.price, property.deal)}
                  </div>
                  <div className={`w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent
                    ${isSelected ? 'border-t-brand-orange' : 'border-t-brand-blue'}`}
                    style={{ borderTopWidth: 6 }}
                  />
                </div>
              </button>
            );
          })}

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1">
            <button className="w-9 h-9 bg-white rounded-t-lg border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors">
              <Icon name="Plus" size={18} />
            </button>
            <button className="w-9 h-9 bg-white rounded-b-lg border border-border flex items-center justify-center shadow-sm hover:bg-muted transition-colors">
              <Icon name="Minus" size={18} />
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-white border-l border-border flex flex-col overflow-hidden hidden md:flex">
          {selected ? (
            <div className="flex-1 overflow-y-auto animate-slide-in-right">
              {/* Selected property */}
              <div className="relative">
                <img src={selected.image} alt={selected.title} className="w-full h-44 object-cover" />
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center"
                >
                  <Icon name="X" size={16} />
                </button>
                <div className="absolute bottom-3 left-3">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-brand-blue text-white font-display">
                    {TYPE_ICONS[selected.type]} {selected.type}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-display font-700 text-base mb-1">{selected.title}</h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
                  <Icon name="MapPin" size={12} />
                  {selected.address}
                </div>
                <div className="font-display font-800 text-2xl text-brand-blue mb-1">
                  {formatPrice(selected.price, selected.deal)}
                </div>
                {selected.pricePerM2 && (
                  <div className="text-xs text-muted-foreground mb-3">{selected.pricePerM2.toLocaleString()} ₽/м²</div>
                )}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="text-xs text-muted-foreground mb-1">Площадь</div>
                    <div className="font-display font-700 text-base">{selected.area} м²</div>
                  </div>
                  {selected.payback ? (
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Окупаемость</div>
                      <div className="font-display font-700 text-base text-green-600">{selected.payback} мес</div>
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="text-xs text-muted-foreground mb-1">Район</div>
                      <div className="font-display font-700 text-sm">{selected.district}</div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4">{selected.description}</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {selected.tags.map(tag => (
                    <span key={tag} className="tag-blue text-[10px] px-2 py-0.5 rounded-full font-medium">{tag}</span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onToggleFavorite(selected.id)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                      ${favorites.includes(selected.id) ? 'border-red-400 bg-red-50 text-red-500' : 'border-border text-foreground hover:border-red-400'}`}
                  >
                    <Icon name="Heart" size={16} />
                    {favorites.includes(selected.id) ? 'В избранном' : 'В избранное'}
                  </button>
                  <button className="flex-1 btn-orange text-white py-2.5 rounded-xl text-sm font-semibold font-display">
                    Связаться
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-border">
                <div className="font-display font-700 text-base">
                  Объекты на карте
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{filtered.length} объектов</div>
              </div>
              <div className="divide-y divide-border">
                {filtered.map(property => (
                  <button
                    key={property.id}
                    onClick={() => setSelected(property)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-16 h-14 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={property.image} alt={property.title} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display font-600 text-xs text-foreground leading-tight line-clamp-2 mb-1">
                        {property.title}
                      </div>
                      <div className="font-display font-700 text-sm text-brand-blue">
                        {formatPrice(property.price, property.deal)}
                      </div>
                    </div>
                    <Icon name="ChevronRight" size={16} className="text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
