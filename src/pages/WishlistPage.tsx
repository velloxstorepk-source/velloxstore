import React from 'react';
import { Link } from 'react-router-dom';
import { Heart } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';

export const WishlistPage: React.FC = () => {
  const { products, wishlistIds } = useStore();
  const saved = products.filter((p) => wishlistIds.includes(p.id));

  return (
    <div className="max-w-7xl mx-auto px-2.5 sm:px-6 py-10 sm:py-12">
      <div className="pb-6 border-b border-zinc-200">
        <h1 className="font-display text-3xl font-bold text-[#111317]">Saved Wishlist</h1>
        <p className="text-sm text-zinc-600 mt-1">
          {saved.length} {saved.length === 1 ? 'item' : 'items'} saved for later.
        </p>
      </div>

      {saved.length === 0 ? (
        <div className="py-16 text-center bg-white border border-zinc-200 rounded-xl mt-8">
          <Heart className="w-8 h-8 text-zinc-300 mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-[#111317]">Your wishlist is empty</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Tap the heart icon on any product to save it here.
          </p>
          <Link
            to="/shop"
            className="mt-5 inline-block px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg"
          >
            Explore Products
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-5 lg:gap-6">
          {saved.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
};
