import { useEffect, useRef, useState } from 'react';
import { createChart, Time, ISeriesApi, CandlestickData } from 'lightweight-charts';
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

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

const INTERVALS = {
  '1m': { label: '1m', minutes: 1 },
  '5m': { label: '5m', minutes: 5 },
  '15m': { label: '15m', minutes: 15 },
  '1h': { label: '1H', minutes: 60 },
  '4h': { label: '4H', minutes: 240 },
  '1d': { label: '1D', minutes: 1440 },
} as const;

type IntervalKey = keyof typeof INTERVALS;

const generateSimulatedVolumeProfile = (currentPrice: number) => {
  try {
    const volumeProfileData: Array<{ price: number; volume: number; normalizedVolume: number }> = [];
    // Fixed price range from 90,000 to 105,000
    const minPrice = 90000;
    const maxPrice = 105000;
    const interval = 50; // $50 intervals

    // Generate bars for the entire range
    for (let price = minPrice; price <= maxPrice; price += interval) {
      const distanceFromCurrent = Math.abs(price - currentPrice);
      // Use a wider range (7500) for smoother volume distribution
      const volumeBase = Math.max(0, 1 - (distanceFromCurrent / 7500) ** 0.75);
      const randomFactor = 0.5 + Math.random();
      const volume = volumeBase * randomFactor * 1000;
      volumeProfileData.push({ price, volume, normalizedVolume: 0 });
    }

    // Sort by price to ensure proper display
    volumeProfileData.sort((a, b) => a.price - b.price);

    // Find max volume for normalization
    const maxVolume = Math.max(...volumeProfileData.map(d => d.volume));

    // Normalize volumes
    return volumeProfileData.map(data => ({
      ...data,
      normalizedVolume: data.volume / maxVolume
    }));
  } catch (error) {
    console.error('Error generating volume profile:', error);
    return []; // Return empty array in case of error
  }
};

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const historicalDataRef = useRef<Array<{ close: number; volume: number }>>([]);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();
  const [interval, setInterval] = useState<IntervalKey>('1m');
  const [volumeProfileData, setVolumeProfileData] = useState<Array<{ price: number; volume: number; normalizedVolume: number }>>([]);
  const [visiblePriceRange, setVisiblePriceRange] = useState<{min: number, max: number}>({ min: 90000, max: 105000 });
  const [currentChartPrice, setCurrentChartPrice] = useState<number>(96000);
  const [priceCoordinate, setPriceCoordinate] = useState<number | null>(null);
  const [priceCoordinates, setPriceCoordinates] = useState<PriceCoordinates | null>(null);

  const handleAutoFit = () => {
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  };

  const updatePriceCoordinate = () => {
    if (candlestickSeriesRef.current && currentChartPrice) {
      const coordinate = candlestickSeriesRef.current.priceToCoordinate(currentChartPrice);
      if (coordinate !== null) {
        setPriceCoordinate(coordinate);
      }
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
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    try {
      const timeScale = chartRef.current.timeScale();
      const priceScale = chartRef.current.priceScale('right');

      if (!timeScale || !priceScale) return;

      const visibleRange = timeScale.getVisibleRange();
      if (!visibleRange) return;

      const allData = historicalDataRef.current;
      if (!allData.length) return;

      // Filtrar los puntos visibles basados en el rango de tiempo
      const visiblePoints = allData.filter((_, index) => {
        const time = timeScale.coordinateToTime(timeScale.timeToCoordinate(index));
        return time >= visibleRange.from && time <= visibleRange.to;
      });

      if (visiblePoints.length === 0) return;

      // Calcular el rango de precios visible
      const prices = visiblePoints.map(point => point.close);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);

      // Obtener el último precio (precio actual)
      const lastPoint = visiblePoints[visiblePoints.length - 1];
      if (!lastPoint) return;

      setCurrentChartPrice(lastPoint.close);

      // Ajustar el rango para incluir un poco más de espacio
      const padding = (maxPrice - minPrice) * 0.1;
      const paddedMinPrice = minPrice - padding;
      const paddedMaxPrice = maxPrice + padding;

      setVisiblePriceRange({ 
        min: paddedMinPrice, 
        max: paddedMaxPrice 
      });

      // Obtener todas las coordenadas necesarias
      const currentY = candlestickSeriesRef.current.priceToCoordinate(lastPoint.close);
      const minY = candlestickSeriesRef.current.priceToCoordinate(paddedMinPrice);
      const maxY = candlestickSeriesRef.current.priceToCoordinate(paddedMaxPrice);

      if (typeof currentY === 'number' && typeof minY === 'number' && typeof maxY === 'number') {
        const coordinates = {
          currentPrice: lastPoint.close,
          currentY,
          minPrice: paddedMinPrice,
          minY,
          maxPrice: paddedMaxPrice,
          maxY
        };

        setPriceCoordinates(coordinates);
        setPriceCoordinate(currentY);

        console.log('Price Coordinates Debug:', coordinates);
      }
    } catch (error) {
      console.error('Error al actualizar el rango de precios visible:', error);
    }
  };

  const updateVolumeProfile = (data: { close: number; volume: number }[]) => {
    try {
      if (!data || data.length === 0) return;

      const currentPrice = data[data.length - 1].close;
      if (!currentPrice || isNaN(currentPrice)) return;

      setCurrentChartPrice(currentPrice);
      const simulatedData = generateSimulatedVolumeProfile(currentPrice);
      setVolumeProfileData(simulatedData);
    } catch (error) {
      console.error('Error updating volume profile:', error);
    }
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
      updatePriceCoordinate();
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      updateVisiblePriceRange();
      updatePriceCoordinate();
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
        {container.current && volumeProfileData.length > 0 && currentChartPrice && (
          <div 
            className="absolute right-20 top-0 h-full" 
            style={{ 
              width: '120px',
              zIndex: 2,
              pointerEvents: 'none',
              background: 'rgba(21, 25, 36, 0.7)'
            }}
          >
            <VolumeProfile
              data={volumeProfileData}
              width={120}
              height={container.current.clientHeight}
              visiblePriceRange={visiblePriceRange}
              currentPrice={currentChartPrice}
              priceCoordinate={priceCoordinate}
              priceCoordinates={priceCoordinates}
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