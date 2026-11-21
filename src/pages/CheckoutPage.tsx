import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { CheckCircle2, MessageCircle, ShieldCheck, Tag, Truck } from 'lucide-react';
import { db } from '../firebase';
import { useStore } from '../context/StoreContext';
import { CustomerAddress, formatPKR, formatWhatsAppUrl, Order } from '../types';

export const CheckoutPage: React.FC = () => {
  const {
    user,
    userProfile,
    cart,
    cartSubtotal,
    storeSettings,
    validateCoupon,
    placeOrder,
    showToast,
  } = useStore();

  const [savedAddresses, setSavedAddresses] = useState<CustomerAddress[]>([]);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [notes, setNotes] = useState('');

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMessage, setCouponMessage] = useState('');
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (userProfile) {
      setFullName((prev) => prev || userProfile.fullName || '');
      setEmail((prev) => prev || userProfile.email || '');
      setPhone((prev) => prev || userProfile.phone || '');
    } else if (user) {
      setFullName((prev) => prev || user.displayName || '');
      setEmail((prev) => prev || user.email || '');
    }
  }, [user, userProfile]);

  useEffect(() => {
    if (!user) return;
    getDocs(collection(db, 'users', user.uid, 'addresses'))
      .then((snap) => {
        const list = snap.docs.map((d) => d.data() as CustomerAddress);
        setSavedAddresses(list);
        const def = list.find((a) => a.isDefault) || list[0];
        if (def) {
          setFullName((prev) => prev || def.fullName);
          setPhone((prev) => prev || def.phone);
          setCity((prev) => prev || def.city);
          setDeliveryAddress((prev) => prev || def.address);
          setPostalCode((prev) => prev || def.postalCode || '');
        }
      })
      .catch(() => {});
  }, [user]);

  const shippingFee = 0;
  const discountAmount = appliedCoupon ? appliedCoupon.discount : 0;
  const finalTotal = Math.max(0, cartSubtotal - discountAmount);

  const handleApplyCoupon = async () => {
    setCheckingCoupon(true);
    const result = await validateCoupon(couponInput, cartSubtotal);
    setCouponMessage(result.message);
    if (result.valid && result.coupon) {
      setAppliedCoupon({ code: result.coupon.code, discount: result.discount });
    } else {
      setAppliedCoupon(null);
    }
    setCheckingCoupon(false);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setErrorMsg('');

    if (fullName.trim().length < 2) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (phone.trim().length < 10) {
      setErrorMsg('Please enter a valid mobile number (e.g. 03XX-XXXXXXX).');
      return;
    }
    if (city.trim().length < 2) {
      setErrorMsg('Please enter your delivery city.');
      return;
    }
    if (deliveryAddress.trim().length < 6) {
      setErrorMsg('Please enter your complete street/house delivery address.');
      return;
    }

    setSubmitting(true);
    try {
      const order = await placeOrder({
        customerName: fullName,
        customerPhone: phone,
        customerEmail: email,
        city,
        deliveryAddress,
        postalCode,
        notes,
        couponCode: appliedCoupon?.code,
      });
      setConfirmedOrder(order);
      showToast(`Order #${order.orderNumber} placed successfully.`);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    const waUrl = formatWhatsAppUrl(
      storeSettings.whatsappNumber || '03014426490',
      `Hello VELLOX, I just placed Order #${confirmedOrder.orderNumber} (Total: ${formatPKR(
        confirmedOrder.totalAmount
      )}). Please confirm dispatch.`
    );

    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="bg-white border border-zinc-200 rounded-2xl p-6 sm:p-10 space-y-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                Order Confirmed
              </p>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111317] mt-1">
                Thank you, {confirmedOrder.customerName}!
              </h1>
              <p className="text-sm text-zinc-600 mt-1">
                Your Cash on Delivery order{' '}
                <span className="font-mono font-bold text-[#111317]">#{confirmedOrder.orderNumber}</span>{' '}
                has been saved and received by VELLOX.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Order Number</p>
              <p className="font-mono font-bold text-[#111317] mt-0.5">#{confirmedOrder.orderNumber}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Payment Method</p>
              <p className="font-semibold text-[#111317] mt-0.5">Cash on Delivery (COD)</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Delivery To</p>
              <p className="text-zinc-800 mt-0.5">
                {confirmedOrder.deliveryAddress}, {confirmedOrder.city}
              </p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Contact Number</p>
              <p className="font-mono text-zinc-800 mt-0.5">{confirmedOrder.customerPhone}</p>
            </div>
          </div>

          <div className="border border-zinc-200 rounded-xl overflow-hidden">
            <div className="bg-zinc-50 px-4 py-2.5 border-b border-zinc-200 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Order Summary
            </div>
            <div className="divide-y divide-zinc-100">
              {confirmedOrder.items.map((item) => (
                <div key={item.productId} className="px-4 py-3 flex items-center justify-between gap-4 text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.image}
                      alt={item.name}
                      referrerPolicy="no-referrer"
                      className="w-12 h-10 rounded object-cover bg-[#121417] shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-medium text-[#111317] truncate">{item.name}</p>
                      <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="font-mono font-semibold text-[#111317] tabular-nums shrink-0">
                    {formatPKR(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>
            <div className="px-4 py-3 bg-zinc-50 border-t border-zinc-200 space-y-1.5 text-sm">
              <div className="flex justify-between text-zinc-600">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatPKR(confirmedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Shipping</span>
                <span className="font-mono tabular-nums">
                  {confirmedOrder.shippingFee === 0 ? 'FREE' : formatPKR(confirmedOrder.shippingFee)}
                </span>
              </div>
              {confirmedOrder.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Discount</span>
                  <span className="font-mono tabular-nums">-{formatPKR(confirmedOrder.discountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base text-[#111317] pt-2 border-t border-zinc-200">
                <span>Total Payable on Delivery</span>
                <span className="font-mono tabular-nums">{formatPKR(confirmedOrder.totalAmount)}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              to={`/track-order?id=${encodeURIComponent(confirmedOrder.orderNumber)}`}
              className="px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
            >
              Track Order
            </Link>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold rounded-lg hover:bg-emerald-100 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Order Inquiry
            </a>
            <Link
              to="/shop"
              className="px-5 py-2.5 border border-zinc-200 text-zinc-700 text-sm font-medium rounded-lg hover:bg-zinc-50 transition-colors"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-bold text-[#111317]">Your Bag is Empty</h1>
        <p className="text-sm text-zinc-600 mt-2">Add products to your bag before checking out.</p>
        <Link
          to="/shop"
          className="mt-6 inline-block px-6 py-3 bg-[#111317] text-white text-sm font-semibold rounded-lg"
        >
          Browse Catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-[#111317]">Cash on Delivery Checkout</h1>
        <p className="text-sm text-zinc-600 mt-1">
          Complete your delivery information below. Pay in cash when your parcel arrives.
        </p>
      </div>

      <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Delivery Details */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6">
          {savedAddresses.length > 0 && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-2">
                Use Saved Address
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => {
                      setFullName(addr.fullName);
                      setPhone(addr.phone);
                      setCity(addr.city);
                      setDeliveryAddress(addr.address);
                      setPostalCode(addr.postalCode || '');
                    }}
                    className="text-left p-3 border border-zinc-200 rounded-lg hover:border-[#111317] transition-colors text-xs"
                  >
                    <p className="font-semibold text-[#111317]">{addr.label || addr.city}</p>
                    <p className="text-zinc-600 truncate mt-0.5">{addr.address}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Hamza Tariq"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Mobile Number *
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="03XX-XXXXXXX"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address (for order confirmation)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                City *
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Sheikhupura, Lahore, Karachi, Islamabad..."
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Postal Code
              </label>
              <input
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="54000"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Full Delivery Address *
              </label>
              <textarea
                rows={3}
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House / Flat #, Street, Sector / Block, Nearest Landmark"
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Additional Order Notes (Optional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Delivery timing instructions, call before arrival, etc."
                className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-200">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Payment Method
            </h2>
            <div className="p-4 border-2 border-[#111317] bg-zinc-50 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Truck className="w-5 h-5 text-[#111317]" />
                <div>
                  <p className="text-sm font-bold text-[#111317]">Cash on Delivery (COD)</p>
                  <p className="text-xs text-zinc-600">Pay cash directly to the courier rider upon arrival.</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700">Selected</span>
            </div>
          </div>
        </div>

        {/* Right: Order Review & Coupon */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-5">
          <h2 className="font-display text-lg font-bold text-[#111317]">Your Order ({cart.length})</h2>

          <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.productId} className="py-3 flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={item.image}
                    alt={item.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-10 rounded object-cover bg-[#121417] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-medium text-[#111317] truncate">{item.name}</p>
                    <p className="text-xs text-zinc-500">Qty: {item.quantity}</p>
                  </div>
                </div>
                <span className="font-mono font-semibold text-[#111317] tabular-nums shrink-0">
                  {formatPKR(item.price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Coupon Input */}
          <div className="pt-3 border-t border-zinc-200">
            <label className="block text-xs font-semibold text-zinc-700 mb-1.5">Discount Coupon</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317] font-mono uppercase"
                />
              </div>
              <button
                type="button"
                disabled={checkingCoupon || !couponInput.trim()}
                onClick={handleApplyCoupon}
                className="px-4 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 disabled:opacity-40"
              >
                {checkingCoupon ? 'Checking...' : 'Apply'}
              </button>
            </div>
            {couponMessage && (
              <p className={`text-xs mt-1.5 ${appliedCoupon ? 'text-emerald-700' : 'text-rose-600'}`}>
                {couponMessage}
              </p>
            )}
          </div>

          <div className="pt-3 border-t border-zinc-200 space-y-2 text-sm">
            <div className="flex justify-between text-zinc-600">
              <span>Subtotal</span>
              <span className="font-mono tabular-nums">{formatPKR(cartSubtotal)}</span>
            </div>
            <div className="flex justify-between text-zinc-600">
              <span>Shipping Charges</span>
              <span className="font-mono tabular-nums">
                {shippingFee === 0 ? 'FREE' : formatPKR(shippingFee)}
              </span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount ({appliedCoupon?.code})</span>
                <span className="font-mono tabular-nums">-{formatPKR(discountAmount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-[#111317] pt-3 border-t border-zinc-200">
              <span>Final Total (PKR)</span>
              <span className="font-mono tabular-nums">{formatPKR(finalTotal)}</span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {submitting ? 'Confirming Order...' : `Place COD Order · ${formatPKR(finalTotal)}`}
          </button>

          <p className="text-xs text-zinc-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-zinc-600" />
            Stock is reserved immediately upon confirmation.
          </p>
        </div>
      </form>
    </div>
  );
};
