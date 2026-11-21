import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../types';

export const CartDrawer: React.FC = () => {
  const {
    cart,
    cartSubtotal,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
  } = useStore();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const shippingFee = 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end no-print">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-[1px]" onClick={() => setIsCartOpen(false)} />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#111317]" />
            <h2 className="font-display text-base font-bold text-[#111317]">Shopping Bag</h2>
          </div>
          <button
            type="button"
            aria-label="Close bag"
            onClick={() => setIsCartOpen(false)}
            className="p-2 text-zinc-500 hover:text-[#111317] rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cart.length > 0 && (
          <div className="px-5 py-2.5 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800">
            <span className="font-medium">FREE nationwide Cash on Delivery on every order.</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12">
              <div className="w-14 h-14 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
                <ShoppingBag className="w-6 h-6 text-zinc-400" />
              </div>
              <p className="font-display font-semibold text-zinc-900">Your bag is empty</p>
              <p className="text-sm text-zinc-500 mt-1 max-w-xs">
                Explore VELLOX smart lighting, audio, coffee, and desk essentials.
              </p>
              <Link
                to="/shop"
                onClick={() => setIsCartOpen(false)}
                className="mt-5 px-5 py-2.5 bg-[#111317] text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.productId} className="flex gap-3.5 pb-4 border-b border-zinc-100">
                <Link
                  to={`/product/${item.slug}`}
                  onClick={() => setIsCartOpen(false)}
                  className="w-20 h-16 rounded-lg overflow-hidden bg-[#121417] shrink-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/product/${item.slug}`}
                      onClick={() => setIsCartOpen(false)}
                      className="text-sm font-semibold text-[#111317] line-clamp-1 hover:underline"
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.productId)}
                      aria-label="Remove item"
                      className="text-zinc-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <p className="font-mono text-xs text-zinc-600 mt-0.5 tabular-nums">
                    {formatPKR(item.price)}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="inline-flex items-center border border-zinc-200 rounded-lg">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                        className="p-1.5 text-zinc-600 hover:text-[#111317]"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="px-3 text-xs font-mono font-medium tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        disabled={item.quantity >= item.maxStock}
                        onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                        className="p-1.5 text-zinc-600 hover:text-[#111317] disabled:opacity-40"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <span className="font-mono text-sm font-semibold text-[#111317] tabular-nums">
                      {formatPKR(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="p-5 border-t border-zinc-200 bg-zinc-50 space-y-3">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatPKR(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Shipping (COD)</span>
              <span className="font-mono tabular-nums">
                {shippingFee === 0 ? 'FREE' : formatPKR(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#111317] pt-2 border-t border-zinc-200">
              <span>Estimated Total</span>
              <span className="font-mono tabular-nums">{formatPKR(cartSubtotal + shippingFee)}</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-2">
              <Link
                to="/cart"
                onClick={() => setIsCartOpen(false)}
                className="py-2.5 px-4 border border-zinc-300 bg-white text-[#111317] text-sm font-medium rounded-lg text-center hover:bg-zinc-100 transition-colors"
              >
                View Bag
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIsCartOpen(false);
                  navigate('/checkout');
                }}
                className="py-2.5 px-4 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
