import Chart from '@/components/trading/Chart';
import MetricsPanel from '@/components/trading/MetricsPanel';
import { useAuth } from '@/hooks/use-auth';
import { useMarketData } from '@/lib/use-market-data';
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

  // Asegurarse de que marketData tenga todas las propiedades necesarias
  const metrics = {
    direccion: marketData?.direccion || 0,
    dominancia: marketData?.dominancia || { left: 0, right: 0 },
    delta_futuros: marketData?.delta_futuros || { positivo: 0, negativo: 0 },
    delta_spot: marketData?.delta_spot || { positivo: 0, negativo: 0 },
    transacciones: marketData?.transacciones || []
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="flex-1 p-4 flex gap-4">
        <div className="flex-[3] h-full">
          <Chart />
        </div>
        <div className="flex-1 h-full">
          <MetricsPanel
            metrics={metrics}
            className="h-full"
          />
        </div>
      </div>
    </div>
  );
}