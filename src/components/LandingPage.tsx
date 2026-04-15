import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  Calendar, 
  Bell, 
  FileText, 
  Download, 
  ShieldCheck, 
  Zap, 
  LayoutDashboard,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Heart
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';

interface LandingPageProps {
  onEnter: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onEnter }) => {
  const features = [
    {
      title: "Gestión de Clientes",
      description: "Base de datos centralizada de pacientes y propietarios con acceso instantáneo.",
      icon: <Users className="w-6 h-6 text-blue-500" />,
    },
    {
      title: "Recordatorios Automáticos",
      description: "Notificaciones inteligentes para citas, vacunas y tratamientos pendientes.",
      icon: <Bell className="w-6 h-6 text-emerald-500" />,
    },
    {
      title: "Agenda Inteligente",
      description: "Organiza tu día con un calendario visual y gestión de turnos eficiente.",
      icon: <Calendar className="w-6 h-6 text-indigo-500" />,
    },
    {
      title: "Historial Clínico",
      description: "Registros detallados, notas SOAP y evolución de cada paciente en un solo lugar.",
      icon: <Stethoscope className="w-6 h-6 text-rose-500" />,
    },
    {
      title: "Exportación PDF",
      description: "Genera recetas, certificados e informes profesionales con un solo clic.",
      icon: <FileText className="w-6 h-6 text-orange-500" />,
    },
    {
      title: "Control de Negocio",
      description: "Dashboard con métricas clave para entender el crecimiento de tu clínica.",
      icon: <LayoutDashboard className="w-6 h-6 text-cyan-500" />,
    }
  ];

  const benefits = [
    {
      title: "Ahorro de Tiempo",
      text: "Automatiza tareas repetitivas y enfócate en lo que importa: la salud animal.",
    },
    {
      title: "Organización Total",
      text: "Elimina el papel y los archivos físicos con una gestión 100% digital.",
    },
    {
      title: "Reducción de Ausencias",
      text: "Mejora la asistencia con recordatorios automáticos vía sistema.",
    }
  ];

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100">
      {/* Header / Nav */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
              <Heart className="w-6 h-6 text-white fill-white/20" />
            </div>
            <span className="text-xl font-black tracking-tight text-slate-800">VetCare <span className="text-blue-600">CRM</span></span>
          </div>
          <Button 
            onClick={onEnter}
            className="rounded-full px-6 bg-slate-900 hover:bg-slate-800 text-white font-bold transition-all hover:scale-105 active:scale-95"
          >
            Acceder al Sistema
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-50 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-50 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-black uppercase tracking-widest mb-8">
              <Zap className="w-3 h-3 fill-current" /> Gestión Veterinaria Inteligente
            </div>
            <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-8 leading-[1.1]">
              La plataforma definitiva para <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">tu clínica veterinaria.</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-12 font-medium leading-relaxed">
              Optimiza tu tiempo, organiza tus pacientes y haz crecer tu negocio con el CRM más intuitivo y potente del mercado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                onClick={onEnter}
                size="lg"
                className="h-16 px-10 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-lg font-bold shadow-2xl shadow-blue-200 transition-all hover:-translate-y-1"
              >
                Ver Dashboard <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <div className="flex items-center gap-2 text-slate-400 text-sm font-bold px-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Sin instalaciones complejas
              </div>
            </div>
          </motion.div>

          {/* Mockup Preview */}
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="mt-20 relative"
          >
            <div className="relative mx-auto max-w-5xl rounded-[2.5rem] border-[8px] border-slate-900/5 bg-slate-100 shadow-2xl overflow-hidden aspect-[16/9]">
              <img 
                src="https://picsum.photos/seed/vet-dashboard/1920/1080" 
                alt="Dashboard Preview" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-20 h-20 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-2xl cursor-pointer hover:scale-110 transition-transform">
                  <LayoutDashboard className="w-8 h-8 text-blue-600" />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Todo lo que necesitas para tu clínica</h2>
            <p className="text-slate-500 font-medium max-w-xl mx-auto">Diseñado por profesionales para profesionales. Herramientas potentes que se sienten naturales.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ y: -5 }}
                className="group"
              >
                <Card className="h-full border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-[2rem] overflow-hidden">
                  <CardContent className="p-10">
                    <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-black mb-4 text-slate-800">{feature.title}</h3>
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

      {/* Benefits Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-slate-900 rounded-[3rem] p-12 md:p-20 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-blue-600/10 blur-[100px] -z-0" />
            
            <div className="grid lg:grid-cols-2 gap-16 items-center relative z-10">
              <div>
                <h2 className="text-4xl md:text-5xl font-black text-white mb-8 leading-tight">
                  Enfócate en la salud animal, <br />
                  <span className="text-blue-400">nosotros nos encargamos del resto.</span>
                </h2>
                <div className="space-y-8">
                  {benefits.map((benefit, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="mt-1">
                        <CheckCircle2 className="w-6 h-6 text-blue-400" />
                      </div>
                      <div>
                        <h4 className="text-white font-black text-lg mb-1">{benefit.title}</h4>
                        <p className="text-slate-400 font-medium">{benefit.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block">
                <div className="relative">
                  <div className="absolute -inset-4 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
                  <img 
                    src="https://picsum.photos/seed/vet-care/800/800" 
                    alt="Vet Care" 
                    className="rounded-[2.5rem] shadow-2xl relative z-10"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <Heart className="w-5 h-5 text-white fill-white/20" />
            </div>
            <span className="text-lg font-black tracking-tight text-slate-800">VetCare <span className="text-blue-600">CRM</span></span>
          </div>
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
            © {new Date().getFullYear()} VetCare CRM • Todos los derechos reservados
          </p>
          <div className="flex items-center gap-6">
            <ShieldCheck className="w-5 h-5 text-slate-300" />
            <Zap className="w-5 h-5 text-slate-300" />
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
