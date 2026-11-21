import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { CheckCircle2, MessageCircle, Package, Search, Truck } from 'lucide-react';
import { db } from '../firebase';
import { useStore } from '../context/StoreContext';
import { formatPKR, formatWhatsAppUrl, ORDER_STATUSES, OrderStatus, OrderTrackingDoc } from '../types';

export const TrackOrderPage: React.FC = () => {
  const { storeSettings } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [orderInput, setOrderInput] = useState(searchParams.get('id') || '');
  const [loading, setLoading] = useState(false);
  const [tracking, setTracking] = useState<OrderTrackingDoc | null>(null);
  const [notFound, setNotFound] = useState(false);

  const lookupOrder = async (rawId: string) => {
    const clean = rawId.trim().replace(/^#/, '').toUpperCase();
    if (!clean) return;
    setLoading(true);
    setNotFound(false);
    try {
      const snap = await getDoc(doc(db, 'orderTracking', clean));
      if (snap.exists()) {
        setTracking(snap.data() as OrderTrackingDoc);
      } else {
        setTracking(null);
        setNotFound(true);
      }
    } catch {
      setTracking(null);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initial = searchParams.get('id');
    if (initial) {
      setOrderInput(initial);
      lookupOrder(initial);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = orderInput.trim().replace(/^#/, '').toUpperCase();
    if (!clean) return;
    setSearchParams({ id: clean });
    lookupOrder(clean);
  };

  const progressSteps: OrderStatus[] = ORDER_STATUSES.filter((s) => s !== 'Cancelled');
  const activeStepIdx = tracking ? progressSteps.indexOf(tracking.status) : -1;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-display text-3xl font-bold text-[#111317]">Track Your VELLOX Order</h1>
        <p className="text-sm text-zinc-600 mt-2">
          Enter your Order ID (for example <span className="font-mono">VLX-123456ABCD</span>) to check live shipment status.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder="Enter Order ID (e.g. VLX-...)"
              className="w-full pl-10 pr-4 py-3 text-sm bg-white border border-zinc-300 rounded-lg focus:outline-none focus:border-[#111317] font-mono uppercase"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800 transition-colors"
          >
            {loading ? 'Checking...' : 'Track'}
          </button>
        </form>
      </div>

      {notFound && (
        <div className="mt-8 bg-white border border-zinc-200 rounded-xl p-8 text-center">
          <Package className="w-8 h-8 text-zinc-400 mx-auto mb-3" />
          <h2 className="font-display font-semibold text-[#111317]">Order Not Found</h2>
          <p className="text-sm text-zinc-600 mt-1">
            Please verify the Order ID from your confirmation screen or reach out on WhatsApp for assistance.
          </p>
        </div>
      )}

      {tracking && (
        <div className="mt-8 bg-white border border-zinc-200 rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-200">
            <div>
              <p className="text-xs text-zinc-500">Order ID</p>
              <h2 className="font-mono text-xl font-bold text-[#111317]">#{tracking.orderNumber}</h2>
            </div>
            <div className="text-right">
              <p className="text-xs text-zinc-500">Status</p>
              <p
                className={`text-sm font-bold ${
                  tracking.status === 'Cancelled'
                    ? 'text-rose-600'
                    : tracking.status === 'Delivered'
                    ? 'text-emerald-700'
                    : 'text-[#111317]'
                }`}
              >
                {tracking.status}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-xs text-zinc-500">Destination City</p>
              <p className="font-medium text-[#111317] mt-0.5">{tracking.city}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">Items</p>
              <p className="font-mono font-medium text-[#111317] mt-0.5">{tracking.itemCount}</p>
            </div>
            <div>
              <p className="text-xs text-zinc-500">COD Total</p>
              <p className="font-mono font-bold text-[#111317] mt-0.5 tabular-nums">
                {formatPKR(tracking.totalAmount)}
              </p>
            </div>
          </div>

          {tracking.status !== 'Cancelled' && (
            <div className="pt-2">
              <div className="grid grid-cols-5 gap-2">
                {progressSteps.map((step, idx) => {
                  const done = idx <= activeStepIdx;
                  return (
                    <div key={step} className="text-center">
                      <div
                        className={`h-2 rounded-full mb-2 ${
                          done ? 'bg-[#111317]' : 'bg-zinc-200'
                        }`}
                      />
                      <span
                        className={`text-[11px] font-medium ${
                          done ? 'text-[#111317]' : 'text-zinc-400'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-zinc-100">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 mb-3">
              Status History
            </h3>
            <div className="space-y-3">
              {tracking.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  {h.status === 'Shipped' ? (
                    <Truck className="w-4 h-4 text-[#111317] mt-0.5 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className="font-semibold text-[#111317]">{h.status}</p>
                    {h.note && <p className="text-xs text-zinc-600">{h.note}</p>}
                    <p className="text-[11px] font-mono text-zinc-400 mt-0.5">
                      {new Date(h.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-100">
            <a
              href={formatWhatsAppUrl(
                storeSettings.whatsappNumber || '03014426490',
                `Hello VELLOX, I would like an update on Order #${tracking.orderNumber}.`
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4" />
              Order Inquiry on WhatsApp
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
