import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR, formatWhatsAppUrl, Product } from '../types';

export const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
  const navigate = useNavigate();
  const { addToCart, toggleWishlist, wishlistIds, storeSettings } = useStore();
  const [imgError, setImgError] = useState(false);

  const isWishlisted = wishlistIds.includes(product.id);
  const isAvailable = product.inStock && product.stock > 0;
  const hasDiscount = Boolean(product.originalPrice && product.originalPrice > product.price);
  const discountPct =
    product.discountPercent ||
    (hasDiscount && product.originalPrice
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : 0);

  const productUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/product/${product.slug}` : `/product/${product.slug}`;
  const whatsappHref = formatWhatsAppUrl(
    storeSettings.whatsappNumber || '03014426490',
    `Hello VELLOX, I want to buy:\nProduct: ${product.name}\nPrice: ${formatPKR(product.price)}${
      product.sku ? `\nSKU: ${product.sku}` : ''
    }\nLink: ${productUrl}`
  );

  const handleBuyNow = () => {
    if (!isAvailable) return;
    addToCart(product, 1);
    navigate('/checkout');
  };

  return (
    <div className="group bg-white border border-zinc-200 rounded-lg sm:rounded-xl overflow-hidden flex flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-square sm:aspect-[4/3] bg-[#121417] overflow-hidden">
        <Link to={`/product/${product.slug}`} className="block w-full h-full">
          {!imgError && product.images?.[0] ? (
            <img
              src={product.images[0]}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 text-zinc-400 bg-gradient-to-br from-zinc-900 to-zinc-800">
              <ShoppingBag className="w-6 h-6 sm:w-8 sm:h-8 mb-1 sm:mb-2 opacity-60" />
              <span className="text-[10px] sm:text-xs text-center font-medium line-clamp-2">{product.name}</span>
            </div>
          )}
        </Link>

        {discountPct > 0 && (
          <span className="sm:hidden absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[9px] font-bold">
            -{discountPct}%
          </span>
        )}

        <button
          type="button"
          onClick={() => toggleWishlist(product.id)}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className={`absolute top-1.5 right-1.5 sm:top-3 sm:right-3 p-1 sm:p-2 rounded-md sm:rounded-lg backdrop-blur-sm transition-colors ${
            isWishlisted
              ? 'bg-white text-rose-600 shadow-sm'
              : 'bg-black/50 text-white hover:bg-black/75'
          }`}
        >
          <Heart className={`w-3 h-3 sm:w-4 sm:h-4 ${isWishlisted ? 'fill-current' : ''}`} />
        </button>

        {!isAvailable && (
          <div className="absolute inset-x-0 bottom-0 bg-black/75 text-white text-[10px] sm:text-xs font-medium py-1 px-2 text-center">
            Out of Stock
          </div>
        )}
      </div>

      <div className="p-2 sm:p-4 flex-1 flex flex-col justify-between gap-1.5 sm:gap-3">
        <div>
          <div className="hidden sm:flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="uppercase tracking-wider truncate">{product.categoryName || 'Essentials'}</span>
            {discountPct > 0 && (
              <span className="text-emerald-700 font-semibold shrink-0">{discountPct}% Off</span>
            )}
          </div>

          <Link to={`/product/${product.slug}`} className="block sm:mt-1.5">
            <h3 className="font-display text-[11px] sm:text-[15px] font-semibold text-[#111317] leading-tight sm:leading-snug line-clamp-2 min-h-[28px] sm:min-h-[42px] group-hover:text-zinc-700 transition-colors">
              {product.name}
            </h3>
          </Link>

          <div className="mt-1 sm:mt-2 flex items-center justify-between gap-1 text-[10px] sm:text-xs text-zinc-500">
            <div className="flex items-center gap-1">
              <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 fill-amber-500 shrink-0" />
              <span className="font-mono font-medium text-zinc-700">{(product.rating || 4.8).toFixed(1)}</span>
              <span className="hidden sm:inline" aria-hidden="true">&middot;</span>
              <span className="hidden sm:inline">{product.reviewCount || 12} reviews</span>
            </div>
            <span className="text-[9px] sm:text-[11px] font-semibold text-emerald-700 whitespace-nowrap">
              Free Delivery
            </span>
          </div>
        </div>

        <div className="pt-1.5 sm:pt-2 border-t border-zinc-100">
          <div className="flex items-baseline justify-between gap-1">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-2 min-w-0">
              <span className="font-mono text-xs sm:text-base font-bold text-[#111317] tabular-nums truncate">
                {formatPKR(product.price)}
              </span>
              {hasDiscount && product.originalPrice && (
                <span className="font-mono text-[9px] sm:text-xs text-zinc-400 line-through tabular-nums truncate">
                  {formatPKR(product.originalPrice)}
                </span>
              )}
            </div>
            <span className={`hidden sm:inline text-xs font-medium shrink-0 ${isAvailable ? 'text-emerald-700' : 'text-rose-600'}`}>
              {isAvailable ? 'In Stock' : 'Sold Out'}
            </span>
          </div>

          <div className="mt-2 sm:mt-3 space-y-1 sm:space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-2">
              <button
                type="button"
                disabled={!isAvailable}
                onClick={() => addToCart(product, 1)}
                className="py-1.5 sm:py-2.5 px-1.5 sm:px-3 bg-[#111317] text-white text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg hover:bg-zinc-800 transition-colors disabled:bg-zinc-200 disabled:text-zinc-500 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Add to Cart
              </button>
              <button
                type="button"
                disabled={!isAvailable}
                onClick={handleBuyNow}
                className="py-1.5 sm:py-2.5 px-1.5 sm:px-3 border border-[#111317] text-[#111317] bg-white text-[10px] sm:text-xs font-semibold rounded-md sm:rounded-lg hover:bg-zinc-100 transition-colors disabled:border-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Buy Now
              </button>
            </div>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-1.5 sm:py-2.5 px-1 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[9.5px] sm:text-xs font-semibold rounded-md sm:rounded-lg transition-colors flex items-center justify-center gap-1 sm:gap-1.5 whitespace-nowrap"
            >
              <MessageCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
              <span className="sm:hidden">Buy on WhatsApp</span>
              <span className="hidden sm:inline">Buy Now on WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
