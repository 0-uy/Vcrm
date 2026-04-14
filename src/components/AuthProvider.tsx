import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserProfile, Clinic } from '../types';
import { handleFirestoreError, OperationType } from '../lib/firestore-utils';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  clinic: Clinic | null;
  loading: boolean;
  isAuthReady: boolean;
  updateProfileName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  clinic: null,
  loading: true,
  isAuthReady: false,
  updateProfileName: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const updateProfileName = async (name: string) => {
    if (!user) {
      // Fallback to localStorage if not authenticated (though unlikely in this app structure)
      localStorage.setItem('vcrm_guest_name', name);
      return;
    }

    try {
      const userRef = doc(db, 'users', user.uid);
      const updateData: any = { 
        displayName: name,
        uid: user.uid,
        email: user.email || ''
      };

      await setDoc(userRef, updateData, { merge: true });
      setProfile(prev => prev ? { ...prev, displayName: name } : {
        uid: user.uid,
        email: user.email || '',
        displayName: name,
        role: 'staff', // Default role if creating from here
        clinicId: ''   // Will be updated during clinic setup
      } as UserProfile);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        let retries = 3;
        while (retries > 0) {
          try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
              const userData = userDoc.data() as UserProfile;
              setProfile(userData);
              
              if (userData.clinicId) {
                const clinicDoc = await getDoc(doc(db, 'clinics', userData.clinicId));
                if (clinicDoc.exists()) {
                  setClinic({ id: clinicDoc.id, ...clinicDoc.data() } as Clinic);
                }
              }
            } else {
              setProfile(null);
              setClinic(null);
            }
            break; // Success, exit retry loop
          } catch (error) {
            retries--;
            if (retries === 0) {
              handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
            } else {
              // Wait 1s before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } else {
        setProfile(null);
        setClinic(null);
      }
      setLoading(false);
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      clinic, 
      loading, 
      isAuthReady, 
      updateProfileName: updateProfileName || (async () => { console.warn('updateProfileName not initialized'); }) 
    }}>
      {children}
    </AuthContext.Provider>
  );
};
