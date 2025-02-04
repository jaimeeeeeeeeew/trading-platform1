import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from 'lucide-react';
import { useTrading } from '@/lib/trading-context';

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
    ask_limit: string;
    bid_limit: string;
    buy_market: string;
    sell_market: string;
  };
  className?: string;
}

export default function MetricsPanel({ metrics, className = '' }: MetricsPanelProps) {
  const { currentSymbol, setCurrentSymbol } = useTrading();

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
    <Card className={`p-4 flex flex-col bg-[rgb(26,26,26)] ${className}`}>
      <div className="space-y-4 flex-1">
        {/* Selector de Criptomoneda */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Criptomoneda</label>
          <Select
            value={currentSymbol}
            onValueChange={setCurrentSymbol}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona una criptomoneda" />
            </SelectTrigger>
            <SelectContent>
              {CRYPTOCURRENCIES.map((crypto) => (
                <SelectItem key={crypto.value} value={crypto.value}>
                  {crypto.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {/* Precios del Mercado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Precios del Mercado</label>
            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Ask Limit"
                value={metrics.ask_limit}
                icon={<Activity className="h-4 w-4" />}
                valueClassName="text-primary"
              />
              <MetricCard
                label="Bid Limit"
                value={metrics.bid_limit}
                icon={<Activity className="h-4 w-4" />}
                valueClassName="text-destructive"
              />
              <MetricCard
                label="Buy Market"
                value={metrics.buy_market}
                icon={<Activity className="h-4 w-4" />}
                valueClassName="text-primary"
              />
              <MetricCard
                label="Sell Market"
                value={metrics.sell_market}
                icon={<Activity className="h-4 w-4" />}
                valueClassName="text-destructive"
              />
            </div>
          </div>

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