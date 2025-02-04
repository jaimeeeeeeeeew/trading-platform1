import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import TransactionList from './TransactionList';
import { Activity } from 'lucide-react';

interface MetricsPanelProps {
  metrics: {
    direccion: number;
    dominancia: { left: number; right: number };
    delta_futuros: { positivo: number; negativo: number };
    delta_spot: { positivo: number; negativo: number };
    transacciones: Array<{ volume: string; price: string }>;
  };
  className?: string;
}

export default function MetricsPanel({ metrics, className = '' }: MetricsPanelProps) {
  // Calcular el total para los porcentajes de dominancia
  const dominanciaTotal = metrics.dominancia.left + metrics.dominancia.right;
  const leftPercentage = (metrics.dominancia.left / dominanciaTotal) * 100;
  const rightPercentage = (metrics.dominancia.right / dominanciaTotal) * 100;

  // Calcular porcentajes para los deltas
  const deltaFuturosTotal = metrics.delta_futuros.positivo + metrics.delta_futuros.negativo;
  const deltaFuturosPositivoPercentage = (metrics.delta_futuros.positivo / deltaFuturosTotal) * 100;
  const deltaFuturosNegativoPercentage = (metrics.delta_futuros.negativo / deltaFuturosTotal) * 100;

  const deltaSpotTotal = metrics.delta_spot.positivo + metrics.delta_spot.negativo;
  const deltaSpotPositivoPercentage = (metrics.delta_spot.positivo / deltaSpotTotal) * 100;
  const deltaSpotNegativoPercentage = (metrics.delta_spot.negativo / deltaSpotTotal) * 100;

  // Precio base para comparar la dirección
  const precioBase = 68500;

  return (
    <Card className={`p-4 flex flex-col bg-[rgb(26,26,26)] ${className}`}>
      <div className="space-y-4 flex-1">
        <div className="grid gap-4">
          <MetricCard
            label="Dirección"
            value={metrics.direccion.toLocaleString()}
            icon={<Activity className="h-4 w-4" />}
            valueClassName={metrics.direccion > precioBase ? 'text-primary' : 'text-destructive'}
          />

          <div className="space-y-2">
            <label className="text-sm font-medium">Dominancia</label>
            <div className="h-8 w-full rounded-lg overflow-hidden flex">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${leftPercentage}%` }}
              >
                <span className="text-xs text-primary-foreground flex items-center justify-center h-full">
                  {metrics.dominancia.left.toLocaleString()}
                </span>
              </div>
              <div 
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${rightPercentage}%` }}
              >
                <span className="text-xs text-destructive-foreground flex items-center justify-center h-full">
                  {metrics.dominancia.right.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delta Futuros</label>
            <div className="h-8 w-full rounded-lg overflow-hidden flex">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${deltaFuturosPositivoPercentage}%` }}
              >
                <span className="text-xs text-primary-foreground flex items-center justify-center h-full">
                  {metrics.delta_futuros.positivo.toLocaleString()}
                </span>
              </div>
              <div 
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${deltaFuturosNegativoPercentage}%` }}
              >
                <span className="text-xs text-destructive-foreground flex items-center justify-center h-full">
                  {metrics.delta_futuros.negativo.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Delta Spot</label>
            <div className="h-8 w-full rounded-lg overflow-hidden flex">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${deltaSpotPositivoPercentage}%` }}
              >
                <span className="text-xs text-primary-foreground flex items-center justify-center h-full">
                  {metrics.delta_spot.positivo.toLocaleString()}
                </span>
              </div>
              <div 
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${deltaSpotNegativoPercentage}%` }}
              >
                <span className="text-xs text-destructive-foreground flex items-center justify-center h-full">
                  {metrics.delta_spot.negativo.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        <TransactionList transactions={metrics.transacciones} />
      </div>
    </Card>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}

function MetricCard({ label, value, icon, valueClassName = '' }: MetricCardProps) {
  return (
    <div className="bg-[rgb(26,26,26)] rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={`text-lg font-semibold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}