import express from 'express';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import nodemailer, { type Transporter } from 'nodemailer';
import { getApps, getApp, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface FirebaseAppletConfig {
  projectId: string;
}

function loadFirebaseProjectId(): string | null {
  try {
    const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(configPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf-8')) as FirebaseAppletConfig;
    if (!parsed.projectId || parsed.projectId === 'remixed-project-id') return null;
    return parsed.projectId;
  } catch {
    return null;
  }
}

const projectId = loadFirebaseProjectId();
const adminApp = projectId
  ? getApps().length > 0
    ? getApp()
    : initializeApp({ projectId })
  : null;

interface OrderEmailItem {
  name: string;
  quantity: number;
  price: number;
}

interface OrderNotificationPayload {
  orderId: string;
  orderNumber: string;
  ownerGmail: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  deliveryAddress: string;
  postalCode?: string;
  notes?: string;
  items: OrderEmailItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  totalAmount: number;
  paymentMethod: string;
  createdAtIso: string;
}

function formatPkr(amount: number): string {
  return `PKR ${Number(amount || 0).toLocaleString('en-PK')}`;
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildOwnerOrderHtml(order: OrderNotificationPayload): string {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111317;font-size:14px;">${escapeHtml(item.name)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:14px;text-align:center;">${item.quantity}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111317;font-size:14px;text-align:right;font-family:monospace;">${formatPkr(item.price)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#111317;font-size:14px;text-align:right;font-weight:600;font-family:monospace;">${formatPkr(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
        <div style="background:#111317;color:#ffffff;padding:24px 28px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a1a1aa;margin-bottom:6px;">VELLOX STORE ALERT</div>
          <h1 style="margin:0;font-size:22px;font-weight:700;">New Order #${escapeHtml(order.orderNumber)}</h1>
          <p style="margin:6px 0 0;color:#d4d4d8;font-size:13px;">Placed on ${escapeHtml(order.createdAtIso)}</p>
        </div>

        <div style="padding:24px 28px;">
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px;margin-bottom:24px;">
            <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:#52525b;">Customer &amp; Delivery Details</h2>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:4px 0;color:#71717a;width:140px;">Order ID:</td><td style="padding:4px 0;color:#111317;font-weight:600;font-family:monospace;">#${escapeHtml(order.orderNumber)}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Customer Name:</td><td style="padding:4px 0;color:#111317;font-weight:600;">${escapeHtml(order.customerName)}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Phone / Mobile:</td><td style="padding:4px 0;color:#111317;font-weight:600;">${escapeHtml(order.customerPhone)}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Email:</td><td style="padding:4px 0;color:#111317;">${escapeHtml(order.customerEmail || 'Not provided')}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">City:</td><td style="padding:4px 0;color:#111317;">${escapeHtml(order.city)}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;vertical-align:top;">Delivery Address:</td><td style="padding:4px 0;color:#111317;">${escapeHtml(order.deliveryAddress)}${order.postalCode ? ` (${escapeHtml(order.postalCode)})` : ''}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Payment Method:</td><td style="padding:4px 0;color:#111317;font-weight:600;">${escapeHtml(order.paymentMethod)} (Cash on Delivery)</td></tr>
              ${order.notes ? `<tr><td style="padding:4px 0;color:#71717a;vertical-align:top;">Order Notes:</td><td style="padding:4px 0;color:#111317;">${escapeHtml(order.notes)}</td></tr>` : ''}
            </table>
          </div>

          <h2 style="margin:0 0 12px;font-size:14px;text-transform:uppercase;letter-spacing:0.06em;color:#52525b;">Ordered Products</h2>
          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;">
            <thead>
              <tr style="background:#f4f4f5;">
                <th style="padding:10px 12px;text-align:left;font-size:12px;color:#52525b;border-bottom:1px solid #e5e7eb;">Product</th>
                <th style="padding:10px 12px;text-align:center;font-size:12px;color:#52525b;border-bottom:1px solid #e5e7eb;">Qty</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#52525b;border-bottom:1px solid #e5e7eb;">Unit Price</th>
                <th style="padding:10px 12px;text-align:right;font-size:12px;color:#52525b;border-bottom:1px solid #e5e7eb;">Line Total</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <div style="margin-top:20px;border-top:1px solid #e5e7eb;padding-top:16px;">
            <table style="width:100%;font-size:14px;">
              <tr><td style="padding:4px 0;color:#71717a;">Subtotal</td><td style="text-align:right;font-family:monospace;">${formatPkr(order.subtotal)}</td></tr>
              <tr><td style="padding:4px 0;color:#71717a;">Shipping Charges</td><td style="text-align:right;font-family:monospace;">${order.shippingFee === 0 ? 'FREE' : formatPkr(order.shippingFee)}</td></tr>
              ${order.discountAmount > 0 ? `<tr><td style="padding:4px 0;color:#16a34a;">Discount</td><td style="text-align:right;color:#16a34a;font-family:monospace;">-${formatPkr(order.discountAmount)}</td></tr>` : ''}
              <tr><td style="padding:10px 0 0;font-size:16px;font-weight:700;color:#111317;border-top:1px solid #e5e7eb;">Total Payable (COD)</td><td style="padding:10px 0 0;text-align:right;font-size:18px;font-weight:700;color:#111317;border-top:1px solid #e5e7eb;font-family:monospace;">${formatPkr(order.totalAmount)}</td></tr>
            </table>
          </div>
        </div>
      </div>
    </body>
  </html>`;
}

function buildCustomerOrderHtml(order: OrderNotificationPayload): string {
  const rows = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:14px;">${escapeHtml(item.name)} &times; ${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e5e7eb;font-size:14px;text-align:right;font-family:monospace;">${formatPkr(item.price * item.quantity)}</td>
      </tr>`
    )
    .join('');

  return `
  <!DOCTYPE html>
  <html>
    <body style="margin:0;padding:24px;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px;overflow:hidden;">
        <div style="background:#111317;color:#ffffff;padding:24px 28px;">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:#a1a1aa;">VELLOX</div>
          <h1 style="margin:6px 0 0;font-size:20px;">Thank you for your order, ${escapeHtml(order.customerName)}!</h1>
        </div>
        <div style="padding:24px 28px;">
          <p style="margin:0 0 16px;color:#3f3f46;font-size:14px;line-height:1.6;">
            We have received your Cash on Delivery order <strong>#${escapeHtml(order.orderNumber)}</strong>. Our team will verify and dispatch your package to <strong>${escapeHtml(order.city)}</strong> shortly.
          </p>
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${rows}</table>
          <div style="border-top:1px solid #e5e7eb;padding-top:12px;font-size:14px;">
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;"><span>Shipping:</span><span>${order.shippingFee === 0 ? 'FREE' : formatPkr(order.shippingFee)}</span></div>
            <div style="display:flex;justify-content:space-between;font-weight:700;font-size:16px;margin-top:8px;"><span>Total Payable on Delivery:</span><span>${formatPkr(order.totalAmount)}</span></div>
          </div>
          <p style="margin:20px 0 0;color:#71717a;font-size:13px;">
            Need help? Message us on WhatsApp at <a href="https://wa.me/923014426490" style="color:#111317;font-weight:600;">+92 301 4426490</a>.
          </p>
        </div>
      </div>
    </body>
  </html>`;
}

function getServerTransport(): { transporter: Transporter; provider: 'smtp' | 'gmail_oauth'; sender: string } | null {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailAppPassword) {
    return {
      provider: 'smtp',
      sender: gmailUser,
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: gmailUser,
          pass: gmailAppPassword,
        },
      }),
    };
  }

  const clientId = process.env.GMAIL_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GMAIL_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GMAIL_OAUTH_REFRESH_TOKEN;
  if (gmailUser && clientId && clientSecret && refreshToken) {
    return {
      provider: 'gmail_oauth',
      sender: gmailUser,
      transporter: nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: gmailUser,
          clientId,
          clientSecret,
          refreshToken,
        },
      }),
    };
  }

  return null;
}

async function sendViaGmailApiToken(
  accessToken: string,
  to: string,
  subject: string,
  htmlBody: string
): Promise<{ ok: boolean; error?: string }> {
  const mimeLines = [
    `To: ${to}`,
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(htmlBody, 'utf-8').toString('base64'),
  ];
  const raw = Buffer.from(mimeLines.join('\r\n'), 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { ok: false, error: `Gmail API ${res.status}: ${errText.slice(0, 300)}` };
  }
  return { ok: true };
}

async function verifyCallerToken(req: express.Request): Promise<{ uid: string; email?: string } | null> {
  if (!adminApp) return null;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const idToken = authHeader.slice(7).trim();
  if (!idToken) return null;
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    const transport = getServerTransport();
    res.json({
      ok: true,
      serverEmailConfigured: Boolean(transport),
      provider: transport ? transport.provider : 'none',
    });
  });

  app.post('/api/admin/verify-pin', (req, res) => {
    const submitted = typeof req.body?.pin === 'string' ? req.body.pin.trim() : '';
    const expected = process.env.ADMIN_PIN || '2211';
    const a = Buffer.from(submitted, 'utf8');
    const b = Buffer.from(expected, 'utf8');
    const isMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!isMatch) {
      res.status(401).json({ valid: false, error: 'Incorrect admin password.' });
      return;
    }
    res.json({ valid: true });
  });

  // Triggered right after a customer order is persisted to Firestore
  app.post('/api/notifications/order', async (req, res) => {
    const payload = req.body as OrderNotificationPayload;
    if (!payload || !payload.orderNumber || !payload.ownerGmail || !Array.isArray(payload.items)) {
      res.status(400).json({ error: 'Invalid order notification payload' });
      return;
    }

    const ownerSubject = `NEW VELLOX ORDER - ORDER #${payload.orderNumber}`;
    const ownerHtml = buildOwnerOrderHtml(payload);
    const customerSubject = `VELLOX Order Confirmation - #${payload.orderNumber}`;
    const customerHtml = buildCustomerOrderHtml(payload);

    const serverTransport = getServerTransport();
    const gmailAccessToken = typeof req.headers['x-gmail-token'] === 'string' ? req.headers['x-gmail-token'].trim() : '';

    let ownerResult: { status: 'sent' | 'failed' | 'pending_config'; provider: 'gmail_oauth' | 'smtp' | 'none'; errorMessage?: string } = {
      status: 'pending_config',
      provider: 'none',
      errorMessage: 'Server-side Gmail delivery credentials are not configured in .env; pending Owner Gmail OAuth dispatch in Admin.',
    };

    let customerResult: { status: 'sent' | 'failed' | 'pending_config'; provider: 'gmail_oauth' | 'smtp' | 'none'; errorMessage?: string } = {
      status: 'pending_config',
      provider: 'none',
      errorMessage: 'Server-side email delivery not configured.',
    };

    if (serverTransport) {
      try {
        await serverTransport.transporter.sendMail({
          from: `"VELLOX Store" <${serverTransport.sender}>`,
          to: payload.ownerGmail,
          subject: ownerSubject,
          html: ownerHtml,
        });
        ownerResult = { status: 'sent', provider: serverTransport.provider };
      } catch (err) {
        ownerResult = {
          status: 'failed',
          provider: serverTransport.provider,
          errorMessage: err instanceof Error ? err.message.slice(0, 400) : 'SMTP send failed',
        };
      }

      if (payload.customerEmail) {
        try {
          await serverTransport.transporter.sendMail({
            from: `"VELLOX Store" <${serverTransport.sender}>`,
            to: payload.customerEmail,
            subject: customerSubject,
            html: customerHtml,
          });
          customerResult = { status: 'sent', provider: serverTransport.provider };
        } catch (err) {
          customerResult = {
            status: 'failed',
            provider: serverTransport.provider,
            errorMessage: err instanceof Error ? err.message.slice(0, 400) : 'Customer email send failed',
          };
        }
      }
    } else if (gmailAccessToken) {
      const apiRes = await sendViaGmailApiToken(gmailAccessToken, payload.ownerGmail, ownerSubject, ownerHtml);
      ownerResult = apiRes.ok
        ? { status: 'sent', provider: 'gmail_oauth' }
        : { status: 'failed', provider: 'gmail_oauth', errorMessage: apiRes.error };

      if (payload.customerEmail) {
        const custRes = await sendViaGmailApiToken(gmailAccessToken, payload.customerEmail, customerSubject, customerHtml);
        customerResult = custRes.ok
          ? { status: 'sent', provider: 'gmail_oauth' }
          : { status: 'failed', provider: 'gmail_oauth', errorMessage: custRes.error };
      }
    }

    res.json({
      ownerSubject,
      customerSubject,
      ownerResult,
      customerResult: payload.customerEmail ? customerResult : null,
    });
  });

  // Admin-only endpoint: send test email or dispatch a queued order email via Owner's Gmail OAuth token or server SMTP
  app.post('/api/gmail/dispatch', async (req, res) => {
    const caller = await verifyCallerToken(req);
    if (!caller) {
      res.status(401).json({ error: 'Valid Firebase authentication token required.' });
      return;
    }

    const { to, subject, type, order } = req.body as {
      to: string;
      subject?: string;
      type: 'test_email' | 'owner_order_alert' | 'customer_confirmation';
      order?: OrderNotificationPayload;
    };

    if (!to || typeof to !== 'string') {
      res.status(400).json({ error: 'Recipient email is required.' });
      return;
    }

    const finalSubject =
      type === 'test_email'
        ? subject || 'VELLOX Gmail Delivery Verification Test'
        : type === 'customer_confirmation' && order
        ? `VELLOX Order Confirmation - #${order.orderNumber}`
        : order
        ? `NEW VELLOX ORDER - ORDER #${order.orderNumber}`
        : subject || 'VELLOX Notification';

    const htmlBody =
      type === 'test_email'
        ? `<div style="font-family:sans-serif;padding:24px;max-width:540px;margin:0 auto;border:1px solid #e4e4e7;border-radius:8px;">
            <h2 style="margin:0 0 8px;color:#111317;">VELLOX Gmail Integration Active</h2>
            <p style="color:#52525b;font-size:14px;line-height:1.6;">
              Your VELLOX store order notifications are verified and delivering to <strong>${escapeHtml(to)}</strong>.
            </p>
            <p style="color:#71717a;font-size:12px;">Sent at ${new Date().toISOString()}</p>
          </div>`
        : type === 'customer_confirmation' && order
        ? buildCustomerOrderHtml(order)
        : order
        ? buildOwnerOrderHtml(order)
        : '<p>VELLOX Notification</p>';

    const gmailAccessToken = typeof req.headers['x-gmail-token'] === 'string' ? req.headers['x-gmail-token'].trim() : '';
    const serverTransport = getServerTransport();

    if (gmailAccessToken) {
      const apiRes = await sendViaGmailApiToken(gmailAccessToken, to, finalSubject, htmlBody);
      if (apiRes.ok) {
        res.json({ status: 'sent', provider: 'gmail_oauth', subject: finalSubject });
      } else {
        res.status(502).json({ status: 'failed', provider: 'gmail_oauth', errorMessage: apiRes.error, subject: finalSubject });
      }
      return;
    }

    if (serverTransport) {
      try {
        await serverTransport.transporter.sendMail({
          from: `"VELLOX Store" <${serverTransport.sender}>`,
          to,
          subject: finalSubject,
          html: htmlBody,
        });
        res.json({ status: 'sent', provider: serverTransport.provider, subject: finalSubject });
      } catch (err) {
        res.status(502).json({
          status: 'failed',
          provider: serverTransport.provider,
          errorMessage: err instanceof Error ? err.message : 'SMTP error',
          subject: finalSubject,
        });
      }
      return;
    }

    res.status(400).json({
      status: 'pending_config',
      provider: 'none',
      errorMessage: 'No active Gmail OAuth session token or server .env SMTP credentials found. Click "Authorize Gmail" in Admin first.',
      subject: finalSubject,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`VELLOX server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
