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
      // Basic chart configuration
      const chart = createChart(container.current, {
        width: 600,  // Fixed width
        height: 300, // Fixed height
      });

      // Create a candlestick series
      const candlestickSeries = chart.addCandlestickSeries();

      // Add initial data
      const initialData = [
        { time: '2024-02-01', open: 100, high: 105, low: 95, close: 102 },
        { time: '2024-02-02', open: 102, high: 108, low: 98, close: 105 },
        { time: '2024-02-03', open: 105, high: 110, low: 100, close: 108 },
      ];

      candlestickSeries.setData(initialData);

      // Clean up
      return () => {
        chart.remove();
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
        style={{ minHeight: '300px' }}
      />
    </div>
  );
}