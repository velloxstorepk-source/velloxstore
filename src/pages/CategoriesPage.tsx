import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const CategoriesPage: React.FC = () => {
  const { categories, products } = useStore();
  const activeCategories = categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.displayOrder - b.displayOrder);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
      <div className="max-w-2xl">
        <h1 className="font-display text-3xl font-bold text-[#111317]">All Categories</h1>
        <p className="text-sm text-zinc-600 mt-2">
          Browse VELLOX product lines curated for modern living, studio productivity, and specialty coffee.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeCategories.map((cat) => {
          const count = products.filter((p) => p.isVisible && p.categoryId === cat.id).length;
          return (
            <Link
              key={cat.id}
              to={`/shop?category=${encodeURIComponent(cat.id)}`}
              className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-all flex flex-col"
            >
              <div className="aspect-[16/10] bg-[#121417] overflow-hidden">
                <img
                  src={cat.imageUrl || '/assets/products/led-desk-lamp.jpg'}
                  alt={cat.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="p-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="font-display text-lg font-bold text-[#111317]">{cat.name}</h2>
                    <span className="text-xs font-mono text-zinc-500">{count} items</span>
                  </div>
                  {cat.description && (
                    <p className="text-sm text-zinc-600 mt-2 leading-relaxed">{cat.description}</p>
                  )}
                </div>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#111317]">
                  Browse {cat.name} <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
