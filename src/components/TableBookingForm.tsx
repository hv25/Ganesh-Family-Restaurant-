import React, { useState } from 'react';
import { Calendar, Users, Clock, CheckCircle2, Phone, User } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TableBookingFormProps {
  user: UserProfile | null;
  onClose: () => void;
}

export const TableBookingForm: React.FC<TableBookingFormProps> = ({ user, onClose }) => {
  const [bookingData, setBookingData] = useState({
    customerName: user?.displayName || '',
    phone: '',
    date: '',
    time: '',
    guests: 2,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'bookings'), {
        ...bookingData,
        userId: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setIsSuccess(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'bookings');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center py-12 px-6">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="text-green-600" size={48} />
        </div>
        <h3 className="text-2xl font-display mb-2">Booking Requested!</h3>
        <p className="text-gray-500 mb-8">We'll confirm your reservation via phone shortly.</p>
        <button 
          onClick={onClose}
          className="w-full bg-dark-bg text-primary-gold py-4 rounded-2xl font-bold hover:bg-primary-gold hover:text-black transition-all"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-8">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-display flex items-center gap-3">
          <Calendar className="text-primary-gold" size={28} />
          Book a Table
        </h3>
        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <Clock size={20} className="text-gray-400" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <User size={14} /> Full Name
            </label>
            <input 
              required
              type="text"
              value={bookingData.customerName}
              onChange={(e) => setBookingData({...bookingData, customerName: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none transition-all"
              placeholder="Your Name"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Phone size={14} /> Phone Number
            </label>
            <input 
              required
              type="tel"
              value={bookingData.phone}
              onChange={(e) => setBookingData({...bookingData, phone: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none transition-all"
              placeholder="10-digit number"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Calendar size={14} /> Date
            </label>
            <input 
              required
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={bookingData.date}
              onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Clock size={14} /> Time
            </label>
            <input 
              required
              type="time"
              value={bookingData.time}
              onChange={(e) => setBookingData({...bookingData, time: e.target.value})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
              <Users size={14} /> Guests
            </label>
            <select 
              value={bookingData.guests}
              onChange={(e) => setBookingData({...bookingData, guests: Number(e.target.value)})}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none transition-all bg-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                <option key={n} value={n}>{n} {n === 1 ? 'Person' : 'People'}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-4">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-dark-bg text-primary-gold py-4 rounded-2xl font-bold hover:bg-primary-gold hover:text-black transition-all flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
          >
            {isSubmitting ? 'Processing...' : 'Request Reservation'}
          </button>
        </div>
      </form>
    </div>
  );
};
