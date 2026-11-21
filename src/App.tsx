/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { StoreProvider, useStore } from './context/StoreContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { WhatsAppWidget } from './components/WhatsAppWidget';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AuthPage } from './pages/AuthPage';
import { AccountPage } from './pages/AccountPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
import { WishlistPage } from './pages/WishlistPage';
import { AboutPage, ContactPage, FaqPage, PolicyPage } from './pages/InfoPages';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboard } from './pages/admin/AdminDashboard';

const ToastBanner: React.FC = () => {
  const { toastMessage } = useStore();
  if (!toastMessage) return null;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 bg-[#111317] text-white text-xs sm:text-sm font-medium rounded-lg shadow-xl border border-zinc-700">
      {toastMessage}
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col bg-[#FAFAFA] text-[#111317]">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/shop" element={<ShopPage />} />
                <Route path="/search" element={<ShopPage />} />
                <Route path="/categories" element={<CategoriesPage />} />
                <Route path="/product/:slug" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/login" element={<AuthPage initialMode="login" />} />
                <Route path="/register" element={<AuthPage initialMode="register" />} />
                <Route path="/account" element={<AccountPage />} />
                <Route path="/my-orders" element={<AccountPage />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/track-order" element={<TrackOrderPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/faq" element={<FaqPage />} />
                <Route path="/privacy-policy" element={<PolicyPage type="privacy" />} />
                <Route path="/return-policy" element={<PolicyPage type="return" />} />
                <Route path="/shipping-policy" element={<PolicyPage type="shipping" />} />
                <Route path="/terms" element={<PolicyPage type="terms" />} />
                <Route path="/admin/login" element={<AdminLoginPage />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<HomePage />} />
              </Routes>
            </main>
            <Footer />
            <CartDrawer />
            <WhatsAppWidget />
            <ToastBanner />
          </div>
        </BrowserRouter>
      </StoreProvider>
    </ErrorBoundary>
  );
}
