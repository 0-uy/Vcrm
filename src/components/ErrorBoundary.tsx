import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { ShieldAlert, RefreshCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends (Component as any) {
  public state: any;
  
  constructor(props: any) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private renderErrorDetails(error: Error) {
    const message = error?.message;
    
    if (!message || message === 'undefined' || typeof message !== 'string' || message.trim() === 'undefined') {
      return (
        <div className="p-6 bg-destructive/5 rounded-2xl border border-destructive/10 text-left">
          <p className="text-sm font-bold text-destructive leading-relaxed">
            Ha ocurrido un error inesperado en la aplicación.
          </p>
        </div>
      );
    }

    try {
      // Only attempt to parse if it looks like a JSON object
      const trimmedMessage = message.trim();
      if (trimmedMessage.startsWith('{') && trimmedMessage.endsWith('}')) {
        const info = JSON.parse(trimmedMessage);
        if (info && typeof info === 'object' && info.error) {
          return (
            <div className="space-y-4 text-left">
              <div className="p-4 bg-muted/50 rounded-2xl border border-border space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Error de Firestore</p>
                <p className="text-sm font-bold text-destructive">{info.error}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Operación</p>
                  <p className="text-[10px] font-bold uppercase">{info.operationType || 'N/A'}</p>
                </div>
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Ruta</p>
                  <p className="text-[10px] font-bold truncate">{info.path || 'N/A'}</p>
                </div>
              </div>
              {info.authInfo && (
                <div className="p-3 bg-muted/30 rounded-xl border border-border/50">
                  <p className="text-[8px] font-black uppercase tracking-widest text-muted-foreground mb-1">Usuario</p>
                  <p className="text-[10px] font-bold truncate">{info.authInfo.email || info.authInfo.userId || 'N/A'}</p>
                </div>
              )}
            </div>
          );
        }
      }
      
      // Fallback for non-JSON or unexpected JSON structure
      return (
        <div className="p-6 bg-destructive/5 rounded-2xl border border-destructive/10 text-left">
          <p className="text-sm font-bold text-destructive leading-relaxed">
            {message}
          </p>
        </div>
      );
    } catch (e) {
      // Fallback for parsing errors
      return (
        <div className="p-6 bg-destructive/5 rounded-2xl border border-destructive/10 text-left">
          <p className="text-sm font-bold text-destructive leading-relaxed">
            {message}
          </p>
        </div>
      );
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-destructive/10 rounded-full blur-[120px]" />
          </div>

          <Card className="max-w-md w-full border-none shadow-2xl rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
            <CardHeader className="p-10 pb-4 text-center space-y-4">
              <div className="w-20 h-20 bg-destructive/10 text-destructive rounded-3xl flex items-center justify-center mx-auto shadow-inner rotate-3">
                <ShieldAlert className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <CardTitle className="text-3xl font-black tracking-tight">¡Ups! Algo salió mal</CardTitle>
                <CardDescription className="text-sm font-medium">
                  La aplicación ha encontrado un error crítico y no puede continuar.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="p-10 pt-0 text-center space-y-8">
              {this.renderErrorDetails(this.state.error)}
              
              <div className="flex flex-col gap-3">
                <Button 
                  className="w-full h-12 rounded-xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20 gap-2"
                  onClick={this.handleReset}
                >
                  <RefreshCcw className="w-4 h-4" /> Reiniciar Aplicación
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full h-12 rounded-xl font-bold gap-2"
                  onClick={() => window.location.href = '/'}
                >
                  <Home className="w-4 h-4" /> Ir al Inicio
                </Button>
              </div>
              
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">
                VetCare CRM Error Recovery System
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

