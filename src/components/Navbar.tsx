import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

export const Navbar: React.FC = () => {
  const { storeSettings, cartCount, wishlistIds, user, setIsCartOpen } = useStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [announcementDismissed, setAnnouncementDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/shop?q=${encodeURIComponent(q)}` : '/shop');
  };

  const showAnnouncement =
    !announcementDismissed &&
    storeSettings.sectionsVisibility?.announcementBar !== false &&
    Boolean(storeSettings.announcementText);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 backdrop-blur border-b border-zinc-200 no-print">
      {showAnnouncement && (
        <div className="bg-[#111317] text-zinc-100 text-xs py-2 px-4 flex items-center justify-center relative">
          <p className="truncate max-w-3xl text-center font-medium tracking-wide">
            {storeSettings.announcementText}
          </p>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setAnnouncementDismissed(true)}
            className="absolute right-3 p-1 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 sm:gap-8">
        {/* Zone 1: Brand Wordmark + Uploaded Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
            className="lg:hidden p-2 -ml-2 text-zinc-700 hover:text-zinc-950 rounded-lg"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link to="/" className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
            <img
              src={storeSettings.logoUrl || '/assets/vellox-logo-crop.jpg'}
              alt="VELLOX"
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-md object-cover bg-[#111317] border border-zinc-800"
            />
            <span className="font-display text-lg font-extrabold tracking-[0.16em] text-[#111317]">
              {storeSettings.storeName || 'VELLOX'}
            </span>
          </Link>
        </div>

        {/* Zone 2: Single-line Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-zinc-600">
          <Link
            to="/"
            className={`whitespace-nowrap shrink-0 hover:text-[#111317] transition-colors ${
              location.pathname === '/' ? 'text-[#111317] font-semibold' : ''
            }`}
          >
            Home
          </Link>
          <Link
            to="/shop"
            className={`whitespace-nowrap shrink-0 hover:text-[#111317] transition-colors ${
              location.pathname === '/shop' ? 'text-[#111317] font-semibold' : ''
            }`}
          >
            Shop
          </Link>
          <Link
            to="/categories"
            className={`whitespace-nowrap shrink-0 hover:text-[#111317] transition-colors ${
              location.pathname === '/categories' ? 'text-[#111317] font-semibold' : ''
            }`}
          >
            Categories
          </Link>
          <Link
            to="/track-order"
            className={`whitespace-nowrap shrink-0 hover:text-[#111317] transition-colors ${
              location.pathname === '/track-order' ? 'text-[#111317] font-semibold' : ''
            }`}
          >
            Track Order
          </Link>
          <Link
            to="/contact"
            className={`whitespace-nowrap shrink-0 hover:text-[#111317] transition-colors ${
              location.pathname === '/contact' ? 'text-[#111317] font-semibold' : ''
            }`}
          >
            Contact
          </Link>
          <Link
            to="/admin/login"
            className={`whitespace-nowrap shrink-0 hover:text-[#111317] transition-colors ${
              location.pathname.startsWith('/admin') ? 'text-[#111317] font-semibold' : ''
            }`}
          >
            Admin
          </Link>
        </nav>

        {/* Zone 3: Search, Wishlist, Account & Bag */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            aria-label="Search products"
            onClick={() => setSearchOpen((v) => !v)}
            className="p-2.5 text-zinc-700 hover:text-[#111317] hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Search className="w-5 h-5" />
          </button>

          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative p-2.5 text-zinc-700 hover:text-[#111317] hover:bg-zinc-100 rounded-lg transition-colors"
          >
            <Heart className="w-5 h-5" />
            {wishlistIds.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-zinc-900 text-white text-[10px] font-mono flex items-center justify-center">
                {wishlistIds.length}
              </span>
            )}
          </Link>

          <Link
            to={user ? '/account' : '/login'}
            aria-label="Account"
            className="p-2.5 text-zinc-700 hover:text-[#111317] hover:bg-zinc-100 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <User className="w-5 h-5" />
            <span className="hidden xl:inline text-xs font-medium whitespace-nowrap">
              {user ? 'Account' : 'Sign In'}
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            aria-label="Shopping Bag"
            className="ml-1 px-3 py-2 bg-[#111317] text-white rounded-lg hover:bg-zinc-800 transition-colors flex items-center gap-2 text-xs font-medium whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span className="font-mono tabular-nums">{cartCount}</span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 py-3">
          <form onSubmit={handleSearchSubmit} className="max-w-3xl mx-auto flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search lamps, earbuds, smartwatches, coffee tools..."
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#111317] text-white text-sm font-medium rounded-lg hover:bg-zinc-800 transition-colors whitespace-nowrap"
            >
              Search
            </button>
          </form>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-xl flex flex-col justify-between p-6 overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-200">
                <div className="flex items-center gap-2.5">
                  <img
                    src={storeSettings.logoUrl || '/assets/vellox-logo-crop.jpg'}
                    alt="VELLOX"
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded object-cover bg-[#111317]"
                  />
                  <span className="font-display font-extrabold tracking-[0.14em] text-[#111317]">
                    {storeSettings.storeName || 'VELLOX'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close menu"
                  className="p-2 text-zinc-500 hover:text-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSearchSubmit} className="mt-4">
                <div className="relative">
                  <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search VELLOX..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-50 border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900"
                  />
                </div>
              </form>

              <nav className="mt-6 flex flex-col gap-1">
                {[
                  { label: 'Home', to: '/' },
                  { label: 'Shop All Products', to: '/shop' },
                  { label: 'Categories', to: '/categories' },
                  { label: 'Track Order', to: '/track-order' },
                  { label: 'Wishlist', to: '/wishlist' },
                  { label: user ? 'My Account' : 'Sign In / Register', to: user ? '/account' : '/login' },
                  { label: 'Admin Login', to: '/admin/login' },
                  { label: 'About VELLOX', to: '/about' },
                  { label: 'Contact Us', to: '/contact' },
                  { label: 'FAQ', to: '/faq' },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-3 py-2.5 text-sm font-medium text-zinc-700 hover:text-[#111317] hover:bg-zinc-50 rounded-lg transition-colors"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>

            <div className="pt-4 border-t border-zinc-200 text-xs text-zinc-500">
              <p>FREE Cash on Delivery Nationwide</p>
              <p className="mt-1 font-mono">{storeSettings.phone || '+92 301 4426490'}</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
