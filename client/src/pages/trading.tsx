import Chart from '@/components/trading/Chart';
import MetricsPanel from '@/components/trading/MetricsPanel';
import RiskCalculator from '@/components/trading/RiskCalculator';
import { useAuth } from '@/hooks/use-auth';
import { useMarketData } from '@/hooks/use-market-data';
import { Loader2 } from 'lucide-react';

export default function Trading() {
  const { user } = useAuth();
  const { data: marketData, error: connectionError } = useMarketData();

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

  // Transformar los datos al formato que espera MetricsPanel
  const metricsData = {
    direccion: marketData?.direccion || 0,
    dominancia: marketData?.dominancia || { left: 0, right: 0 },
    delta_futuros: marketData?.delta_futuros || { positivo: 0, negativo: 0 },
    delta_spot: marketData?.delta_spot || { positivo: 0, negativo: 0 }
  };

  const dominanceData = {
    bidsTotalInRange: marketData?.orderbook?.bidsTotalInRange || 0,
    asksTotalInRange: marketData?.orderbook?.asksTotalInRange || 0,
    dominancePercentage: marketData?.orderbook?.dominancePercentage || 50,
    btcAmount: marketData?.orderbook?.btcAmount || 0
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 p-4 flex gap-4">
        <div className="flex-[3]">
          <Chart />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1">
            <MetricsPanel
              metrics={metricsData}
              className="h-full"
              dominanceData={dominanceData}
              dominancePercentage={5}
              onDominancePercentageChange={(value) => {
                // TODO: Implementar la actualización del porcentaje
                console.log('Nuevo porcentaje de dominancia:', value);
              }}
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