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

  // 1. Control de redirección automática para el Admin
  useEffect(() => {
    if (user) {
      if (user.email === 'imcorreamauricio@gmail.com') {
        // Si es el admin, no mostramos selección de clínica, mandamos al dashboard/admin
        window.location.href = '/dashboard'; 
        return;
      }
      
      if (!profile) {
        setSetupStep('clinic-choice');
      }
    } else {
      setSetupStep('auth');
    }
  }, [user, profile]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      // Redirección inmediata si es admin
      if (result.user.email === 'imcorreamauricio@gmail.com') {
        window.location.href = '/dashboard';
      } else {
        toast.success('Sesión iniciada con Google.');
      }
    } catch (error: any) {
      console.error(error);
      toast.error('Error al iniciar sesión con Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, email, password);
        if (result.user.email === 'imcorreamauricio@gmail.com') {
          window.location.href = '/dashboard';
        } else {
          toast.success('Bienvenido de nuevo.');
        }
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
      window.location.href = '/dashboard';
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

      window.location.href = '/dashboard';
    } catch (error) {
      console.error(error);
      toast.error('Error al unirse.');
    } finally {
      setLoading(false);
    }
  };

  // Renderizado de Auth (Login/Registro)
  if (setupStep === 'auth') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl overflow-hidden bg-white/80 backdrop-blur-md">
          <form onSubmit={handleSubmit}>
            <CardHeader className="space-y-1 pb-8 pt-10 px-8 text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 rotate-3 hover:rotate-0 transition-transform duration-500">
                <Stethoscope className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-black tracking-tighter text-slate-800">
                {isLogin ? 'VETCARE' : 'REGISTRO'}
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                {isLogin ? 'Ingresa tus credenciales premium' : 'Comienza a gestionar tu clínica hoy'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-8">
              {!isLogin && (
                <div className="space-y-2">
                  <Label className="text-xs font-black uppercase ml-1">Nombre Completo</Label>
                  <Input 
                    placeholder="Dr. Mauricio Correa"
                    className="rounded-xl h-12"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase ml-1">Email Profesional</Label>
                <Input 
                  type="email" 
                  placeholder="doctor@clinica.com" 
                  required 
                  className="rounded-xl h-12"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase ml-1">Contraseña</Label>
                <Input 
                  type="password" 
                  placeholder="••••••••"
                  required 
                  className="rounded-xl h-12"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 px-8 pb-10 pt-4">
              <Button className="w-full h-12 rounded-xl font-black" type="submit" disabled={loading}>
                {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button variant="outline" className="w-full h-12 rounded-xl gap-3" type="button" onClick={handleGoogleSignIn}>
                Google
              </Button>
              <Button variant="link" className="text-xs" type="button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  // Renderizado de Selección de Clínica (Solo para no-admins sin perfil)
  if (setupStep === 'clinic-choice') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-lg shadow-2xl border-none rounded-3xl p-8 bg-white/80 backdrop-blur-md">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Bienvenido</h2>
            <p className="text-slate-500 font-medium">Configura tu espacio de trabajo para continuar</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button 
              onClick={() => setSetupStep('create-clinic')}
              className="p-6 rounded-2xl border-2 border-primary/5 bg-white hover:border-primary/40 hover:shadow-xl transition-all text-left group"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Building2 className="text-primary" />
              </div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Crear Clínica</h3>
              <p className="text-xs text-slate-500 mt-1">Soy el dueño o administrador</p>
            </button>
            <button 
              onClick={() => setSetupStep('join-clinic')}
              className="p-6 rounded-2xl border-2 border-primary/5 bg-white hover:border-primary/40 hover:shadow-xl transition-all text-left group"
            >
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UserPlus className="text-slate-600" />
              </div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Unirme</h3>
              <p className="text-xs text-slate-500 mt-1">Tengo un código de acceso</p>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  // Creación de clínica
  if (setupStep === 'create-clinic') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl p-8 bg-white/80 backdrop-blur-md">
          <Button variant="ghost" className="mb-4" onClick={() => setSetupStep('clinic-choice')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Nueva Clínica</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Nombre de la Clínica</Label>
              <Input 
                placeholder="Ej. Veterinaria San Roque" 
                className="h-12 rounded-xl"
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
              />
            </div>
            <Button className="w-full h-12 rounded-xl font-black" onClick={handleCreateClinic} disabled={loading}>
              {loading ? 'Creando...' : 'Finalizar Configuración'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Unirse a clínica
  if (setupStep === 'join-clinic') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl p-8 bg-white/80 backdrop-blur-md">
          <Button variant="ghost" className="mb-4" onClick={() => setSetupStep('clinic-choice')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Volver
          </Button>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Unirse a Clínica</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Código de Acceso</Label>
              <Input 
                placeholder="CÓDIGO-123" 
                className="h-12 rounded-xl text-center font-bold tracking-widest"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>
            <Button className="w-full h-12 rounded-xl font-black" onClick={handleJoinClinic} disabled={loading}>
              {loading ? 'Validando...' : 'Unirse'}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default LoginView;
