import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageCircle, Package, ShoppingBag, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatWhatsAppUrl } from '../types';

export const WhatsAppWidget: React.FC = () => {
  const { storeSettings, products } = useStore();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const whatsappNumber = storeSettings.whatsappNumber || '03014426490';

  // Detect if currently viewing a product detail page
  const productSlugMatch = location.pathname.match(/^\/product\/([^/]+)/);
  const activeProduct = productSlugMatch
    ? products.find((p) => p.slug === decodeURIComponent(productSlugMatch[1]))
    : null;

  const supportUrl = formatWhatsAppUrl(
    whatsappNumber,
    'Hello VELLOX Support, I would like assistance.'
  );

  const productInquiryUrl = activeProduct
    ? formatWhatsAppUrl(
        whatsappNumber,
        `Hello VELLOX, I have an inquiry about: ${activeProduct.name} (${window.location.href})`
      )
    : formatWhatsAppUrl(
        whatsappNumber,
        `Hello VELLOX, I would like to inquire about a product on ${window.location.origin}/shop`
      );

  const orderInquiryUrl = formatWhatsAppUrl(
    whatsappNumber,
    'Hello VELLOX, I would like to check on my Order ID: #'
  );

  return (
    <div className="fixed bottom-5 right-5 z-40 no-print">
      {open && (
        <div className="mb-3 w-72 bg-white border border-zinc-200 rounded-xl shadow-xl overflow-hidden">
          <div className="bg-[#111317] text-white px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">VELLOX WhatsApp Support</p>
              <p className="text-xs text-zinc-400 font-mono">{storeSettings.phone || '+92 301 4426490'}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close WhatsApp menu"
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 space-y-1">
            <a
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Contact Support</span>
            </a>
            <a
              href={productInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <ShoppingBag className="w-4 h-4 text-zinc-700 shrink-0" />
              <span className="truncate">
                {activeProduct ? `Inquire: ${activeProduct.name}` : 'Product Inquiry'}
              </span>
            </a>
            <a
              href={orderInquiryUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 text-sm text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
            >
              <Package className="w-4 h-4 text-zinc-700 shrink-0" />
              <span>Order Inquiry</span>
            </a>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="WhatsApp Support"
        className="flex items-center gap-2 px-4 py-3 rounded-full bg-emerald-600 text-white shadow-lg hover:bg-emerald-700 transition-all text-sm font-semibold"
      >
        <MessageCircle className="w-5 h-5" />
        <span className="hidden sm:inline">WhatsApp</span>
      </button>
    </div>
  );
};
