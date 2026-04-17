import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Stethoscope, Building2, UserPlus, ArrowRight, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface LoginViewProps {
  onBack?: () => void;
}

const LoginView: React.FC<LoginViewProps> = ({ onBack }) => {
  const { user, profile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [setupStep, setSetupStep] = useState<'auth' | 'clinic-choice' | 'create-clinic' | 'join-clinic'>('auth');
  const [clinicName, setClinicName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (user && !profile && !loading) {
      setSetupStep('clinic-choice');
    }
  }, [user, profile, loading]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      await signInWithPopup(auth, provider);
      toast.success('Sincronizando con Google...');
    } catch (error: any) {
      console.error(error);
      if (error.code !== 'auth/cancelled-popup-request') {
        toast.error('Error al iniciar sesión con Google.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bienvenido de nuevo.');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;
        await updateProfile(newUser, { displayName });
        toast.success('Cuenta creada exitosamente.');
      }
    } catch (error: any) {
      console.error(error);
      let message = 'Error al autenticar.';
      if (error.code === 'auth/email-already-in-use') message = 'Este correo ya está registrado.';
      else if (error.code === 'auth/weak-password') message = 'La contraseña es muy débil.';
      else if (error.code === 'auth/invalid-credential') message = 'Credenciales incorrectas.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClinic = async () => {
    if (!user || !clinicName) return;
    setLoading(true);
    try {
      const clinicId = `clinic-${Math.random().toString(36).substr(2, 9)}`;
      const newJoinCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await setDoc(doc(db, 'clinics', clinicId), {
        id: clinicId,
        name: clinicName,
        joinCode: newJoinCode,
        ownerUid: user.uid,
        createdAt: Timestamp.now(),
        status: 'trial',
        plan: 'Trial',
        expiresAt: Timestamp.fromDate(expiresAt),
      });

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName,
        role: 'clinic_admin',
        clinicId: clinicId,
      });

      toast.success(`Clínica "${clinicName}" creada.`);

      // 🔥 FIX
      setSetupStep('auth');

    } catch (error) {
      console.error(error);
      toast.error('Error al crear la clínica.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinClinic = async () => {
    if (!user || !joinCode) return;
    setLoading(true);
    try {
      const q = query(collection(db, 'clinics'), where('joinCode', '==', joinCode.toUpperCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        toast.error('Código inválido.');
        return;
      }

      const clinicDoc = querySnapshot.docs[0];

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName,
        role: 'staff',
        clinicId: clinicDoc.id,
      });

      toast.success('Te has unido a la clínica.');

      // 🔥 FIX
      setSetupStep('auth');

    } catch (error) {
      console.error(error);
      toast.error('Error al unirse.');
    } finally {
      setLoading(false);
    }
  };

  if (setupStep === 'auth') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-8 pt-10 px-8 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black">
                {isLogin ? 'VETCARE' : 'REGISTRO'}
              </CardTitle>
              <CardDescription>
                {isLogin ? 'Ingresa tus credenciales' : 'Crea tu cuenta'}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 px-8">
              {!isLogin && (
                <Input placeholder="Nombre" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              )}
              <Input type="email" placeholder="Email" required value={email} onChange={e => setEmail(e.target.value)} />
              <Input type="password" placeholder="Contraseña" required value={password} onChange={e => setPassword(e.target.value)} />
            </CardContent>

            <CardFooter className="flex flex-col gap-4 px-8 pb-10">
              <Button type="submit" disabled={loading}>
                {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
              </Button>

              <Button type="button" onClick={handleGoogleSignIn}>
                Google
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  if (setupStep === 'clinic-choice') {
    return (
      <div>
        <button onClick={() => setSetupStep('create-clinic')}>Crear Clínica</button>
        <button onClick={() => setSetupStep('join-clinic')}>Unirme</button>
      </div>
    );
  }

  if (setupStep === 'create-clinic') {
    return (
      <div>
        <Input value={clinicName} onChange={e => setClinicName(e.target.value)} />
        <Button onClick={handleCreateClinic}>Crear</Button>
      </div>
    );
  }

  if (setupStep === 'join-clinic') {
    return (
      <div>
        <Input value={joinCode} onChange={e => setJoinCode(e.target.value)} />
        <Button onClick={handleJoinClinic}>Unirme</Button>
      </div>
    );
  }

  return null;
};

export default LoginView;

