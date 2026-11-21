import React, { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Check,
  ChevronRight,
  Heart,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Star,
  Truck,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { formatPKR, formatWhatsAppUrl } from '../types';

export const ProductDetailPage: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const { products, addToCart, toggleWishlist, wishlistIds, storeSettings } = useStore();
  const navigate = useNavigate();

  const product = useMemo(
    () => products.find((p) => p.slug === slug || p.id === slug),
    [products, slug]
  );

  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [qty, setQty] = useState(1);

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return products
      .filter((p) => p.isVisible && p.id !== product.id && p.categoryId === product.categoryId)
      .slice(0, 3);
  }, [products, product]);

  if (!product) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#111317]">Product Not Found</h1>
        <p className="text-sm text-zinc-600 mt-2">
          The product you are looking for may have been removed or renamed.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-block px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg"
        >
          Back to Shop
        </Link>
      </div>
    );
  }

  const images = product.images?.length ? product.images : ['/assets/products/led-desk-lamp.jpg'];
  const activeImg = images[selectedImageIdx] || images[0];
  const isWishlisted = wishlistIds.includes(product.id);
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discountPct =
    product.discountPercent ||
    (hasDiscount && product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0);

  const whatsappInquiryUrl = formatWhatsAppUrl(
    storeSettings.whatsappNumber || '03014426490',
    `Hello VELLOX, I would like to inquire about "${product.name}" (SKU: ${product.sku || product.id}) - ${window.location.href}`
  );

  const handleBuyNow = () => {
    addToCart(product, qty);
    navigate('/checkout');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-zinc-500 mb-6 flex-wrap">
        <Link to="/" className="hover:text-[#111317]">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/shop" className="hover:text-[#111317]">Shop</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        {product.categoryName && (
          <>
            <Link to={`/shop?category=${encodeURIComponent(product.categoryId)}`} className="hover:text-[#111317]">
              {product.categoryName}
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
          </>
        )}
        <span className="text-[#111317] font-medium truncate">{product.name}</span>
      </nav>

      {/* Main Contiguous Purchase Module */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left: Gallery */}
        <div className="lg:col-span-7 space-y-4">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-[#121417] border border-zinc-200">
            <img
              src={activeImg}
              alt={product.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>

          {images.length > 1 && (
            <div className="flex items-center gap-3 overflow-x-auto pb-1">
              {images.map((imgUrl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedImageIdx(idx)}
                  className={`w-20 h-16 rounded-lg overflow-hidden border-2 shrink-0 bg-[#121417] ${
                    selectedImageIdx === idx ? 'border-[#111317]' : 'border-zinc-200 opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt={`${product.name} ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details & Purchase Controls */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div>
            <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
              <span className="uppercase tracking-wider">{product.categoryName || 'VELLOX'}</span>
              {product.sku && <span className="font-mono">SKU: {product.sku}</span>}
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-bold text-[#111317] leading-tight">
              {product.name}
            </h1>

            <div className="mt-3 flex items-center gap-3 text-xs text-zinc-600">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span className="font-mono font-semibold text-[#111317]">
                  {(product.rating || 4.8).toFixed(1)}
                </span>
              </div>
              <span aria-hidden="true">&middot;</span>
              <span>{product.reviewCount || 12} verified reviews</span>
              <span aria-hidden="true">&middot;</span>
              <span className={product.inStock ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                {product.inStock ? `In Stock (${product.stock} left)` : 'Out of Stock'}
              </span>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100 flex items-baseline gap-3 flex-wrap">
            <span className="font-mono text-3xl font-bold text-[#111317] tabular-nums">
              {formatPKR(product.price)}
            </span>
            {hasDiscount && product.originalPrice && (
              <>
                <span className="font-mono text-base text-zinc-400 line-through tabular-nums">
                  {formatPKR(product.originalPrice)}
                </span>
                <span className="text-xs font-semibold text-emerald-700">
                  Save {discountPct}%
                </span>
              </>
            )}
          </div>

          <p className="text-sm text-zinc-700 leading-relaxed">{product.description}</p>

          {/* Quantity & Actions */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Quantity</span>
              <div className="inline-flex items-center border border-zinc-300 rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  className="p-2.5 text-zinc-700 hover:text-[#111317]"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="px-4 font-mono text-sm font-semibold tabular-nums">{qty}</span>
                <button
                  type="button"
                  disabled={!product.inStock || qty >= product.stock}
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  className="p-2.5 text-zinc-700 hover:text-[#111317] disabled:opacity-40"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={!product.inStock || product.stock <= 0}
                onClick={() => addToCart(product, qty)}
                className="py-3 px-4 border border-[#111317] text-[#111317] text-sm font-semibold rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40"
              >
                Add to Cart
              </button>
              <button
                type="button"
                disabled={!product.inStock || product.stock <= 0}
                onClick={handleBuyNow}
                className="py-3 px-4 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                Buy Now (COD)
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => toggleWishlist(product.id)}
                className={`py-2.5 px-4 border rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isWishlisted
                    ? 'border-rose-200 bg-rose-50 text-rose-700'
                    : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-current' : ''}`} />
                {isWishlisted ? 'Saved in Wishlist' : 'Add to Wishlist'}
              </button>
              <a
                href={whatsappInquiryUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 border border-emerald-200 bg-emerald-50 text-emerald-800 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                Product Inquiry
              </a>
            </div>
          </div>

          {/* Delivery & Policy Highlights */}
          <div className="pt-4 border-t border-zinc-100 space-y-2.5 text-xs text-zinc-600">
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-zinc-800 shrink-0" />
              <span>
                FREE Cash on Delivery nationwide for everyone (2–4 days)
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <RotateCcw className="w-4 h-4 text-zinc-800 shrink-0" />
              <span>7-day return &amp; replacement policy for damaged or defective items</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-zinc-800 shrink-0" />
              <span>100% authentic VELLOX inspected stock</span>
            </div>
          </div>

          {/* Specifications */}
          {product.specifications && (
            <div className="pt-4 border-t border-zinc-100">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
                Specifications
              </h2>
              <div className="space-y-1.5 text-xs text-zinc-700">
                {product.specifications.split('|').map((spec, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-zinc-900 shrink-0 mt-0.5" />
                    <span>{spec.trim()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-10 border-t border-zinc-200">
          <h2 className="font-display text-2xl font-bold text-[#111317] mb-6">Related Products</h2>
          <div className="grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6">
            {relatedProducts.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
