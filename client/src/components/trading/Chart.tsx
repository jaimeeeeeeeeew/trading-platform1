import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    if (!container.current) return;

    try {
      // Create chart instance with minimal configuration
      const chartInstance = createChart(container.current, {
        width: container.current.clientWidth,
        height: container.current.clientHeight,
        layout: {
          background: { color: '#1a1a1a' },
          textColor: '#DDD',
        },
      });

      // Create a basic candlestick series
      const candlestickSeries = chartInstance.createSeries('candlestick');

      // Set some initial test data
      const initialData = [
        { time: '2024-02-01', open: 100, high: 105, low: 95, close: 102 },
        { time: '2024-02-02', open: 102, high: 108, low: 98, close: 105 },
        { time: '2024-02-03', open: 105, high: 110, low: 100, close: 108 },
      ];

      candlestickSeries.setData(initialData);

      // Handle window resizing
      const handleResize = () => {
        chartInstance.applyOptions({
          width: container.current!.clientWidth,
          height: container.current!.clientHeight
        });
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        chartInstance.remove();
      };

    } catch (error) {
      console.error('Error creating chart:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chart',
        variant: 'destructive'
      });
    }
  }, [currentSymbol]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        ref={container}
        className="w-full h-full"
      />
    </div>
  );
}