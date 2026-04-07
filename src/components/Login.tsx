import { useState } from 'react';
import { motion } from 'motion/react';
import { User } from 'lucide-react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';

interface LoginProps {
  setView: (view: 'customer' | 'kitchen' | 'pos' | 'admin' | 'login' | 'orders') => void;
}

export const Login = ({ setView }: LoginProps) => {
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Check if user profile exists, if not create one as 'customer' by default
      const userRef = doc(db, 'users', result.user.uid);
      try {
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            uid: result.user.uid,
            email: result.user.email,
            role: result.user.email === 'hv81764@gmail.com' ? 'admin' : 'customer',
            displayName: result.user.displayName
          });
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${result.user.uid}`);
      }
      
      setView('customer');
    } catch (error) {
      console.error("Login failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-bg px-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-md rounded-[40px] p-10 text-center shadow-2xl"
      >
        <div className="w-20 h-20 bg-primary-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <User className="text-primary-gold" size={40} />
        </div>
        <h2 className="text-3xl font-display mb-2">Welcome Back</h2>
        <p className="text-gray-500 mb-8">Sign in to manage your orders and profile</p>
        
        <button 
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-dark-bg text-primary-gold py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 hover:bg-opacity-90 transition-all disabled:opacity-50"
        >
          {loading ? "AUTHENTICATING..." : "CONTINUE WITH GOOGLE"}
        </button>
        
        <button 
          onClick={() => setView('customer')}
          className="mt-6 text-gray-400 hover:text-dark-bg font-medium transition-colors"
        >
          Back to Home
        </button>
      </motion.div>
    </div>
  );
};
