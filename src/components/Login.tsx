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
          <svg className="w-6 h-6" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.66l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
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
