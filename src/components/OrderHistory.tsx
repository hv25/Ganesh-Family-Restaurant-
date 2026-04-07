import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Clock, CheckCircle, XCircle, MapPin, Star, ShoppingBag, ChevronRight } from 'lucide-react';
import { Order, Review } from '../types';
import { format } from 'date-fns';
import { collection, addDoc, serverTimestamp, query, where, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { OrderDetails } from './OrderDetails';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OrderHistoryProps {
  orders: Order[];
  userId: string;
}

export const OrderHistory: React.FC<OrderHistoryProps> = ({ orders, userId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [ratingOrder, setRatingOrder] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(query(collection(db, 'reviews'), where('userId', '==', userId)), (snapshot) => {
      setReviews(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Review));
    });
    return () => unsubscribe();
  }, [userId]);

  const handleSubmitReview = async (order: Order) => {
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'reviews'), {
        orderId: order.id,
        userId: userId,
        customerName: order.customerName,
        rating,
        comment,
        createdAt: serverTimestamp(),
      });
      setRatingOrder(null);
      setRating(5);
      setComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'reviews');
    } finally {
      setIsSubmitting(false);
    }
  };

  const userOrders = orders
    .filter(o => o.userId === userId)
    .sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

  return (
    <>
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-primary-gold rounded-2xl flex items-center justify-center shadow-lg">
            <Package className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-display">My Orders</h1>
            <p className="text-gray-500">Track and view your past orders</p>
          </div>
        </div>

        <div className="space-y-6">
          {userOrders.length > 0 ? (
            userOrders.map((order) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-all group"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      order.status === 'completed' ? "bg-green-100 text-green-600" :
                      order.status === 'cancelled' ? "bg-red-100 text-red-600" :
                      ['pending', 'preparing', 'ready'].includes(order.status) ? "bg-primary-gold/20 text-primary-gold animate-pulse" :
                      "bg-blue-100 text-blue-600"
                    )}>
                      {order.status === 'completed' ? <CheckCircle size={20} /> :
                       order.status === 'cancelled' ? <XCircle size={20} /> :
                       ['pending', 'preparing', 'ready'].includes(order.status) ? <Package size={20} /> :
                       <Clock size={20} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Order #{order.id.slice(-6).toUpperCase()}</p>
                        {['pending', 'preparing', 'ready'].includes(order.status) && (
                          <span className="bg-primary-gold text-black text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">LIVE</span>
                        )}
                      </div>
                      <p className="font-bold capitalize">{order.status}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM dd, yyyy') : 'Just now'}
                      </p>
                      <p className="text-xl font-bold text-deep-red">₹{order.totalAmount}</p>
                    </div>
                    <ChevronRight className="text-gray-300 group-hover:text-primary-gold transition-colors" size={20} />
                  </div>
                </div>

                <div className="space-y-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start gap-3 text-sm text-gray-600">
                    <MapPin size={18} className="text-gray-400 mt-0.5 shrink-0" />
                    <p className="line-clamp-1">{order.address}</p>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-4">
                    <p className="text-xs font-bold text-gray-400 uppercase mb-3">Order Items</p>
                    <div className="space-y-2">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            <span className="font-bold text-dark-bg">{item.quantity}x</span> {item.name}
                          </span>
                          <span className="font-medium">₹{item.price * item.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.status === 'completed' && !reviews.find(r => r.orderId === order.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      {ratingOrder === order.id ? (
                        <div className="space-y-4">
                          <p className="text-sm font-bold text-gray-500 uppercase tracking-widest">Rate your experience</p>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button 
                                key={star} 
                                onClick={() => setRating(star)}
                                className={cn(
                                  "p-1 transition-all transform hover:scale-110",
                                  rating >= star ? "text-primary-gold" : "text-gray-200"
                                )}
                              >
                                <Star size={28} fill={rating >= star ? "currentColor" : "none"} />
                              </button>
                            ))}
                          </div>
                          <textarea 
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Tell us about the food and delivery..."
                            className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 focus:ring-2 focus:ring-primary-gold outline-none text-sm"
                            rows={3}
                          />
                          <div className="flex gap-3">
                            <button 
                              onClick={() => setRatingOrder(null)}
                              className="flex-1 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-50 transition-all"
                            >
                              Cancel
                            </button>
                            <button 
                              onClick={() => handleSubmitReview(order)}
                              disabled={isSubmitting}
                              className="flex-1 bg-dark-bg text-primary-gold py-3 rounded-xl font-bold hover:bg-primary-gold hover:text-black transition-all disabled:opacity-50"
                            >
                              {isSubmitting ? 'Submitting...' : 'Submit Review'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setRatingOrder(order.id)}
                          className="w-full py-3 rounded-xl border-2 border-dashed border-gray-200 text-gray-500 font-bold hover:border-primary-gold hover:text-primary-gold transition-all flex items-center justify-center gap-2"
                        >
                          <Star size={18} /> Rate Order
                        </button>
                      )}
                    </div>
                  )}

                  {reviews.find(r => r.orderId === order.id) && (
                    <div className="mt-6 pt-6 border-t border-gray-100">
                      <div className="bg-gray-50 p-4 rounded-2xl">
                        <div className="flex justify-between items-center mb-2">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Your Review</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star 
                                key={star} 
                                size={12} 
                                className={cn(reviews.find(r => r.orderId === order.id)!.rating >= star ? "text-primary-gold" : "text-gray-200")} 
                                fill={reviews.find(r => r.orderId === order.id)!.rating >= star ? "currentColor" : "none"} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-gray-600 italic">"{reviews.find(r => r.orderId === order.id)?.comment}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-20 bg-white rounded-[40px] border-2 border-dashed border-gray-200">
              <Package className="mx-auto text-gray-300 mb-4" size={64} />
              <h3 className="text-xl font-bold text-gray-400">No orders yet</h3>
              <p className="text-gray-500 mt-2">When you place an order, it will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
    <AnimatePresence>
      {selectedOrder && (
        <OrderDetails 
          order={selectedOrder} 
          onClose={() => setSelectedOrder(null)} 
        />
      )}
    </AnimatePresence>
    </>
  );
};
