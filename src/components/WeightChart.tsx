import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ClinicalEvent } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Scale, Ruler } from 'lucide-react';

interface WeightChartProps {
  history: ClinicalEvent[];
}

const WeightChart: React.FC<WeightChartProps> = ({ history }) => {
  // Filter events that have weight or height and sort by date
  const data = history
    .filter(event => event.weight !== undefined || event.height !== undefined)
    .sort((a, b) => a.date.toMillis() - b.date.toMillis())
    .map(event => ({
      date: format(event.date.toDate(), 'dd/MM/yy', { locale: es }),
      timestamp: event.date.toMillis(),
      weight: event.weight,
      height: event.height,
    }));

  if (data.length === 0) {
    return (
      <Card className="border-none shadow-none bg-muted/30 rounded-[2rem] py-12">
        <CardContent className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center shadow-inner">
            <Scale className="w-8 h-8 text-muted-foreground/30" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-muted-foreground">Sin datos de evolución</p>
            <p className="text-sm text-muted-foreground/60 max-w-[200px]">
              Registra el peso y la talla en las consultas para ver el gráfico.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-none shadow-xl bg-card rounded-[2.5rem] overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            Evolución de Peso y Talla
          </CardTitle>
          <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-primary" /> Peso (kg)
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-indigo-500" /> Talla (cm)
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '1.5rem', 
                  border: 'none', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                  padding: '1rem'
                }}
                labelStyle={{ fontWeight: 900, marginBottom: '0.5rem', color: 'hsl(var(--primary))' }}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                name="Peso (kg)"
                stroke="hsl(var(--primary))" 
                strokeWidth={4}
                dot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                animationDuration={1500}
              />
              <Line 
                type="monotone" 
                dataKey="height" 
                name="Talla (cm)"
                stroke="#6366f1" 
                strokeWidth={4}
                dot={{ r: 6, strokeWidth: 2, fill: 'white' }}
                activeDot={{ r: 8, strokeWidth: 0 }}
                animationDuration={1500}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};

export default WeightChart;
