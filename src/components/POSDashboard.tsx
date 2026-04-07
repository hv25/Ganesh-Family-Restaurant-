import React, { useState } from 'react';
import { CreditCard, Search, CheckCircle, Download, X, ShoppingBag, MapPin } from 'lucide-react';
import { Order, OrderStatus, PaymentStatus } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface POSDashboardProps {
  orders: Order[];
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  updatePaymentStatus: (orderId: string, paymentStatus: PaymentStatus) => Promise<void>;
}

export const POSDashboard: React.FC<POSDashboardProps> = ({ orders, updateOrderStatus, updatePaymentStatus }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const filteredOrders = orders.filter((o: Order) => {
    const matchesSearch = o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         o.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         o.phone.includes(searchTerm);
    const matchesFilter = filterStatus === 'all' ? true : o.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <h1 className="text-3xl font-display flex items-center gap-3">
            <CreditCard className="text-primary-gold" size={32} />
            POS System
          </h1>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text"
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
              />
            </div>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none bg-white"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Items</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Payment</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredOrders.map((order: Order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-bold">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="px-6 py-4">
                      <p className="font-bold">{order.customerName}</p>
                      <p className="text-xs text-gray-500">{order.phone}</p>
                      <div className={cn(
                        "inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full mt-1",
                        order.orderType === 'pickup' ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                      )}>
                        {order.orderType === 'pickup' ? <ShoppingBag size={10} /> : <MapPin size={10} />}
                        {order.orderType}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {order.items.map((item, i) => (
                          <span key={i} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">
                            {item.quantity}x {item.name}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-deep-red">₹{order.totalAmount}</td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                        order.status === 'pending' && "bg-orange-100 text-orange-700",
                        order.status === 'preparing' && "bg-blue-100 text-blue-700",
                        order.status === 'ready' && "bg-green-100 text-green-700",
                        order.status === 'completed' && "bg-gray-100 text-gray-700",
                        order.status === 'cancelled' && "bg-red-100 text-red-700",
                      )}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase text-gray-400">
                          {order.paymentMethod || 'cash'}
                        </span>
                        {order.paymentStatus === 'paid' ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={14} />
                            <span className="text-xs font-bold uppercase">Paid</span>
                          </div>
                        ) : (
                          <button 
                            onClick={() => updatePaymentStatus(order.id, 'paid')}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-[10px] font-bold uppercase hover:bg-green-100 hover:text-green-700 transition-all"
                          >
                            Mark as Paid
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {order.status === 'ready' && (
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'completed')}
                            className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Complete Order"
                          >
                            <CheckCircle size={18} />
                          </button>
                        )}
                        {order.paymentStatus === 'paid' && (
                          <button 
                            onClick={() => updatePaymentStatus(order.id, 'pending')}
                            className="p-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            title="Mark as Unpaid"
                          >
                            <X size={18} />
                          </button>
                        )}
                        <button 
                          className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          title="Print Bill"
                          onClick={() => window.print()}
                        >
                          <Download size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredOrders.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                No orders found matching your criteria.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
