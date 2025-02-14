import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from 'lucide-react';
import { useTrading } from '@/lib/trading-context';
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { DominanceControl } from './DominanceControl';
import { useState } from 'react';

// Lista de criptomonedas disponibles
const CRYPTOCURRENCIES = [
  { value: 'BINANCE:BTCUSDT', label: 'Bitcoin (BTC)' },
  { value: 'BINANCE:ETHUSDT', label: 'Ethereum (ETH)' },
  { value: 'BINANCE:ADAUSDT', label: 'Cardano (ADA)' },
  { value: 'BINANCE:SOLUSDT', label: 'Solana (SOL)' },
  { value: 'BINANCE:DOGEUSDT', label: 'Dogecoin (DOGE)' },
];

interface MetricsPanelProps {
  metrics: {
    direccion: number;
    dominancia: { left: number; right: number };
    delta_futuros: { positivo: number; negativo: number };
    delta_spot: { positivo: number; negativo: number };
  };
  className?: string;
  dominanceData: {
    bidsTotalInRange: number;
    asksTotalInRange: number;
    dominancePercentage: number;
    btcAmount: number;
  };
  onDominancePercentageChange: (value: number) => void;
  dominancePercentage: number;
}

export default function MetricsPanel({ 
  metrics, 
  className = '', 
  dominanceData,
  onDominancePercentageChange,
  dominancePercentage
}: MetricsPanelProps) {
  const { currentSymbol, setCurrentSymbol } = useTrading();
  const [showMetrics, setShowMetrics] = useState(true);

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

  return (
    <Card className={`p-2 flex flex-col bg-[rgb(26,26,26)] ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          <span className="text-xs font-medium">Panel Métricas</span>
        </div>
        <div className="flex items-center gap-1">
          <Label htmlFor="metrics-switch" className="text-[10px]">
            Métricas
          </Label>
          <Switch
            id="metrics-switch"
            checked={showMetrics}
            onCheckedChange={setShowMetrics}
            className="h-4 w-7"
          />
        </div>
      </div>

      <div className="space-y-2 flex-1">
        <Select
          value={currentSymbol}
          onValueChange={setCurrentSymbol}
        >
          <SelectTrigger className="w-full h-7 text-xs">
            <SelectValue placeholder="Selecciona una criptomoneda" />
          </SelectTrigger>
          <SelectContent>
            {CRYPTOCURRENCIES.map((crypto) => (
              <SelectItem key={crypto.value} value={crypto.value} className="text-xs">
                {crypto.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {showMetrics ? (
          <div className="grid gap-2">
            <MetricCard
              label="Dirección"
              value={metrics.direccion.toLocaleString()}
              icon={<Activity className="h-3 w-3" />}
              valueClassName={metrics.direccion > 68500 ? 'text-primary' : 'text-destructive'}
            />

            <div className="space-y-1">
              <label className="text-[10px] font-medium">Dominancia</label>
              <div className="h-6 w-full rounded-lg overflow-hidden flex">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${leftPercentage}%` }}
                >
                  <span className="text-[10px] text-primary-foreground flex items-center justify-center h-full">
                    {metrics.dominancia.left.toLocaleString()}
                  </span>
                </div>
                <div 
                  className="bg-destructive h-full transition-all duration-300"
                  style={{ width: `${rightPercentage}%` }}
                >
                  <span className="text-[10px] text-destructive-foreground flex items-center justify-center h-full">
                    {metrics.dominancia.right.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium">Delta Futuros</label>
              <div className="h-6 w-full rounded-lg overflow-hidden flex">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${deltaFuturosPositivoPercentage}%` }}
                >
                  <span className="text-[10px] text-primary-foreground flex items-center justify-center h-full">
                    {metrics.delta_futuros.positivo.toLocaleString()}
                  </span>
                </div>
                <div 
                  className="bg-destructive h-full transition-all duration-300"
                  style={{ width: `${deltaFuturosNegativoPercentage}%` }}
                >
                  <span className="text-[10px] text-destructive-foreground flex items-center justify-center h-full">
                    {metrics.delta_futuros.negativo.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-medium">Delta Spot</label>
              <div className="h-6 w-full rounded-lg overflow-hidden flex">
                <div 
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${deltaSpotPositivoPercentage}%` }}
                >
                  <span className="text-[10px] text-primary-foreground flex items-center justify-center h-full">
                    {metrics.delta_spot.positivo.toLocaleString()}
                  </span>
                </div>
                <div 
                  className="bg-destructive h-full transition-all duration-300"
                  style={{ width: `${deltaSpotNegativoPercentage}%` }}
                >
                  <span className="text-[10px] text-destructive-foreground flex items-center justify-center h-full">
                    {metrics.delta_spot.negativo.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <DominanceControl
            percentage={dominancePercentage}
            onPercentageChange={onDominancePercentageChange}
            dominanceData={dominanceData}
          />
        )}
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
    <div className="bg-[rgb(26,26,26)] rounded-lg p-2 space-y-1">
      <div className="flex items-center gap-1">
        {icon}
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      <div className={`text-sm font-semibold ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}