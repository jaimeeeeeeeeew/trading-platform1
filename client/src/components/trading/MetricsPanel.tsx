import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from 'lucide-react';
import { useTrading } from '@/lib/trading-context';
import { useBinxData } from '@/lib/use-binx-data';
import { Skeleton } from '@/components/ui/skeleton';

// Lista de criptomonedas disponibles en BINX
const CRYPTOCURRENCIES = [
  { value: 'BINX:BTCUSDT', label: 'Bitcoin (BTC)' },
  { value: 'BINX:ETHUSDT', label: 'Ethereum (ETH)' },
  { value: 'BINX:SOLBTC', label: 'Solana (SOL)' },
  { value: 'BINX:ARBUSDT', label: 'Arbitrum (ARB)' },
  { value: 'BINX:BNBUSDT', label: 'Binance Coin (BNB)' },
];

interface MetricCardProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  valueClassName?: string;
}

function MetricCard({ label, value, icon, valueClassName = '' }: MetricCardProps) {
  return (
    <div className="bg-card-foreground/5 rounded-lg p-2 space-y-1">
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

export default function MetricsPanel() {
  const { currentSymbol, setCurrentSymbol } = useTrading();
  const { marketData, error } = useBinxData(currentSymbol);

  if (error) {
    return (
      <Card className="p-4 space-y-2">
        <p className="text-sm text-destructive">Error al cargar datos de BINX</p>
        <p className="text-xs text-muted-foreground">
          Verifica tu conexión y las credenciales de la API
        </p>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card className="p-4 space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </Card>
    );
  }

  // Calcular porcentajes
  const dominanciaTotal = marketData.dominancia.left + marketData.dominancia.right;
  const leftPercentage = (marketData.dominancia.left / dominanciaTotal) * 100;
  const rightPercentage = (marketData.dominancia.right / dominanciaTotal) * 100;

  const deltaFuturosTotal = marketData.delta_futuros.positivo + marketData.delta_futuros.negativo;
  const deltaFuturosPositivoPercentage = (marketData.delta_futuros.positivo / deltaFuturosTotal) * 100;
  const deltaFuturosNegativoPercentage = (marketData.delta_futuros.negativo / deltaFuturosTotal) * 100;

  const deltaSpotTotal = marketData.delta_spot.positivo + marketData.delta_spot.negativo;
  const deltaSpotPositivoPercentage = (marketData.delta_spot.positivo / deltaSpotTotal) * 100;
  const deltaSpotNegativoPercentage = (marketData.delta_spot.negativo / deltaSpotTotal) * 100;

  return (
    <Card className="p-2 flex flex-col bg-[rgb(26,26,26)]">
      <div className="space-y-2 flex-1">
        <Select value={currentSymbol} onValueChange={setCurrentSymbol}>
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

        <div className="grid gap-2">
          <MetricCard
            label="Dirección"
            value={marketData.direccion.toLocaleString()}
            icon={<Activity className="h-3 w-3" />}
            valueClassName={marketData.direccion > 0 ? 'text-primary' : 'text-destructive'}
          />

          <div className="space-y-1">
            <label className="text-[10px] font-medium">Dominancia</label>
            <div className="h-6 w-full rounded-lg overflow-hidden flex">
              <div
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${leftPercentage}%` }}
              >
                <span className="text-[10px] text-primary-foreground flex items-center justify-center h-full">
                  {marketData.dominancia.left.toLocaleString()}
                </span>
              </div>
              <div
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${rightPercentage}%` }}
              >
                <span className="text-[10px] text-destructive-foreground flex items-center justify-center h-full">
                  {marketData.dominancia.right.toLocaleString()}
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
                  {marketData.delta_futuros.positivo.toLocaleString()}
                </span>
              </div>
              <div
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${deltaFuturosNegativoPercentage}%` }}
              >
                <span className="text-[10px] text-destructive-foreground flex items-center justify-center h-full">
                  {marketData.delta_futuros.negativo.toLocaleString()}
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
                  {marketData.delta_spot.positivo.toLocaleString()}
                </span>
              </div>
              <div
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${deltaSpotNegativoPercentage}%` }}
              >
                <span className="text-[10px] text-destructive-foreground flex items-center justify-center h-full">
                  {marketData.delta_spot.negativo.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}