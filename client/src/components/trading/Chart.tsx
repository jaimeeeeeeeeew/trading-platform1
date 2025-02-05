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
          rightOffset: 5,
          barSpacing: 10,
          fixLeftEdge: true,
          lockVisibleTimeRangeOnResize: true,
        },
        rightPriceScale: {
          borderColor: '#1e222d',
          autoScale: true,
          scaleMargins: {
            top: 0.1,
            bottom: 0.1,
          },
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

      // Generate more realistic sample data
      const sampleData = [];
      const startTime = new Date('2024-02-01').getTime();
      let lastClose = 3500; // Starting price around a realistic BTC value

      for (let i = 0; i < 50; i++) {
        const time = new Date(startTime + i * 24 * 60 * 60 * 1000);
        const volatility = Math.random() * 100; // Daily volatility
        const open = lastClose;
        const close = open + (Math.random() - 0.5) * volatility;
        const high = Math.max(open, close) + Math.random() * volatility * 0.5;
        const low = Math.min(open, close) - Math.random() * volatility * 0.5;

        sampleData.push({
          time: time.toISOString().split('T')[0], // Format: YYYY-MM-DD
          open: open,
          high: high,
          low: low,
          close: close,
        });

        lastClose = close;
      }

      candlestickSeries.setData(sampleData);

      // Handle window resizing
      const handleResize = () => {
        const { width, height } = container.current!.getBoundingClientRect();
        chart.applyOptions({
          width,
          height,
        });

        // Auto-fit content after resize
        chart.timeScale().fitContent();
      };

      // Initial size and fit
      handleResize();

      // Ensure data is visible initially
      chart.timeScale().fitContent();

      // Listen for resize events
      window.addEventListener('resize', handleResize);

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
        style={{ height: '500px' }}
      />
    </div>
  );
}