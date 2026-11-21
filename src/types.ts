export const BLUEPRINT_LIMITS = {
  NAME_MAX: 160,
  SHORT_TEXT_MAX: 200,
  DESC_MAX: 5000,
  SPECS_MAX: 3000,
  ADDRESS_MAX: 400,
  CITY_MAX: 80,
  PHONE_MAX: 30,
  NOTES_MAX: 600,
  POLICY_MAX: 15000,
  IMAGES_MAX: 8,
  ORDER_ITEMS_MAX: 50,
} as const;

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Processing'
  | 'Shipped'
  | 'Delivered'
  | 'Cancelled';

export const ORDER_STATUSES: OrderStatus[] = [
  'Pending',
  'Confirmed',
  'Processing',
  'Shipped',
  'Delivered',
  'Cancelled',
];

export interface StorePublicSettings {
  storeName: string;
  tagline?: string;
  logoUrl?: string;
  bannerUrl?: string;
  announcementText?: string;
  whatsappNumber: string;
  contactEmail?: string;
  phone?: string;
  address?: string;
  shippingFee: number;
  freeShippingThreshold?: number;
  ownerInitialized: boolean;
  socialLinks?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
  };
  sectionsVisibility?: {
    announcementBar: boolean;
    categories: boolean;
    featured: boolean;
    trending: boolean;
    bestSellers: boolean;
    newArrivals: boolean;
    promoBanner: boolean;
    benefits: boolean;
    newsletter: boolean;
  };
  privacyPolicy?: string;
  returnPolicy?: string;
  termsConditions?: string;
  shippingPolicy?: string;
  updatedAt?: unknown;
}

export interface StoreOwnerConfig {
  ownerUid: string;
  ownerName: string;
  ownerEmail: string;
  ownerGmail: string;
  initializedAt?: unknown;
  updatedAt?: unknown;
}

export interface UserProfile {
  uid: string;
  fullName: string;
  email: string;
  phone?: string;
  role: 'customer' | 'owner';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CustomerAddress {
  id: string;
  userId: string;
  label?: string;
  fullName: string;
  phone: string;
  city: string;
  address: string;
  postalCode?: string;
  isDefault?: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku?: string;
  categoryId: string;
  categoryName?: string;
  description?: string;
  specifications?: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  stock: number;
  inStock: boolean;
  isFeatured?: boolean;
  isTrending?: boolean;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  isVisible: boolean;
  rating?: number;
  reviewCount?: number;
  images: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CartItem {
  productId: string;
  name: string;
  slug: string;
  price: number;
  image: string;
  quantity: number;
  maxStock: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  sku?: string;
  image: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  deliveryAddress: string;
  postalCode?: string;
  notes?: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discountAmount: number;
  couponCode?: string;
  totalAmount: number;
  paymentMethod: 'COD';
  status: OrderStatus;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OrderStatusHistoryItem {
  id?: string;
  status: OrderStatus;
  note?: string;
  updatedBy: string;
  createdAt?: unknown;
}

export interface OrderTrackingDoc {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  city: string;
  itemCount: number;
  totalAmount: number;
  statusHistory: Array<{
    status: OrderStatus;
    note?: string;
    timestamp: string;
  }>;
  updatedAt?: unknown;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl: string;
  placement: 'hero' | 'promo';
  isActive: boolean;
  displayOrder: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface Coupon {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderAmount: number;
  expiresAt?: string;
  isActive: boolean;
  usageCount: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface InventoryLog {
  id?: string;
  productId: string;
  productName: string;
  changeAmount: number;
  previousStock: number;
  newStock: number;
  reason: string;
  referenceId?: string;
  actorUid: string;
  createdAt?: unknown;
}

export interface EmailNotificationLog {
  id?: string;
  orderId: string;
  orderNumber: string;
  recipientEmail: string;
  type: 'owner_order_alert' | 'customer_confirmation' | 'test_email';
  subject: string;
  status: 'sent' | 'failed' | 'pending_config';
  provider: 'gmail_oauth' | 'smtp' | 'none';
  errorMessage?: string;
  createdAt?: unknown;
}

export function formatPKR(amount: number): string {
  return `PKR ${Math.round(amount || 0).toLocaleString('en-PK')}`;
}

export function formatWhatsAppUrl(phone: string, message: string): string {
  const digits = phone.replace(/\D/g, '');
  const normalized = digits.startsWith('0') ? `92${digits.slice(1)}` : digits.startsWith('92') ? digits : `92${digits}`;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`;
}
