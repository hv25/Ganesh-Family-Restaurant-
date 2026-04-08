/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  MapPin, 
  Menu as MenuIcon, 
  X, 
  Drumstick, 
  Flame, 
  Crown, 
  ChevronRight,
  Clock,
  ExternalLink,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  ShoppingBag,
  LayoutDashboard,
  ChefHat,
  CreditCard,
  LogOut,
  User,
  Search,
  Filter,
  ArrowRight,
  IndianRupee,
  Calendar,
  TrendingUp,
  Download
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  orderBy, 
  where,
  getDoc,
  getDocs,
  setDoc
} from 'firebase/firestore';
import { 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType, increment } from './firebase';
import { Order, OrderStatus, PaymentStatus, PaymentMethod, UserProfile, OrderItem, MenuItem, MenuCategory, OrderType, Advertisement } from './types';
import { INITIAL_MENU_DATA } from './constants';
import { KitchenDashboard } from './components/KitchenDashboard';
import { POSDashboard } from './components/POSDashboard';
import { AdminDashboard } from './components/AdminDashboard';
import { Login } from './components/Login';
import { OrderHistory } from './components/OrderHistory';
import { LiveOrderTracker } from './components/LiveOrderTracker';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format } from 'date-fns';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- COMPONENTS ---

const Loader = ({ size = 24, className = "" }: { size?: number, className?: string }) => (
  <div className={cn("flex items-center justify-center", className)}>
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      style={{ width: size, height: size }}
      className="border-2 border-primary-gold border-t-transparent rounded-full"
    />
  </div>
);

const Skeleton = ({ className }: { className?: string }) => (
  <div className={cn("animate-pulse bg-gray-200 rounded-xl", className)} />
);

const Navbar = ({ 
  scrolled, 
  cartCount, 
  setIsCartOpen, 
  setIsMenuOpen, 
  isMenuOpen, 
  user,
  setView,
  userProfile,
  setCart,
  orders = []
}: any) => {
  const activeOrder = orders.find((o: any) => ['pending', 'preparing', 'ready'].includes(o.status));

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300",
      scrolled ? "bg-dark-bg py-2 shadow-lg border-b-2 border-primary-gold" : "bg-transparent py-4"
    )}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
        <div className="flex flex-col cursor-pointer" onClick={() => setView('customer')}>
          <span className="text-primary-gold font-display text-xl sm:text-2xl tracking-wider leading-none">
            GANESH RESTAURANT
          </span>
          <span className="text-gray-400 text-[10px] sm:text-xs font-sans tracking-widest mt-1">
            FAMILY RESTAURANT & DHABA • PONDURU
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-8">
          <button onClick={() => setView('customer')} className="text-white hover:text-primary-gold transition-colors font-medium text-sm uppercase tracking-widest">Home</button>
          <a href="#menu" className="text-white hover:text-primary-gold transition-colors font-medium text-sm uppercase tracking-widest">Menu</a>
          {user && (
            <button 
              onClick={() => setView('orders')} 
              className={cn(
                "transition-colors font-medium text-sm uppercase tracking-widest flex items-center gap-2",
                activeOrder ? "text-primary-gold animate-pulse" : "text-white hover:text-primary-gold"
              )}
            >
              {activeOrder && <div className="w-2 h-2 bg-primary-gold rounded-full" />}
              My Orders
            </button>
          )}
        
        {user ? (
          <div className="flex items-center gap-4">
            {(userProfile?.role === 'admin' || userProfile?.role === 'kitchen') && (
              <button 
                onClick={() => setView('kitchen')}
                className="text-white hover:text-primary-gold flex items-center gap-2"
              >
                <ChefHat size={20} /> Kitchen
              </button>
            )}
            {(userProfile?.role === 'admin' || userProfile?.role === 'staff') && (
              <button 
                onClick={() => setView('pos')}
                className="text-white hover:text-primary-gold flex items-center gap-2"
              >
                <CreditCard size={20} /> POS
              </button>
            )}
            {userProfile?.role === 'admin' && (
              <button 
                onClick={() => setView('admin')}
                className="text-white hover:text-primary-gold flex items-center gap-2"
              >
                <LayoutDashboard size={20} /> Admin
              </button>
            )}
            <div className="flex items-center gap-3 px-4 py-1.5 bg-white/10 rounded-full border border-white/20">
              <button 
                onClick={() => setView('profile')}
                className="text-white text-sm font-bold hover:text-primary-gold transition-colors flex items-center gap-2"
              >
                <User size={16} className="text-primary-gold" />
                {userProfile?.displayName || user.email?.split('@')[0]}
              </button>
              <div className="w-px h-4 bg-white/20" />
              <button 
                onClick={() => {
                  signOut(auth);
                  if (setCart) setCart([]);
                  setView('customer');
                }}
                className="text-deep-red hover:text-white transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter"
                title="Sign Out"
              >
                <LogOut size={16} />
                LOGOUT
              </button>
            </div>
          </div>
        ) : (
          <button 
            onClick={() => setView('login')}
            className="text-gray-400 hover:text-primary-gold flex items-center gap-2 font-medium"
          >
            <User size={20} /> Sign In
          </button>
        )}

        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 text-white hover:text-primary-gold transition-colors"
        >
          <ShoppingCart size={24} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-deep-red text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-bg">
              {cartCount}
            </span>
          )}
        </button>

        <a 
          href="tel:+918106964427" 
          className="bg-primary-gold text-black px-6 py-2 rounded-full font-bold flex items-center gap-2 hover:bg-opacity-90 transition-all transform hover:scale-105"
        >
          <Phone size={18} />
          81069 64427
        </a>
      </div>

      {/* Mobile Toggle */}
      <div className="flex items-center gap-4 md:hidden">
        <button 
          onClick={() => setIsCartOpen(true)}
          className="relative p-2 text-primary-gold"
        >
          <ShoppingCart size={24} />
          {cartCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-deep-red text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-dark-bg">
              {cartCount}
            </span>
          )}
        </button>
        <button 
          className="text-primary-gold p-2"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={28} /> : <MenuIcon size={28} />}
        </button>
      </div>
    </div>
  </nav>
);
};

// --- MAIN APP ---

import { KitchenView } from './components/KitchenView';
import { TableBookingForm } from './components/TableBookingForm';
import { UserProfilePage } from './components/UserProfilePage';

export default function App() {
  const [view, setView] = useState<'customer' | 'kitchen' | 'pos' | 'admin' | 'login' | 'orders' | 'profile'>('customer');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Menu State
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Orders State
  const [orders, setOrders] = useState<Order[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  const trackAdView = async (adId: string) => {
    try {
      await updateDoc(doc(db, 'advertisements', adId), {
        views: increment(1)
      });
    } catch (e) {
      console.error("Failed to track ad view:", e);
    }
  };

  const trackAdClick = async (adId: string) => {
    try {
      await updateDoc(doc(db, 'advertisements', adId), {
        clicks: increment(1)
      });
    } catch (e) {
      console.error("Failed to track ad click:", e);
    }
  };

  useEffect(() => {
    if (user) {
      console.log("App: Auth state changed. User:", user.email, "Verified:", user.emailVerified);
    } else {
      console.log("App: Auth state changed. No user.");
    }
  }, [user]);

  useEffect(() => {
    if (userProfile) {
      console.log("App: User profile loaded:", userProfile.role);
    }
  }, [userProfile]);

  useEffect(() => {
    if (!user) {
      setOrders([]);
      return;
    }

    let q;
    const isStaff = (userProfile && ['admin', 'staff', 'kitchen'].includes(userProfile.role)) || 
                    (user?.email === 'hv81764@gmail.com');

    if (isStaff) {
      // Staff can see all orders
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      // Customers can only see their own orders
      q = query(
        collection(db, 'orders'), 
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Order));
    }, (error) => {
      // Only log if it's not a permission error during initial load/logout
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'orders');
      }
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'advertisements'), (snapshot) => {
      const allAds = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Advertisement);
      console.log("App: Advertisements snapshot received. Total:", allAds.length);
      // Sort by createdAt desc in memory to avoid index issues
      const sortedAds = allAds.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });
      const activeAds = sortedAds.filter(ad => ad.active);
      console.log("App: Active advertisements:", activeAds.length);
      setAdvertisements(activeAds);
    }, (error) => {
      console.error("App: Advertisements listener error:", error);
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'advertisements');
      }
    });
    return () => unsubscribe();
  }, []);
  
  useEffect(() => {
    if (isCartOpen || isBookingOpen || isCheckoutOpen || isMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isCartOpen, isBookingOpen, isCheckoutOpen, isMenuOpen]);

  // Cart State
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'processing' | 'success'>('idle');
  
  // Checkout Form State
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phone: '',
    address: '',
    instructions: '',
    orderType: 'delivery' as OrderType,
    paymentMethod: 'cash' as PaymentMethod
  });

  // Auto-fill customer info if logged in
  useEffect(() => {
    if (userProfile) {
      setCustomerInfo(prev => ({
        ...prev,
        name: userProfile.displayName || prev.name,
      }));
    }
  }, [userProfile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const userRef = doc(db, 'users', u.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUserProfile(userSnap.data() as UserProfile);
          } else {
            // Create default profile for first time login
            const profile = {
              uid: u.uid,
              email: u.email || '',
              role: u.email === 'hv81764@gmail.com' ? 'admin' : 'customer',
              displayName: u.displayName || ''
            };
            await setDoc(userRef, profile);
            setUserProfile(profile as UserProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${u.uid}`);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Categories and Menu Items
  useEffect(() => {
    setIsLoadingMenu(true);
    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('order')), (snap) => {
      const cats = snap.docs.map(d => ({ id: d.id, ...d.data() })) as MenuCategory[];
      setCategories(cats);
      if (cats.length > 0 && !activeCategoryId) {
        setActiveCategoryId(cats[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'categories');
    });

    const unsubItems = onSnapshot(collection(db, 'menuItems'), (snap) => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() })) as MenuItem[];
      setMenuItems(items);
      setIsLoadingMenu(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'menuItems');
      setIsLoadingMenu(false);
    });

    return () => {
      unsubCats();
      unsubItems();
    };
  }, []);

  useEffect(() => {
    if (!userProfile) {
      setOrders([]);
      return;
    }

    const isStaff = ['admin', 'staff', 'kitchen'].includes(userProfile.role);
    let q;

    if (isStaff) {
      q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    } else {
      // For customers, only fetch their own orders
      // Note: We don't use orderBy here to avoid needing a composite index for now
      q = query(collection(db, 'orders'), where('userId', '==', userProfile.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      let ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];

      if (!isStaff) {
        // Sort in memory for customers
        ordersData.sort((a, b) => {
          const dateA = a.createdAt?.toMillis?.() || 0;
          const dateB = b.createdAt?.toMillis?.() || 0;
          return dateB - dateA;
        });
      }

      setOrders(ordersData);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'orders');
    });
    return () => unsubscribe();
  }, [userProfile]);

  // Seed Menu if empty or missing categories
  useEffect(() => {
    const seed = async () => {
      if (userProfile?.role !== 'admin') return;
      
      try {
        const catsSnap = await getDocs(collection(db, 'categories'));
        const existingCats = catsSnap.docs.map(d => d.data().name);
        
        let order = catsSnap.size;
        for (const [key, catData] of Object.entries(INITIAL_MENU_DATA)) {
          if (!existingCats.includes(catData.title)) {
            console.log(`Seeding missing category: ${catData.title}`);
            const catRef = await addDoc(collection(db, 'categories'), {
              name: catData.title,
              icon: catData.icon,
              order: order++
            });
            
            for (const section of catData.sections) {
              for (const item of section.items) {
                await addDoc(collection(db, 'menuItems'), {
                  name: item.name,
                  price: item.price,
                  categoryId: catRef.id,
                  available: true,
                  isSpecial: (section as any).isSpecial || false,
                  description: ''
                });
              }
            }
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, 'menu/seed');
      }
    };
    seed();
  }, [userProfile]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const addToCart = (item: { id: string; name: string; price: number; categoryId: string }) => {
    if (!user) {
      setView('login');
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = Math.max(1, i.quantity + delta);
        return { ...i, quantity: newQty };
      }
      return i;
    }));
  };

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const handleCheckout = async (e: FormEvent) => {
    e.preventDefault();
    setOrderStatus('processing');
    
    try {
      const orderData: any = {
        customerName: customerInfo.name,
        phone: customerInfo.phone,
        address: customerInfo.orderType === 'pickup' ? 'PICKUP' : customerInfo.address,
        items: cart,
        totalAmount: cartTotal,
        status: 'pending',
        orderType: customerInfo.orderType,
        paymentStatus: 'pending',
        paymentMethod: customerInfo.paymentMethod,
        createdAt: serverTimestamp(),
        instructions: customerInfo.instructions
      };

      if (user?.uid) {
        orderData.userId = user.uid;
      }

      console.log('Attempting to create order with data:', orderData);
      await addDoc(collection(db, 'orders'), orderData);

      setOrderStatus('success');
      setCart([]);
      setTimeout(() => {
        setOrderStatus('idle');
        setIsCheckoutOpen(false);
        setIsCartOpen(false);
      }, 3000);
    } catch (error) {
      setOrderStatus('idle');
      handleFirestoreError(error, OperationType.CREATE, 'orders');
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: PaymentStatus) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { paymentStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  if (view === 'login') return <Login setView={setView} />;
  if (view === 'orders') return (
    <>
      <Navbar scrolled={true} cartCount={cartCount} setIsCartOpen={setIsCartOpen} setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} user={user} setView={setView} userProfile={userProfile} orders={orders} />
      <OrderHistory orders={orders} userId={user?.uid || ''} />
    </>
  );

  if (view === 'kitchen') return (
    <>
      <Navbar scrolled={true} cartCount={cartCount} setIsCartOpen={setIsCartOpen} setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} user={user} setView={setView} userProfile={userProfile} setCart={setCart} orders={orders} />
      <KitchenDashboard orders={orders} updateOrderStatus={updateOrderStatus} />
    </>
  );
  if (view === 'pos') return (
    <>
      <Navbar scrolled={true} cartCount={cartCount} setIsCartOpen={setIsCartOpen} setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} user={user} setView={setView} userProfile={userProfile} setCart={setCart} orders={orders} />
      <POSDashboard orders={orders} updateOrderStatus={updateOrderStatus} updatePaymentStatus={updatePaymentStatus} />
    </>
  );
  if (view === 'admin') return (
    <>
      <Navbar scrolled={true} cartCount={cartCount} setIsCartOpen={setIsCartOpen} setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} user={user} setView={setView} userProfile={userProfile} setCart={setCart} orders={orders} />
      <AdminDashboard categories={categories} menuItems={menuItems} orders={orders} />
    </>
  );

  if (view === 'profile') return (
    <>
      <Navbar scrolled={true} cartCount={cartCount} setIsCartOpen={setIsCartOpen} setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} user={user} setView={setView} userProfile={userProfile} setCart={setCart} orders={orders} />
      <UserProfilePage userProfile={userProfile} onUpdate={setUserProfile} />
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar scrolled={scrolled} cartCount={cartCount} setIsCartOpen={setIsCartOpen} setIsMenuOpen={setIsMenuOpen} isMenuOpen={isMenuOpen} user={user} setView={setView} userProfile={userProfile} setCart={setCart} orders={orders} />

      {/* Live Order Tracker for Customers */}
      {view === 'customer' && user && (
        <LiveOrderTracker 
          orders={orders} 
          onViewOrder={() => setView('orders')} 
        />
      )}

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/90 z-[60] md:hidden backdrop-blur-lg"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 h-full w-full max-w-xs bg-dark-bg z-[70] md:hidden p-8 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <span className="text-primary-gold font-display text-2xl tracking-wider">MENU</span>
                <button onClick={() => setIsMenuOpen(false)} className="text-white p-2">
                  <X size={32} />
                </button>
              </div>

              <div className="flex flex-col space-y-8">
                <button 
                  onClick={() => {setView('customer'); setIsMenuOpen(false);}} 
                  className="text-3xl font-display text-white hover:text-primary-gold transition-colors text-left"
                >
                  Home
                </button>
                {user && (
                  <button 
                    onClick={() => {setView('orders'); setIsMenuOpen(false);}} 
                    className={cn(
                      "text-3xl font-display transition-colors text-left flex items-center gap-3",
                      orders.some(o => ['pending', 'preparing', 'ready'].includes(o.status)) 
                        ? "text-primary-gold" 
                        : "text-white hover:text-primary-gold"
                    )}
                  >
                    My Orders
                    {orders.some(o => ['pending', 'preparing', 'ready'].includes(o.status)) && (
                      <span className="w-3 h-3 bg-primary-gold rounded-full animate-pulse" />
                    )}
                  </button>
                )}
                <a 
                  href="#menu" 
                  onClick={() => setIsMenuOpen(false)} 
                  className="text-3xl font-display text-white hover:text-primary-gold transition-colors"
                >
                  Menu
                </a>
                
                {user ? (
                  <>
                    <button 
                      onClick={() => {setView('profile'); setIsMenuOpen(false);}}
                      className="text-3xl font-display text-white hover:text-primary-gold flex items-center gap-4"
                    >
                      <User size={28} /> My Profile
                    </button>
                    {(userProfile?.role === 'admin' || userProfile?.role === 'kitchen') && (
                      <button 
                        onClick={() => {setView('kitchen'); setIsMenuOpen(false);}}
                        className="text-3xl font-display text-white hover:text-primary-gold flex items-center gap-4"
                      >
                        <ChefHat size={28} /> Kitchen (KOT)
                      </button>
                    )}
                    {(userProfile?.role === 'admin' || userProfile?.role === 'staff') && (
                      <button 
                        onClick={() => {setView('pos'); setIsMenuOpen(false);}}
                        className="text-3xl font-display text-white hover:text-primary-gold flex items-center gap-4"
                      >
                        <CreditCard size={28} /> POS
                      </button>
                    )}
                    {userProfile?.role === 'admin' && (
                      <button 
                        onClick={() => {setView('admin'); setIsMenuOpen(false);}}
                        className="text-3xl font-display text-white hover:text-primary-gold flex items-center gap-4"
                      >
                        <LayoutDashboard size={28} /> Admin
                      </button>
                    )}
                    <button 
                      onClick={() => {setIsBookingOpen(true); setIsMenuOpen(false);}}
                      className="text-3xl font-display text-white hover:text-primary-gold flex items-center gap-4"
                    >
                      <Calendar size={28} /> Book a Table
                    </button>
                    <div className="pt-8 border-t border-white/10">
                      <p className="text-gray-400 text-sm mb-2">Logged in as</p>
                      <p className="text-white font-bold mb-4">{userProfile?.displayName || user.email}</p>
                      <button 
                        onClick={() => {
                          signOut(auth);
                          if (setCart) setCart([]);
                          setIsMenuOpen(false);
                          setView('customer');
                        }}
                        className="text-deep-red flex items-center gap-2 font-bold text-xl"
                      >
                        <LogOut size={24} /> Logout
                      </button>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => {setView('login'); setIsMenuOpen(false);}}
                    className="text-3xl font-display text-primary-gold flex items-center gap-4"
                  >
                    <User size={28} /> Sign In
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Table Booking Modal */}
      <AnimatePresence>
        {isBookingOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBookingOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl"
            >
              <TableBookingForm user={userProfile} onClose={() => setIsBookingOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section id="home" className="relative h-[85vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=1920&q=80" 
            alt="Delicious Indian Food" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-black/70"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center px-4"
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl text-primary-gold mb-4 drop-shadow-2xl">
            GANESH FAMILY RESTAURANT
          </h1>
          <p className="text-white text-lg sm:text-xl md:text-2xl font-light tracking-wide mb-8">
            Near System Degree College, Ponduru
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a 
              href="#menu" 
              className="w-full sm:w-auto inline-block bg-primary-gold text-black px-10 py-4 rounded-full text-lg font-bold hover:bg-white transition-all transform hover:scale-105 shadow-xl"
            >
              VIEW MENU
            </a>
            <button 
              onClick={() => {
                document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
                if (categories.length > 0) setActiveCategoryId(categories[0].id);
              }}
              className="w-full sm:w-auto inline-block bg-white text-black px-10 py-4 rounded-full text-lg font-bold hover:bg-primary-gold transition-all transform hover:scale-105 shadow-xl"
            >
              ORDER ONLINE
            </button>
          </div>
        </motion.div>
      </section>

      {/* Advertisements Section */}
      {advertisements.length > 0 && (
        <section className="bg-white py-12 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-2xl font-display text-dark-bg">Local <span className="text-primary-gold">Promotions</span></h2>
              <div className="flex-1 h-[1px] bg-gray-100"></div>
              <span className="text-[10px] font-mono text-gray-400">Ads: {advertisements.length}</span>
            </div>
            <div className="flex gap-6 overflow-x-auto pb-8 snap-x">
              {advertisements.map((ad) => (
                <motion.div 
                  key={ad.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  onViewportEnter={() => trackAdView(ad.id)}
                  viewport={{ once: true }}
                  onClick={() => trackAdClick(ad.id)}
                  className="flex-shrink-0 w-[300px] sm:w-[450px] rounded-3xl overflow-hidden shadow-xl snap-center relative group cursor-pointer"
                >
                  <div className="aspect-video relative">
                    {ad.type === 'video' ? (
                      <video 
                        src={ad.url} 
                        className="w-full h-full object-cover" 
                        autoPlay 
                        muted 
                        loop 
                        playsInline 
                      />
                    ) : (
                      <img 
                        src={ad.url} 
                        alt={ad.title} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    )}
                    
                    {/* Overlay Info */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col justify-end p-6">
                      <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        {ad.businessName && (
                          <span className="inline-block px-3 py-1 bg-primary-gold text-black text-[10px] font-black uppercase tracking-widest rounded-full mb-2">
                            {ad.businessName}
                          </span>
                        )}
                        <h3 className="text-white font-display text-xl mb-1">{ad.title}</h3>
                        {ad.description && (
                          <p className="text-gray-300 text-sm line-clamp-2 mb-3">{ad.description}</p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          {ad.phone && (
                            <a 
                              href={`tel:${ad.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 text-primary-gold font-bold text-sm hover:underline"
                            >
                              <Phone size={14} />
                              {ad.phone}
                            </a>
                          )}
                          {ad.location && (
                            <div className="flex items-center gap-1 text-gray-400 text-xs">
                              <MapPin size={12} />
                              {ad.location}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Simple Title Overlay (Visible by default) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent group-hover:opacity-0 transition-opacity">
                      <h3 className="text-white font-bold text-lg">{ad.title}</h3>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Menu Section */}
      <section id="menu" className="relative z-10 -mt-20 bg-white rounded-t-[40px] sm:rounded-t-[60px] shadow-2xl pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-24">
          <div className="text-center mb-12">
            <h2 className="text-4xl sm:text-5xl mb-4">
              Restaurant <span className="text-deep-red">Menu</span>
            </h2>
            <div className="w-20 h-1 bg-primary-gold mx-auto rounded-full"></div>
            <p className="mt-4 text-gray-500">Select items to add to your cart and order online</p>
          </div>

          {/* Search and Filters */}
          <div className="max-w-2xl mx-auto mb-12 space-y-6">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-gold transition-colors" size={20} />
              <input 
                type="text"
                placeholder="Search for biryani, starters, fried rice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-200 focus:border-primary-gold focus:ring-4 focus:ring-primary-gold/10 outline-none transition-all text-lg shadow-sm"
              />
            </div>
            
            <div className="flex flex-wrap justify-center gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setActiveCategoryId(cat.id);
                    setSearchTerm('');
                  }}
                  className={cn(
                    "px-6 py-3 rounded-full font-bold transition-all flex items-center gap-2",
                    activeCategoryId === cat.id && !searchTerm
                      ? "bg-dark-bg text-primary-gold shadow-lg scale-105" 
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  )}
                >
                  {cat.icon === 'Drumstick' && <Drumstick size={24} />}
                  {cat.icon === 'Flame' && <Flame size={24} />}
                  {cat.icon === 'MenuIcon' && <MenuIcon size={24} />}
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Content */}
          <AnimatePresence>
            {isLoadingMenu ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="bg-cream-bg border border-gray-100 p-6 sm:p-8 rounded-2xl space-y-4">
                    {[1, 2, 3].map(j => (
                      <div key={j} className="flex justify-between items-center border-b border-dashed border-gray-300 pb-3">
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-1/2" />
                          <Skeleton className="h-5 w-1/4" />
                        </div>
                        <Skeleton className="h-10 w-10 rounded-full ml-4" />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                key={activeCategoryId + searchTerm}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12"
              >
                {(searchTerm 
                  ? menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  : menuItems.filter(item => item.categoryId === activeCategoryId)
                ).length > 0 ? (
                  <div className="bg-cream-bg border border-gray-100 p-6 sm:p-8 rounded-2xl md:col-span-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
                      {(searchTerm 
                        ? menuItems.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
                        : menuItems.filter(item => item.categoryId === activeCategoryId)
                      ).map((item, iIdx) => (
                          <div key={iIdx} className="flex justify-between items-center border-b border-dashed border-gray-300 pb-3 group">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg group-hover:text-deep-red transition-colors font-medium">{item.name}</span>
                                {item.isSpecial && <Crown size={14} className="text-primary-gold" />}
                              </div>
                              {item.description && (
                                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 max-w-md">
                                  {item.description}
                                </p>
                              )}
                              <span className="text-deep-red font-bold text-lg">₹{item.price}</span>
                            </div>
                            <button 
                              onClick={() => addToCart(item)}
                              disabled={!item.available}
                              className={cn(
                                "ml-4 px-3 py-2 rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-md flex items-center gap-2",
                                item.available 
                                  ? "bg-primary-gold text-black hover:bg-dark-bg hover:text-primary-gold" 
                                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
                              )}
                              title={!user ? "Sign in to order" : item.available ? "Add to cart" : "Sold Out"}
                            >
                              {!user ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider">Sign in to Order</span>
                              ) : item.available ? (
                                <Plus size={20} />
                              ) : (
                                <X size={20} />
                              )}
                            </button>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="col-span-2 text-center py-12 text-gray-400">
                    No items in this category yet.
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-16 bg-[#fff9db] border border-[#ffeeba] p-8 rounded-2xl flex flex-col items-center text-center max-w-3xl mx-auto">
            <Clock className="text-primary-gold mb-4" size={40} />
            <p className="text-gray-600 italic leading-relaxed text-lg">
              "We request our customers to please wait for <span className="text-deep-red font-semibold">5-10 minutes</span> to experience the delicious, freshly prepared food."
            </p>
          </div>
        </div>
      </section>

      {/* Cart Sidebar */}
      <AnimatePresence>
        {isCartOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-white z-[70] shadow-2xl flex flex-col"
            >
              <div className="p-6 bg-dark-bg text-white flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="text-primary-gold" />
                  <h2 className="text-2xl font-display tracking-wider">Your Cart</h2>
                </div>
                <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {user && !userProfile ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                    <Loader size={40} />
                    <p className="text-gray-500 font-medium">Syncing your profile...</p>
                  </div>
                ) : cart.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <ShoppingCart size={64} className="text-gray-300" />
                    <p className="text-xl font-medium">Your cart is empty</p>
                    <button 
                      onClick={() => setIsCartOpen(false)}
                      className="text-primary-gold font-bold hover:underline"
                    >
                      Browse our menu
                    </button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="flex gap-4 items-center bg-gray-50 p-4 rounded-xl">
                      <div className="flex-1">
                        <h4 className="font-bold text-lg">{item.name}</h4>
                        <p className="text-deep-red font-bold">₹{item.price}</p>
                      </div>
                      <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-full px-3 py-1">
                        <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-500 hover:text-deep-red">
                          <Minus size={16} />
                        </button>
                        <span className="font-bold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-500 hover:text-primary-gold">
                          <Plus size={16} />
                        </button>
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-gray-400 hover:text-deep-red transition-colors"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Smart Suggestions */}
              {cart.length > 0 && (
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-3 tracking-wider flex items-center gap-2">
                    <Flame size={12} className="text-orange-500" /> You might also like
                  </p>
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {menuItems
                      .filter(item => 
                        item.available && 
                        !cart.find(c => c.id === item.id) &&
                        (
                          // Suggest drinks if they have food
                          (item.categoryId === categories.find(c => c.name.toLowerCase().includes('drink'))?.id) ||
                          // Suggest starters if they have main course
                          (item.categoryId === categories.find(c => c.name.toLowerCase().includes('starter'))?.id && 
                           cart.some(c => categories.find(cat => cat.id === c.categoryId)?.name.toLowerCase().includes('biryani'))) ||
                          // Suggest specials
                          item.isSpecial
                        )
                      )
                      .slice(0, 4)
                      .map((item) => (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="flex-shrink-0 bg-white p-3 rounded-xl border border-gray-200 hover:border-primary-gold transition-all shadow-sm group"
                        >
                          <p className="text-[10px] font-bold text-dark-bg group-hover:text-deep-red transition-colors truncate max-w-[100px]">{item.name}</p>
                          <p className="text-[10px] text-deep-red font-bold">₹{item.price}</p>
                        </button>
                      ))}
                  </div>
                </div>
              )}

              {cart.length > 0 && (
                <div className="p-6 border-t border-gray-100 bg-gray-50 space-y-4">
                  <div className="flex justify-between items-center text-xl font-bold">
                    <span>Total Amount</span>
                    <span className="text-deep-red">₹{cartTotal}</span>
                  </div>
                  <button 
                    onClick={() => setIsCheckoutOpen(true)}
                    className="w-full bg-dark-bg text-primary-gold py-4 rounded-xl font-bold text-lg hover:bg-primary-gold hover:text-black transition-all shadow-lg"
                  >
                    PROCEED TO CHECKOUT
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Checkout Modal */}
      <AnimatePresence>
        {isCheckoutOpen && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !orderStatus.includes('processing') && setIsCheckoutOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-white w-full max-w-xl rounded-3xl overflow-y-auto max-h-[90vh] shadow-2xl"
            >
              {orderStatus === 'success' ? (
                <div className="p-12 text-center space-y-6">
                  <motion.div 
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto"
                  >
                    <CheckCircle size={64} />
                  </motion.div>
                  <h2 className="text-3xl font-display">Order Placed!</h2>
                  <p className="text-gray-600 text-lg">
                    Thank you for ordering from Ganesh Restaurant. Your food will be ready in 15-20 minutes.
                  </p>
                  <div className="bg-cream-bg p-4 rounded-xl border border-primary-gold/20">
                    <p className="text-sm text-gray-500 uppercase tracking-widest mb-1">Order ID</p>
                    <p className="font-mono font-bold text-xl">#GR-{Math.floor(Math.random() * 10000)}</p>
                  </div>
                  <button 
                    onClick={() => {
                      setIsCheckoutOpen(false);
                      setIsCartOpen(false);
                      setCart([]);
                      setOrderStatus('idle');
                      setView('customer');
                    }}
                    className="w-full bg-dark-bg text-primary-gold py-4 rounded-xl font-bold text-lg hover:bg-primary-gold hover:text-black transition-all"
                  >
                    BACK TO HOME
                  </button>
                </div>
              ) : (
                <div className="p-8 sm:p-10">
                  <div className="flex justify-between items-center mb-8">
                    <h2 className="text-3xl font-display">Checkout</h2>
                    <button 
                      onClick={() => setIsCheckoutOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <form onSubmit={handleCheckout} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Full Name</label>
                        <input 
                          required
                          type="text"
                          value={customerInfo.name}
                          onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/20 outline-none transition-all"
                          placeholder="Enter your name"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Phone Number</label>
                        <input 
                          required
                          type="tel"
                          value={customerInfo.phone}
                          onChange={e => setCustomerInfo({...customerInfo, phone: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/20 outline-none transition-all"
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Order Type</label>
                      <div className="grid grid-cols-2 gap-4">
                        {(['delivery', 'pickup'] as OrderType[]).map((type) => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setCustomerInfo({ ...customerInfo, orderType: type })}
                            className={cn(
                              "py-3 rounded-xl border-2 font-bold transition-all capitalize flex items-center justify-center gap-2",
                              customerInfo.orderType === type
                                ? "border-primary-gold bg-primary-gold/10 text-dark-bg"
                                : "border-gray-100 text-gray-400 hover:border-gray-200"
                            )}
                          >
                            {type === 'delivery' ? <MapPin size={18} /> : <ShoppingBag size={18} />}
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>

                    {customerInfo.orderType === 'delivery' && (
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Delivery Address</label>
                        <textarea 
                          required
                          value={customerInfo.address}
                          onChange={e => setCustomerInfo({...customerInfo, address: e.target.value})}
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/20 outline-none transition-all h-24 resize-none"
                          placeholder="Enter full address"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Special Instructions (Optional)</label>
                      <input 
                        type="text"
                        value={customerInfo.instructions}
                        onChange={e => setCustomerInfo({...customerInfo, instructions: e.target.value})}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary-gold focus:ring-2 focus:ring-primary-gold/20 outline-none transition-all"
                        placeholder="e.g. Make it extra spicy"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-500 uppercase tracking-wider">Payment Method</label>
                      <div className="grid grid-cols-3 gap-4">
                        {(['cash', 'upi', 'card'] as PaymentMethod[]).map((method) => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setCustomerInfo({ ...customerInfo, paymentMethod: method })}
                            className={cn(
                              "py-3 rounded-xl border-2 font-bold transition-all capitalize",
                              customerInfo.paymentMethod === method
                                ? "border-primary-gold bg-primary-gold/10 text-dark-bg"
                                : "border-gray-100 text-gray-400 hover:border-gray-200"
                            )}
                          >
                            {method}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                      <div className="flex justify-between items-center mb-6">
                        <span className="text-gray-500">Order Total</span>
                        <span className="text-2xl font-bold text-deep-red">₹{cartTotal}</span>
                      </div>
                      <button 
                        disabled={orderStatus === 'processing'}
                        type="submit"
                        className="w-full bg-dark-bg text-primary-gold py-4 rounded-xl font-bold text-lg hover:bg-primary-gold hover:text-black transition-all shadow-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {orderStatus === 'processing' ? (
                          <>
                            <Loader size={24} />
                            PROCESSING ORDER...
                          </>
                        ) : (
                          <>
                            <CheckCircle size={20} />
                            PLACE ORDER NOW (₹{cartTotal})
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Location Section */}
      <section id="location" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-dark-bg text-white p-10 sm:p-14 rounded-[30px] shadow-2xl relative overflow-hidden"
              >
                <div className="absolute -right-10 -bottom-10 opacity-5">
                  <MapPin size={200} />
                </div>
                
                <h2 className="text-4xl text-primary-gold mb-8">Visit Us</h2>
                
                <div className="space-y-8 relative z-10">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary-gold/20 p-3 rounded-lg text-primary-gold">
                      <MapPin size={24} />
                    </div>
                    <div>
                      <h4 className="text-gray-400 text-sm uppercase tracking-widest mb-1">Location</h4>
                      <p className="text-lg">Near System Degree College, Main Road, Ponduru, AP</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="bg-primary-gold/20 p-3 rounded-lg text-primary-gold">
                      <Phone size={24} />
                    </div>
                    <div>
                      <h4 className="text-gray-400 text-sm uppercase tracking-widest mb-1">Contact</h4>
                      <p className="text-lg">+91 81069 64427</p>
                    </div>
                  </div>

                  <div className="pt-6">
                    <a 
                      href="https://maps.app.goo.gl/smR1PGB7T9P6puat6" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-full bg-primary-gold text-black py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white transition-all group"
                    >
                      GET DIRECTIONS
                      <ExternalLink size={18} className="group-hover:translate-x-1 transition-transform" />
                    </a>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="lg:col-span-7 h-[450px] sm:h-[550px]">
              <div className="w-full h-full rounded-[30px] overflow-hidden border-8 border-white shadow-2xl">
                <iframe 
                  title="Ganesh Restaurant Location"
                  width="100%" 
                  height="100%" 
                  frameBorder="0" 
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d15147.23456789!2d83.7543!3d18.3639!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3a3c10323984f861%3A0x6b3068e2f89b9d88!2sPonduru%2C%20Andhra%20Pradesh!5e0!3m2!1sen!2sin!4v1712345678901" 
                  allowFullScreen
                  loading="lazy"
                ></iframe>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#0a0704] text-gray-400 py-12 border-t border-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="mb-8">
            <span className="text-primary-gold font-display text-2xl tracking-widest">GANESH RESTAURANT</span>
            <p className="mt-2 text-sm">Quality Food • Family Atmosphere • Authentic Taste</p>
          </div>
          <div className="flex justify-center space-x-6 mb-8">
            <a href="#" className="hover:text-primary-gold transition-colors">Home</a>
            <a href="#menu" className="hover:text-primary-gold transition-colors">Menu</a>
            <a href="#location" className="hover:text-primary-gold transition-colors">Location</a>
          </div>
          <p className="text-xs">
            &copy; {new Date().getFullYear()} Ganesh Family Restaurant & Dhaba • Ponduru. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
