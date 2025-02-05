import { useEffect, useRef, useState } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
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

interface VolumeProfileBar {
  price: number;
  volume: number;
}

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
    toast({
      title: 'Interval Changed',
      description: `Changed to ${INTERVALS[newInterval].label} timeframe`,
    });
  };

  // Calculate volume profile data
  const calculateVolumeProfile = (data: any[], priceStep: number = 100) => {
    const volumeByPrice: Map<number, number> = new Map();
    let minPrice = Infinity;
    let maxPrice = -Infinity;

    // Aggregate volume by price levels
    data.forEach(candle => {
      const price = Math.round(candle.close / priceStep) * priceStep;
      const currentVolume = volumeByPrice.get(price) || 0;
      volumeByPrice.set(price, currentVolume + (candle.volume || 1000));
      minPrice = Math.min(minPrice, candle.low);
      maxPrice = Math.max(maxPrice, candle.high);
    });

    // Convert to array and sort by price
    const volumeProfile: VolumeProfileBar[] = Array.from(volumeByPrice.entries()).map(([price, volume]) => ({
      price,
      volume,
    }));

    return { volumeProfile, minPrice, maxPrice };
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

      // Create candlestick series
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });

      // Create volume profile series
      const volumeProfileSeries = chart.addHistogramSeries({
        priceFormat: {
          type: 'price',
        },
        base: 0,
        overlay: true,
        priceLineVisible: false,
        lastValueVisible: false,
        color: 'rgba(38, 166, 154, 0.3)',
      });

      // Generate sample data
      const sampleData = [];
      const startTime = new Date('2023-01-01').getTime();
      let lastClose = 45000;
      const dailyData = 365;

      for (let i = 0; i < dailyData; i++) {
        const time = new Date(startTime + i * 24 * 60 * 60 * 1000);
        const volatility = (Math.random() * 0.03) * lastClose;
        const trend = Math.sin(i / 30) * 0.001;

        const open = lastClose;
        const close = open * (1 + (Math.random() - 0.5) * 0.02 + trend);
        const high = Math.max(open, close) * (1 + Math.random() * 0.01);
        const low = Math.min(open, close) * (1 - Math.random() * 0.01);
        const volume = Math.floor(1000 + Math.random() * 10000 * (1 + volatility / lastClose));

        sampleData.push({
          time: time.toISOString().split('T')[0],
          open,
          high,
          low,
          close,
          volume,
        });

        lastClose = close;
      }

      // Set candlestick data
      candlestickSeries.setData(sampleData);

      // Calculate and set volume profile data
      const { volumeProfile } = calculateVolumeProfile(sampleData);
      const volumeProfileData = volumeProfile.map(({ price, volume }) => ({
        time: sampleData[sampleData.length - 1].time,
        value: volume,
        color: 'rgba(38, 166, 154, 0.3)',
      }));

      volumeProfileSeries.setData(volumeProfileData);

      // Handle window resizing
      const handleResize = () => {
        const { width, height } = container.current!.getBoundingClientRect();
        chart.applyOptions({
          width,
          height,
        });
        chart.timeScale().fitContent();
      };

      // Initial size and fit
      handleResize();

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