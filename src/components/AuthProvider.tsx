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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  clinic: null,
  loading: true,
  isAuthReady: false,
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
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
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
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
    <AuthContext.Provider value={{ user, profile, clinic, loading, isAuthReady }}>
      {children}
    </AuthContext.Provider>
  );
};
