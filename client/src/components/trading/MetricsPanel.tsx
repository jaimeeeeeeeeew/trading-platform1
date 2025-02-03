import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import TransactionList from './TransactionList';
import { ArrowUp, ArrowDown, Activity, Waves } from 'lucide-react';

interface MetricsPanelProps {
  metrics: {
    direccion: number;
    dominancia: { left: number; right: number };
    delta_futuros: number;
    delta_spot: number;
    transacciones: Array<{ volume: string; price: string }>;
  };
  className?: string;
}

export default function MetricsPanel({ metrics, className = '' }: MetricsPanelProps) {
  return (
    <Card className={`p-4 flex flex-col ${className}`}>
      <div className="space-y-4 flex-1">
        <div className="grid gap-4">
          <MetricCard
            label="Dirección"
            value={metrics.direccion.toLocaleString()}
            icon={<Activity className="h-4 w-4" />}
          />
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Dominancia</label>
            <div className="flex gap-2 items-center">
              <div className="flex-1 bg-primary/10 rounded-lg p-2 text-center">
                <span className="text-sm text-primary">
                  {metrics.dominancia.left.toLocaleString()}
                </span>
              </div>
              <div className="flex-1 bg-destructive/10 rounded-lg p-2 text-center">
                <span className="text-sm text-destructive">
                  {metrics.dominancia.right.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <MetricCard
            label="Delta Futuros"
            value={metrics.delta_futuros.toLocaleString()}
            icon={<ArrowUp className="h-4 w-4" />}
            valueClassName={metrics.delta_futuros >= 0 ? 'text-primary' : 'text-destructive'}
          />

          <MetricCard
            label="Delta Spot"
            value={metrics.delta_spot.toLocaleString()}
            icon={<ArrowDown className="h-4 w-4" />}
            valueClassName={metrics.delta_spot >= 0 ? 'text-primary' : 'text-destructive'}
          />
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
    <div className="bg-card rounded-lg p-3 space-y-2">
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
