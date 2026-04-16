import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  Bell, 
  FileText, 
  ShieldCheck, 
  Zap, 
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Heart,
  Sparkles
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

// IMPORTACIÓN DE TUS FOTOS DESDE ASSETS
import clinicHero1 from '../assets/clinic-hero.webp';
import clinicHero2 from '../assets/clinic-hero2.webp';
import clinicHero3 from '../assets/clinic-hero3.webp';
import clinicHero4 from '../assets/clinic-hero4.webp';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const features = [
    {
      title: "Gestión de Pacientes",
      description: "Fichas clínicas digitales con historial completo y evolución en tiempo real.",
      icon: <Users className="w-6 h-6 text-blue-500" />,
    },
    {
      title: "Recordatorios Pro",
      description: "Notificaciones automáticas para vacunas y citas vía sistema.",
      icon: <Bell className="w-6 h-6 text-emerald-500" />,
    },
    {
      title: "Agenda Inteligente",
      description: "Organiza tu día con un calendario visual diseñado para la eficiencia.",
      icon: <Calendar className="w-6 h-6 text-indigo-500" />,
    },
    {
      title: "Historial Clínico",
      description: "Registros detallados, notas SOAP y carga de estudios multimedia.",
      icon: <Stethoscope className="w-6 h-6 text-rose-500" />,
    },
    {
      title: "Reportes & PDF",
      description: "Genera recetas y certificados profesionales con un solo clic.",
      icon: <FileText className="w-6 h-6 text-orange-500" />,
    },
    {
      title: "Analytics",
      description: "Dashboard con métricas clave para entender el crecimiento de tu clínica.",
      icon: <LayoutDashboard className="w-6 h-6 text-cyan-500" />,
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navegación Estilo Glassmorphism */}
      <nav className="fixed top-0 w-full z-[100] bg-white/70 backdrop-blur-xl border-b border-slate-100/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200 rotate-3 group-hover:rotate-0 transition-transform">
              <Heart className="w-6 h-6 text-white fill-white/20" />
            </div>
            <span className="text-xl font-black tracking-tighter text-slate-800 uppercase">VetCare <span className="text-blue-600">CRM</span></span>
          </div>
          <Button 
            onClick={onEnter}
            className="rounded-full px-8 bg-slate-900 hover:bg-blue-600 text-white font-bold transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-200"
          >
            Acceder al Sistema
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-50/60 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-50/60 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.3em] mb-10">
              <Sparkles className="w-3 h-3 fill-current" /> Gestión Veterinaria de Élite
            </div>
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-slate-900 mb-8 leading-[0.85]">
              Tu clínica, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-blue-600 to-blue-800">evolucionada.</span>
            </h1>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              La plataforma definitiva para médicos veterinarios que buscan orden, 
              profesionalismo y eficiencia en un solo lugar.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <Button 
                onClick={onEnter}
                size="lg"
                className="h-16 px-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-black shadow-[0_20px_40px_-10px_rgba(37,99,235,0.4)] transition-all hover:-translate-y-1"
              >
                Comenzar ahora <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-bold uppercase tracking-widest">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Cloud Premium
              </div>
            </div>
          </motion.div>

          {/* Main Showcase con clinicHero1 */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="mt-24 relative"
          >
            <div className="relative mx-auto max-w-6xl rounded-[3rem] border-[12px] border-slate-900/5 bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] overflow-hidden aspect-[16/9]">
              <img 
                src={clinicHero1} 
                alt="VetCare Dashboard" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/10 to-transparent" />
            </div>
            
            {/* Elemento Flotante con clinicHero4 */}
            <div className="absolute -bottom-12 -left-12 hidden lg:block w-56 h-56 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <img src={clinicHero4} alt="Detail" className="w-full h-full object-cover" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Características Grid */}
      <section className="py-32 bg-slate-50/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-24">
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter text-slate-900 mb-6 uppercase">Potencia Médica</h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto text-lg leading-relaxed">Todo lo que necesitas para que tu única preocupación sea la salud de tus pacientes.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -10 }}
                className="group"
              >
                <Card className="h-full border-none shadow-[0_10px_30px_-15px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 rounded-[2.5rem] overflow-hidden bg-white">
                  <CardContent className="p-12">
                    <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 group-hover:bg-blue-600 transition-all duration-500">
                      {React.cloneElement(feature.icon as React.ReactElement, { className: "w-7 h-7 transition-colors group-hover:text-white" })}
                    </div>
                    <h3 className="text-2xl font-black mb-4 text-slate-800 tracking-tight uppercase">{feature.title}</h3>
                    <p className="text-slate-500 font-medium leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Sección con clinicHero2 */}
      <section className="py-32 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-24 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-blue-100/50 rounded-[4rem] -rotate-2 -z-10" />
              <img 
                src={clinicHero2} 
                alt="Evolución" 
                className="rounded-[3rem] shadow-2xl w-full aspect-square object-cover"
              />
            </motion.div>
            <div className="space-y-10">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-[0.9] text-slate-900 uppercase">
                Enfócate en la vida, <br />
                <span className="text-blue-600 font-black">no en el papel.</span>
              </h2>
              <div className="space-y-6">
                {[
                  "Acceso instantáneo desde cualquier dispositivo.",
                  "Historial clínico encriptado y seguro.",
                  "Recordatorios automáticos inteligentes.",
                  "Generación de recetas profesionales."
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <span className="font-bold text-slate-700 text-lg">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / CTA con clinicHero3 */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-slate-900 rounded-[4rem] p-12 md:p-24 overflow-hidden text-center">
            {/* Imagen de fondo con overlay */}
            <img src={clinicHero3} className="absolute inset-0 w-full h-full object-cover opacity-40" alt="CTA BG" />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent" />
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-black text-white mb-8 leading-tight tracking-tighter uppercase">
                Digitaliza tu pasión <br />veterinaria
              </h2>
              <p className="text-blue-100/60 text-xl mb-12 font-medium">
                Únete a las clínicas que ya han transformado su gestión con VetCare CRM.
              </p>
              <Button 
                onClick={onEnter}
                size="lg"
                className="h-20 px-16 rounded-2xl bg-white hover:bg-blue-50 text-blue-600 text-xl font-black shadow-2xl transition-all hover:scale-105"
              >
                Empezar Ahora
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="py-20 bg-white border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="flex flex-col items-center md:items-start gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
                <Heart className="w-5 h-5 text-white fill-white/20" />
              </div>
              <span className="text-lg font-black tracking-tighter text-slate-800 uppercase">VetCare CRM</span>
            </div>
            <p className="text-slate-400 text-[10px] font-black tracking-[0.3em] uppercase">© 2026 Nodepath Solutions</p>
          </div>
          
          <div className="flex gap-8 text-slate-400 font-bold text-xs uppercase tracking-widest">
            <a href="#" className="hover:text-blue-600 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Términos</a>
            <a href="#" className="hover:text-blue-600 transition-colors">Soporte</a>
          </div>

          <div className="flex items-center gap-4">
            <ShieldCheck className="w-5 h-5 text-slate-200" />
            <Zap className="w-5 h-5 text-slate-200" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
