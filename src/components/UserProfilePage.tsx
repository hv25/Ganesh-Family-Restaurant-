import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Save, CheckCircle2, AlertCircle, LogOut } from 'lucide-react';
import { doc, updateDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile } from '../types';
import { motion } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UserProfilePageProps {
  userProfile: UserProfile | null;
  onUpdate: (updatedProfile: UserProfile) => void;
}

export const UserProfilePage: React.FC<UserProfilePageProps> = ({ userProfile, onUpdate }) => {
  const [formData, setFormData] = useState({
    displayName: userProfile?.displayName || '',
    phone: userProfile?.phone || '',
    address: userProfile?.address || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (userProfile) {
      setFormData({
        displayName: userProfile.displayName || '',
        phone: userProfile.phone || '',
        address: userProfile.address || '',
      });
    }
  }, [userProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsSaving(true);
    setSaveStatus('idle');

    try {
      const userRef = doc(db, 'users', userProfile.uid);
      const updatedData = {
        ...formData,
      };
      await updateDoc(userRef, updatedData);
      
      onUpdate({
        ...userProfile,
        ...updatedData,
      });
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      setSaveStatus('error');
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24">
        <p className="text-gray-500">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-gray-100"
        >
          <div className="bg-dark-bg p-8 sm:p-12 text-center relative">
            <div className="w-24 h-24 bg-primary-gold rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/10 shadow-2xl">
              <User size={48} className="text-black" />
            </div>
            <h1 className="text-3xl font-display text-primary-gold mb-1">
              {userProfile.displayName || 'Guest User'}
            </h1>
            <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
              <Mail size={14} /> {userProfile.email}
            </p>
            <div className="absolute top-8 right-8">
              <span className="bg-primary-gold/20 text-primary-gold text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-primary-gold/30">
                {userProfile.role}
              </span>
            </div>
          </div>

          <div className="p-8 sm:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={14} /> Display Name
                  </label>
                  <input 
                    type="text"
                    value={formData.displayName}
                    onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-primary-gold outline-none transition-all text-dark-bg font-medium"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} /> Phone Number
                  </label>
                  <input 
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-primary-gold outline-none transition-all text-dark-bg font-medium"
                    placeholder="Enter your mobile number"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <MapPin size={14} /> Delivery Address
                  </label>
                  <textarea 
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-6 py-4 rounded-2xl bg-gray-50 border border-gray-100 focus:ring-2 focus:ring-primary-gold outline-none transition-all text-dark-bg font-medium min-h-[120px]"
                    placeholder="Enter your full address for delivery"
                  />
                </div>
              </div>

              <div className="pt-4 space-y-4">
                <button 
                  type="submit"
                  disabled={isSaving}
                  className={cn(
                    "w-full py-5 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-xl",
                    saveStatus === 'success' ? "bg-green-500 text-white" : 
                    saveStatus === 'error' ? "bg-red-500 text-white" :
                    "bg-dark-bg text-primary-gold hover:bg-primary-gold hover:text-black"
                  )}
                >
                  {isSaving ? (
                    'Saving Changes...'
                  ) : saveStatus === 'success' ? (
                    <><CheckCircle2 size={24} /> Profile Updated!</>
                  ) : saveStatus === 'error' ? (
                    <><AlertCircle size={24} /> Error Saving</>
                  ) : (
                    <><Save size={24} /> Save Profile</>
                  )}
                </button>

                <button 
                  type="button"
                  onClick={() => signOut(auth)}
                  className="w-full py-4 rounded-2xl font-bold text-gray-400 hover:text-deep-red transition-all flex items-center justify-center gap-2 border border-dashed border-gray-200 hover:border-deep-red/30"
                >
                  <LogOut size={20} /> Sign Out from Account
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
