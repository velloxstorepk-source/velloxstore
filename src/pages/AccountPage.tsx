import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Heart, LogOut, MapPin, MessageCircle, Package, Settings, Trash2, User } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { CustomerAddress, formatPKR, formatWhatsAppUrl, Order } from '../types';

export const AccountPage: React.FC = () => {
  const {
    authReady,
    user,
    userProfile,
    products,
    wishlistIds,
    storeSettings,
    resendVerification,
    logout,
    showToast,
  } = useStore();

  const [tab, setTab] = useState<'profile' | 'orders' | 'wishlist' | 'addresses' | 'settings'>('orders');
  const [orders, setOrders] = useState<Order[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [addrLabel, setAddrLabel] = useState('Home');
  const [addrFullName, setAddrFullName] = useState('');
  const [addrPhone, setAddrPhone] = useState('');
  const [addrCity, setAddrCity] = useState('');
  const [addrLine, setAddrLine] = useState('');
  const [addrPostal, setAddrPostal] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    if (userProfile) {
      setProfileName(userProfile.fullName || '');
      setProfilePhone(userProfile.phone || '');
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user) return;
    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), where('userId', '==', user.uid)),
      (snap) => {
        const list = snap.docs.map((d) => d.data() as Order);
        list.sort((a, b) => (b.orderNumber > a.orderNumber ? 1 : -1));
        setOrders(list);
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubAddresses = onSnapshot(
      collection(db, 'users', user.uid, 'addresses'),
      (snap) => {
        setAddresses(snap.docs.map((d) => d.data() as CustomerAddress));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, `users/${user.uid}/addresses`)
    );

    return () => {
      unsubOrders();
      unsubAddresses();
    };
  }, [user]);

  if (!authReady) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16">
        <div className="h-48 bg-zinc-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const wishlistProducts = products.filter((p) => wishlistIds.includes(p.id));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        fullName: profileName.trim(),
        phone: profilePhone.trim(),
        updatedAt: serverTimestamp(),
      });
      showToast('Profile updated.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    const id = `addr-${Date.now()}`;
    try {
      await setDoc(doc(db, 'users', user.uid, 'addresses', id), {
        id,
        userId: user.uid,
        label: addrLabel.trim() || 'Home',
        fullName: addrFullName.trim(),
        phone: addrPhone.trim(),
        city: addrCity.trim(),
        address: addrLine.trim(),
        postalCode: addrPostal.trim(),
        isDefault: addresses.length === 0,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setAddrFullName('');
      setAddrPhone('');
      setAddrCity('');
      setAddrLine('');
      setAddrPostal('');
      showToast('Delivery address saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}/addresses/${id}`);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'addresses', id));
      showToast('Address removed.');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/addresses/${id}`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match.');
      return;
    }
    try {
      if (!auth.currentUser) return;
      await updatePassword(auth.currentUser, newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('Password updated successfully.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Please re-login before changing password.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#111317]">
            My Account
          </h1>
          <p className="text-sm text-zinc-600 mt-1">
            Signed in as {userProfile?.fullName || user.displayName || user.email}
          </p>
        </div>

        <button
          type="button"
          onClick={() => logout()}
          className="inline-flex items-center gap-2 px-4 py-2 border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 hover:bg-zinc-100 self-start sm:self-auto"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>

      {!user.emailVerified && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-amber-900">
          <span>Your email address is not verified yet. Check your inbox for the verification link.</span>
          <button
            type="button"
            onClick={async () => {
              await resendVerification();
              showToast('Verification email resent.');
            }}
            className="px-3.5 py-1.5 bg-amber-900 text-white text-xs font-semibold rounded-lg whitespace-nowrap self-start"
          >
            Resend Email
          </button>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <aside className="lg:col-span-3 bg-white border border-zinc-200 rounded-xl p-2 space-y-1">
          {[
            { id: 'orders', label: 'My Orders', icon: Package },
            { id: 'profile', label: 'My Profile', icon: User },
            { id: 'addresses', label: 'Saved Addresses', icon: MapPin },
            { id: 'wishlist', label: `Wishlist (${wishlistProducts.length})`, icon: Heart },
            { id: 'settings', label: 'Account Settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id as typeof tab)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  tab === item.id
                    ? 'bg-[#111317] text-white'
                    : 'text-zinc-700 hover:bg-zinc-100 hover:text-[#111317]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="lg:col-span-9">
          {tab === 'orders' && (
            <div className="space-y-4">
              <h2 className="font-display text-xl font-bold text-[#111317]">Order History</h2>
              {orders.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
                  <p className="font-medium text-zinc-800">You have not placed any orders yet.</p>
                  <Link
                    to="/shop"
                    className="mt-4 inline-block px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg"
                  >
                    Start Shopping
                  </Link>
                </div>
              ) : (
                orders.map((order) => (
                  <div key={order.id} className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-zinc-100">
                      <div>
                        <span className="font-mono font-bold text-[#111317]">#{order.orderNumber}</span>
                        <span className="mx-2 text-zinc-300">&middot;</span>
                        <span className="text-xs text-zinc-500">{order.city}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-zinc-800">Status: {order.status}</span>
                        <span className="font-mono font-bold text-[#111317] tabular-nums">
                          {formatPKR(order.totalAmount)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {order.items.map((item) => (
                        <div key={item.productId} className="flex items-center justify-between text-sm">
                          <span className="text-zinc-700">
                            {item.name} &times; {item.quantity}
                          </span>
                          <span className="font-mono text-zinc-800 tabular-nums">
                            {formatPKR(item.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-3 border-t border-zinc-100 flex flex-wrap items-center justify-between gap-3">
                      <Link
                        to={`/track-order?id=${encodeURIComponent(order.orderNumber)}`}
                        className="text-xs font-semibold text-[#111317] hover:underline"
                      >
                        View Tracking Timeline
                      </Link>
                      <a
                        href={formatWhatsAppUrl(
                          storeSettings.whatsappNumber || '03014426490',
                          `Hello VELLOX, I have an inquiry regarding Order #${order.orderNumber}.`
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        Order Inquiry on WhatsApp
                      </a>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4 max-w-xl"
            >
              <h2 className="font-display text-xl font-bold text-[#111317]">My Profile</h2>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Email</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-200 bg-zinc-50 rounded-lg text-zinc-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Mobile Number</label>
                <input
                  type="tel"
                  value={profilePhone}
                  onChange={(e) => setProfilePhone(e.target.value)}
                  placeholder="03XX-XXXXXXX"
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                disabled={savingProfile}
                className="px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800"
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </form>
          )}

          {tab === 'addresses' && (
            <div className="space-y-6">
              <div className="bg-white border border-zinc-200 rounded-xl p-6">
                <h2 className="font-display text-xl font-bold text-[#111317] mb-4">Saved Addresses</h2>
                {addresses.length === 0 ? (
                  <p className="text-sm text-zinc-500">No saved delivery addresses yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {addresses.map((a) => (
                      <div key={a.id} className="p-4 border border-zinc-200 rounded-lg relative">
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(a.id)}
                          aria-label="Delete address"
                          className="absolute top-3 right-3 text-zinc-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <p className="text-xs font-semibold uppercase text-zinc-500">{a.label || 'Address'}</p>
                        <p className="font-semibold text-sm text-[#111317] mt-1">{a.fullName}</p>
                        <p className="text-xs text-zinc-600 mt-1">{a.address}</p>
                        <p className="text-xs text-zinc-600">
                          {a.city} {a.postalCode ? `· ${a.postalCode}` : ''}
                        </p>
                        <p className="font-mono text-xs text-zinc-700 mt-1">{a.phone}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form onSubmit={handleAddAddress} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
                <h3 className="font-display text-base font-bold text-[#111317]">Add New Address</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="Label (Home, Office)"
                    value={addrLabel}
                    onChange={(e) => setAddrLabel(e.target.value)}
                    className="px-3.5 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Recipient Full Name"
                    value={addrFullName}
                    onChange={(e) => setAddrFullName(e.target.value)}
                    className="px-3.5 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                  <input
                    type="tel"
                    required
                    placeholder="Mobile Number"
                    value={addrPhone}
                    onChange={(e) => setAddrPhone(e.target.value)}
                    className="px-3.5 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={addrCity}
                    onChange={(e) => setAddrCity(e.target.value)}
                    className="px-3.5 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Full Street Address"
                    value={addrLine}
                    onChange={(e) => setAddrLine(e.target.value)}
                    className="sm:col-span-2 px-3.5 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="Postal Code"
                    value={addrPostal}
                    onChange={(e) => setAddrPostal(e.target.value)}
                    className="px-3.5 py-2 text-sm border border-zinc-300 rounded-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800"
                >
                  Save Address
                </button>
              </form>
            </div>
          )}

          {tab === 'wishlist' && (
            <div>
              <h2 className="font-display text-xl font-bold text-[#111317] mb-4">My Wishlist</h2>
              {wishlistProducts.length === 0 ? (
                <div className="bg-white border border-zinc-200 rounded-xl p-10 text-center">
                  <p className="text-sm text-zinc-600">Your wishlist is empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {wishlistProducts.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'settings' && (
            <form
              onSubmit={handleChangePassword}
              className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4 max-w-xl"
            >
              <h2 className="font-display text-xl font-bold text-[#111317]">Account Security</h2>
              <p className="text-xs text-zinc-500">
                If you signed in with Email &amp; Password, you can update your password below.
              </p>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-zinc-300 rounded-lg"
                />
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800"
              >
                Update Password
              </button>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};
