import { useEffect, useRef, useState } from 'react';
import { createChart, HistogramData, ISeriesApi, SeriesOptionsCommon } from 'lightweight-charts';
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

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
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
      },
      leftPriceScale: {
        borderColor: '#1e222d',
        visible: true,
        scaleMargins: {
          top: 0.2,
          bottom: 0.2,
        },
      },
    });

    chartRef.current = chart;

    // Candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceScaleId: 'right',
    });

    // Volume profile series with correct type annotations
    const volumeProfileSeries = chart.addHistogramSeries({
      color: 'rgba(76, 175, 80, 0.5)',
      priceLineVisible: false,
      lastValueVisible: false,
      priceScaleId: 'left',
    }) as ISeriesApi<"Histogram">;

    // Generar datos de muestra
    const sampleData: CandleData[] = [];
    const startTime = new Date('2023-01-01').getTime();
    let lastClose = 45000;
    const dailyData = 365;

    for (let i = 0; i < dailyData; i++) {
      const time = startTime + i * 24 * 60 * 60 * 1000;
      const volatility = (Math.random() * 0.03) * lastClose;
      const trend = Math.sin(i / 30) * 0.001;

      const open = lastClose;
      const close = open * (1 + (Math.random() - 0.5) * 0.02 + trend);
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(1000 + Math.random() * 10000 * (1 + volatility / lastClose));

      sampleData.push({
        time: new Date(time).toISOString().split('T')[0],
        open,
        high,
        low,
        close,
        volume,
      });

      lastClose = close;
    }

    candlestickSeries.setData(sampleData);

    // Calcular y establecer datos del perfil de volumen
    const priceStep = 100;
    const volumeByPrice = new Map<number, number>();

    // Primero recolectamos los datos de volumen por precio
    sampleData.forEach(candle => {
      const price = Math.floor(candle.close / priceStep) * priceStep;
      const currentVolume = volumeByPrice.get(price) || 0;
      volumeByPrice.set(price, currentVolume + candle.volume);
    });

    // Crear datos del perfil de volumen con timestamps incrementales
    const volumeProfileData: HistogramData[] = Array.from(volumeByPrice.entries())
      .sort((a, b) => a[0] - b[0]) // Ordenar por precio ascendente
      .map(([price, volume]) => ({
        time: sampleData[0].time,
        value: volume,
        color: 'rgba(76, 175, 80, 0.5)',
      }));

    volumeProfileSeries.setData(volumeProfileData);

    const handleResize = () => {
      const { width, height } = container.current!.getBoundingClientRect();
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
      chartRef.current = null;
    };
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
      <div ref={container} className="w-full h-full" />
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