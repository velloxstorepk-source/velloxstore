import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatPKR } from '../types';

export const CartPage: React.FC = () => {
  const { cart, cartSubtotal, updateCartQty, removeFromCart } = useStore();
  const navigate = useNavigate();

  const shippingFee = 0;
  const total = cartSubtotal;

  if (cart.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-5">
          <ShoppingBag className="w-7 h-7 text-zinc-400" />
        </div>
        <h1 className="font-display text-2xl font-bold text-[#111317]">Your Shopping Bag is Empty</h1>
        <p className="text-sm text-zinc-600 mt-2">
          Browse our collection of modern tech, home lighting, and coffee essentials.
        </p>
        <Link
          to="/shop"
          className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
        >
          Continue Shopping <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="font-display text-3xl font-bold text-[#111317] mb-8">Shopping Bag</h1>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-200">
          {cart.map((item) => (
            <div key={item.productId} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
              <Link
                to={`/product/${item.slug}`}
                className="w-24 h-20 rounded-lg overflow-hidden bg-[#121417] shrink-0"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/product/${item.slug}`}
                  className="font-display font-semibold text-base text-[#111317] hover:underline line-clamp-1"
                >
                  {item.name}
                </Link>
                <p className="font-mono text-sm text-zinc-600 mt-1 tabular-nums">
                  {formatPKR(item.price)} each
                </p>
                <p className="text-xs text-zinc-500 mt-0.5">Available stock: {item.maxStock}</p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-5">
                <div className="inline-flex items-center border border-zinc-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => updateCartQty(item.productId, item.quantity - 1)}
                    className="p-2 text-zinc-600 hover:text-[#111317]"
                    aria-label="Decrease quantity"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="px-3.5 font-mono text-sm font-medium tabular-nums">{item.quantity}</span>
                  <button
                    type="button"
                    disabled={item.quantity >= item.maxStock}
                    onClick={() => updateCartQty(item.productId, item.quantity + 1)}
                    className="p-2 text-zinc-600 hover:text-[#111317] disabled:opacity-40"
                    aria-label="Increase quantity"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                <span className="font-mono text-base font-bold text-[#111317] tabular-nums w-28 text-right">
                  {formatPKR(item.price * item.quantity)}
                </span>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.productId)}
                  aria-label="Remove item"
                  className="p-2 text-zinc-400 hover:text-rose-600"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#111317]">Order Summary</h2>
          <div className="space-y-2.5 text-sm pt-2">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatPKR(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Cash on Delivery Shipping</span>
              <span className="font-mono tabular-nums">
                {shippingFee === 0 ? 'FREE' : formatPKR(shippingFee)}
              </span>
            </div>
            <div className="pt-3 border-t border-zinc-200 flex justify-between text-base font-bold text-[#111317]">
              <span>Estimated Total</span>
              <span className="font-mono tabular-nums">{formatPKR(total)}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/checkout')}
            className="w-full py-3 px-4 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Proceed to Checkout
          </button>

          <Link
            to="/shop"
            className="block w-full py-2.5 px-4 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg text-center hover:bg-zinc-50 transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};
