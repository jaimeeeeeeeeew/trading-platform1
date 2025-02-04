import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity, TrendingUp, TrendingDown } from 'lucide-react';
import { useTrading } from '@/lib/trading-context';

const CRYPTOCURRENCIES = [
  { value: 'BTCUSDT', label: 'Bitcoin (BTC)' },
  { value: 'ETHUSDT', label: 'Ethereum (ETH)' },
  { value: 'SOLUSDT', label: 'Solana (SOL)' },
  { value: 'XRPUSDT', label: 'Ripple (XRP)' },
];

interface OrderData {
  price: number;
  volume: number;
}

interface MarketData {
  limitAsks: OrderData[];
  limitBids: OrderData[];
  marketBuys: OrderData[];
  marketSells: OrderData[];
}

interface MetricsPanelProps {
  metrics?: Record<string, MarketData>;
  className?: string;
}

export default function MetricsPanel({ metrics, className = '' }: MetricsPanelProps) {
  const { currentSymbol, setCurrentSymbol } = useTrading();

  if (!metrics) {
    return <div>Cargando datos...</div>;
  }

  const symbolData = metrics[currentSymbol];

  if (!symbolData) {
    return <div>No hay datos disponibles para {currentSymbol}</div>;
  }

  // Calcular totales
  const totalAskVolume = symbolData.limitAsks.reduce((sum, order) => sum + order.volume, 0);
  const totalBidVolume = symbolData.limitBids.reduce((sum, order) => sum + order.volume, 0);
  const totalMarketBuyVolume = symbolData.marketBuys.reduce((sum, order) => sum + order.volume, 0);
  const totalMarketSellVolume = symbolData.marketSells.reduce((sum, order) => sum + order.volume, 0);

  // Obtener el precio medio
  const midPrice = (symbolData.limitAsks[0]?.price + symbolData.limitBids[0]?.price) / 2;

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
          {/* Precio Actual */}
          <MetricCard
            label="Precio Medio"
            value={midPrice?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            })}
            icon={<Activity className="h-4 w-4" />}
          />

          {/* Volumen de Órdenes Límite */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Volumen de Órdenes Límite</label>
            <div className="h-8 w-full rounded-lg overflow-hidden flex">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(totalAskVolume / (totalAskVolume + totalBidVolume)) * 100}%` }}
              >
                <span className="text-xs text-primary-foreground flex items-center justify-center h-full">
                  {totalAskVolume.toLocaleString()}
                </span>
              </div>
              <div 
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${(totalBidVolume / (totalAskVolume + totalBidVolume)) * 100}%` }}
              >
                <span className="text-xs text-destructive-foreground flex items-center justify-center h-full">
                  {totalBidVolume.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Volumen de Mercado */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Volumen de Mercado</label>
            <div className="h-8 w-full rounded-lg overflow-hidden flex">
              <div 
                className="bg-primary h-full transition-all duration-300"
                style={{ width: `${(totalMarketBuyVolume / (totalMarketBuyVolume + totalMarketSellVolume)) * 100}%` }}
              >
                <span className="text-xs text-primary-foreground flex items-center justify-center h-full">
                  {totalMarketBuyVolume.toLocaleString()}
                </span>
              </div>
              <div 
                className="bg-destructive h-full transition-all duration-300"
                style={{ width: `${(totalMarketSellVolume / (totalMarketBuyVolume + totalMarketSellVolume)) * 100}%` }}
              >
                <span className="text-xs text-destructive-foreground flex items-center justify-center h-full">
                  {totalMarketSellVolume.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Últimas Órdenes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Últimas Órdenes de Mercado</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {[...symbolData.marketBuys, ...symbolData.marketSells]
                .sort((a, b) => b.price - a.price)
                .slice(0, 5)
                .map((order, i) => (
                  <div key={i} className="flex justify-between items-center text-sm p-2 rounded bg-card">
                    <span className={order.price >= midPrice ? 'text-primary' : 'text-destructive'}>
                      {order.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                    <span>{order.volume.toLocaleString()}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
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