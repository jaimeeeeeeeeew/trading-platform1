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

const generateVolumeProfileData = (price: number) => {
  const data: Array<{ price: number; volume: number; normalizedVolume: number }> = [];
  // Generar un rango muy amplio de datos (±30% del precio actual)
  const range = price * 0.3;
  const step = 10; // Intervalo de precio entre barras
  let maxVolume = 0;

  // Generar datos para todo el rango visible
  for (let p = price - range; p <= price + range; p += step) {
    const distanceFromPrice = Math.abs(p - price);
    const volumeBase = Math.exp(-distanceFromPrice / (range * 0.1)); // Distribución exponencial
    const randomFactor = 0.7 + Math.random() * 0.6; // Factor aleatorio entre 0.7 y 1.3
    const volume = volumeBase * randomFactor * 1000;

    maxVolume = Math.max(maxVolume, volume);
    data.push({
      price: Math.round(p), // Redondear al entero más cercano
      volume,
      normalizedVolume: 0 // Se normalizará después
    });
  }

  // Normalizar volúmenes
  return data.map(item => ({
    ...item,
    normalizedVolume: item.volume / maxVolume
  }));
};

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const historicalDataRef = useRef<Array<{ close: number; volume: number }>>([]);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();
  const [interval, setInterval] = useState<IntervalKey>('1m');
  const [volumeProfileData, setVolumeProfileData] = useState<Array<{ price: number; volume: number; normalizedVolume: number }>>([]);
  const [priceScale, setPriceScale] = useState<{min: number, max: number} | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);

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

  const formatSymbolForBinance = (symbol: string) => {
    return symbol
      .toUpperCase()
      .replace('BINANCE:', '')
      .replace('PERP', '');
  };

  const loadInitialData = async (symbol: string) => {
    try {
      const formattedSymbol = formatSymbolForBinance(symbol);
      console.log('Cargando datos históricos para:', formattedSymbol);

      const responses = await Promise.all([
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=1m&limit=1500`),
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=1m&limit=1500&endTime=${Date.now() - 90000000}`)
      ]);

      const datas = await Promise.all(responses.map(r => r.json()));
      const allData = [...datas[1], ...datas[0]];

      console.log('Datos recibidos:', allData.length, 'velas');

      if (!Array.isArray(allData)) {
        console.error('Los datos recibidos no son un array:', allData);
        return;
      }

      const candlesticks = allData.map((d: any) => ({
        time: Math.floor(d[0] / 1000) as Time,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      console.log('Primer candlestick:', candlesticks[0]);
      console.log('Último candlestick:', candlesticks[candlesticks.length - 1]);

      if (candlestickSeriesRef.current && candlesticks.length > 0) {
        candlestickSeriesRef.current.setData(candlesticks);
        handleAutoFit();

        historicalDataRef.current = candlesticks.map(c => ({ 
          close: c.close, 
          volume: c.volume 
        }));

        updateVolumeProfile(historicalDataRef.current);

        console.log('Datos históricos cargados exitosamente');
      } else {
        console.error('candlestickSeries no está listo o no hay datos para cargar');
      }
    } catch (error) {
      console.error('Error cargando datos históricos:', error);
      toast({
        title: 'Error',
        description: 'Error loading historical data',
        variant: 'destructive',
      });
    }
  };

  const updateVisiblePriceRange = () => {
    if (!chartRef.current) return;

    try {
      const scale = chartRef.current.priceScale('right');
      if (!scale) return;

      const logicalRange = scale.getVisibleLogicalRange();
      if (!logicalRange) return;

      const coordinateToPrice = (coordinate: number) => scale.coordinateToPrice(coordinate);
      const visibleRange = {
        min: coordinateToPrice(0), // Corrected to get min from bottom
        max: coordinateToPrice(container.current.clientHeight) // Corrected to get max from top
      };

      setPriceScale(visibleRange);

      // Actualizar el precio actual y regenerar los datos del perfil
      const lastCandle = candlestickSeriesRef.current?.lastValue();
      if (lastCandle) {
        setCurrentPrice(lastCandle.close);
        setVolumeProfileData(generateVolumeProfileData(lastCandle.close));
      }
    } catch (error) {
      console.error('Error updating price scale:', error);
    }
  };

  const updateVolumeProfile = (data: { close: number; volume: number }[]) => {
    if (!data.length) return;

    const currentPrice = data[data.length - 1].close;
    setCurrentPrice(currentPrice);
    const simulatedData = generateVolumeProfileData(currentPrice);
    setVolumeProfileData(simulatedData);
  };

  useEffect(() => {
    if (!container.current || !currentSymbol) return;

    console.log('Inicializando gráfico para:', currentSymbol);
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

    loadInitialData(currentSymbol);

    const handleResize = () => {
      if (!container.current) return;
      const { width, height } = container.current.getBoundingClientRect();
      chart.applyOptions({ width, height });
      chart.timeScale().fitContent();
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    chart.subscribeCrosshairMove(() => {
      updateVisiblePriceRange();
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      updateVisiblePriceRange();
    });


    return () => {
      window.removeEventListener('resize', handleResize);
      chart.unsubscribeCrosshairMove();
      chart.timeScale().unsubscribeVisibleLogicalRangeChange();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      historicalDataRef.current = [];
    };
  }, [currentSymbol]);

  useEffect(() => {
    if (!currentSymbol || !candlestickSeriesRef.current) return;

    const formattedSymbol = formatSymbolForBinance(currentSymbol);
    console.log('Conectando WebSocket para:', formattedSymbol);

    if (wsRef.current) {
      wsRef.current.close();
    }

    const wsUrl = `wss://fstream.binance.com/ws/${formattedSymbol.toLowerCase()}@kline_1m`;
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
            time: Math.floor(kline.t / 1000) as Time,
            open: parseFloat(kline.o),
            high: parseFloat(kline.h),
            low: parseFloat(kline.l),
            close: parseFloat(kline.c),
            volume: parseFloat(kline.v)
          };

          console.log('Nueva vela recibida:', bar);
          candlestickSeriesRef.current.update(bar);

          const lastCandle = { close: parseFloat(kline.c), volume: parseFloat(kline.v) };
          historicalDataRef.current = [...historicalDataRef.current.slice(-1499), lastCandle];
          updateVolumeProfile(historicalDataRef.current);
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
        {container.current && volumeProfileData.length > 0 && currentPrice && (
          <div 
            className="absolute right-20 top-0 h-full" 
            style={{ 
              width: '120px',
              zIndex: 2,
              pointerEvents: 'none'
            }}
          >
            <VolumeProfile
              data={volumeProfileData}
              width={120}
              height={container.current.clientHeight}
              priceScale={priceScale}
              currentPrice={currentPrice}
            />
          </div>
        )}
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