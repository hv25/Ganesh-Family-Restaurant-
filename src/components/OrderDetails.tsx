import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  ShoppingBag,
  FileText,
  Calendar
} from 'lucide-react';
import { Order } from '../types';
import { format } from 'date-fns';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface OrderDetailsProps {
  order: Order;
  onClose: () => void;
}

export const OrderDetails: React.FC<OrderDetailsProps> = ({ order, onClose }) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="text-green-500" size={24} />;
      case 'cancelled': return <XCircle className="text-red-500" size={24} />;
      case 'pending':
      case 'preparing':
      case 'ready': return <Clock className="text-primary-gold animate-pulse" size={24} />;
      default: return <Package className="text-blue-500" size={24} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return "bg-green-100 text-green-700";
      case 'cancelled': return "bg-red-100 text-red-700";
      case 'pending': return "bg-yellow-100 text-yellow-700";
      case 'preparing': return "bg-orange-100 text-orange-700";
      case 'ready': return "bg-blue-100 text-blue-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-gray-100">
              {getStatusIcon(order.status)}
            </div>
            <div>
              <h2 className="text-xl font-display">Order Details</h2>
              <p className="text-xs text-gray-400 font-mono uppercase tracking-wider">ID: {order.id}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-full transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Status & Time */}
          <div className="flex flex-wrap gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</p>
              <span className={cn("px-3 py-1 rounded-full text-xs font-bold capitalize", getStatusColor(order.status))}>
                {order.status}
              </span>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered On</p>
              <p className="text-sm font-medium flex items-center gap-2 justify-end">
                <Calendar size={14} className="text-gray-400" />
                {order.createdAt?.toDate ? format(order.createdAt.toDate(), 'MMM dd, yyyy • hh:mm a') : 'Just now'}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Customer Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <User size={16} /> Customer Information
              </h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <User size={14} className="text-primary-gold" />
                  </div>
                  <p className="text-sm font-bold">{order.customerName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <Phone size={14} className="text-primary-gold" />
                  </div>
                  <p className="text-sm font-medium">{order.phone}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm shrink-0">
                    <MapPin size={14} className="text-primary-gold" />
                  </div>
                  <p className="text-sm text-gray-600 leading-relaxed">{order.address}</p>
                </div>
              </div>
            </div>

            {/* Order & Payment Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <CreditCard size={16} /> Order & Payment
              </h3>
              <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      {order.orderType === 'delivery' ? <MapPin size={14} className="text-primary-gold" /> : <ShoppingBag size={14} className="text-primary-gold" />}
                    </div>
                    <p className="text-sm font-medium capitalize">{order.orderType}</p>
                  </div>
                  <span className="text-[10px] font-bold bg-white px-2 py-1 rounded-md border border-gray-100">TYPE</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <CreditCard size={14} className="text-primary-gold" />
                    </div>
                    <p className="text-sm font-medium uppercase">{order.paymentMethod || 'cash'}</p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-bold px-2 py-1 rounded-md border",
                    order.paymentStatus === 'paid' ? "bg-green-50 border-green-100 text-green-600" : "bg-yellow-50 border-yellow-100 text-yellow-600"
                  )}>
                    {order.paymentStatus.toUpperCase()}
                  </span>
                </div>
                {order.tableNumber && (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-sm">
                        <FileText size={14} className="text-primary-gold" />
                      </div>
                      <p className="text-sm font-medium">Table {order.tableNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Package size={16} /> Order Items
            </h3>
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-400 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {order.items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-4">
                        <p className="font-bold text-dark-bg">{item.name}</p>
                        {item.instructions && (
                          <p className="text-[10px] text-gray-400 italic mt-0.5">Note: {item.instructions}</p>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center font-medium">{item.quantity}</td>
                      <td className="px-4 py-4 text-right text-gray-500">₹{item.price}</td>
                      <td className="px-4 py-4 text-right font-bold">₹{item.price * item.quantity}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50/50">
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-right font-bold text-gray-500">Total Amount</td>
                    <td className="px-4 py-4 text-right text-xl font-black text-deep-red">₹{order.totalAmount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Instructions */}
          {order.instructions && (
            <div className="space-y-4">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={16} /> Special Instructions
              </h3>
              <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-2xl">
                <p className="text-sm text-yellow-800 leading-relaxed italic">"{order.instructions}"</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50">
          <button 
            onClick={onClose}
            className="w-full bg-dark-bg text-primary-gold py-4 rounded-2xl font-bold hover:bg-primary-gold hover:text-black transition-all shadow-lg"
          >
            Close Details
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
