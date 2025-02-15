import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Activity } from 'lucide-react';
import { useTrading } from '@/lib/trading-context';
import { DominanceControl } from './DominanceControl';

const CRYPTOCURRENCIES = [
  { value: 'BINANCE:BTCUSDT', label: 'Bitcoin (BTC)' },
  { value: 'BINANCE:ETHUSDT', label: 'Ethereum (ETH)' },
  { value: 'BINANCE:ADAUSDT', label: 'Cardano (ADA)' },
  { value: 'BINANCE:SOLUSDT', label: 'Solana (SOL)' },
  { value: 'BINANCE:DOGEUSDT', label: 'Dogecoin (DOGE)' },
];

interface MetricsPanelProps {
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
  className = '', 
  dominanceData,
  onDominancePercentageChange,
  dominancePercentage
}: MetricsPanelProps) {
  const { currentSymbol, setCurrentSymbol } = useTrading();

  return (
    <Card className={`p-2 flex flex-col border border-black ${className}`}>
      <div className="flex items-center gap-1 mb-2">
        <Activity className="h-3 w-3" />
        <span className="text-xs font-medium">Panel Trading</span>
      </div>

      <div className="space-y-2 flex-1">
        <Select
          value={currentSymbol}
          onValueChange={setCurrentSymbol}
        >
          <SelectTrigger className="w-full h-7 text-xs bg-[#151924] border-black">
            <SelectValue placeholder="Selecciona una criptomoneda" />
          </SelectTrigger>
          <SelectContent className="bg-[#151924]">
            {CRYPTOCURRENCIES.map((crypto) => (
              <SelectItem key={crypto.value} value={crypto.value} className="text-xs">
                {crypto.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <DominanceControl
          percentage={dominancePercentage}
          onPercentageChange={onDominancePercentageChange}
          dominanceData={dominanceData}
        />
      </div>
    </Card>
  );
}