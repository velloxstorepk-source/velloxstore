import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageCircle, RotateCcw, ShieldCheck, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { formatWhatsAppUrl } from '../types';

export const HomePage: React.FC = () => {
  const { products, categories, banners, storeSettings } = useStore();
  const [activeTab, setActiveTab] = useState<'featured' | 'trending' | 'bestsellers' | 'new'>('featured');

  const visibility = storeSettings.sectionsVisibility || {
    announcementBar: true,
    categories: true,
    featured: true,
    trending: true,
    bestSellers: true,
    newArrivals: true,
    promoBanner: true,
    benefits: true,
    newsletter: true,
  };

  const visibleProducts = useMemo(() => products.filter((p) => p.isVisible), [products]);
  const activeCategories = useMemo(
    () => categories.filter((c) => c.isActive).sort((a, b) => a.displayOrder - b.displayOrder),
    [categories]
  );

  const heroBanner = useMemo(
    () => banners.find((b) => b.placement === 'hero' && b.isActive),
    [banners]
  );
  const promoBanner = useMemo(
    () => banners.find((b) => b.placement === 'promo' && b.isActive),
    [banners]
  );

  const tabProducts = useMemo(() => {
    if (activeTab === 'featured') return visibleProducts.filter((p) => p.isFeatured);
    if (activeTab === 'trending') return visibleProducts.filter((p) => p.isTrending);
    if (activeTab === 'bestsellers') return visibleProducts.filter((p) => p.isBestSeller);
    return visibleProducts.filter((p) => p.isNewArrival);
  }, [visibleProducts, activeTab]);

  const specialOffers = useMemo(
    () => visibleProducts.filter((p) => p.originalPrice && p.originalPrice > p.price).slice(0, 3),
    [visibleProducts]
  );

  return (
    <div className="bg-[#FAFAFA]">
      {/* 1. Clean Hero Banner (No text overlay) */}
      <section className="bg-[#111317] border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <Link
            to={heroBanner?.ctaLink || '/shop'}
            className="block rounded-xl overflow-hidden border border-zinc-800 bg-[#0d0f12] shadow-2xl"
          >
            <img
              src={heroBanner?.imageUrl || storeSettings.bannerUrl || '/assets/aistudio/velloxb_5c666189.jpg'}
              alt="VELLOX Featured Collection"
              referrerPolicy="no-referrer"
              className="w-full h-auto object-cover"
            />
          </Link>
        </div>
      </section>

      {/* 2. Curated Collection Catalog directly below Hero Banner (3 per row on mobile & desktop like Daraz) */}
      {(visibility.featured || visibility.trending || visibility.bestSellers || visibility.newArrivals) && (
        <section className="max-w-7xl mx-auto px-2.5 sm:px-6 pt-8 sm:pt-10 pb-12 sm:pb-14">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111317]">
                Curated Collection
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Quality-inspected hardware and home essentials ready for fast dispatch.
              </p>
            </div>

            <div className="inline-flex flex-wrap items-center gap-1 p-1 bg-zinc-200/70 rounded-lg self-start sm:self-auto">
              {visibility.featured && (
                <button
                  type="button"
                  onClick={() => setActiveTab('featured')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'featured'
                      ? 'bg-white text-[#111317] shadow-sm'
                      : 'text-zinc-600 hover:text-[#111317]'
                  }`}
                >
                  Featured
                </button>
              )}
              {visibility.trending && (
                <button
                  type="button"
                  onClick={() => setActiveTab('trending')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'trending'
                      ? 'bg-white text-[#111317] shadow-sm'
                      : 'text-zinc-600 hover:text-[#111317]'
                  }`}
                >
                  Trending
                </button>
              )}
              {visibility.bestSellers && (
                <button
                  type="button"
                  onClick={() => setActiveTab('bestsellers')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'bestsellers'
                      ? 'bg-white text-[#111317] shadow-sm'
                      : 'text-zinc-600 hover:text-[#111317]'
                  }`}
                >
                  Best Sellers
                </button>
              )}
              {visibility.newArrivals && (
                <button
                  type="button"
                  onClick={() => setActiveTab('new')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap ${
                    activeTab === 'new'
                      ? 'bg-white text-[#111317] shadow-sm'
                      : 'text-zinc-600 hover:text-[#111317]'
                  }`}
                >
                  New Arrivals
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6">
            {(tabProducts.length > 0 ? tabProducts : visibleProducts).slice(0, 6).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              View Full Catalog <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* 3. Special Offers & Promotional Banner */}
      {visibility.promoBanner && (
        <section className="max-w-7xl mx-auto px-2.5 sm:px-6 pb-14">
          <div className="bg-[#111317] text-white rounded-2xl overflow-hidden border border-zinc-800 grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-[0.18em] text-zinc-400">
                Free Delivery For Everyone
              </p>
              <h2 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-balance">
                {promoBanner?.title || 'Free Nationwide Delivery for Everyone'}
              </h2>
              <p className="mt-3 text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed">
                {promoBanner?.subtitle ||
                  'Enjoy 100% FREE Cash on Delivery across Pakistan on every order — no minimum spend required.'}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to={promoBanner?.ctaLink || '/shop'}
                  className="px-5 py-2.5 bg-white text-[#111317] text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors"
                >
                  {promoBanner?.ctaText || 'Explore Offers'}
                </Link>
                <a
                  href={formatWhatsAppUrl(
                    storeSettings.whatsappNumber || '03014426490',
                    'Hello VELLOX, I would like to know about current special offers.'
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 border border-zinc-700 text-zinc-200 text-sm font-medium rounded-lg hover:border-zinc-500 transition-colors"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-400" />
                  Ask on WhatsApp
                </a>
              </div>
            </div>
            <div className="lg:col-span-5 bg-[#0d0f12] min-h-[240px]">
              <img
                src={promoBanner?.imageUrl || '/assets/products/led-desk-lamp.jpg'}
                alt="VELLOX Promotional Offer"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {specialOffers.length > 0 && (
            <div className="mt-12">
              <div className="flex items-end justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold text-[#111317]">Special Offers</h2>
                  <p className="text-sm text-zinc-600 mt-0.5">Direct savings on selected VELLOX essentials.</p>
                </div>
                <Link to="/shop?filter=sale" className="text-sm font-semibold text-[#111317] hover:underline">
                  View All Deals
                </Link>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6">
                {specialOffers.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* 4. Shop by Category (Moved to the end) */}
      {visibility.categories && activeCategories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-14">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#111317]">
                Shop by Category
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Explore engineered essentials across lighting, audio, kitchenware, and workspace.
              </p>
            </div>
            <Link
              to="/categories"
              className="text-sm font-semibold text-[#111317] hover:underline whitespace-nowrap shrink-0 flex items-center gap-1"
            >
              All Categories <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {activeCategories.slice(0, 4).map((cat) => {
              const count = visibleProducts.filter((p) => p.categoryId === cat.id).length;
              return (
                <Link
                  key={cat.id}
                  to={`/shop?category=${encodeURIComponent(cat.id)}`}
                  className="group bg-white border border-zinc-200 rounded-xl overflow-hidden hover:shadow-md transition-all"
                >
                  <div className="aspect-[4/3] bg-[#121417] overflow-hidden">
                    <img
                      src={cat.imageUrl || '/assets/products/led-desk-lamp.jpg'}
                      alt={cat.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-display font-semibold text-base text-[#111317]">{cat.name}</h3>
                    <p className="text-xs text-zinc-500 mt-1">
                      {count} {count === 1 ? 'Product' : 'Products'}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. Customer Benefits */}
      {visibility.benefits && (
        <section className="bg-white border-t border-zinc-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200 bg-[#FAFAFA]">
              <Truck className="w-5 h-5 text-[#111317] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-semibold text-[#111317]">Free Delivery Nationwide</h3>
                <p className="text-xs text-zinc-600 mt-1">100% Free Cash on Delivery across Pakistan on every order.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200 bg-[#FAFAFA]">
              <ShieldCheck className="w-5 h-5 text-[#111317] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-semibold text-[#111317]">Verified Quality</h3>
                <p className="text-xs text-zinc-600 mt-1">Every item is inspected and sealed prior to courier dispatch.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200 bg-[#FAFAFA]">
              <RotateCcw className="w-5 h-5 text-[#111317] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-semibold text-[#111317]">7-Day Easy Returns</h3>
                <p className="text-xs text-zinc-600 mt-1">Hassle-free replacement for defective or damaged deliveries.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-4 rounded-xl border border-zinc-200 bg-[#FAFAFA]">
              <MessageCircle className="w-5 h-5 text-[#111317] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-display text-sm font-semibold text-[#111317]">Direct WhatsApp Help</h3>
                <p className="text-xs text-zinc-600 mt-1">
                  Instant support at {storeSettings.phone || '+92 301 4426490'} for orders and inquiries.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
