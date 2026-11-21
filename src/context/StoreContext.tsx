import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import {
  auth,
  authorizeOwnerGmail,
  db,
  getGmailAccessToken,
  googleAuthProvider,
  handleFirestoreError,
  OperationType,
  setGmailAccessToken,
  testFirestoreConnection,
} from '../firebase';
import {
  DEFAULT_STORE_SETTINGS,
  INITIAL_BANNERS,
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
} from '../data/seedCatalog';
import {
  Banner,
  CartItem,
  Category,
  Coupon,
  Order,
  OrderItem,
  Product,
  StorePublicSettings,
  UserProfile,
} from '../types';

interface CheckoutPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  city: string;
  deliveryAddress: string;
  postalCode?: string;
  notes?: string;
  couponCode?: string;
}

interface StoreContextValue {
  authReady: boolean;
  catalogLoading: boolean;
  user: User | null;
  userProfile: UserProfile | null;
  isOwner: boolean;
  adminPinVerified: boolean;
  ownerInitialized: boolean;
  gmailConnected: boolean;
  storeSettings: StorePublicSettings;
  categories: Category[];
  products: Product[];
  banners: Banner[];
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  wishlistIds: string[];
  toastMessage: string | null;
  showToast: (msg: string) => void;
  googleSignIn: () => Promise<User>;
  emailSignIn: (email: string, password: string) => Promise<User>;
  emailRegister: (fullName: string, email: string, password: string) => Promise<User>;
  sendResetEmail: (email: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  verifyAdminPin: (pin: string) => Promise<boolean>;
  clearAdminPinSession: () => void;
  bootstrapOwnerStore: (firebaseUser: User, ownerName?: string) => Promise<void>;
  logout: () => Promise<void>;
  connectOwnerGmail: () => Promise<string>;
  addToCart: (product: Product, qty?: number) => void;
  updateCartQty: (productId: string, qty: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => Promise<void>;
  validateCoupon: (code: string, subtotal: number) => Promise<{ valid: boolean; discount: number; coupon?: Coupon; message: string }>;
  placeOrder: (payload: CheckoutPayload) => Promise<Order>;
  seedInitialCatalog: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const CART_STORAGE_KEY = 'veloxx_cart_v1';
const WISHLIST_STORAGE_KEY = 'veloxx_wishlist_guest_v1';
const ADMIN_PIN_STORAGE_KEY = 'veloxx_admin_pin_ok';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [adminPinVerified, setAdminPinVerified] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(ADMIN_PIN_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [gmailConnected, setGmailConnected] = useState(false);

  const [storeSettings, setStoreSettings] = useState<StorePublicSettings>(DEFAULT_STORE_SETTINGS);
  const [firestoreCategories, setFirestoreCategories] = useState<Category[]>([]);
  const [firestoreProducts, setFirestoreProducts] = useState<Product[]>([]);
  const [firestoreBanners, setFirestoreBanners] = useState<Banner[]>([]);
  const [hasLoadedPublicConfig, setHasLoadedPublicConfig] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  const [wishlistIds, setWishlistIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as string[]) : [];
    } catch {
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  // Initial Firestore connectivity verification
  useEffect(() => {
    testFirestoreConnection();
  }, []);

  // Subscribe to public store configuration
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'storeConfig', 'public'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data() as StorePublicSettings;
          const normalized: StorePublicSettings = {
            ...DEFAULT_STORE_SETTINGS,
            ...data,
            storeName:
              !data.storeName || data.storeName === 'VELOXX'
                ? DEFAULT_STORE_SETTINGS.storeName
                : data.storeName,
            whatsappNumber:
              !data.whatsappNumber || data.whatsappNumber === '03134017700'
                ? DEFAULT_STORE_SETTINGS.whatsappNumber
                : data.whatsappNumber,
            phone:
              !data.phone || data.phone === '+92 313 4017700'
                ? DEFAULT_STORE_SETTINGS.phone
                : data.phone,
            address:
              !data.address || data.address === 'Gulberg III, Lahore, Pakistan'
                ? DEFAULT_STORE_SETTINGS.address
                : data.address,
          };
          setStoreSettings(normalized);
        } else {
          setStoreSettings(DEFAULT_STORE_SETTINGS);
        }
        setHasLoadedPublicConfig(true);
      },
      (err) => {
        console.error('Public config listener error:', err);
        setHasLoadedPublicConfig(true);
      }
    );
    return () => unsub();
  }, []);

  // Subscribe to public catalog: categories, products, banners
  useEffect(() => {
    const unsubCats = onSnapshot(
      query(collection(db, 'categories'), orderBy('displayOrder', 'asc')),
      (snap) => {
        setFirestoreCategories(snap.docs.map((d) => d.data() as Category));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'categories')
    );

    const unsubProds = onSnapshot(
      collection(db, 'products'),
      (snap) => {
        setFirestoreProducts(snap.docs.map((d) => d.data() as Product));
        setCatalogLoading(false);
      },
      (err) => {
        setCatalogLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'products');
      }
    );

    const unsubBanners = onSnapshot(
      query(collection(db, 'banners'), orderBy('displayOrder', 'asc')),
      (snap) => {
        setFirestoreBanners(snap.docs.map((d) => d.data() as Banner));
      },
      (err) => handleFirestoreError(err, OperationType.LIST, 'banners')
    );

    return () => {
      unsubCats();
      unsubProds();
      unsubBanners();
    };
  }, []);

  // Auth listener + role resolution + private wishlist listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubWishlist: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }
      if (unsubWishlist) {
        unsubWishlist();
        unsubWishlist = null;
      }

      setUser(firebaseUser);

      if (!firebaseUser) {
        setGmailAccessToken(null);
        setGmailConnected(false);
        setUserProfile(null);
        setIsOwner(false);
        setAuthReady(true);
        try {
          const saved = localStorage.getItem(WISHLIST_STORAGE_KEY);
          setWishlistIds(saved ? (JSON.parse(saved) as string[]) : []);
        } catch {
          setWishlistIds([]);
        }
        return;
      }

      setGmailConnected(Boolean(getGmailAccessToken()));

      try {
        const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
        const isBootstrappedOwner =
          firebaseUser.email === 'vellox.store.pk@gmail.com' && firebaseUser.emailVerified;
        setIsOwner(adminSnap.exists() || isBootstrappedOwner);
      } catch {
        setIsOwner(false);
      }

      unsubProfile = onSnapshot(
        doc(db, 'users', firebaseUser.uid),
        (snap) => {
          if (snap.exists()) {
            const prof = snap.data() as UserProfile;
            setUserProfile(prof);
            if (prof.role === 'owner') {
              setIsOwner(true);
            }
          } else {
            setUserProfile(null);
          }
          setAuthReady(true);
        },
        () => {
          setAuthReady(true);
        }
      );

      unsubWishlist = onSnapshot(
        collection(db, 'users', firebaseUser.uid, 'wishlist'),
        (snap) => {
          setWishlistIds(snap.docs.map((d) => d.id));
        },
        (err) => {
          console.error('Wishlist listener error:', err);
        }
      );
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
      if (unsubWishlist) unsubWishlist();
    };
  }, []);

  const ownerInitialized = storeSettings.ownerInitialized;

  // Before owner initializes the store, show launch catalog defaults; once initialized, use strictly live Firestore data
  const categories = useMemo(() => {
    if (firestoreCategories.length > 0 || ownerInitialized) {
      return firestoreCategories;
    }
    return INITIAL_CATEGORIES as Category[];
  }, [firestoreCategories, ownerInitialized]);

  const products = useMemo(() => {
    if (firestoreProducts.length > 0 || ownerInitialized) {
      return firestoreProducts;
    }
    return INITIAL_PRODUCTS as Product[];
  }, [firestoreProducts, ownerInitialized]);

  const banners = useMemo(() => {
    if (firestoreBanners.length > 0 || ownerInitialized) {
      return firestoreBanners;
    }
    return INITIAL_BANNERS as Banner[];
  }, [firestoreBanners, ownerInitialized]);

  const ensureCustomerProfile = async (firebaseUser: User, explicitName?: string) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      try {
        await setDoc(userRef, {
          uid: firebaseUser.uid,
          fullName: explicitName || firebaseUser.displayName || 'VELLOX Customer',
          email: firebaseUser.email || '',
          phone: firebaseUser.phoneNumber || '',
          role: 'customer',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${firebaseUser.uid}`);
      }
    }
  };

  const googleSignIn = async (): Promise<User> => {
    const result = await signInWithPopup(auth, googleAuthProvider);
    await ensureCustomerProfile(result.user);
    return result.user;
  };

  const emailSignIn = async (email: string, password: string): Promise<User> => {
    const result = await signInWithEmailAndPassword(auth, email.trim(), password);
    return result.user;
  };

  const emailRegister = async (fullName: string, email: string, password: string): Promise<User> => {
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await updateProfile(result.user, { displayName: fullName.trim() });
    await ensureCustomerProfile(result.user, fullName.trim());
    try {
      await sendEmailVerification(result.user);
    } catch {
      // Verification email best-effort
    }
    return result.user;
  };

  const sendResetEmail = async (email: string): Promise<void> => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerification = async (): Promise<void> => {
    if (!auth.currentUser) throw new Error('Not signed in.');
    await sendEmailVerification(auth.currentUser);
  };

  const verifyAdminPin = async (pin: string): Promise<boolean> => {
    const res = await fetch('/api/admin/verify-pin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return false;
    try {
      sessionStorage.setItem(ADMIN_PIN_STORAGE_KEY, '1');
    } catch {
      // ignore storage errors
    }
    setAdminPinVerified(true);
    return true;
  };

  const clearAdminPinSession = () => {
    try {
      sessionStorage.removeItem(ADMIN_PIN_STORAGE_KEY);
    } catch {
      // ignore
    }
    setAdminPinVerified(false);
  };

  const logout = async (): Promise<void> => {
    setGmailAccessToken(null);
    setGmailConnected(false);
    clearAdminPinSession();
    await signOut(auth);
  };

  const connectOwnerGmail = async (): Promise<string> => {
    const { accessToken } = await authorizeOwnerGmail();
    setGmailConnected(true);
    return accessToken;
  };

  const addToCart = useCallback(
    (product: Product, qty = 1) => {
      if (!product.inStock || product.stock <= 0) {
        showToast('This item is currently out of stock.');
        return;
      }
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        if (existing) {
          const nextQty = Math.min(existing.quantity + qty, product.stock);
          if (nextQty === existing.quantity) {
            showToast(`Maximum available stock (${product.stock}) reached.`);
            return prev;
          }
          showToast(`Updated ${product.name} in bag.`);
          return prev.map((i) =>
            i.productId === product.id ? { ...i, quantity: nextQty, maxStock: product.stock, price: product.price } : i
          );
        }
        const safeQty = Math.min(Math.max(1, qty), product.stock);
        showToast(`Added ${product.name} to bag.`);
        return [
          ...prev,
          {
            productId: product.id,
            name: product.name,
            slug: product.slug,
            price: product.price,
            image: product.images[0] || '/assets/products/led-desk-lamp.jpg',
            quantity: safeQty,
            maxStock: product.stock,
          },
        ];
      });
    },
    [showToast]
  );

  const updateCartQty = useCallback((productId: string, qty: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.productId !== productId) return item;
          const clamped = Math.min(Math.max(0, qty), item.maxStock);
          return { ...item, quantity: clamped };
        })
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const toggleWishlist = useCallback(
    async (productId: string) => {
      if (user) {
        const ref = doc(db, 'users', user.uid, 'wishlist', productId);
        const isIn = wishlistIds.includes(productId);
        try {
          if (isIn) {
            await deleteDoc(ref);
            showToast('Removed from wishlist.');
          } else {
            await setDoc(ref, {
              productId,
              userId: user.uid,
              addedAt: serverTimestamp(),
            });
            showToast('Saved to wishlist.');
          }
        } catch (err) {
          // If product hasn't been seeded to Firestore yet, fallback locally with clear feedback
          console.error('Wishlist update error:', err);
          showToast('Unable to update wishlist right now.');
        }
      } else {
        setWishlistIds((prev) => {
          const next = prev.includes(productId)
            ? prev.filter((id) => id !== productId)
            : [...prev, productId];
          try {
            localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(next));
          } catch {
            // ignore
          }
          showToast(prev.includes(productId) ? 'Removed from wishlist.' : 'Saved to wishlist.');
          return next;
        });
      }
    },
    [user, wishlistIds, showToast]
  );

  const validateCoupon = async (code: string, subtotal: number) => {
    const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!cleanCode) {
      return { valid: false, discount: 0, message: 'Enter a valid coupon code.' };
    }
    try {
      const snap = await getDoc(doc(db, 'coupons', cleanCode));
      if (!snap.exists()) {
        return { valid: false, discount: 0, message: 'Coupon code not found.' };
      }
      const coupon = snap.data() as Coupon;
      if (!coupon.isActive) {
        return { valid: false, discount: 0, message: 'This coupon is currently inactive.' };
      }
      if (coupon.expiresAt && new Date(coupon.expiresAt).getTime() < Date.now()) {
        return { valid: false, discount: 0, message: 'This coupon has expired.' };
      }
      if (subtotal < coupon.minOrderAmount) {
        return {
          valid: false,
          discount: 0,
          message: `Minimum order of PKR ${coupon.minOrderAmount.toLocaleString('en-PK')} required.`,
        };
      }
      const discount =
        coupon.type === 'percentage'
          ? Math.min(subtotal, Math.round((subtotal * coupon.value) / 100))
          : Math.min(subtotal, coupon.value);

      return {
        valid: true,
        discount,
        coupon,
        message: `Coupon ${coupon.code} applied (-PKR ${discount.toLocaleString('en-PK')}).`,
      };
    } catch {
      return { valid: false, discount: 0, message: 'Could not verify coupon code.' };
    }
  };

  const seedInitialCatalog = async () => {
    const batch = writeBatch(db);
    for (const cat of INITIAL_CATEGORIES) {
      batch.set(doc(db, 'categories', cat.id), {
        ...cat,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const prod of INITIAL_PRODUCTS) {
      batch.set(doc(db, 'products', prod.id), {
        ...prod,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    for (const banner of INITIAL_BANNERS) {
      batch.set(doc(db, 'banners', banner.id), {
        ...banner,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    await batch.commit();
  };

  const bootstrapOwnerStore = async (firebaseUser: User, explicitName?: string) => {
    const ownerSnap = await getDoc(doc(db, 'storeConfig', 'owner'));
    const adminSnap = await getDoc(doc(db, 'admins', firebaseUser.uid));
    const displayName = explicitName?.trim() || firebaseUser.displayName || 'VELLOX Owner';
    const ownerEmail = firebaseUser.email || 'vellox.store.pk@gmail.com';

    if (!ownerSnap.exists()) {
      const batch = writeBatch(db);
      if (!adminSnap.exists()) {
        batch.set(doc(db, 'admins', firebaseUser.uid), {
          uid: firebaseUser.uid,
          email: ownerEmail,
          role: 'owner',
          createdAt: serverTimestamp(),
        });
      }
      batch.set(doc(db, 'storeConfig', 'owner'), {
        ownerUid: firebaseUser.uid,
        ownerName: displayName,
        ownerEmail,
        ownerGmail: 'vellox.store.pk@gmail.com',
        initializedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'storeConfig', 'public'), {
        ...DEFAULT_STORE_SETTINGS,
        shippingFee: 0,
        freeShippingThreshold: 0,
        contactEmail: 'vellox.store.pk@gmail.com',
        ownerInitialized: true,
        updatedAt: serverTimestamp(),
      });
      batch.set(doc(db, 'users', firebaseUser.uid), {
        uid: firebaseUser.uid,
        fullName: displayName,
        email: ownerEmail,
        phone: DEFAULT_STORE_SETTINGS.whatsappNumber,
        role: 'owner',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      await batch.commit();
      setIsOwner(true);
    }

    if (firestoreProducts.length === 0) {
      await seedInitialCatalog();
    }
  };

  const placeOrder = async (payload: CheckoutPayload): Promise<Order> => {
    if (cart.length === 0) {
      throw new Error('Your shopping bag is empty.');
    }

    if (firestoreProducts.length === 0 && !ownerInitialized) {
      throw new Error(
        'Store catalog has not been initialized yet. The Owner must complete first-time setup at /admin before orders can be placed.'
      );
    }

    const cleanSuffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const orderNumber = `VLX-${Date.now().toString().slice(-6)}${cleanSuffix}`;
    const orderId = orderNumber;
    const actorUid = user ? user.uid : 'guest';
    const createdIso = new Date().toISOString();

    const cleanCouponCode = payload.couponCode
      ? payload.couponCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '')
      : '';

    const committedOrder = await runTransaction(db, async (tx) => {
      const productDocs: Array<{ ref: ReturnType<typeof doc>; data: Product; qty: number }> = [];
      for (const item of cart) {
        const pRef = doc(db, 'products', item.productId);
        const pSnap = await tx.get(pRef);
        if (!pSnap.exists()) {
          throw new Error(`Product "${item.name}" is no longer available.`);
        }
        const pData = pSnap.data() as Product;
        if (!pData.inStock || pData.stock < item.quantity) {
          throw new Error(`Insufficient stock for "${pData.name}". Available: ${pData.stock}`);
        }
        productDocs.push({ ref: pRef, data: pData, qty: item.quantity });
      }

      let discountAmount = 0;
      let couponRef: ReturnType<typeof doc> | null = null;
      let couponData: Coupon | null = null;

      const subtotal = productDocs.reduce((sum, entry) => sum + entry.data.price * entry.qty, 0);
      const shippingFee = 0;

      if (cleanCouponCode) {
        couponRef = doc(db, 'coupons', cleanCouponCode);
        const cSnap = await tx.get(couponRef);
        if (cSnap.exists()) {
          const cData = cSnap.data() as Coupon;
          const notExpired = !cData.expiresAt || new Date(cData.expiresAt).getTime() >= Date.now();
          if (cData.isActive && notExpired && subtotal >= cData.minOrderAmount) {
            couponData = cData;
            discountAmount =
              cData.type === 'percentage'
                ? Math.min(subtotal, Math.round((subtotal * cData.value) / 100))
                : Math.min(subtotal, cData.value);
          }
        }
      }

      const totalAmount = Math.max(0, subtotal + shippingFee - discountAmount);

      const orderItems: OrderItem[] = productDocs.map(({ data, qty }) => ({
        productId: data.id,
        name: data.name,
        sku: data.sku || '',
        image: data.images[0] || '/assets/products/led-desk-lamp.jpg',
        price: data.price,
        quantity: qty,
      }));

      // 1. Update product stocks & write inventory logs
      for (const { ref, data, qty } of productDocs) {
        const newStock = data.stock - qty;
        tx.update(ref, {
          stock: newStock,
          inStock: newStock > 0,
          updatedAt: serverTimestamp(),
        });

        const logId = `inv-${orderId}-${data.id}`.slice(0, 120);
        tx.set(doc(db, 'inventoryLogs', logId), {
          productId: data.id,
          productName: data.name,
          changeAmount: -qty,
          previousStock: data.stock,
          newStock,
          reason: 'Customer COD Order',
          referenceId: orderId,
          actorUid,
          createdAt: serverTimestamp(),
        });
      }

      // 2. Increment coupon usage if applied
      if (couponRef && couponData) {
        tx.update(couponRef, {
          usageCount: (couponData.usageCount || 0) + 1,
          updatedAt: serverTimestamp(),
        });
      }

      const orderDoc: Order = {
        id: orderId,
        orderNumber,
        userId: actorUid,
        customerName: payload.customerName.trim().slice(0, 120),
        customerPhone: payload.customerPhone.trim().slice(0, 30),
        customerEmail: (payload.customerEmail || '').trim().slice(0, 200),
        city: payload.city.trim().slice(0, 80),
        deliveryAddress: payload.deliveryAddress.trim().slice(0, 400),
        postalCode: (payload.postalCode || '').trim().slice(0, 20),
        notes: (payload.notes || '').trim().slice(0, 600),
        items: orderItems,
        subtotal,
        shippingFee,
        discountAmount,
        couponCode: couponData ? couponData.code : '',
        totalAmount,
        paymentMethod: 'COD',
        status: 'Pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 3. Persist Order
      tx.set(doc(db, 'orders', orderId), orderDoc);

      // 4. Persist Initial Status History
      tx.set(doc(db, 'orders', orderId, 'statusHistory', 'init'), {
        status: 'Pending',
        note: 'Order placed via Cash on Delivery.',
        updatedBy: actorUid,
        createdAt: serverTimestamp(),
      });

      // 5. Persist Non-PII Tracking Projection
      tx.set(doc(db, 'orderTracking', orderId), {
        orderId,
        orderNumber,
        status: 'Pending',
        city: orderDoc.city,
        itemCount: orderItems.reduce((s, i) => s + i.quantity, 0),
        totalAmount,
        statusHistory: [
          {
            status: 'Pending',
            note: 'Order placed via Cash on Delivery.',
            timestamp: createdIso,
          },
        ],
        updatedAt: serverTimestamp(),
      });

      return orderDoc;
    });

    // Dispatch Owner Gmail Alert & Customer Confirmation via backend API (never blocks verified order creation)
    const ownerGmailTarget = storeSettings.contactEmail || 'vellox.store.pk@gmail.com';
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const gmailTok = getGmailAccessToken();
      if (gmailTok) {
        headers['x-gmail-token'] = gmailTok;
      }
      const res = await fetch('/api/notifications/order', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderId: committedOrder.id,
          orderNumber: committedOrder.orderNumber,
          ownerGmail: ownerGmailTarget,
          customerName: committedOrder.customerName,
          customerPhone: committedOrder.customerPhone,
          customerEmail: committedOrder.customerEmail,
          city: committedOrder.city,
          deliveryAddress: committedOrder.deliveryAddress,
          postalCode: committedOrder.postalCode,
          notes: committedOrder.notes,
          items: committedOrder.items.map((i) => ({
            name: i.name,
            quantity: i.quantity,
            price: i.price,
          })),
          subtotal: committedOrder.subtotal,
          shippingFee: committedOrder.shippingFee,
          discountAmount: committedOrder.discountAmount,
          totalAmount: committedOrder.totalAmount,
          paymentMethod: committedOrder.paymentMethod,
          createdAtIso: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' }),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        await setDoc(doc(db, 'emailNotificationLogs', `owner-${orderId}`), {
          orderId,
          orderNumber,
          recipientEmail: ownerGmailTarget,
          type: 'owner_order_alert',
          subject: data.ownerSubject,
          status: data.ownerResult.status,
          provider: data.ownerResult.provider,
          errorMessage: data.ownerResult.errorMessage || '',
          createdAt: serverTimestamp(),
        });
        if (committedOrder.customerEmail && data.customerResult) {
          await setDoc(doc(db, 'emailNotificationLogs', `cust-${orderId}`), {
            orderId,
            orderNumber,
            recipientEmail: committedOrder.customerEmail,
            type: 'customer_confirmation',
            subject: data.customerSubject,
            status: data.customerResult.status,
            provider: data.customerResult.provider,
            errorMessage: data.customerResult.errorMessage || '',
            createdAt: serverTimestamp(),
          });
        }
      }
    } catch (notifyErr) {
      console.error('Order notification log warning:', notifyErr);
    }

    clearCart();
    return committedOrder;
  };

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);
  const cartSubtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart]);

  return (
    <StoreContext.Provider
      value={{
        authReady: authReady && hasLoadedPublicConfig,
        catalogLoading,
        user,
        userProfile,
        isOwner,
        adminPinVerified,
        ownerInitialized,
        gmailConnected,
        storeSettings,
        categories,
        products,
        banners,
        cart,
        cartCount,
        cartSubtotal,
        isCartOpen,
        setIsCartOpen,
        wishlistIds,
        toastMessage,
        showToast,
        googleSignIn,
        emailSignIn,
        emailRegister,
        sendResetEmail,
        resendVerification,
        verifyAdminPin,
        clearAdminPinSession,
        bootstrapOwnerStore,
        logout,
        connectOwnerGmail,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        toggleWishlist,
        validateCoupon,
        placeOrder,
        seedInitialCatalog,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}
