import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Boxes,
  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Plus,
  Settings,
  ShoppingBag,
  Tag,
  Users,
  X,
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../../firebase';
import { useStore } from '../../context/StoreContext';
import {
  Coupon,
  EmailNotificationLog,
  formatPKR,
  InventoryLog,
  Order,
  StoreOwnerConfig,
  UserProfile,
} from '../../types';
import {
  AdminBannersTab,
  AdminCategoriesTab,
  AdminCouponsTab,
  AdminInventoryTab,
  AdminProductsTab,
} from './AdminCatalogTabs';
import {
  AdminCustomersTab,
  AdminGmailTab,
  AdminOrdersTab,
  AdminSettingsTab,
} from './AdminOpsTabs';

type AdminSection =
  | 'overview'
  | 'orders'
  | 'products'
  | 'categories'
  | 'inventory'
  | 'customers'
  | 'banners'
  | 'coupons'
  | 'gmail'
  | 'settings';

export const AdminDashboard: React.FC = () => {
  const { authReady, user, isOwner, adminPinVerified, ownerInitialized, bootstrapOwnerStore, products, logout } = useStore();
  const [section, setSection] = useState<AdminSection>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [emailLogs, setEmailLogs] = useState<EmailNotificationLog[]>([]);
  const [ownerConfig, setOwnerConfig] = useState<StoreOwnerConfig | null>(null);

  useEffect(() => {
    if (!authReady || !user || !isOwner || !adminPinVerified) return;
    if (!ownerInitialized) {
      bootstrapOwnerStore(user).catch((err) => console.error('Owner bootstrap warning:', err));
    }
  }, [authReady, user, isOwner, adminPinVerified, ownerInitialized, bootstrapOwnerStore]);

  useEffect(() => {
    if (!authReady || !user || !isOwner || !adminPinVerified) return;

    const unsubOrders = onSnapshot(
      query(collection(db, 'orders'), orderBy('createdAt', 'desc')),
      (snap) => setOrders(snap.docs.map((d) => d.data() as Order)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'orders')
    );

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => setCustomers(snap.docs.map((d) => d.data() as UserProfile)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'users')
    );

    const unsubCoupons = onSnapshot(
      collection(db, 'coupons'),
      (snap) => setCoupons(snap.docs.map((d) => d.data() as Coupon)),
      (err) => handleFirestoreError(err, OperationType.LIST, 'coupons')
    );

    const unsubInv = onSnapshot(
      query(collection(db, 'inventoryLogs'), orderBy('createdAt', 'desc')),
      (snap) => setInventoryLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as InventoryLog) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'inventoryLogs')
    );

    const unsubEmails = onSnapshot(
      query(collection(db, 'emailNotificationLogs'), orderBy('createdAt', 'desc')),
      (snap) => setEmailLogs(snap.docs.map((d) => ({ id: d.id, ...(d.data() as EmailNotificationLog) }))),
      (err) => handleFirestoreError(err, OperationType.LIST, 'emailNotificationLogs')
    );

    const unsubOwner = onSnapshot(
      doc(db, 'storeConfig', 'owner'),
      (snap) => {
        if (snap.exists()) setOwnerConfig(snap.data() as StoreOwnerConfig);
      },
      () => {}
    );

    return () => {
      unsubOrders();
      unsubUsers();
      unsubCoupons();
      unsubInv();
      unsubEmails();
      unsubOwner();
    };
  }, [authReady, user, isOwner, adminPinVerified]);

  const stats = useMemo(() => {
    const activeOrders = orders.filter((o) => o.status !== 'Cancelled');
    const totalRevenue = activeOrders.reduce((s, o) => s + (o.totalAmount || 0), 0);
    const pendingOrders = orders.filter((o) => o.status === 'Pending').length;
    const confirmedOrders = orders.filter((o) => o.status === 'Confirmed').length;
    const deliveredOrders = orders.filter((o) => o.status === 'Delivered').length;
    const cancelledOrders = orders.filter((o) => o.status === 'Cancelled').length;
    const lowStockProducts = products.filter((p) => p.stock <= 5);
    const customerCount = customers.filter((c) => c.role === 'customer').length;

    return {
      totalRevenue,
      totalOrders: orders.length,
      totalProducts: products.length,
      totalCustomers: customerCount,
      pendingOrders,
      confirmedOrders,
      deliveredOrders,
      cancelledOrders,
      lowStockProducts,
    };
  }, [orders, products, customers]);

  const chartData = useMemo(() => {
    const map = new Map<string, { label: string; revenue: number; orders: number }>();
    orders
      .filter((o) => o.status !== 'Cancelled')
      .forEach((o) => {
        const ts = o.createdAt as { toDate?: () => Date } | undefined;
        const dateObj = ts?.toDate ? ts.toDate() : new Date();
        const key = dateObj.toLocaleDateString('en-PK', { month: 'short', day: 'numeric' });
        const cur = map.get(key) || { label: key, revenue: 0, orders: 0 };
        cur.revenue += o.totalAmount || 0;
        cur.orders += 1;
        map.set(key, cur);
      });
    return Array.from(map.values()).slice(-10);
  }, [orders]);

  const bestSelling = useMemo(() => {
    const map = new Map<string, { name: string; sold: number; revenue: number }>();
    orders
      .filter((o) => o.status !== 'Cancelled')
      .forEach((o) => {
        o.items.forEach((i) => {
          const cur = map.get(i.productId) || { name: i.name, sold: 0, revenue: 0 };
          cur.sold += i.quantity;
          cur.revenue += i.price * i.quantity;
          map.set(i.productId, cur);
        });
      });
    return Array.from(map.values()).sort((a, b) => b.sold - a.sold).slice(0, 5);
  }, [orders]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-300 border-t-[#111317] rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isOwner || !adminPinVerified) {
    return <Navigate to="/admin/login" replace />;
  }

  const navItems: Array<{ id: AdminSection; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'orders', label: 'Orders', icon: Package },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'categories', label: 'Categories', icon: FolderTree },
    { id: 'inventory', label: 'Inventory', icon: Boxes },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'banners', label: 'Banners & Home', icon: ImageIcon },
    { id: 'coupons', label: 'Coupons', icon: Tag },
    { id: 'gmail', label: 'Gmail & Logs', icon: Mail },
    { id: 'settings', label: 'Store Settings', icon: Settings },
  ];

  const currentLabel = navItems.find((n) => n.id === section)?.label || 'Overview';

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-[#111317] text-zinc-300 flex-col justify-between border-r border-zinc-800 no-print">
        <div>
          <div className="h-16 px-5 border-b border-zinc-800 flex items-center gap-2.5">
            <img
              src="/assets/vellox-logo-crop.jpg"
              alt="VELLOX"
              className="h-8 w-8 rounded object-cover"
            />
            <div>
              <p className="font-display text-sm font-extrabold tracking-[0.16em] text-white">VELLOX</p>
              <p className="text-[11px] text-zinc-400">Owner Console</p>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                    active ? 'bg-white text-[#111317]' : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-zinc-800 space-y-2">
          <p className="text-xs text-zinc-400 truncate">{ownerConfig?.ownerEmail || user.email}</p>
          <button
            type="button"
            onClick={() => logout()}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-zinc-300 hover:text-white hover:bg-zinc-800 rounded-lg"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-[#111317] text-zinc-300 h-full p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                <span className="font-display font-bold text-white tracking-widest">VELLOX ADMIN</span>
                <button type="button" onClick={() => setSidebarOpen(false)}>
                  <X className="w-5 h-5 text-zinc-400" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSection(item.id);
                        setSidebarOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg ${
                        section === item.id ? 'bg-white text-[#111317]' : 'text-zinc-300 hover:bg-zinc-800'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="flex items-center gap-2 px-3 py-2 text-xs text-zinc-300 hover:text-white"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-white border-b border-zinc-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-zinc-600 hover:text-[#111317]"
              aria-label="Open admin menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-sm">
              <span className="text-zinc-400">Admin</span>
              <span className="mx-2 text-zinc-300">/</span>
              <span className="font-display font-bold text-[#111317]">{currentLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSection('products')}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#111317] text-white rounded-lg text-xs font-semibold hover:bg-zinc-800 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" /> Add Product
            </button>
            <button
              type="button"
              onClick={() => setSection('orders')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
            >
              <Package className="w-3.5 h-3.5" /> Orders ({stats.totalOrders})
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 hover:bg-zinc-50 whitespace-nowrap"
            >
              View Store <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        <main className="p-4 sm:p-6 lg:p-8 flex-1">
          {section === 'overview' && (
            <div className="space-y-6">
              {/* Quick Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-zinc-200 rounded-xl p-4">
                <div>
                  <h2 className="font-display text-base font-bold text-[#111317]">Store Quick Actions</h2>
                  <p className="text-xs text-zinc-500">Add new products or inspect incoming customer COD orders.</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSection('products')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800"
                  >
                    <Plus className="w-4 h-4" /> Manage &amp; Add Products
                  </button>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-zinc-300 bg-white text-[#111317] text-xs font-semibold rounded-lg hover:bg-zinc-50"
                  >
                    <Package className="w-4 h-4" /> View Customer Orders ({stats.totalOrders})
                  </button>
                </div>
              </div>
              {/* Primary KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-zinc-500">Total Revenue</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#111317] tabular-nums">
                    {formatPKR(stats.totalRevenue)}
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-zinc-500">Total Orders</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#111317] tabular-nums">
                    {stats.totalOrders}
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-zinc-500">Total Products</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#111317] tabular-nums">
                    {stats.totalProducts}
                  </p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-5">
                  <p className="text-xs font-medium text-zinc-500">Registered Customers</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-[#111317] tabular-nums">
                    {stats.totalCustomers}
                  </p>
                </div>
              </div>

              {/* Order Status Breakdown + Low Stock */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-xs text-zinc-500">Pending</p>
                  <p className="font-mono text-xl font-bold text-amber-700 mt-1">{stats.pendingOrders}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-xs text-zinc-500">Confirmed</p>
                  <p className="font-mono text-xl font-bold text-[#111317] mt-1">{stats.confirmedOrders}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-xs text-zinc-500">Delivered</p>
                  <p className="font-mono text-xl font-bold text-emerald-700 mt-1">{stats.deliveredOrders}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-xs text-zinc-500">Cancelled</p>
                  <p className="font-mono text-xl font-bold text-rose-600 mt-1">{stats.cancelledOrders}</p>
                </div>
                <div className="bg-white border border-zinc-200 rounded-xl p-4">
                  <p className="text-xs text-zinc-500">Low Stock (&le;5)</p>
                  <p className="font-mono text-xl font-bold text-amber-700 mt-1">
                    {stats.lowStockProducts.length}
                  </p>
                </div>
              </div>

              {/* Sales Chart & Best Sellers */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 bg-white border border-zinc-200 rounded-xl p-5">
                  <h2 className="font-display text-base font-bold text-[#111317] mb-4">
                    Sales Revenue (PKR)
                  </h2>
                  {chartData.length === 0 ? (
                    <div className="h-60 flex items-center justify-center text-sm text-zinc-500">
                      Revenue chart will populate automatically as customer orders arrive.
                    </div>
                  ) : (
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="revenue" fill="#111317" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-4 bg-white border border-zinc-200 rounded-xl p-5">
                  <h2 className="font-display text-base font-bold text-[#111317] mb-4">
                    Best Selling Products
                  </h2>
                  {bestSelling.length === 0 ? (
                    <p className="text-sm text-zinc-500">No sales recorded yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {bestSelling.map((b, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm border-b border-zinc-100 pb-2">
                          <div className="min-w-0 pr-2">
                            <p className="font-medium text-[#111317] truncate">{b.name}</p>
                            <p className="text-xs text-zinc-500 font-mono">{b.sold} units sold</p>
                          </div>
                          <span className="font-mono font-semibold text-xs shrink-0">{formatPKR(b.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
                  <h2 className="font-display text-base font-bold text-[#111317]">Recent Orders</h2>
                  <button
                    type="button"
                    onClick={() => setSection('orders')}
                    className="text-xs font-semibold text-[#111317] hover:underline"
                  >
                    Manage All Orders
                  </button>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
                    <tr>
                      <th className="py-3 px-4">Order</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">City</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                      <th className="py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {orders.slice(0, 5).map((o) => (
                      <tr key={o.id}>
                        <td className="py-3 px-4 font-mono font-bold">#{o.orderNumber}</td>
                        <td className="py-3 px-4">{o.customerName}</td>
                        <td className="py-3 px-4 text-zinc-600">{o.city}</td>
                        <td className="py-3 px-4 text-right font-mono">{formatPKR(o.totalAmount)}</td>
                        <td className="py-3 px-4 text-xs font-semibold">{o.status}</td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-zinc-500">
                          No orders placed yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {section === 'orders' && <AdminOrdersTab orders={orders} />}
          {section === 'products' && <AdminProductsTab />}
          {section === 'categories' && <AdminCategoriesTab />}
          {section === 'inventory' && <AdminInventoryTab logs={inventoryLogs} />}
          {section === 'customers' && <AdminCustomersTab customers={customers} orders={orders} />}
          {section === 'banners' && <AdminBannersTab />}
          {section === 'coupons' && <AdminCouponsTab coupons={coupons} />}
          {section === 'gmail' && (
            <AdminGmailTab logs={emailLogs} orders={orders} ownerConfig={ownerConfig} />
          )}
          {section === 'settings' && <AdminSettingsTab ownerConfig={ownerConfig} />}
        </main>
      </div>
    </div>
  );
};
