export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid';
export type PaymentMethod = 'cash' | 'upi' | 'card';
export type UserRole = 'admin' | 'kitchen' | 'staff' | 'customer';

export type OrderType = 'pickup' | 'delivery';

export interface OrderItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  categoryId: string;
  instructions?: string;
}

export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  address: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  orderType: OrderType;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  createdAt: any; // Firestore Timestamp
  tableNumber?: string;
  instructions?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
  phone?: string;
  address?: string;
}

export interface TableBooking {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  createdAt: any;
}

export interface Review {
  id: string;
  orderId: string;
  userId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: any;
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  categoryId: string;
  isSpecial: boolean;
  available: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  icon: string;
  order: number;
}

export interface Advertisement {
  id: string;
  title: string;
  type: 'image' | 'video';
  url: string;
  active: boolean;
  createdAt: any;
}
