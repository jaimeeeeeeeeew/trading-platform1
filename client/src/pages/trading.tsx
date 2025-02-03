import { useEffect, useState } from 'react';
import Chart from '@/components/trading/Chart';
import MetricsPanel from '@/components/trading/MetricsPanel';
import { useToast } from '@/hooks/use-toast';
import { useWebSocket } from '@/lib/websocket';

export default function Trading() {
  const { toast } = useToast();
  const socket = useWebSocket({
    onError: () => {
      toast({
        variant: "destructive",
        title: "Connection Error",
        description: "Failed to connect to real-time data feed"
      });
    }
  });

  const [metrics, setMetrics] = useState({
    direccion: 0,
    dominancia: { left: 0, right: 0 },
    delta_futuros: 0,
    delta_spot: 0,
    transacciones: []
  });

  useEffect(() => {
    if (!socket) return;

    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(event.data);
        setMetrics(data);
      } catch (err) {
        console.error('Failed to parse websocket data:', err);
      }
    });
  }, [socket]);

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
