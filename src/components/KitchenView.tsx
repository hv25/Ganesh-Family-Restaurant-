import React from 'react';
import { ChefHat, Clock, CheckCircle, Flame } from 'lucide-react';
import { Order } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface KitchenViewProps {
  orders: Order[];
}

export const KitchenView: React.FC<KitchenViewProps> = ({ orders }) => {
  const activeOrders = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return aTime - bTime;
    });

  const updateStatus = async (orderId: string, status: Order['status']) => {
    try {
      await updateDoc(doc(db, 'orders', orderId), { status });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display flex items-center gap-3 text-primary-gold">
            <ChefHat size={32} />
            Kitchen Display System (KOT)
          </h1>
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span>New Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full" />
              <span>Preparing</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {activeOrders.map((order) => (
            <div 
              key={order.id} 
              className={cn(
                "bg-gray-800 rounded-2xl overflow-hidden border-t-4 shadow-2xl transition-all",
                order.status === 'pending' ? "border-red-500" : 
                order.status === 'preparing' ? "border-orange-500" : "border-green-500"
              )}
            >
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white">#{order.id.slice(-4).toUpperCase()}</h3>
                    <p className="text-gray-400 text-sm flex items-center gap-1">
                      <Clock size={14} />
                      {order.createdAt?.toDate?.().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                    order.status === 'pending' ? "bg-red-500/20 text-red-400" : 
                    order.status === 'preparing' ? "bg-orange-500/20 text-orange-400" : "bg-green-500/20 text-green-400"
                  )}>
                    {order.status}
                  </span>
                </div>

                <div className="space-y-3 mb-6">
                  {order.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-start border-b border-gray-700 pb-2">
                      <div>
                        <p className="font-bold text-lg">
                          <span className="text-primary-gold mr-2">{item.quantity}x</span>
                          {item.name}
                        </p>
                        {item.instructions && (
                          <p className="text-xs text-orange-300 italic mt-1">
                            Note: {item.instructions}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.instructions && (
                  <div className="bg-gray-700/50 p-3 rounded-lg mb-6 border-l-2 border-primary-gold">
                    <p className="text-xs text-gray-300 font-bold uppercase mb-1">Order Instructions</p>
                    <p className="text-sm text-white">{order.instructions}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  {order.status === 'pending' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'preparing')}
                      className="flex-1 bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <Flame size={18} /> Start Cooking
                    </button>
                  )}
                  {order.status === 'preparing' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'ready')}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle size={18} /> Mark Ready
                    </button>
                  )}
                  {order.status === 'ready' && (
                    <button 
                      onClick={() => updateStatus(order.id, 'completed')}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                    >
                      <CheckCircle size={18} /> Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {activeOrders.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500">
              <ChefHat size={64} className="mx-auto mb-4 opacity-20" />
              <p className="text-xl">No active orders in the kitchen.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
