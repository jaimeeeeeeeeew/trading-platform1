import { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VolumeProfile } from './VolumeProfile';
import { TradingViewDataFeed } from '@/lib/tradingview-feed';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const candlestickSeriesRef = useRef<any>(null);
  const dataFeedRef = useRef<TradingViewDataFeed | null>(null);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();
  const [interval, setInterval] = useState<IntervalKey>('1h');
  const [volumeProfileData, setVolumeProfileData] = useState<Array<{ price: number; volume: number }>>([]);

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

  // Efecto para manejar la conexión del WebSocket y suscripción a datos
  useEffect(() => {
    if (!currentSymbol || !candlestickSeriesRef.current) return;

    // Desconectar feed anterior si existe
    if (dataFeedRef.current) {
      dataFeedRef.current.disconnect();
    }

    // Crear nuevo feed
    const feed = new TradingViewDataFeed(currentSymbol);
    dataFeedRef.current = feed;

    // Suscribirse a actualizaciones de precio
    feed.onPriceUpdate((data) => {
      if (candlestickSeriesRef.current) {
        // Actualizar la última vela o crear una nueva
        const bar = {
          time: Math.floor(Date.now() / 1000),
          open: data.price,
          high: data.high,
          low: data.low,
          close: data.price,
          volume: data.volume
        };

        candlestickSeriesRef.current.update(bar);

        // Actualizar perfil de volumen
        setVolumeProfileData(prevData => {
          const price = Math.floor(data.price / 100) * 100;
          const existingIndex = prevData.findIndex(item => item.price === price);

          if (existingIndex >= 0) {
            const newData = [...prevData];
            newData[existingIndex] = {
              ...newData[existingIndex],
              volume: newData[existingIndex].volume + data.volume
            };
            return newData;
          }

          return [...prevData, { price, volume: data.volume }];
        });
      }
    });

    return () => {
      if (dataFeedRef.current) {
        dataFeedRef.current.disconnect();
      }
    };
  }, [currentSymbol, interval]);

  useEffect(() => {
    if (!container.current) return;

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
        scaleMargins: {
          top: 0.35,
          bottom: 0.35,
        },
        alignLabels: true,
        autoScale: true,
        mode: 1,
      },
      leftPriceScale: {
        visible: true,
        borderColor: '#1e222d',
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        precision: 2,
        minMove: 0.01,
      },
    });

    candlestickSeriesRef.current = candlestickSeries;

    const handleResize = () => {
      if (!container.current) return;
      const { width, height } = container.current.getBoundingClientRect();
      chart.applyOptions({
        width,
        height,
        rightPriceScale: {
          ...chart.options().rightPriceScale,
          scaleMargins: {
            top: 0.35,
            bottom: 0.35,
          },
        },
      });
      chart.timeScale().fitContent();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
    };
  }, []);

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
      <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
        <div ref={container} className="w-full h-full" />
        <div 
          className="absolute right-20 top-0 h-full" 
          style={{ 
            width: '80px',
            zIndex: 2,
            pointerEvents: 'none'
          }}
        >
          <VolumeProfile
            data={volumeProfileData}
            width={80}
            height={container.current?.clientHeight || 400}
          />
        </div>
      </div>
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