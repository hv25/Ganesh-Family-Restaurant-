import React, { useState } from 'react';
import { LayoutDashboard, Plus, Trash2, Edit, Save, X, CheckCircle, AlertCircle, TrendingUp, BarChart3, PieChart, Megaphone, Upload, Play, Image as ImageIcon } from 'lucide-react';
import { MenuCategory, MenuItem, UserProfile, Order, Advertisement } from '../types';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, writeBatch, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { db, storage, auth, handleFirestoreError, OperationType } from '../firebase';
import { INITIAL_MENU_DATA } from '../constants';
import { useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { RefreshCw } from 'lucide-react';

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
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [uploadProgress, setUploadProgress] = useState(0);

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
  
  const handleUploadAd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("handleUploadAd triggered");
    const file = e.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    const title = prompt("Enter a title for this advertisement:");
    if (!title) {
      e.target.value = '';
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Starting upload...');
    
    try {
      if (!auth.currentUser) {
        alert("You must be logged in to upload advertisements.");
        setUploading(false);
        return;
      }
      console.log("DEBUG: File object details:", {
        name: file.name,
        size: file.size,
        type: file.type,
        lastModified: file.lastModified
      });
      console.log("Starting upload for file:", file.name, "type:", file.type, "size:", file.size);
      const type = file.type.startsWith('video/') ? 'video' : 'image';
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
      const storageRef = ref(storage, `ads/${fileName}`);
      console.log("Storage ref created:", storageRef.fullPath);
      
      setUploadStatus('Uploading to storage...');
      const uploadResult = await uploadBytes(storageRef, file);
      console.log("Upload complete, getting download URL...");
      
      setUploadStatus('Getting download URL...');
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log("Download URL obtained:", downloadURL);
      
      setUploadStatus('Saving to Firestore...');
      console.log("Saving to Firestore with data:", { title, type, url: downloadURL });
      
      if (!downloadURL || !downloadURL.startsWith('http')) {
        throw new Error("Invalid download URL obtained from storage.");
      }

      const docRef = await addDoc(collection(db, 'advertisements'), {
        title,
        type,
        url: downloadURL,
        active: true,
        createdAt: serverTimestamp()
      });
      console.log("Firestore save complete! Doc ID:", docRef.id);
      
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      e.target.value = '';
      alert("Advertisement uploaded successfully!");
    } catch (error: any) {
      console.error("Upload failed with error:", error);
      setUploading(false);
      setUploadStatus('');
      setUploadProgress(0);
      e.target.value = '';
      alert(`Upload failed: ${error.message}. Please check your connection and try again.`);
    }
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
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-display">Local Advertisements</h2>
                <p className="text-gray-500">Manage promotional images and videos</p>
              </div>
              <div className="flex items-center gap-3">
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
                <div className="relative">
                  <input 
                    type="file" 
                    id="ad-upload" 
                    className="hidden" 
                    accept="image/*,video/*"
                    onChange={handleUploadAd}
                    disabled={uploading}
                  />
                  <label 
                    htmlFor="ad-upload"
                    className={cn(
                      "bg-dark-bg text-primary-gold px-6 py-3 rounded-xl font-bold flex items-center gap-2 cursor-pointer hover:bg-primary-gold hover:text-black transition-all shadow-lg",
                      uploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Upload size={20} />
                    {uploading ? uploadStatus : 'Upload New Ad'}
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {advertisements.map((ad) => (
                <div key={ad.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 group">
                  <div className="aspect-video bg-gray-100 relative overflow-hidden">
                    {ad.type === 'video' ? (
                      <video src={ad.url} className="w-full h-full object-cover" controls />
                    ) : (
                      <img src={ad.url} alt={ad.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    )}
                    <div className="absolute top-2 right-2">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                        ad.active ? "bg-green-500 text-white" : "bg-gray-500 text-white"
                      )}>
                        {ad.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg">{ad.title}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          {ad.type === 'video' ? <Play size={10} /> : <ImageIcon size={10} />}
                          {ad.type.toUpperCase()}
                        </p>
                      </div>
                      <button 
                        onClick={() => handleDeleteAd(ad)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <button 
                      onClick={() => toggleAdStatus(ad)}
                      className={cn(
                        "w-full py-2 rounded-lg font-bold text-sm transition-all border-2",
                        ad.active 
                          ? "border-gray-200 text-gray-500 hover:border-red-200 hover:text-red-500" 
                          : "border-primary-gold text-primary-gold hover:bg-primary-gold hover:text-black"
                      )}
                    >
                      {ad.active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </div>
              ))}
              {advertisements.length === 0 && !uploading && (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
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
