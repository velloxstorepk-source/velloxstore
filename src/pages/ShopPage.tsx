import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';

export const ShopPage: React.FC = () => {
  const { products, categories, catalogLoading } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialQuery = searchParams.get('q') || '';
  const initialCategory = searchParams.get('category') || 'all';
  const initialFilter = searchParams.get('filter') || 'all';

  const [queryText, setQueryText] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [collectionFilter, setCollectionFilter] = useState(initialFilter);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'featured' | 'price_asc' | 'price_desc' | 'rating'>('featured');

  const filteredProducts = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return products
      .filter((p) => p.isVisible)
      .filter((p) => {
        if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) return false;
        if (inStockOnly && (!p.inStock || p.stock <= 0)) return false;
        if (collectionFilter === 'featured' && !p.isFeatured) return false;
        if (collectionFilter === 'trending' && !p.isTrending) return false;
        if (collectionFilter === 'bestsellers' && !p.isBestSeller) return false;
        if (collectionFilter === 'new' && !p.isNewArrival) return false;
        if (collectionFilter === 'sale' && !(p.originalPrice && p.originalPrice > p.price)) return false;
        if (q) {
          const hay = `${p.name} ${p.description || ''} ${p.categoryName || ''} ${p.sku || ''}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'price_asc') return a.price - b.price;
        if (sortBy === 'price_desc') return b.price - a.price;
        if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
        return Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured));
      });
  }, [products, queryText, selectedCategory, collectionFilter, inStockOnly, sortBy]);

  const clearFilters = () => {
    setQueryText('');
    setSelectedCategory('all');
    setCollectionFilter('all');
    setInStockOnly(false);
    setSortBy('featured');
    setSearchParams({});
  };

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-8 sm:py-10">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#111317]">
            {queryText ? `Search: "${queryText}"` : 'Shop VELLOX'}
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Showing {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} with FREE Cash on Delivery nationwide.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Filter by keyword..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 w-56"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
          >
            <option value="featured">Sort: Featured</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="py-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-500 mr-1">
            <SlidersHorizontal className="w-3.5 h-3.5" /> Category:
          </span>
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              selectedCategory === 'all'
                ? 'bg-[#111317] text-white border-[#111317]'
                : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
            }`}
          >
            All
          </button>
          {categories.filter((c) => c.isActive).map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-[#111317] text-white border-[#111317]'
                  : 'bg-white text-zinc-700 border-zinc-200 hover:border-zinc-400'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={collectionFilter}
            onChange={(e) => setCollectionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium bg-white border border-zinc-200 rounded-lg focus:outline-none"
          >
            <option value="all">All Collections</option>
            <option value="featured">Featured</option>
            <option value="trending">Trending</option>
            <option value="bestsellers">Best Sellers</option>
            <option value="new">New Arrivals</option>
            <option value="sale">On Sale</option>
          </select>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
            <input
              type="checkbox"
              checked={inStockOnly}
              onChange={(e) => setInStockOnly(e.target.checked)}
              className="rounded border-zinc-300 text-[#111317]"
            />
            In Stock Only
          </label>

          {(queryText || selectedCategory !== 'all' || collectionFilter !== 'all' || inStockOnly) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 hover:underline"
            >
              <X className="w-3.5 h-3.5" /> Reset
            </button>
          )}
        </div>
      </div>

      {catalogLoading ? (
        <div className="grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6 mt-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-zinc-200 rounded-xl h-56 sm:h-80 animate-pulse" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white border border-zinc-200 rounded-xl p-12 text-center mt-4">
          <h2 className="font-display text-lg font-semibold text-[#111317]">No matching products found</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Try clearing your search keyword or switching category filters.
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-5 px-5 py-2.5 bg-[#111317] text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6 mt-2">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
};
