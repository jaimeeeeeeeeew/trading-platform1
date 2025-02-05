import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const INTERVALS = {
  '1m': { label: '1m', minutes: 1 },
  '5m': { label: '5m', minutes: 5 },
  '15m': { label: '15m', minutes: 15 },
  '1h': { label: '1H', minutes: 60 },
  '4h': { label: '4H', minutes: 240 },
  '1d': { label: '1D', minutes: 1440 },
} as const;

type IntervalKey = keyof typeof INTERVALS;

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();
  const [interval, setInterval] = useState<IntervalKey>('1h');

  const handleAutoFit = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const handleIntervalChange = (newInterval: IntervalKey) => {
    setInterval(newInterval);
    // Here we'll later implement the data fetching from TradingView
    toast({
      title: 'Interval Changed',
      description: `Changed to ${INTERVALS[newInterval].label} timeframe`,
    });
  };

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

      // Save chart reference for the auto-fit button
      chartRef.current = chart;

      // Create candlestick series with dark theme colors
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      // Add volume series
      const volumeSeries = chart.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '', // Set as an overlay
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // Generate more realistic sample data
      const sampleData = [];
      const volumeData = [];
      const startTime = new Date('2023-01-01').getTime(); // Start from a year ago
      let lastClose = 45000; // Starting price around a realistic BTC value
      const dailyData = 365; // One year of daily data

      for (let i = 0; i < dailyData; i++) {
        const time = new Date(startTime + i * 24 * 60 * 60 * 1000);
        // More realistic volatility based on price
        const volatility = (Math.random() * 0.03) * lastClose; // 3% max daily volatility
        const trend = Math.sin(i / 30) * 0.001; // Add a slight cyclical trend

        // Calculate OHLC with more realistic price movements
        const open = lastClose;
        const close = open * (1 + (Math.random() - 0.5) * 0.02 + trend); // Max 2% move + trend
        const high = Math.max(open, close) * (1 + Math.random() * 0.01); // Up to 1% above max
        const low = Math.min(open, close) * (1 - Math.random() * 0.01); // Up to 1% below min

        // Calculate volume with more variation
        const volume = Math.floor(1000 + Math.random() * 10000 * (1 + volatility / lastClose));

        const timeStr = time.toISOString().split('T')[0]; // Format: YYYY-MM-DD

        sampleData.push({
          time: timeStr,
          open: open,
          high: high,
          low: low,
          close: close,
        });

        volumeData.push({
          time: timeStr,
          value: volume,
          color: close > open ? '#26a69a80' : '#ef535080',
        });

        lastClose = close;
      }

      candlestickSeries.setData(sampleData);
      volumeSeries.setData(volumeData);

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
        chartRef.current = null;
      };
    } catch (error) {
      console.error('Error creating chart:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chart',
        variant: 'destructive'
      });
    }
  }, [currentSymbol, interval]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card relative">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <Select value={interval} onValueChange={handleIntervalChange}>
          <SelectTrigger className="w-20 bg-background">
            <SelectValue placeholder="Interval" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(INTERVALS).map(([key, { label }]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div
        ref={container}
        className="w-full h-full"
        style={{ height: '500px' }}
      />
      <Button 
        onClick={handleAutoFit}
        className="absolute top-2 right-2 z-10 bg-background hover:bg-background/90 shadow-md"
        size="icon"
        variant="outline"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
    </div>
  );
}