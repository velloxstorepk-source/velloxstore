import React, { useEffect, useMemo, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';
import { Mail, Printer, Search, Send, ShieldCheck, X } from 'lucide-react';
import { auth, db, getGmailAccessToken, handleFirestoreError, OperationType } from '../../firebase';
import { useStore } from '../../context/StoreContext';
import { compressImageFileToDataUrl } from '../../utils/imageUpload';
import {
  EmailNotificationLog,
  formatPKR,
  Order,
  ORDER_STATUSES,
  OrderStatus,
  OrderTrackingDoc,
  Product,
  StoreOwnerConfig,
  UserProfile,
} from '../../types';

export const AdminOrdersTab: React.FC<{ orders: Order[] }> = ({ orders }) => {
  const { user, showToast } = useStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusNote, setStatusNote] = useState('');
  const [updating, setUpdating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'all' && o.status !== statusFilter) return false;
      if (q && !`${o.orderNumber} ${o.customerName} ${o.customerPhone} ${o.city}`.toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [orders, search, statusFilter]);

  const handleStatusChange = async (order: Order, nextStatus: OrderStatus) => {
    if (!user || order.status === nextStatus) return;
    setUpdating(true);
    try {
      await runTransaction(db, async (tx) => {
        const orderRef = doc(db, 'orders', order.id);
        const trackRef = doc(db, 'orderTracking', order.id);
        const trackSnap = await tx.get(trackRef);

        // If transitioning INTO Cancelled from a non-cancelled status, safely restore stock
        if (nextStatus === 'Cancelled' && order.status !== 'Cancelled') {
          for (const item of order.items) {
            const pRef = doc(db, 'products', item.productId);
            const pSnap = await tx.get(pRef);
            if (pSnap.exists()) {
              const pData = pSnap.data() as Product;
              const restored = pData.stock + item.quantity;
              tx.update(pRef, {
                stock: restored,
                inStock: restored > 0,
                updatedAt: serverTimestamp(),
              });
              tx.set(doc(collection(db, 'inventoryLogs')), {
                productId: item.productId,
                productName: item.name,
                changeAmount: item.quantity,
                previousStock: pData.stock,
                newStock: restored,
                reason: `Order #${order.orderNumber} Cancelled`,
                referenceId: order.id,
                actorUid: user.uid,
                createdAt: serverTimestamp(),
              });
            }
          }
        }

        tx.update(orderRef, {
          status: nextStatus,
          updatedAt: serverTimestamp(),
        });

        const histId = `h-${Date.now()}`;
        tx.set(doc(db, 'orders', order.id, 'statusHistory', histId), {
          status: nextStatus,
          note: statusNote.trim() || `Status updated to ${nextStatus}`,
          updatedBy: user.uid,
          createdAt: serverTimestamp(),
        });

        if (trackSnap.exists()) {
          const trackData = trackSnap.data() as OrderTrackingDoc;
          tx.update(trackRef, {
            status: nextStatus,
            statusHistory: [
              ...trackData.statusHistory,
              {
                status: nextStatus,
                note: statusNote.trim() || `Order ${nextStatus}`,
                timestamp: new Date().toISOString(),
              },
            ].slice(-20),
            updatedAt: serverTimestamp(),
          });
        }
      });

      setStatusNote('');
      setSelectedOrder({ ...order, status: nextStatus });
      showToast(`Order #${order.orderNumber} marked ${nextStatus}.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order #, customer, phone..."
              className="pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg w-64"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg"
          >
            <option value="all">All Statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <span className="text-xs font-mono text-zinc-500">{filtered.length} orders</span>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-3 px-4">Order ID</th>
              <th className="py-3 px-4">Customer</th>
              <th className="py-3 px-4">City</th>
              <th className="py-3 px-4">Items</th>
              <th className="py-3 px-4 text-right">Total (PKR)</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50">
                <td className="py-3 px-4 font-mono font-bold text-[#111317]">#{o.orderNumber}</td>
                <td className="py-3 px-4">
                  <p className="font-medium text-[#111317]">{o.customerName}</p>
                  <p className="text-xs font-mono text-zinc-500">{o.customerPhone}</p>
                </td>
                <td className="py-3 px-4 text-zinc-600">{o.city}</td>
                <td className="py-3 px-4 font-mono">{o.items.reduce((s, i) => s + i.quantity, 0)}</td>
                <td className="py-3 px-4 text-right font-mono font-bold tabular-nums">
                  {formatPKR(o.totalAmount)}
                </td>
                <td className="py-3 px-4 text-xs font-semibold">
                  <span
                    className={
                      o.status === 'Delivered'
                        ? 'text-emerald-700'
                        : o.status === 'Cancelled'
                        ? 'text-rose-600'
                        : 'text-amber-700'
                    }
                  >
                    {o.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(o)}
                    className="px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-100"
                  >
                    Manage
                  </button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="py-10 text-center text-zinc-500">
                  No orders found matching your filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <div>
                <h3 className="font-display text-lg font-bold text-[#111317]">
                  Order #{selectedOrder.orderNumber}
                </h3>
                <p className="text-xs text-zinc-500">Cash on Delivery (COD)</p>
              </div>
              <div className="flex items-center gap-2 no-print">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-zinc-300 rounded-lg text-xs font-semibold hover:bg-zinc-50"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 text-zinc-400 hover:text-zinc-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-50 border border-zinc-200 rounded-xl p-4 text-sm">
              <div>
                <p className="text-xs text-zinc-500">Customer</p>
                <p className="font-semibold text-[#111317]">{selectedOrder.customerName}</p>
                <p className="font-mono text-xs text-zinc-700">{selectedOrder.customerPhone}</p>
                {selectedOrder.customerEmail && (
                  <p className="text-xs text-zinc-600">{selectedOrder.customerEmail}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-zinc-500">Delivery Address</p>
                <p className="text-zinc-800">{selectedOrder.deliveryAddress}</p>
                <p className="text-zinc-700">
                  {selectedOrder.city} {selectedOrder.postalCode ? `(${selectedOrder.postalCode})` : ''}
                </p>
                {selectedOrder.notes && (
                  <p className="text-xs text-zinc-500 mt-1">Note: {selectedOrder.notes}</p>
                )}
              </div>
            </div>

            <div className="border border-zinc-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-zinc-50 border-b border-zinc-200 text-xs text-zinc-500">
                  <tr>
                    <th className="py-2 px-3 text-left">Item</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {selectedOrder.items.map((i) => (
                    <tr key={i.productId}>
                      <td className="py-2.5 px-3">{i.name}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{i.quantity}</td>
                      <td className="py-2.5 px-3 text-right font-mono">{formatPKR(i.price * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="bg-zinc-50 p-3 border-t border-zinc-200 text-sm space-y-1">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-mono">{formatPKR(selectedOrder.subtotal)}</span></div>
                <div className="flex justify-between"><span>Shipping</span><span className="font-mono">{formatPKR(selectedOrder.shippingFee)}</span></div>
                {selectedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700"><span>Discount</span><span className="font-mono">-{formatPKR(selectedOrder.discountAmount)}</span></div>
                )}
                <div className="flex justify-between font-bold text-[#111317] pt-1 border-t border-zinc-200">
                  <span>Total COD</span><span className="font-mono">{formatPKR(selectedOrder.totalAmount)}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-zinc-200 space-y-3 no-print">
              <label className="block text-xs font-semibold text-zinc-700">Update Order Status</label>
              <input
                type="text"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                placeholder="Optional note (e.g. Dispatched via TCS Tracking #...)"
                className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
              />
              <div className="flex flex-wrap gap-2">
                {ORDER_STATUSES.map((st) => (
                  <button
                    key={st}
                    type="button"
                    disabled={updating || selectedOrder.status === st}
                    onClick={() => handleStatusChange(selectedOrder, st)}
                    className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors ${
                      selectedOrder.status === st
                        ? 'bg-[#111317] text-white border-[#111317]'
                        : 'bg-white text-zinc-700 border-zinc-300 hover:bg-zinc-100'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminCustomersTab: React.FC<{ customers: UserProfile[]; orders: Order[] }> = ({
  customers,
  orders,
}) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<UserProfile | null>(null);

  const filtered = customers.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${c.fullName} ${c.email} ${c.phone || ''}`.toLowerCase().includes(q);
  });

  const customerOrders = selected
    ? orders.filter((o) => o.userId === selected.uid)
    : [];

  return (
    <div className="space-y-5">
      <div className="flex justify-between items-center gap-3">
        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customers..."
            className="pl-9 pr-3 py-2 text-sm bg-white border border-zinc-200 rounded-lg w-64"
          />
        </div>
        <span className="text-xs font-mono text-zinc-500">{filtered.length} accounts</span>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 border-b border-zinc-200 text-xs uppercase text-zinc-500">
            <tr>
              <th className="py-3 px-4">Full Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4 text-right">Orders</th>
              <th className="py-3 px-4 text-right">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((c) => {
              const count = orders.filter((o) => o.userId === c.uid).length;
              return (
                <tr key={c.uid}>
                  <td className="py-3 px-4 font-medium">{c.fullName}</td>
                  <td className="py-3 px-4 text-zinc-600">{c.email}</td>
                  <td className="py-3 px-4 font-mono text-xs">{c.phone || '-'}</td>
                  <td className="py-3 px-4 text-xs capitalize">{c.role}</td>
                  <td className="py-3 px-4 text-right font-mono">{count}</td>
                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className="text-xs font-semibold text-[#111317] hover:underline"
                    >
                      View History
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-display font-bold text-lg">{selected.fullName}</h3>
                <p className="text-xs text-zinc-500">{selected.email}</p>
              </div>
              <button type="button" onClick={() => setSelected(null)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <h4 className="text-xs font-semibold uppercase text-zinc-500">
              Order History ({customerOrders.length})
            </h4>
            {customerOrders.length === 0 ? (
              <p className="text-sm text-zinc-500">No orders placed by this customer yet.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {customerOrders.map((o) => (
                  <div key={o.id} className="p-3 border border-zinc-200 rounded-lg flex justify-between text-sm">
                    <div>
                      <p className="font-mono font-bold">#{o.orderNumber}</p>
                      <p className="text-xs text-zinc-500">{o.status} · {o.city}</p>
                    </div>
                    <span className="font-mono font-semibold">{formatPKR(o.totalAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export const AdminGmailTab: React.FC<{
  logs: EmailNotificationLog[];
  orders: Order[];
  ownerConfig: StoreOwnerConfig | null;
}> = ({ logs, orders, ownerConfig }) => {
  const { gmailConnected, connectOwnerGmail, storeSettings, showToast } = useStore();
  const [serverHealth, setServerHealth] = useState<{ serverEmailConfigured: boolean; provider: string } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setServerHealth(d))
      .catch(() => {});
  }, []);

  const targetGmail = ownerConfig?.ownerGmail || storeSettings.contactEmail || 'vellox.store.pk@gmail.com';

  const handleTestEmail = async () => {
    setSendingTest(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      };
      const gmailTok = getGmailAccessToken();
      if (gmailTok) headers['x-gmail-token'] = gmailTok;

      const res = await fetch('/api/gmail/dispatch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: targetGmail,
          type: 'test_email',
        }),
      });
      const data = await res.json();

      await setDoc(doc(collection(db, 'emailNotificationLogs')), {
        orderId: 'test',
        orderNumber: 'TEST',
        recipientEmail: targetGmail,
        type: 'test_email',
        subject: data.subject || 'VELLOX Gmail Delivery Verification Test',
        status: data.status || (res.ok ? 'sent' : 'failed'),
        provider: data.provider || 'none',
        errorMessage: data.errorMessage || '',
        createdAt: serverTimestamp(),
      });

      if (!res.ok) {
        showToast(data.errorMessage || 'Test email failed — authorize Gmail first.');
      } else {
        showToast(`Test email delivered to ${targetGmail}!`);
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Test email failed.');
    } finally {
      setSendingTest(false);
    }
  };

  const handleDispatchLog = async (log: EmailNotificationLog) => {
    const order = orders.find((o) => o.id === log.orderId);
    if (!order) {
      showToast('Associated order record not found.');
      return;
    }
    try {
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) throw new Error('Not authenticated');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      };
      const gmailTok = getGmailAccessToken();
      if (gmailTok) headers['x-gmail-token'] = gmailTok;

      const res = await fetch('/api/gmail/dispatch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          to: log.recipientEmail,
          type: log.type,
          order: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            ownerGmail: targetGmail,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
            city: order.city,
            deliveryAddress: order.deliveryAddress,
            postalCode: order.postalCode,
            notes: order.notes,
            items: order.items,
            subtotal: order.subtotal,
            shippingFee: order.shippingFee,
            discountAmount: order.discountAmount,
            totalAmount: order.totalAmount,
            paymentMethod: order.paymentMethod,
            createdAtIso: new Date().toLocaleString('en-PK'),
          },
        }),
      });
      const data = await res.json();
      if (log.id) {
        await updateDoc(doc(db, 'emailNotificationLogs', log.id), {
          status: data.status || (res.ok ? 'sent' : 'failed'),
          provider: data.provider || 'none',
          errorMessage: data.errorMessage || '',
        });
      }
      if (res.ok) {
        showToast(`Order #${order.orderNumber} email sent to ${log.recipientEmail}.`);
      } else {
        showToast(data.errorMessage || 'Failed to send email.');
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Dispatch error.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#111317]">
              Gmail Order Notification Service
            </h2>
            <p className="text-xs text-zinc-600 mt-1">
              Owner Notification Inbox: <strong className="font-mono text-[#111317]">{targetGmail}</strong>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                try {
                  await connectOwnerGmail();
                  showToast('Gmail OAuth authorized for this session.');
                } catch (err) {
                  showToast(err instanceof Error ? err.message : 'Gmail authorization cancelled.');
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-zinc-300 text-zinc-900 text-xs font-semibold rounded-lg hover:bg-zinc-50"
            >
              <Mail className="w-4 h-4 text-rose-600" />
              {gmailConnected ? 'Re-Authorize Gmail OAuth' : 'Authorize Gmail (OAuth 2.0)'}
            </button>

            <button
              type="button"
              disabled={sendingTest}
              onClick={handleTestEmail}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#111317] text-white text-xs font-semibold rounded-lg hover:bg-zinc-800 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              {sendingTest ? 'Sending...' : 'Send Test Email'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs">
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
            <p className="font-semibold text-[#111317]">Session Gmail OAuth 2.0 Status</p>
            <p className={`mt-1 font-medium ${gmailConnected ? 'text-emerald-700' : 'text-amber-700'}`}>
              {gmailConnected
                ? 'Authorized in-memory — ready for Test Email & instant Dispatch.'
                : 'Not authorized in current browser session.'}
            </p>
          </div>
          <div className="p-3.5 bg-zinc-50 border border-zinc-200 rounded-lg">
            <p className="font-semibold text-[#111317]">Unattended Server Email (.env)</p>
            <p className={`mt-1 font-medium ${serverHealth?.serverEmailConfigured ? 'text-emerald-700' : 'text-zinc-600'}`}>
              {serverHealth?.serverEmailConfigured
                ? `Configured (${serverHealth.provider}) — automatic background delivery active.`
                : 'Not set in server .env — add GMAIL_USER & GMAIL_APP_PASSWORD (or OAuth refresh token) in server environment for automatic unattended background sending.'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl overflow-x-auto">
        <div className="px-4 py-3 border-b border-zinc-200 font-display font-bold text-sm text-[#111317]">
          Email Notification Delivery Logs ({logs.length})
        </div>
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-50 border-b border-zinc-200 uppercase text-zinc-500">
            <tr>
              <th className="py-3 px-4">Order</th>
              <th className="py-3 px-4">Recipient</th>
              <th className="py-3 px-4">Subject</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Details</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {logs.map((log, i) => (
              <tr key={log.id || i}>
                <td className="py-3 px-4 font-mono font-bold">#{log.orderNumber}</td>
                <td className="py-3 px-4">{log.recipientEmail}</td>
                <td className="py-3 px-4 max-w-xs truncate">{log.subject}</td>
                <td className="py-3 px-4 font-semibold">
                  <span
                    className={
                      log.status === 'sent'
                        ? 'text-emerald-700'
                        : log.status === 'failed'
                        ? 'text-rose-600'
                        : 'text-amber-700'
                    }
                  >
                    {log.status}
                  </span>
                </td>
                <td className="py-3 px-4 text-zinc-500 max-w-xs truncate">
                  {log.errorMessage || log.provider}
                </td>
                <td className="py-3 px-4 text-right">
                  {log.status !== 'sent' && log.orderId !== 'test' && (
                    <button
                      type="button"
                      onClick={() => handleDispatchLog(log)}
                      className="px-3 py-1 bg-[#111317] text-white rounded font-semibold hover:bg-zinc-800"
                    >
                      Dispatch Now
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={6} className="py-8 text-center text-zinc-500">
                  No email notification logs yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export const AdminSettingsTab: React.FC<{ ownerConfig: StoreOwnerConfig | null }> = ({
  ownerConfig,
}) => {
  const { storeSettings, showToast } = useStore();
  const [form, setForm] = useState(storeSettings);
  const [ownerGmail, setOwnerGmail] = useState(ownerConfig?.ownerGmail || storeSettings.contactEmail || '');
  const [ownerName, setOwnerName] = useState(ownerConfig?.ownerName || '');
  const [saving, setSaving] = useState(false);

  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  useEffect(() => {
    setForm(storeSettings);
  }, [storeSettings]);

  useEffect(() => {
    if (ownerConfig) {
      setOwnerGmail(ownerConfig.ownerGmail);
      setOwnerName(ownerConfig.ownerName);
    }
  }, [ownerConfig]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateDoc(doc(db, 'storeConfig', 'public'), {
        storeName: form.storeName,
        tagline: form.tagline || '',
        logoUrl: form.logoUrl || '/assets/vellox-logo-crop.jpg',
        bannerUrl: form.bannerUrl || '/assets/aistudio/velloxb_5c666189.jpg',
        announcementText: form.announcementText || '',
        whatsappNumber: form.whatsappNumber,
        contactEmail: ownerGmail.trim() || form.contactEmail || '',
        phone: form.phone || '',
        address: form.address || '',
        shippingFee: Number(form.shippingFee || 0),
        freeShippingThreshold: Number(form.freeShippingThreshold || 0),
        socialLinks: form.socialLinks || {},
        privacyPolicy: form.privacyPolicy || '',
        returnPolicy: form.returnPolicy || '',
        termsConditions: form.termsConditions || '',
        shippingPolicy: form.shippingPolicy || '',
        updatedAt: serverTimestamp(),
      });

      const ownerSnap = await getDoc(doc(db, 'storeConfig', 'owner'));
      if (ownerSnap.exists() && ownerGmail.trim()) {
        await updateDoc(doc(db, 'storeConfig', 'owner'), {
          ownerName: ownerName.trim() || 'VELLOX Owner',
          ownerGmail: ownerGmail.trim(),
          updatedAt: serverTimestamp(),
        });
      }

      showToast('Store settings saved.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'storeConfig');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPass.length < 8) {
      showToast('Owner password must be at least 8 characters.');
      return;
    }
    if (newPass !== confirmPass) {
      showToast('Passwords do not match.');
      return;
    }
    try {
      if (!auth.currentUser) return;
      await updatePassword(auth.currentUser, newPass);
      setNewPass('');
      setConfirmPass('');
      showToast('Owner password updated.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Please re-login to update password.');
    }
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <form onSubmit={handleSaveSettings} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-5">
        <h2 className="font-display text-lg font-bold text-[#111317]">Storefront &amp; Contact Settings</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Store Name</label>
            <input
              type="text"
              required
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Owner Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Owner Gmail (Order Notifications)</label>
            <input
              type="email"
              required
              value={ownerGmail}
              onChange={(e) => setOwnerGmail(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">WhatsApp Number</label>
            <input
              type="text"
              required
              value={form.whatsappNumber}
              onChange={(e) => setForm({ ...form, whatsappNumber: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Standard Shipping Fee (PKR)</label>
            <input
              type="number"
              min={0}
              value={form.shippingFee}
              onChange={(e) => setForm({ ...form, shippingFee: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Free Shipping Over (PKR)</label>
            <input
              type="number"
              min={0}
              value={form.freeShippingThreshold ?? 0}
              onChange={(e) => setForm({ ...form, freeShippingThreshold: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg font-mono"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Announcement Bar Text</label>
            <input
              type="text"
              value={form.announcementText || ''}
              onChange={(e) => setForm({ ...form, announcementText: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Store Address</label>
            <input
              type="text"
              value={form.address || ''}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 text-sm border border-zinc-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Logo URL / Upload</label>
            <input
              type="text"
              value={form.logoUrl || ''}
              onChange={(e) => setForm({ ...form, logoUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg mb-1"
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setForm({ ...form, logoUrl: await compressImageFileToDataUrl(f, 320) });
              }}
              className="text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Banner URL / Upload</label>
            <input
              type="text"
              value={form.bannerUrl || ''}
              onChange={(e) => setForm({ ...form, bannerUrl: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg mb-1"
            />
            <input
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) setForm({ ...form, bannerUrl: await compressImageFileToDataUrl(f, 1200, 0.78) });
              }}
              className="text-xs"
            />
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-zinc-200">
          <h3 className="text-sm font-bold text-[#111317]">Store Policies</h3>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Privacy Policy</label>
            <textarea
              rows={3}
              value={form.privacyPolicy || ''}
              onChange={(e) => setForm({ ...form, privacyPolicy: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Return &amp; Refund Policy</label>
            <textarea
              rows={3}
              value={form.returnPolicy || ''}
              onChange={(e) => setForm({ ...form, returnPolicy: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Terms &amp; Conditions</label>
            <textarea
              rows={3}
              value={form.termsConditions || ''}
              onChange={(e) => setForm({ ...form, termsConditions: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-zinc-300 rounded-lg"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-6 py-2.5 bg-[#111317] text-white text-sm font-semibold rounded-lg hover:bg-zinc-800"
        >
          {saving ? 'Saving...' : 'Save Store Settings'}
        </button>
      </form>

      <form onSubmit={handleUpdatePassword} className="bg-white border border-zinc-200 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#111317]" />
          <h2 className="font-display text-lg font-bold text-[#111317]">Change Owner Password</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="password"
            placeholder="New Password (min 8 chars)"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPass}
            onChange={(e) => setConfirmPass(e.target.value)}
            className="px-3 py-2 text-sm border border-zinc-300 rounded-lg"
          />
        </div>
        <button type="submit" className="px-5 py-2 bg-zinc-900 text-white text-xs font-semibold rounded-lg">
          Update Password
        </button>
      </form>
    </div>
  );
};
