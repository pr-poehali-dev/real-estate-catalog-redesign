import { Link } from 'react-router-dom';
import { Property } from '@/App';
import Icon from '@/components/ui/icon';
import { listingSlug } from '@/lib/slug';

interface PropertyCardProps {
  property: Property;
  isFavorite: boolean;
  isCompare: boolean;
  onToggleFavorite: (id: number) => void;
  onToggleCompare: (id: number) => void;
  style?: React.CSSProperties;
}

const TYPE_LABELS: Record<string, string> = {
  office: 'Офис',
  retail: 'Торговля',
  warehouse: 'Склад',
  restaurant: 'Ресторан',
  business: 'Бизнес',
  production: 'Производство',
};

const DEAL_LABELS: Record<string, string> = {
  sale: 'Продажа',
  rent: 'Аренда',
  business: 'Готовый бизнес',
};

export function formatPrice(price: number, deal: string): string {
  if (deal === 'rent') {
    if (price >= 1000000) return `${(price / 1000000).toFixed(1)} млн ₽/мес`;
    return `${(price / 1000).toFixed(0)} тыс ₽/мес`;
  }
  if (price >= 1000000) return `${(price / 1000000).toFixed(1)} млн ₽`;
  return `${(price / 1000).toFixed(0)} тыс ₽`;
}

export default function PropertyCard({
  property,
  isFavorite,
  isCompare,
  onToggleFavorite,
  onToggleCompare,
  style,
}: PropertyCardProps) {
  return (
    <div
      className="property-card bg-card rounded-2xl overflow-hidden shadow-sm border border-border animate-fade-in-up"
      style={style}
    >
      {/* Image */}
      <div className="relative h-48 overflow-hidden bg-muted">
        <Link to={`/object/${listingSlug(property.title, property.id)}`} className="block w-full h-full">
          <img
            src={property.image}
            alt={property.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        </Link>
        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold font-display px-2 py-0.5 rounded-full bg-brand-blue text-white">
            {DEAL_LABELS[property.deal]}
          </span>
          {property.isHot && (
            <span className="text-[11px] font-semibold font-display px-2 py-0.5 rounded-full btn-orange text-white flex items-center gap-1">
              🔥 Горячее
            </span>
          )}
          {property.isNew && (
            <span className="text-[11px] font-semibold font-display px-2 py-0.5 rounded-full bg-green-500 text-white">
              Новое
            </span>
          )}
        </div>
        {/* Actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2">
          <button
            onClick={() => onToggleFavorite(property.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200
              ${isFavorite ? 'bg-red-500 text-white' : 'bg-white text-muted-foreground hover:text-red-500'}`}
          >
            <Icon name="Heart" size={15} />
          </button>
          <button
            onClick={() => onToggleCompare(property.id)}
            className={`w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-all duration-200
              ${isCompare ? 'bg-brand-orange text-white' : 'bg-white text-muted-foreground hover:text-brand-orange'}`}
          >
            <Icon name="GitCompare" size={15} />
          </button>
        </div>
        {/* Type tag */}
        <div className="absolute bottom-3 left-3">
          <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-black/40 text-white backdrop-blur-sm">
            {TYPE_LABELS[property.type]}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <Link to={`/object/${listingSlug(property.title, property.id)}`}>
          <h3 className="font-display font-700 text-base text-foreground leading-snug mb-1 line-clamp-2 hover:text-brand-blue transition-colors">
            {property.title}
          </h3>
        </Link>
        <div className="flex items-center gap-1 text-muted-foreground text-xs mb-3">
          <Icon name="MapPin" size={12} />
          <span className="truncate">{property.address}</span>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Icon name="Maximize" size={12} />
            <span>{property.area} м²</span>
          </div>
          {property.floor && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Icon name="Layers" size={12} />
              <span>{property.floor}/{property.totalFloors} эт.</span>
            </div>
          )}
          {property.payback && (
            <div className="flex items-center gap-1 text-xs text-green-600 font-medium">
              <Icon name="TrendingUp" size={12} />
              <span>Окуп. {property.payback} мес</span>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {property.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="tag-blue text-[10px] px-2 py-0.5 rounded-full font-medium">
              {tag}
            </span>
          ))}
        </div>

        {/* Price & Action */}
        <div className="flex items-end justify-between">
          <div>
            <div className="font-display font-800 text-xl text-brand-blue leading-none">
              {formatPrice(property.price, property.deal)}
            </div>
            {property.pricePerM2 && (
              <div className="text-xs text-muted-foreground mt-0.5">
                {property.pricePerM2.toLocaleString()} ₽/м²
              </div>
            )}
            {property.profit && (
              <div className="text-xs text-green-600 mt-0.5 font-medium">
                Прибыль: {(property.profit / 1000).toFixed(0)} тыс ₽/мес
              </div>
            )}
          </div>
          <Link to={`/object/${listingSlug(property.title, property.id)}`}
            className="btn-orange text-white text-xs font-semibold font-display px-3 py-2 rounded-lg">
            Подробнее
          </Link>
        </div>
      </div>
    </div>
  );
}