import { useState } from 'react';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import MapPage from './pages/MapPage';
import FavoritesPage from './pages/FavoritesPage';
import ComparePage from './pages/ComparePage';
import Navbar from './components/Navbar';
import CompareBar from './components/CompareBar';

export type PropertyType = 'office' | 'retail' | 'warehouse' | 'restaurant' | 'business' | 'production';
export type DealType = 'sale' | 'rent' | 'business';

export interface Property {
  id: number;
  title: string;
  type: PropertyType;
  deal: DealType;
  address: string;
  district: string;
  area: number;
  price: number;
  pricePerM2?: number;
  payback?: number;
  profit?: number;
  image: string;
  tags: string[];
  description: string;
  floor?: number;
  totalFloors?: number;
  lat: number;
  lng: number;
  isHot?: boolean;
  isNew?: boolean;
}

export const PROPERTIES: Property[] = [
  {
    id: 1,
    title: 'Офисный центр "Премиум Плаза"',
    type: 'office',
    deal: 'sale',
    address: 'ул. Тверская, 12, Москва',
    district: 'ЦАО',
    area: 450,
    price: 67500000,
    pricePerM2: 150000,
    image: 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/11d13912-4216-4a73-9faf-309117250f99.jpg',
    tags: ['Класс A', 'Парковка', 'Охрана'],
    description: 'Современный офисный центр класса A с отделкой премиум уровня, собственной парковкой на 20 машин и круглосуточной охраной.',
    floor: 5,
    totalFloors: 12,
    lat: 55.764,
    lng: 37.606,
    isHot: true,
  },
  {
    id: 2,
    title: 'Ресторан с оборудованием',
    type: 'restaurant',
    deal: 'business',
    address: 'Арбат, 28, Москва',
    district: 'ЦАО',
    area: 180,
    price: 8500000,
    payback: 18,
    profit: 480000,
    image: 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/b39b9336-f780-4ce4-aa0a-7c916796da5f.jpg',
    tags: ['Готовый бизнес', 'Оборудование', 'Аренда 5 лет'],
    description: 'Действующий ресторан на 80 посадочных мест с полным комплектом кухонного оборудования. Стабильная выручка 480 000 ₽/мес.',
    lat: 55.751,
    lng: 37.591,
    isNew: true,
  },
  {
    id: 3,
    title: 'Торговое помещение на 1 этаже',
    type: 'retail',
    deal: 'rent',
    address: 'пр. Мира, 56, Москва',
    district: 'СВАО',
    area: 120,
    price: 240000,
    pricePerM2: 2000,
    image: 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/1acdf853-ec1f-4b29-84ba-d7230d412ca6.jpg',
    tags: ['Угловое', 'Витрина', 'Трафик 8000/день'],
    description: 'Угловое торговое помещение с двумя витринами на оживлённом проспекте. Высокий пешеходный трафик, рядом метро.',
    floor: 1,
    lat: 55.787,
    lng: 37.638,
  },
  {
    id: 4,
    title: 'Склад с офисом',
    type: 'warehouse',
    deal: 'rent',
    address: 'Варшавское шоссе, 125, Москва',
    district: 'ЮАО',
    area: 800,
    price: 560000,
    pricePerM2: 700,
    image: 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/11d13912-4216-4a73-9faf-309117250f99.jpg',
    tags: ['Отопление', 'КПП', 'Пандус'],
    description: 'Тёплый склад класса B+ с встроенным офисом 60 м², пандусом для грузовиков и охраняемой территорией.',
    lat: 55.638,
    lng: 37.618,
  },
  {
    id: 5,
    title: 'Сеть кофеен "CaféGo"',
    type: 'business',
    deal: 'business',
    address: 'Различные адреса, Москва',
    district: 'Несколько районов',
    area: 320,
    price: 22000000,
    payback: 24,
    profit: 920000,
    image: 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/b39b9336-f780-4ce4-aa0a-7c916796da5f.jpg',
    tags: ['4 точки', 'Франшиза', 'CRM система'],
    description: 'Сеть из 4 кофеен с собственной CRM, системой учёта и обученным персоналом. Ежемесячная прибыль стабильно растёт.',
    lat: 55.758,
    lng: 37.62,
    isHot: true,
  },
  {
    id: 6,
    title: 'Производственный цех',
    type: 'production',
    deal: 'sale',
    address: 'ул. Промышленная, 8, Химки',
    district: 'Подмосковье',
    area: 1200,
    price: 45000000,
    pricePerM2: 37500,
    image: 'https://cdn.poehali.dev/projects/4bce74f4-4dd7-424e-85e7-ff08f8399357/files/1acdf853-ec1f-4b29-84ba-d7230d412ca6.jpg',
    tags: ['380В', 'Кран-балка', 'Ж/Д ветка'],
    description: 'Производственный цех высотой 8 метров с кран-балкой 5т, электричеством 380В и железнодорожной веткой на территории.',
    lat: 55.887,
    lng: 37.44,
    isNew: true,
  },
];

export type Page = 'home' | 'catalog' | 'map' | 'favorites' | 'compare';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [favorites, setFavorites] = useState<number[]>([]);
  const [compareList, setCompareList] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]
    );
  };

  const toggleCompare = (id: number) => {
    setCompareList(prev => {
      if (prev.includes(id)) return prev.filter(c => c !== id);
      if (prev.length >= 3) return prev;
      return [...prev, id];
    });
  };

  const clearCompare = () => setCompareList([]);

  const compareProperties = PROPERTIES.filter(p => compareList.includes(p.id));
  const favoriteProperties = PROPERTIES.filter(p => favorites.includes(p.id));

  return (
    <div className="min-h-screen bg-background font-body">
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        favoritesCount={favorites.length}
        compareCount={compareList.length}
      />

      <main>
        {currentPage === 'home' && (
          <HomePage
            properties={PROPERTIES}
            favorites={favorites}
            compareList={compareList}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
            onNavigate={setCurrentPage}
          />
        )}
        {currentPage === 'catalog' && (
          <CatalogPage
            properties={PROPERTIES}
            favorites={favorites}
            compareList={compareList}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
          />
        )}
        {currentPage === 'map' && (
          <MapPage
            properties={PROPERTIES}
            favorites={favorites}
            compareList={compareList}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
          />
        )}
        {currentPage === 'favorites' && (
          <FavoritesPage
            properties={favoriteProperties}
            favorites={favorites}
            compareList={compareList}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
          />
        )}
        {currentPage === 'compare' && (
          <ComparePage
            properties={compareProperties}
            onRemove={(id) => toggleCompare(id)}
            onNavigate={setCurrentPage}
          />
        )}
      </main>

      {compareList.length > 0 && currentPage !== 'compare' && (
        <CompareBar
          count={compareList.length}
          onCompare={() => setCurrentPage('compare')}
          onClear={clearCompare}
        />
      )}
    </div>
  );
}
