import { useEffect, useRef, useState } from 'react';
import { createChart, Time } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VolumeProfile } from './VolumeProfile';
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
  const wsRef = useRef<WebSocket | null>(null);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();
  const [interval, setInterval] = useState<IntervalKey>('1m');
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

  // Cargar datos históricos iniciales de la API de Binance
  const loadInitialData = async (symbol: string) => {
    try {
      console.log('Cargando datos históricos para:', symbol);
      const now = Date.now();
      const oneHourAgo = now - (60 * 60 * 1000); // 1 hora de datos históricos
      const url = `https://fapi.binance.com/fapi/v1/klines?symbol=${symbol.toUpperCase()}&interval=1m&startTime=${oneHourAgo}&endTime=${now}&limit=60`;

      console.log('Fetching URL:', url);
      const response = await fetch(url);
      const data = await response.json();
      console.log('Datos recibidos:', data.length, 'velas');

      if (!candlestickSeriesRef.current) {
        console.error('candlestickSeries no está inicializado');
        return;
      }

      const candlesticks = data.map((d: any) => ({
        time: d[0] / 1000 as Time,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      console.log('Primer candlestick:', candlesticks[0]);
      console.log('Último candlestick:', candlesticks[candlesticks.length - 1]);

      candlestickSeriesRef.current.setData(candlesticks);
      handleAutoFit();

      updateVolumeProfile(candlesticks.map((c: any) => ({ 
        close: c.close, 
        volume: c.volume 
      })));

      console.log('Datos históricos cargados y establecidos en el gráfico');
    } catch (error) {
      console.error('Error cargando datos históricos:', error);
      toast({
        title: 'Error',
        description: 'Error loading historical data',
        variant: 'destructive',
      });
    }
  };

  // Inicializar el gráfico
  useEffect(() => {
    if (!container.current) return;

    console.log('Inicializando gráfico');
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
      },
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Una vez que el gráfico está listo, cargamos los datos iniciales
    if (currentSymbol) {
      const symbol = currentSymbol.toLowerCase().replace(':', '').replace('perp', '');
      loadInitialData(symbol);
    }

    const handleResize = () => {
      if (!container.current) return;
      const { width, height } = container.current.getBoundingClientRect();
      chart.applyOptions({ width, height });
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
  }, [currentSymbol]); // Añadimos currentSymbol como dependencia

  // Actualizar el perfil de volumen
  const updateVolumeProfile = (data: { close: number; volume: number }[]) => {
    const priceStep = 100;
    const volumeByPrice = new Map();

    data.forEach(candle => {
      const price = Math.floor(candle.close / priceStep) * priceStep;
      const currentVolume = volumeByPrice.get(price) || 0;
      volumeByPrice.set(price, currentVolume + candle.volume);
    });

    const profileData = Array.from(volumeByPrice.entries()).map(([price, volume]) => ({
      price: Number(price),
      volume: Number(volume),
    }));

    setVolumeProfileData(profileData);
  };

  // Efecto para manejar el WebSocket
  useEffect(() => {
    if (!currentSymbol || !candlestickSeriesRef.current) return;

    const symbol = currentSymbol.toLowerCase().replace(':', '').replace('perp', '');
    console.log('Conectando WebSocket para:', symbol);

    // Limpiar conexión anterior
    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `wss://fstream.binance.com/ws/${symbol}@kline_1m`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket conectado');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.e === 'kline') {
          const kline = data.k;
          const bar = {
            time: kline.t / 1000 as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v)
          };

          console.log('Nueva vela recibida:', bar);
          candlestickSeriesRef.current.update(bar);
          updateVolumeProfile([{ close: parseFloat(kline.c), volume: parseFloat(kline.v) }]);
        }
      } catch (error) {
        console.error('Error procesando mensaje:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      toast({
        title: 'Connection Error',
        description: 'Error connecting to market data',
        variant: 'destructive',
      });
    };

    ws.onclose = () => {
      console.log('WebSocket desconectado');
    };

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
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