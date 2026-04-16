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

  // Control de flujo: Si el usuario existe pero no tiene perfil en Firestore, pedimos configurar clínica
  useEffect(() => {
    if (user && !profile && !loading) {
      setSetupStep('clinic-choice');
    }
  }, [user, profile, loading]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    
    // OBLIGA A GOOGLE A MOSTRAR EL SELECTOR DE CUENTAS
    provider.setCustomParameters({
      prompt: 'select_account'
    });

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
              
              <div className="relative w-full my-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold">O</span></div>
              </div>

              <Button 
                variant="outline" 
                className="w-full h-12 rounded-xl gap-3 border-slate-200 hover:bg-slate-50 font-bold" 
                type="button" 
                onClick={handleGoogleSignIn}
                disabled={loading}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continuar con Google
              </Button>

              <Button variant="link" className="text-xs font-bold text-slate-500" type="button" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  if (setupStep === 'clinic-choice') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-lg shadow-2xl border-none rounded-3xl p-8 bg-white/80 backdrop-blur-md text-center">
          <h2 className="text-3xl font-black tracking-tight text-slate-800 uppercase mb-2">Bienvenido</h2>
          <p className="text-slate-500 font-medium mb-8">Configura tu espacio de trabajo para continuar</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button onClick={() => setSetupStep('create-clinic')} className="p-6 rounded-2xl border-2 border-primary/5 bg-white hover:border-primary/40 hover:shadow-xl transition-all text-left group">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Building2 className="text-primary" /></div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Crear Clínica</h3>
              <p className="text-xs text-slate-500 mt-1">Dueño o administrador</p>
            </button>
            <button onClick={() => setSetupStep('join-clinic')} className="p-6 rounded-2xl border-2 border-primary/5 bg-white hover:border-primary/40 hover:shadow-xl transition-all text-left group">
              <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><UserPlus className="text-slate-600" /></div>
              <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Unirme</h3>
              <p className="text-xs text-slate-500 mt-1">Tengo un código</p>
            </button>
          </div>
        </Card>
      </div>
    );
  }

  if (setupStep === 'create-clinic') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl p-8 bg-white/80 backdrop-blur-md">
          <Button variant="ghost" className="mb-4" onClick={() => setSetupStep('clinic-choice')}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Nueva Clínica</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Nombre de la Clínica</Label>
              <Input placeholder="Ej. Veterinaria San Roque" className="h-12 rounded-xl" value={clinicName} onChange={e => setClinicName(e.target.value)} />
            </div>
            <Button className="w-full h-12 rounded-xl font-black" onClick={handleCreateClinic} disabled={loading}>{loading ? 'Creando...' : 'Finalizar Configuración'}</Button>
          </div>
        </Card>
      </div>
    );
  }

  if (setupStep === 'join-clinic') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <Card className="w-full max-w-md shadow-2xl border-none rounded-3xl p-8 bg-white/80 backdrop-blur-md">
          <Button variant="ghost" className="mb-4" onClick={() => setSetupStep('clinic-choice')}><ArrowLeft className="w-4 h-4 mr-2" /> Volver</Button>
          <h2 className="text-2xl font-black mb-6 uppercase tracking-tight">Unirse a Clínica</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase">Código de Acceso</Label>
              <Input placeholder="CÓDIGO-123" className="h-12 rounded-xl text-center font-bold tracking-widest" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} />
            </div>
            <Button className="w-full h-12 rounded-xl font-black" onClick={handleJoinClinic} disabled={loading}>{loading ? 'Validando...' : 'Unirse'}</Button>
          </div>
        </Card>
      </div>
    );
  }

  return null;
};

export default LoginView;
