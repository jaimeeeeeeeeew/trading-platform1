import Chart from '@/components/trading/Chart';
import MetricsPanel from '@/components/trading/MetricsPanel';
import RiskCalculator from '@/components/trading/RiskCalculator';
import { useAuth } from '@/hooks/use-auth';
import { useMarketData } from '@/lib/use-market-data';
import { Loader2 } from 'lucide-react';

export default function Trading() {
  const { user } = useAuth();
  const { data: metrics, error: connectionError } = useMarketData();

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

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 p-4 flex gap-4">
        <div className="flex-[3]">
          <Chart />
        </div>
        <div className="flex-1 flex flex-col gap-4">
          <div className="flex-1">
            <MetricsPanel
              metrics={metrics}
              className="h-full"
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