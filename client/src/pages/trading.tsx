import Chart from '@/components/trading/Chart';
import MetricsPanel from '@/components/trading/MetricsPanel';
import RiskCalculator from '@/components/trading/RiskCalculator';
import { useAuth } from '@/hooks/use-auth';
import { useMarketData } from '@/hooks/use-market-data';
import { Loader2, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { TutorialsDrawer } from '@/components/TutorialsDrawer';

export default function Trading() {
  const { user } = useAuth();
  const { data: marketData, error: connectionError } = useMarketData();
  const [dominancePercentage, setDominancePercentage] = useState(5); // Default 5%

  // Calcular los datos de dominancia basados en el orderbook y el porcentaje seleccionado
  const calculateDominanceData = () => {
    if (!marketData?.orderbook?.bids || !marketData?.orderbook?.asks) {
      return {
        bidsTotalInRange: 0,
        asksTotalInRange: 0,
        dominancePercentage: 50,
        btcAmount: 0
      };
    }

    const currentMidPrice = (
      parseFloat(marketData.orderbook.bids[0]?.Price || '0') + 
      parseFloat(marketData.orderbook.asks[0]?.Price || '0')
    ) / 2;

    const rangePriceDistance = currentMidPrice * (dominancePercentage / 100);
    const rangeMinPrice = currentMidPrice - rangePriceDistance;
    const rangeMaxPrice = currentMidPrice + rangePriceDistance;

    const bidsInRange = marketData.orderbook.bids
      .filter(bid => parseFloat(bid.Price) >= rangeMinPrice)
      .reduce((sum, bid) => sum + parseFloat(bid.Quantity), 0);

    const asksInRange = marketData.orderbook.asks
      .filter(ask => parseFloat(ask.Price) <= rangeMaxPrice)
      .reduce((sum, ask) => sum + parseFloat(ask.Quantity), 0);

    const totalVolumeInRange = bidsInRange + asksInRange;
    const calculatedDominancePercentage = totalVolumeInRange === 0 ? 50 : (bidsInRange / totalVolumeInRange) * 100;

    return {
      bidsTotalInRange: bidsInRange,
      asksTotalInRange: asksInRange,
      dominancePercentage: calculatedDominancePercentage,
      btcAmount: Math.floor(totalVolumeInRange)
    };
  };

  if (!user || connectionError) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">
            {connectionError 
              ? "Error de conexión. Intentando reconectar..."
              : "Conectando al servidor de datos..."}
          </p>
        </div>
      </div>
    );
  }

  const dominanceData = calculateDominanceData();

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="bg-black p-2 flex justify-between items-center">
        <div className="flex items-center">
          <TrendingUp className="h-6 w-6 text-primary mr-2" />
          <span className="text-primary font-semibold">Trading Platform</span>
        </div>
        <TutorialsDrawer />
      </div>
      <div className="flex-1 p-4 flex gap-4">
        <div className="flex-[3]">
          <Chart />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1">
            <MetricsPanel
              className="h-full"
              dominanceData={dominanceData}
              dominancePercentage={dominancePercentage}
              onDominancePercentageChange={setDominancePercentage}
            />
          </div>
          <div className="flex-1">
            <RiskCalculator />
          </div>
        </div>
      </div>
    </div>
  );
}