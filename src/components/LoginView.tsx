import React, { useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  User
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Stethoscope, Building2, UserPlus, ArrowRight } from 'lucide-react';
import { useAuth } from './AuthProvider';

const LoginView: React.FC = () => {
  const { user, profile } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Clinic Setup State
  const [setupStep, setSetupStep] = useState<'auth' | 'clinic-choice' | 'create-clinic' | 'join-clinic'>('auth');
  const [clinicName, setClinicName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  useEffect(() => {
    if (user && !profile) {
      setSetupStep('clinic-choice');
    } else {
      setSetupStep('auth');
    }
  }, [user, profile]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast.success('Sesión iniciada con Google.');
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
        await signInWithEmailAndPassword(auth, email, password);
        toast.success('Bienvenido de nuevo.');
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await updateProfile(user, { displayName });
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
      
      // 1. Create Clinic
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days trial

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

      // 2. Create User Profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName,
        role: 'clinic_admin',
        clinicId: clinicId,
      });

      toast.success(`Clínica "${clinicName}" creada. Código de acceso: ${newJoinCode}`);
      window.location.reload(); // Force refresh to update AuthProvider state
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
        toast.error('Código de clínica no válido.');
        setLoading(false);
        return;
      }

      const clinicData = querySnapshot.docs[0].data();
      
      // Create User Profile
      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || displayName,
        role: 'staff',
        clinicId: clinicData.id,
      });

      toast.success(`Te has unido a "${clinicData.name}".`);
      window.location.reload();
    } catch (error) {
      console.error(error);
      toast.error('Error al unirse a la clínica.');
    } finally {
      setLoading(false);
    }
  };

  if (setupStep === 'clinic-choice') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-[450px]">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Configuración de Clínica</CardTitle>
            <CardDescription>Bienvenido, {user?.displayName || 'Colega'}. Para continuar, necesitas una clínica.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 items-center justify-center border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => setSetupStep('create-clinic')}
            >
              <Building2 className="w-6 h-6 text-primary" />
              <div className="text-sm font-semibold">Crear una nueva clínica</div>
            </Button>
            <Button 
              variant="outline" 
              className="h-24 flex flex-col gap-2 items-center justify-center border-2 hover:border-primary hover:bg-primary/5 transition-all"
              onClick={() => setSetupStep('join-clinic')}
            >
              <UserPlus className="w-6 h-6 text-primary" />
              <div className="text-sm font-semibold">Unirse a una clínica existente</div>
            </Button>
          </CardContent>
          <CardFooter>
            <Button variant="ghost" className="w-full text-xs" onClick={() => auth.signOut()}>Cerrar Sesión</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (setupStep === 'create-clinic') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-[400px]">
          <CardHeader>
            <CardTitle>Crear Clínica</CardTitle>
            <CardDescription>Define el nombre de tu centro veterinario.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nombre de la Clínica</Label>
              <Input 
                id="clinicName" 
                placeholder="Veterinaria San Roque" 
                value={clinicName}
                onChange={e => setClinicName(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleCreateClinic} disabled={loading || !clinicName}>
              {loading ? 'Creando...' : 'Confirmar y Crear'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setSetupStep('clinic-choice')}>Volver</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (setupStep === 'join-clinic') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-[400px]">
          <CardHeader>
            <CardTitle>Unirse a Clínica</CardTitle>
            <CardDescription>Ingresa el código de 6 caracteres proporcionado por tu administrador.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="joinCode">Código de Acceso</Label>
              <Input 
                id="joinCode" 
                placeholder="ABC123" 
                className="text-center text-2xl font-mono tracking-widest uppercase"
                maxLength={6}
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button className="w-full" onClick={handleJoinClinic} disabled={loading || joinCode.length < 6}>
              {loading ? 'Verificando...' : 'Unirse ahora'}
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setSetupStep('clinic-choice')}>Volver</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Decorative background elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <Card className="w-full max-w-[420px] border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-700">
        <CardHeader className="space-y-2 text-center pt-10 pb-6">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center text-primary-foreground shadow-2xl shadow-primary/30 rotate-3 animate-in slide-in-from-top-4 duration-1000">
              <Stethoscope className="w-8 h-8" />
            </div>
          </div>
          <CardTitle className="text-3xl font-black tracking-tight">VetCare CRM</CardTitle>
          <CardDescription className="text-sm font-medium px-6">
            {isLogin ? 'Ingresa tus credenciales para acceder al sistema' : 'Crea una cuenta profesional para tu clínica veterinaria'}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5 px-8">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Nombre Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Dr. Juan Pérez" 
                  required 
                  className="rounded-xl h-12 border-border bg-card shadow-sm focus:shadow-md transition-all"
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Email Profesional</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="doctor@clinica.com" 
                required 
                className="rounded-xl h-12 border-border bg-card shadow-sm focus:shadow-md transition-all"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Contraseña</Label>
              <Input 
                id="password" 
                type="password" 
                placeholder="••••••••"
                required 
                className="rounded-xl h-12 border-border bg-card shadow-sm focus:shadow-md transition-all"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-5 px-8 pb-10 pt-4">
            <Button className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 group" type="submit" disabled={loading}>
              {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>

            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-primary/5" />
              </div>
              <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                <span className="bg-background px-4 text-muted-foreground">O continuar con</span>
              </div>
            </div>

            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl gap-3 font-bold border-primary/10 hover:bg-primary/5 transition-all" 
              type="button"
              onClick={handleGoogleSignIn} 
              disabled={loading}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.67-.35-1.39-.35-2.09s.13-1.42.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>

            <Button 
              variant="link" 
              className="text-xs font-bold text-primary/70 hover:text-primary transition-colors" 
              type="button"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? '¿No tienes cuenta? Regístrate gratis' : '¿Ya tienes cuenta? Inicia sesión aquí'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default LoginView;
