import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Plus, Trash2, Edit, Save, X, CheckCircle, AlertCircle, TrendingUp, BarChart3, PieChart, Megaphone, Upload, Play, Image as ImageIcon, Search } from 'lucide-react';
import { MenuCategory, MenuItem, UserProfile, Order, Advertisement } from '../types';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch, onSnapshot, query, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, uploadBytesResumable } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '../firebase';
import { INITIAL_MENU_DATA } from '../constants';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RefreshCw, X as XIcon } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdminDashboardProps {
  categories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ categories, menuItems, orders }) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'categories' | 'staff' | 'analytics' | 'ads'>('menu');
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [advertisements, setAdvertisements] = useState<Advertisement[]>([]);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [editingAd, setEditingAd] = useState<Advertisement | null>(null);
  const [newAd, setNewAd] = useState<Partial<Advertisement>>({
    title: '',
    description: '',
    businessName: '',
    phone: '',
    location: '',
    active: true
  });
  const [adFile, setAdFile] = useState<File | null>(null);
  const [adPreviewUrl, setAdPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [adSearchTerm, setAdSearchTerm] = useState('');
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadTask, setUploadTask] = useState<any>(null);

  useEffect(() => {
    const checkAds = async () => {
      try {
        const snap = await getDocs(collection(db, 'advertisements'));
        console.log("Initial advertisements check. Count:", snap.size);
      } catch (e) {
        console.error("Initial advertisements check failed:", e);
      }
    };
    checkAds();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'advertisements'), (snapshot) => {
      const ads = snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as Advertisement);
      console.log("Advertisements snapshot received. Count:", ads.length);
      // Sort in memory
      const sortedAds = ads.sort((a, b) => {
        const dateA = a.createdAt?.toMillis?.() || 0;
        const dateB = b.createdAt?.toMillis?.() || 0;
        return dateB - dateA;
      });
      setAdvertisements(sortedAds);
    }, (error) => {
      console.error("Advertisements listener error:", error);
      if (error.code === 'permission-denied') {
        alert("Permission denied while fetching advertisements. You may not have admin rights in Firestore.");
      } else {
        handleFirestoreError(error, OperationType.LIST, 'advertisements');
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!adFile) {
      setAdPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(adFile);
    setAdPreviewUrl(objectUrl);

    // Free memory when component unmounts or adFile changes
    return () => URL.revokeObjectURL(objectUrl);
  }, [adFile]);
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as UserProfile));
    }, (error) => {
      if (error.code !== 'permission-denied') {
        handleFirestoreError(error, OperationType.LIST, 'users');
      }
    });
    return () => unsubscribe();
  }, []);

  const handleUpdateRole = async (uid: string, role: UserProfile['role']) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };
  
  const handleResetMenu = async () => {
    if (!window.confirm("This will delete all current categories and menu items and reset them to the default list. Continue?")) return;
    
    setIsResetting(true);
    try {
      // Delete existing
      const catsSnap = await getDocs(collection(db, 'categories'));
      const itemsSnap = await getDocs(collection(db, 'menuItems'));
      
      const batch = writeBatch(db);
      catsSnap.docs.forEach(d => batch.delete(d.ref));
      itemsSnap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      
      // Seed new
      let order = 0;
      for (const [key, catData] of Object.entries(INITIAL_MENU_DATA)) {
        const catRef = await addDoc(collection(db, 'categories'), {
          name: catData.title,
          icon: catData.icon,
          order: order++
        });
        
        for (const section of catData.sections) {
          for (const item of section.items) {
            await addDoc(collection(db, 'menuItems'), {
              name: item.name,
              price: item.price,
              categoryId: catRef.id,
              available: true,
              isSpecial: (section as any).isSpecial || false,
              description: (item as any).description || ''
            });
          }
        }
      }
      alert("Menu reset successfully!");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'menu/reset');
    } finally {
      setIsResetting(false);
    }
  };
  
  useEffect(() => {
    if (isAddingAd) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isAddingAd]);

  const debugStorage = async () => {
    try {
      setUploadStatus('Testing storage connection...');
      const testBlob = new Blob(['test'], { type: 'text/plain' });
      const testRef = ref(storage, `test_${Date.now()}.txt`);
      await uploadBytes(testRef, testBlob);
      const url = await getDownloadURL(testRef);
      alert(`Storage test successful! URL: ${url}`);
      setUploadStatus('');
    } catch (e: any) {
      console.error("Storage debug failed:", e);
      alert(`Storage test failed: ${e.message}. This usually means storage permissions or CORS are not configured correctly.`);
      setUploadStatus('');
    }
  };

  const handleUploadAd = async () => {
    if (!newAd.title) {
      alert("Please provide at least a title.");
      return;
    }

    if (!editingAd && !adFile) {
      alert("Please select a file to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    
    try {
      if (!auth.currentUser) {
        alert("You must be logged in to upload advertisements.");
        setUploading(false);
        return;
      }

      // If we have a new file, upload it
      if (adFile) {
        if (adFile.size > 10 * 1024 * 1024) {
          alert("File is too large. Maximum size is 10MB.");
          setUploading(false);
          return;
        }

        const type = adFile.type.startsWith('video/') ? 'video' : 'image';
        const fileName = `${Date.now()}_${adFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `ads/${fileName}`);
        
        const task = uploadBytesResumable(storageRef, adFile);
        setUploadTask(task);

        task.on('state_changed', 
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
            setUploadStatus(`Uploading: ${Math.round(progress)}%`);
          }, 
          (error) => {
            console.error("Upload failed:", error);
            if (error.code !== 'storage/canceled') {
              alert("Upload failed: " + error.message);
            }
            setUploading(false);
            setUploadStatus('');
            setUploadProgress(0);
            setUploadTask(null);
          }, 
          async () => {
            try {
              setUploadStatus('Finalizing...');
              const downloadURL = await getDownloadURL(task.snapshot.ref);
              
              if (editingAd) {
                // Update existing ad with new file
                await updateDoc(doc(db, 'advertisements', editingAd.id), {
                  ...newAd,
                  type,
                  url: downloadURL,
                });
                // Optional: Delete old file if URL changed
                if (editingAd.url && !editingAd.url.startsWith('https://picsum.photos')) {
                  try {
                    const oldRef = ref(storage, editingAd.url);
                    await deleteObject(oldRef);
                  } catch (e) {
                    console.warn("Could not delete old ad file:", e);
                  }
                }
              } else {
                // Create new ad
                await addDoc(collection(db, 'advertisements'), {
                  ...newAd,
                  type,
                  url: downloadURL,
                  active: true,
                  views: 0,
                  clicks: 0,
                  createdAt: serverTimestamp()
                });
              }
              
              finalizeAdSave();
            } catch (e: any) {
              console.error("Error finalizing ad:", e);
              alert("Error saving ad details: " + e.message);
              setUploading(false);
              setUploadStatus('');
              setUploadTask(null);
            }
          }
        );
      } else if (editingAd) {
        // Just update fields without new file
        await updateDoc(doc(db, 'advertisements', editingAd.id), {
          ...newAd
        });
        finalizeAdSave();
      }
    } catch (error: any) {
      console.error("Ad upload error:", error);
      alert("An error occurred during upload: " + error.message);
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      setUploadTask(null);
    }
  };

  const finalizeAdSave = () => {
    setUploading(false);
    setUploadStatus('');
    setUploadProgress(0);
    setUploadTask(null);
    setIsAddingAd(false);
    setEditingAd(null);
    setAdFile(null);
    setNewAd({
      title: '',
      description: '',
      businessName: '',
      phone: '',
      location: '',
      active: true
    });
    alert(editingAd ? "Advertisement updated successfully!" : "Advertisement published successfully!");
  };

  const handleCancelUpload = () => {
    if (uploadTask) {
      uploadTask.cancel();
      setUploadTask(null);
    }
    setUploading(false);
    setUploadStatus('');
    setUploadProgress(0);
    if (!uploading) {
      setIsAddingAd(false);
      setEditingAd(null);
      setNewAd({
        title: '',
        description: '',
        businessName: '',
        phone: '',
        location: '',
        active: true
      });
    }
  };

  const handleEditAd = (ad: Advertisement) => {
    setEditingAd(ad);
    setNewAd({
      title: ad.title,
      description: ad.description || '',
      businessName: ad.businessName || '',
      phone: ad.phone || '',
      location: ad.location || '',
      active: ad.active
    });
    setIsAddingAd(true);
  };

  const handleDeleteAd = async (ad: Advertisement) => {
    if (!window.confirm("Are you sure you want to delete this advertisement?")) return;
    try {
      // Delete from Firestore
      await deleteDoc(doc(db, 'advertisements', ad.id));
      // Delete from Storage
      const storageRef = ref(storage, ad.url);
      await deleteObject(storageRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `advertisements/${ad.id}`);
    }
  };

  const toggleAdStatus = async (ad: Advertisement) => {
    try {
      await updateDoc(doc(db, 'advertisements', ad.id), { active: !ad.active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `advertisements/${ad.id}`);
    }
  };
  const [newItem, setNewItem] = useState<Partial<MenuItem>>({
    name: '',
    price: 0,
    categoryId: categories[0]?.id || '',
    available: true,
    isSpecial: false,
    description: ''
  });

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await updateDoc(doc(db, 'menuItems', editingItem.id), { ...editingItem });
        setEditingItem(null);
      } else {
        await addDoc(collection(db, 'menuItems'), { ...newItem });
        setIsAddingItem(false);
        setNewItem({
          name: '',
          price: 0,
          categoryId: categories[0]?.id || '',
          available: true,
          isSpecial: false,
          description: ''
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'menuItems');
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  const handleDeleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'menuItems', id));
      setDeletingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `menuItems/${id}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeletingId(null)} />
          <div className="relative bg-white w-full max-w-sm rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={32} />
            </div>
            <h3 className="text-xl font-bold mb-2">Delete Item?</h3>
            <p className="text-gray-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleDeleteItem(deletingId)}
                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-display flex items-center gap-3">
            <LayoutDashboard className="text-primary-gold" size={32} />
            Admin Control Panel
          </h1>
          <button 
            onClick={handleResetMenu}
            disabled={isResetting}
            className="flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-deep-red transition-colors"
          >
            <RefreshCw className={cn(isResetting && "animate-spin")} size={14} />
            RESET MENU TO DEFAULT
          </button>
        </div>

        {/* Debug Info */}
        <div className="mb-8 p-4 bg-gray-100 rounded-xl text-[10px] font-mono overflow-auto max-h-32 border border-gray-200">
          <p className="font-bold text-gray-500 mb-1 uppercase">System Debug Info</p>
          <p>User: {auth.currentUser?.email || 'Not logged in'}</p>
          <p>UID: {auth.currentUser?.uid || 'N/A'}</p>
          <p>Email Verified: {auth.currentUser?.emailVerified ? 'Yes' : 'No'}</p>
          <p>Ads Count: {advertisements.length}</p>
          <p>Upload Status: {uploadStatus || 'Idle'}</p>
          <p>Active Tab: {activeTab}</p>
          <p>Auth Provider: {auth.currentUser?.providerData?.[0]?.providerId || 'N/A'}</p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <button 
              onClick={async () => {
                try {
                  const snap = await getDocs(collection(db, 'advertisements'));
                  console.log("DEBUG: Advertisements collection check:", snap.size, "docs found.");
                  snap.docs.forEach(d => console.log("DEBUG: Ad doc:", d.id, d.data()));
                  alert(`Firestore Check: Found ${snap.size} ads. Check console for details.`);
                } catch (e) {
                  console.error("DEBUG: Advertisements collection check failed:", e);
                  alert("Firestore Check Failed: " + (e instanceof Error ? e.message : String(e)));
                }
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Check Firestore Collection
            </button>
            <button 
              onClick={async () => {
                try {
                  const token = await auth.currentUser?.getIdTokenResult();
                  console.log("DEBUG: Auth Token Result:", token);
                  alert(`Auth Token: Email in token is "${token?.claims.email}". Check console for full details.`);
                } catch (e) {
                  console.error("DEBUG: Auth Token check failed:", e);
                  alert("Auth Token Check Failed: " + (e instanceof Error ? e.message : String(e)));
                }
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Check Auth Token
            </button>
            <button 
              onClick={async () => {
                try {
                  const storageRef = ref(storage, 'test_upload.txt');
                  const blob = new Blob(['Hello World'], { type: 'text/plain' });
                  await uploadBytes(storageRef, blob);
                  const url = await getDownloadURL(storageRef);
                  console.log("DEBUG: Storage test upload successful. URL:", url);
                  alert("Storage Test: Upload successful! Check console for URL.");
                } catch (e) {
                  console.error("DEBUG: Storage test upload failed:", e);
                  alert("Storage Test Failed: " + (e instanceof Error ? e.message : String(e)));
                }
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Test Storage Upload
            </button>
            <button 
              onClick={() => {
                setUploading(false);
                setUploadStatus('');
                setUploadProgress(0);
                alert("Upload state reset.");
              }}
              className="px-2 py-1 bg-red-50 border border-red-200 text-red-600 rounded hover:bg-red-100 transition-colors"
            >
              Reset Upload State
            </button>
            <button 
              onClick={async () => {
                try {
                  if (!auth.currentUser) throw new Error("Not logged in");
                  await setDoc(doc(db, 'users', auth.currentUser.uid), {
                    uid: auth.currentUser.uid,
                    email: auth.currentUser.email,
                    role: 'admin',
                    displayName: auth.currentUser.displayName || 'Admin'
                  }, { merge: true });
                  alert("Admin profile created/updated! Please refresh the page.");
                } catch (e) {
                  console.error("DEBUG: Create admin profile failed:", e);
                  alert("Failed to create admin profile: " + (e instanceof Error ? e.message : String(e)));
                }
              }}
              className="px-2 py-1 bg-green-50 border border-green-200 text-green-600 rounded hover:bg-green-100 transition-colors"
            >
              Become Admin (Firestore)
            </button>
            <button 
              onClick={() => {
                console.log("DEBUG: Current User Auth Details:", auth.currentUser);
                alert(`Auth Details: User is ${auth.currentUser?.email}. Check console for full object.`);
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Check Auth Details
            </button>
            <button 
              onClick={async () => {
                try {
                  const adsRef = ref(storage, 'ads');
                  const res = await listAll(adsRef);
                  console.log("DEBUG: Storage 'ads/' folder list:", res.items.length, "files found.");
                  res.items.forEach(item => console.log("DEBUG: Storage file:", item.fullPath));
                  alert(`Storage Check: Found ${res.items.length} files in 'ads/'. Check console for details.`);
                } catch (e) {
                  console.error("DEBUG: Storage list failed:", e);
                  alert("Storage List Failed: " + (e instanceof Error ? e.message : String(e)));
                }
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Check Storage List
            </button>
            <button 
              onClick={() => {
                console.log("DEBUG: Storage Config:", storage);
                alert(`Storage Bucket: ${storage.app.options.storageBucket}. Check console for full object.`);
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Check Storage Config
            </button>
            <button 
              onClick={() => {
                console.log("DEBUG: Current advertisements state:", advertisements);
                alert(`App State: Found ${advertisements.length} ads in local state. Check console for details.`);
              }}
              className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              Check App Ads State
            </button>
          </div>
        </div>

        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button 
            onClick={() => setActiveTab('menu')}
            className={cn(
              "pb-4 px-4 font-bold transition-all",
              activeTab === 'menu' ? "border-b-2 border-primary-gold text-dark-bg" : "text-gray-400"
            )}
          >
            Menu Items
          </button>
          <button 
            onClick={() => setActiveTab('categories')}
            className={cn(
              "pb-4 px-4 font-bold transition-all",
              activeTab === 'categories' ? "border-b-2 border-primary-gold text-dark-bg" : "text-gray-400"
            )}
          >
            Categories
          </button>
          <button 
            onClick={() => setActiveTab('staff')}
            className={cn(
              "pb-4 px-4 font-bold transition-all",
              activeTab === 'staff' ? "border-b-2 border-primary-gold text-dark-bg" : "text-gray-400"
            )}
          >
            Staff Management
          </button>
          <button 
            onClick={() => setActiveTab('analytics')}
            className={cn(
              "pb-4 px-4 font-bold transition-all",
              activeTab === 'analytics' ? "border-b-2 border-primary-gold text-dark-bg" : "text-gray-400"
            )}
          >
            Analytics
          </button>
          <button 
            onClick={() => setActiveTab('ads')}
            className={cn(
              "pb-4 px-4 font-bold transition-all",
              activeTab === 'ads' ? "border-b-2 border-primary-gold text-dark-bg" : "text-gray-400"
            )}
          >
            Ads
          </button>
        </div>

        {activeTab === 'menu' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Manage Menu</h2>
              <button 
                onClick={() => setIsAddingItem(true)}
                className="bg-dark-bg text-primary-gold px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-gold hover:text-black transition-all"
              >
                <Plus size={20} /> Add New Item
              </button>
            </div>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Price</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {menuItems.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-bold">{item.name}</p>
                        {item.isSpecial && <span className="text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-bold uppercase">Special</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {categories.find(c => c.id === item.categoryId)?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 font-bold text-deep-red">₹{item.price}</td>
                      <td className="px-6 py-4">
                        <button 
                          onClick={async () => {
                            try {
                              await updateDoc(doc(db, 'menuItems', item.id), { available: !item.available });
                            } catch (error) {
                              handleFirestoreError(error, OperationType.UPDATE, `menuItems/${item.id}`);
                            }
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all hover:scale-105 active:scale-95",
                            item.available ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-red-100 text-red-700 hover:bg-red-200"
                          )}
                          title="Click to toggle availability"
                        >
                          {item.available ? 'Available' : 'Sold Out'}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setEditingItem(item)}
                            className="p-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => setDeletingId(item.id)}
                            className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold">Manage Staff Roles</h2>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-bold">{u.displayName || 'No Name'}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                          u.role === 'admin' && "bg-purple-100 text-purple-700",
                          u.role === 'kitchen' && "bg-blue-100 text-blue-700",
                          u.role === 'staff' && "bg-green-100 text-green-700",
                          u.role === 'customer' && "bg-gray-100 text-gray-700",
                        )}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.uid, e.target.value as any)}
                          className="text-xs border border-gray-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-primary-gold bg-white"
                          disabled={u.email === 'hv81764@gmail.com'}
                        >
                          <option value="customer">Customer</option>
                          <option value="staff">Staff (POS)</option>
                          <option value="kitchen">Kitchen</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {(isAddingItem || editingItem) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setIsAddingItem(false); setEditingItem(null); }} />
            <div className="relative bg-white w-full max-w-lg rounded-3xl p-8 shadow-2xl">
              <h3 className="text-2xl font-display mb-6">{editingItem ? 'Edit Item' : 'Add New Item'}</h3>
              <form onSubmit={handleSaveItem} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Item Name</label>
                  <input 
                    required
                    type="text"
                    value={editingItem ? editingItem.name : newItem.name}
                    onChange={(e) => editingItem ? setEditingItem({...editingItem, name: e.target.value}) : setNewItem({...newItem, name: e.target.value})}
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Price (₹)</label>
                    <input 
                      required
                      type="number"
                      value={editingItem ? editingItem.price : newItem.price}
                      onChange={(e) => editingItem ? setEditingItem({...editingItem, price: Number(e.target.value)}) : setNewItem({...newItem, price: Number(e.target.value)})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                    <select 
                      value={editingItem ? editingItem.categoryId : newItem.categoryId}
                      onChange={(e) => editingItem ? setEditingItem({...editingItem, categoryId: e.target.value}) : setNewItem({...newItem, categoryId: e.target.value})}
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none bg-white"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 uppercase">Description</label>
                  <textarea 
                    rows={3}
                    value={editingItem ? editingItem.description || '' : newItem.description || ''}
                    onChange={(e) => editingItem ? setEditingItem({...editingItem, description: e.target.value}) : setNewItem({...newItem, description: e.target.value})}
                    placeholder="Brief description of the item..."
                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none resize-none"
                  />
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editingItem ? editingItem.available : newItem.available}
                      onChange={(e) => editingItem ? setEditingItem({...editingItem, available: e.target.checked}) : setNewItem({...newItem, available: e.target.checked})}
                      className="w-4 h-4 text-primary-gold"
                    />
                    <span className="text-sm font-medium">Available</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox"
                      checked={editingItem ? editingItem.isSpecial : newItem.isSpecial}
                      onChange={(e) => editingItem ? setEditingItem({...editingItem, isSpecial: e.target.checked}) : setNewItem({...newItem, isSpecial: e.target.checked})}
                      className="w-4 h-4 text-primary-gold"
                    />
                    <span className="text-sm font-medium">Chef Special</span>
                  </label>
                </div>
                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAddingItem(false); setEditingItem(null); }}
                    className="flex-1 px-4 py-2 rounded-lg border border-gray-200 font-bold hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 bg-dark-bg text-primary-gold px-4 py-2 rounded-lg font-bold hover:bg-primary-gold hover:text-black transition-all"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-bold uppercase mb-1">Total Revenue</p>
                <p className="text-3xl font-display text-deep-red">₹{orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0)}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-bold uppercase mb-1">Total Orders</p>
                <p className="text-3xl font-display text-dark-bg">{orders.length}</p>
              </div>
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <p className="text-gray-500 text-sm font-bold uppercase mb-1">Avg. Order Value</p>
                <p className="text-3xl font-display text-primary-gold">₹{orders.length > 0 ? Math.round(orders.reduce((acc, o) => acc + (o.totalAmount || 0), 0) / orders.length) : 0}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <BarChart3 className="text-primary-gold" /> Recent Sales
              </h3>
              <div className="space-y-4">
                {orders.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                    <div>
                      <p className="font-bold">#{order.id.slice(-6).toUpperCase()}</p>
                      <p className="text-xs text-gray-500">{order.createdAt?.toDate?.().toLocaleDateString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-deep-red">₹{order.totalAmount}</p>
                      <p className="text-[10px] uppercase font-bold text-gray-400">
                        {order.paymentMethod} • {order.orderType}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {activeTab === 'ads' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-2xl font-display">Local Advertisements</h2>
                <p className="text-gray-500">Manage promotional images and videos</p>
              </div>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text"
                    placeholder="Search ads..."
                    value={adSearchTerm}
                    onChange={(e) => setAdSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none text-sm"
                  />
                </div>
                <button 
                  onClick={async () => {
                    try {
                      setRefreshing(true);
                      const snap = await getDocs(collection(db, 'advertisements'));
                      const ads = snap.docs.map(d => ({ id: d.id, ...d.data() }) as Advertisement);
                      setAdvertisements(ads);
                      alert(`Refreshed! Found ${ads.length} ads.`);
                    } catch (e) {
                      console.error("Manual refresh failed:", e);
                      alert("Refresh failed. Check console for details.");
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-all flex items-center gap-2 font-bold text-sm"
                >
                  <RefreshCw size={18} className={cn(refreshing && "animate-spin")} />
                  Refresh
                </button>
                <button 
                  onClick={async () => {
                    if (!window.confirm("Add a test advertisement?")) return;
                    try {
                      await addDoc(collection(db, 'advertisements'), {
                        title: "Test Ad " + new Date().toLocaleTimeString(),
                        type: 'image',
                        url: "https://picsum.photos/seed/test/800/450",
                        active: true,
                        createdAt: serverTimestamp()
                      });
                      alert("Test ad added successfully!");
                    } catch (e) {
                      console.error("Test ad failed:", e);
                      alert("Failed to add test ad: " + (e instanceof Error ? e.message : String(e)));
                    }
                  }}
                  className="p-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-all flex items-center gap-2 font-bold text-sm"
                >
                  <Plus size={18} />
                  Test Ad
                </button>
                <button 
                  onClick={() => setIsAddingAd(true)}
                  className="bg-dark-bg text-primary-gold px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-primary-gold hover:text-black transition-all shadow-lg"
                >
                  <Upload size={20} />
                  Upload New Ad
                </button>
              </div>
            </div>

            {/* Add Ad Modal */}
            <AnimatePresence>
              {isAddingAd && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
                  >
                    <div className="flex flex-col h-full">
                      <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                        <div className="flex justify-between items-center mb-8 sticky top-0 bg-white z-10 pb-2">
                          <div className="flex flex-col">
                            <h3 className="text-2xl font-display">{editingAd ? 'Edit Advertisement' : 'Upload Advertisement'}</h3>
                            <button 
                              onClick={debugStorage}
                              className="text-[10px] text-blue-500 hover:underline text-left"
                            >
                              Debug Storage Connection
                            </button>
                          </div>
                          <button onClick={handleCancelUpload} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                            <X size={24} />
                          </button>
                        </div>

                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Ad Title *</label>
                              <input 
                                type="text" 
                                value={newAd.title}
                                onChange={(e) => setNewAd({...newAd, title: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
                                placeholder="e.g. Summer Special Biryani"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Business Name</label>
                              <input 
                                type="text" 
                                value={newAd.businessName}
                                onChange={(e) => setNewAd({...newAd, businessName: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
                                placeholder="e.g. Ganesh Restaurant"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Description</label>
                            <textarea 
                              value={newAd.description}
                              onChange={(e) => setNewAd({...newAd, description: e.target.value})}
                              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none h-24 resize-none"
                              placeholder="Tell customers more about this offer..."
                            />
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Contact Phone</label>
                              <input 
                                type="text" 
                                value={newAd.phone}
                                onChange={(e) => setNewAd({...newAd, phone: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
                                placeholder="e.g. +91 81069 64427"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Location</label>
                              <input 
                                type="text" 
                                value={newAd.location}
                                onChange={(e) => setNewAd({...newAd, location: e.target.value})}
                                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-primary-gold outline-none"
                                placeholder="e.g. Hyderabad, Telangana"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">Select Media *</label>
                            
                            {/* Media Preview */}
                            {(adPreviewUrl || (editingAd && editingAd.url)) && (
                              <div className="mb-4 relative aspect-video bg-gray-100 rounded-2xl overflow-hidden border border-gray-200">
                                {adFile ? (
                                  adFile.type.startsWith('video/') ? (
                                    <video src={adPreviewUrl!} className="w-full h-full object-cover" controls />
                                  ) : (
                                    <img src={adPreviewUrl!} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  )
                                ) : editingAd && (
                                  editingAd.type === 'video' ? (
                                    <video src={editingAd.url} className="w-full h-full object-cover" controls />
                                  ) : (
                                    <img src={editingAd.url} alt="Current Media" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  )
                                )}
                                <div className="absolute top-2 left-2 bg-black/50 text-white px-2 py-1 rounded text-[10px] font-bold uppercase">
                                  {adFile ? 'New Media Preview' : 'Current Media'}
                                </div>
                              </div>
                            )}

                            <div className="relative">
                              <input 
                                type="file" 
                                id="ad-file-input"
                                className="hidden" 
                                accept="image/*,video/*"
                                onChange={(e) => setAdFile(e.target.files?.[0] || null)}
                              />
                              <label 
                                htmlFor="ad-file-input"
                                className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-2xl p-8 hover:border-primary-gold hover:bg-primary-gold/5 transition-all cursor-pointer"
                              >
                                {adFile ? (
                                  <div className="flex items-center gap-3 text-green-600 font-bold">
                                    <CheckCircle size={24} />
                                    <span>{adFile.name}</span>
                                  </div>
                                ) : (
                                  <>
                                    <Upload className="text-gray-400 mb-2" size={32} />
                                    <span className="text-gray-500 font-medium">Click to select image or video</span>
                                    <span className="text-xs text-gray-400 mt-1">Max size: 10MB</span>
                                  </>
                                )}
                              </label>
                            </div>
                          </div>

                          {uploading && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm font-bold">
                                <span>{uploadStatus}</span>
                                <span>{Math.round(uploadProgress)}%</span>
                              </div>
                              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                                <motion.div 
                                  className="bg-primary-gold h-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${uploadProgress}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-6 sm:p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
                        <button 
                          onClick={handleCancelUpload}
                          className="flex-1 px-6 py-4 rounded-2xl font-bold border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                        >
                          {uploading ? 'STOP UPLOAD' : 'CANCEL'}
                        </button>
                        <button 
                          onClick={handleUploadAd}
                          disabled={uploading || (!adFile && !editingAd) || !newAd.title}
                          className="flex-1 px-6 py-4 rounded-2xl font-bold bg-dark-bg text-primary-gold hover:bg-opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                          {uploading ? 'UPLOADING...' : (editingAd ? 'UPDATE AD' : 'PUBLISH AD')}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Preview</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Details</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Stats</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {advertisements
                    .filter(ad => 
                      ad.title.toLowerCase().includes(adSearchTerm.toLowerCase()) || 
                      ad.businessName?.toLowerCase().includes(adSearchTerm.toLowerCase())
                    )
                    .map((ad) => (
                    <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="w-20 h-12 bg-gray-100 rounded-lg overflow-hidden">
                          {ad.type === 'video' ? (
                            <div className="w-full h-full flex items-center justify-center bg-dark-bg text-primary-gold">
                              <Play size={16} />
                            </div>
                          ) : (
                            <img src={ad.url} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold">{ad.title}</p>
                        <p className="text-xs text-gray-500">{ad.businessName || 'No business name'}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-bold uppercase px-2 py-1 bg-gray-100 rounded-full flex items-center gap-1 w-fit">
                          {ad.type === 'video' ? <Play size={10} /> : <ImageIcon size={10} />}
                          {ad.type}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-[10px] font-bold text-gray-500">
                          <span className="flex items-center gap-1"><TrendingUp size={10} /> {ad.views || 0} views</span>
                          <span className="flex items-center gap-1"><BarChart3 size={10} /> {ad.clicks || 0} clicks</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                          ad.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                        )}>
                          {ad.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => toggleAdStatus(ad)}
                            title={ad.active ? 'Unpublish' : 'Publish'}
                            className={cn(
                              "p-2 rounded-lg transition-all",
                              ad.active ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-primary-gold hover:bg-primary-gold/10"
                            )}
                          >
                            {ad.active ? <X size={18} /> : <CheckCircle size={18} />}
                          </button>
                          <button 
                            onClick={() => handleEditAd(ad)}
                            className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDeleteAd(ad)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {advertisements.length === 0 && !uploading && (
                <div className="py-20 text-center bg-gray-50">
                  <Megaphone className="mx-auto text-gray-300 mb-4" size={48} />
                  <p className="text-gray-500">No advertisements uploaded yet.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
