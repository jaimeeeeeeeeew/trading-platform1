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
      // Create chart instance with dark theme
      const chart = createChart(container.current, {
        layout: {
          background: { color: '#151924' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: '#1e222d' },
          horzLines: { color: '#1e222d' },
        },
        crosshair: {
          mode: 1,
          vertLine: {
            color: '#6B7280',
            width: 1,
            style: 1,
            labelBackgroundColor: '#1e222d',
          },
          horzLine: {
            color: '#6B7280',
            width: 1,
            style: 1,
            labelBackgroundColor: '#1e222d',
          },
        },
        timeScale: {
          borderColor: '#1e222d',
          timeVisible: true,
          secondsVisible: false,
        },
        rightPriceScale: {
          borderColor: '#1e222d',
        },
      });

      // Create candlestick series with dark theme colors
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      // Add initial data
      const initialData = [
        { time: '2024-02-01', open: 100, high: 105, low: 95, close: 102 },
        { time: '2024-02-02', open: 102, high: 108, low: 98, close: 105 },
        { time: '2024-02-03', open: 105, high: 110, low: 100, close: 108 },
      ];

      candlestickSeries.setData(initialData);

      // Handle window resizing
      const handleResize = () => {
        const { width, height } = container.current!.getBoundingClientRect();
        chart.applyOptions({
          width,
          height,
        });
      };

      // Initial size
      handleResize();

      // Listen for resize events
      window.addEventListener('resize', handleResize);

      // Clean up
      return () => {
        window.removeEventListener('resize', handleResize);
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
        style={{ height: '500px' }} // Minimum height to ensure visibility
      />
    </div>
  );
}