import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Clock, ChefHat, CheckCircle, Package, MapPin, ChevronRight, Timer } from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LiveOrderTrackerProps {
  orders: Order[];
  onViewOrder: () => void;
}

export const LiveOrderTracker: React.FC<LiveOrderTrackerProps> = ({ orders, onViewOrder }) => {
  // Find the most recent active order
  const activeOrder = orders
    .filter(o => ['pending', 'preparing', 'ready'].includes(o.status))
    .sort((a, b) => {
      const dateA = a.createdAt?.toMillis?.() || 0;
      const dateB = b.createdAt?.toMillis?.() || 0;
      return dateB - dateA;
    })[0];

  if (!activeOrder) return null;

  const getStatusStep = (status: OrderStatus) => {
    switch (status) {
      case 'pending': return 1;
      case 'preparing': return 2;
      case 'ready': return 3;
      default: return 0;
    }
  };

  const getEstimatedTime = (status: OrderStatus, allOrders: Order[]) => {
    const activeOrdersCount = allOrders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
    const loadFactor = activeOrdersCount * 3; // 3 mins per active order

    switch (status) {
      case 'pending': 
        return `${25 + loadFactor}-${35 + loadFactor} mins`;
      case 'preparing': 
        return `${15 + Math.floor(loadFactor * 0.7)}-${25 + Math.floor(loadFactor * 0.7)} mins`;
      case 'ready': 
        return '10-15 mins';
      default: 
        return 'Calculating...';
    }
  };

  const currentStep = getStatusStep(activeOrder.status);
  const estimatedTime = getEstimatedTime(activeOrder.status, orders);
  const activeOrdersCount = orders.filter(o => ['pending', 'preparing', 'ready'].includes(o.status)).length;
  const kitchenLoad = activeOrdersCount > 10 ? 'High' : activeOrdersCount > 5 ? 'Moderate' : 'Normal';

  const steps = [
    { id: 1, label: 'Received', icon: Clock, color: 'bg-blue-500' },
    { id: 2, label: 'Preparing', icon: ChefHat, color: 'bg-orange-500' },
    { id: 3, label: 'Ready', icon: CheckCircle, color: 'bg-green-500' },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 w-[95%] max-w-2xl z-40"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-primary-gold/20 overflow-hidden">
        <div className="bg-dark-bg p-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-gold rounded-full flex items-center justify-center">
              <Package className="text-black" size={20} />
            </div>
            <div>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active Order</p>
              <div className="flex items-center gap-2">
                <p className="text-white font-display text-lg">#{activeOrder.id.slice(-6).toUpperCase()}</p>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[10px] text-primary-gold font-bold border border-primary-gold/20">
                  <Timer size={12} /> {estimatedTime}
                </div>
                <div className={cn(
                  "flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border",
                  kitchenLoad === 'High' ? "bg-red-500/20 text-red-500 border-red-500/30" :
                  kitchenLoad === 'Moderate' ? "bg-orange-500/20 text-orange-500 border-orange-500/30" :
                  "bg-green-500/20 text-green-500 border-green-500/30"
                )}>
                  <ChefHat size={12} /> Load: {kitchenLoad}
                </div>
                <div className="flex items-center gap-1 bg-white/10 px-2 py-0.5 rounded text-[10px] text-gray-400 font-bold border border-gray-800 uppercase">
                  {activeOrder.paymentMethod || 'cash'}
                </div>
              </div>
            </div>
          </div>
          <button 
            onClick={onViewOrder}
            className="text-primary-gold flex items-center gap-1 font-bold text-sm hover:underline"
          >
            VIEW DETAILS <ChevronRight size={16} />
          </button>
        </div>

        <div className="p-6">
          <div className="relative flex justify-between items-center">
            {/* Progress Bar Background */}
            <div className="absolute top-5 left-0 w-full h-1 bg-gray-100 -z-10 rounded-full" />
            
            {/* Progress Bar Active */}
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
              className="absolute top-5 left-0 h-1 bg-primary-gold -z-10 rounded-full"
            />

            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep >= step.id;
              const isCurrent = currentStep === step.id;

              return (
                <div key={step.id} className="flex flex-col items-center gap-2">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500",
                    isActive ? "bg-primary-gold text-black shadow-lg scale-110" : "bg-gray-100 text-gray-400",
                    isCurrent && "ring-4 ring-primary-gold/20 animate-pulse"
                  )}>
                    <Icon size={20} />
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isActive ? "text-dark-bg" : "text-gray-400"
                  )}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between bg-gray-50 p-3 rounded-2xl">
            <div className="flex items-center gap-3 overflow-hidden">
              <MapPin size={16} className="text-primary-gold shrink-0" />
              <p className="text-xs text-gray-600 truncate">
                Delivering to: <span className="font-bold text-dark-bg">{activeOrder.address}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-deep-red font-bold text-xs shrink-0 pl-3 border-l border-gray-200">
              <Timer size={14} />
              <span>{estimatedTime}</span>
            </div>
          </div>
          <p className="mt-4 text-[10px] text-gray-400 text-center uppercase tracking-widest font-bold">
            {kitchenLoad === 'High' ? "🔥 Kitchen is very busy. Thank you for your patience!" :
             kitchenLoad === 'Moderate' ? "👨‍🍳 Kitchen is busy. We're working hard on your order!" :
             "✨ Kitchen is running smoothly. Your food is on the way!"}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
