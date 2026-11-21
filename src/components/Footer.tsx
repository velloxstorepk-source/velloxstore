import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { Mail, MessageCircle, MapPin, Phone } from 'lucide-react';
import { db } from '../firebase';
import { useStore } from '../context/StoreContext';
import { formatWhatsAppUrl } from '../types';

export const Footer: React.FC = () => {
  const { storeSettings, categories, showToast } = useStore();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      showToast('Please enter a valid email address.');
      return;
    }
    setSubmitting(true);
    try {
      const subId = `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await setDoc(doc(db, 'newsletterSubscribers', subId), {
        email: trimmed,
        createdAt: serverTimestamp(),
      });
      setEmail('');
      showToast('Subscribed to VELLOX updates.');
    } catch {
      showToast('Unable to subscribe right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const whatsappUrl = formatWhatsAppUrl(
    storeSettings.whatsappNumber || '03014426490',
    'Hello VELLOX Support, I have a question about your products.'
  );

  return (
    <footer className="bg-[#111317] text-zinc-300 border-t border-zinc-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
          {/* Brand Column */}
          <div className="lg:col-span-4 space-y-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src={storeSettings.logoUrl || '/assets/vellox-logo-crop.jpg'}
                alt="VELLOX"
                referrerPolicy="no-referrer"
                className="h-11 w-11 rounded-md object-cover border border-zinc-700"
              />
              <span className="font-display text-xl font-extrabold tracking-[0.18em] text-white">
                {storeSettings.storeName || 'VELLOX'}
              </span>
            </Link>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-sm">
              {storeSettings.tagline ||
                'Precision modern tech, homeware, coffee bar essentials, and workspace objects curated for everyday life in Pakistan.'}
            </p>
            <div className="space-y-2 pt-2 text-xs text-zinc-400">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-zinc-200 hover:text-white transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>WhatsApp Support: {storeSettings.phone || '+92 301 4426490'}</span>
              </a>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-zinc-500" />
                <span className="font-mono">{storeSettings.whatsappNumber || '03014426490'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-zinc-500" />
                <span>{storeSettings.contactEmail || 'vellox.store.pk@gmail.com'}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-zinc-500" />
                <span>{storeSettings.address || 'Sheikhupura, Pakistan'}</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="lg:col-span-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Quick Links</h3>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/shop" className="hover:text-white transition-colors">Shop All</Link></li>
              <li><Link to="/categories" className="hover:text-white transition-colors">All Categories</Link></li>
              <li><Link to="/track-order" className="hover:text-white transition-colors">Track Order</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
              <li><Link to="/faq" className="hover:text-white transition-colors">FAQ</Link></li>
            </ul>
          </div>

          {/* Categories & Policies */}
          <div className="lg:col-span-3 grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Categories</h3>
              <ul className="space-y-2.5 text-sm">
                {categories.filter((c) => c.isActive).slice(0, 5).map((cat) => (
                  <li key={cat.id}>
                    <Link
                      to={`/shop?category=${encodeURIComponent(cat.id)}`}
                      className="hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Policies</h3>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link to="/return-policy" className="hover:text-white transition-colors">Return Policy</Link></li>
                <li><Link to="/shipping-policy" className="hover:text-white transition-colors">Shipping Policy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              </ul>
            </div>
          </div>

          {/* Newsletter */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-white mb-4">Stay Updated</h3>
            <p className="text-sm text-zinc-400 mb-4">
              Receive new arrival alerts and exclusive seasonal offers straight to your inbox.
            </p>
            <form onSubmit={handleSubscribe} className="space-y-2.5">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-3.5 py-2.5 text-sm bg-zinc-900 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 px-4 bg-white text-[#111317] text-sm font-semibold rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                {submitting ? 'Subscribing...' : 'Subscribe'}
              </button>
            </form>
            <div className="mt-4 flex items-center gap-4 text-xs text-zinc-400">
              {storeSettings.socialLinks?.instagram && (
                <a href={storeSettings.socialLinks.instagram} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Instagram
                </a>
              )}
              {storeSettings.socialLinks?.facebook && (
                <a href={storeSettings.socialLinks.facebook} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Facebook
                </a>
              )}
              {storeSettings.socialLinks?.tiktok && (
                <a href={storeSettings.socialLinks.tiktok} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>&copy; {new Date().getFullYear()} {storeSettings.storeName || 'VELLOX'}. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <span>FREE Delivery Nationwide (COD)</span>
            <Link to="/admin/login" className="text-zinc-300 hover:text-white font-medium transition-colors">
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
