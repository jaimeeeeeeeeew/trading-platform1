import { useEffect, useRef, useState } from 'react';
import { createChart, Time, ISeriesApi, CandlestickData, LogicalRange } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeftRight } from 'lucide-react';
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
    console.log('Generating volume profile with current price:', currentPrice);
    const volumeProfileData: Array<{ price: number; volume: number; normalizedVolume: number }> = [];
    const dataMinPrice = 90000;
    const dataMaxPrice = 105000;
    const interval = 50;

    for (let price = dataMinPrice; price <= dataMaxPrice; price += interval) {
      const distanceFromCurrent = Math.abs(price - currentPrice);
      const volumeBase = Math.max(0, 1 - (distanceFromCurrent / 5000) ** 0.5);
      const randomFactor = 0.5 + Math.random();
      const volume = volumeBase * randomFactor * 1000;
      volumeProfileData.push({ price, volume, normalizedVolume: 0 });
    }

    volumeProfileData.sort((a, b) => a.price - b.price);
    const maxVolume = Math.max(...volumeProfileData.map(d => d.volume));
    const normalizedData = volumeProfileData.map(data => ({
      ...data,
      normalizedVolume: data.volume / maxVolume
    }));

    return normalizedData;
  } catch (error) {
    console.error('Error generating volume profile:', error);
    return [];
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
  const [isLoading, setIsLoading] = useState(false);
  const [volumeProfileData, setVolumeProfileData] = useState<Array<{ price: number; volume: number; normalizedVolume: number }>>([]);
  const [visiblePriceRange, setVisiblePriceRange] = useState<{min: number, max: number}>({ min: 95850, max: 99300 });
  const [currentChartPrice, setCurrentChartPrice] = useState<number>(96000);
  const [priceCoordinate, setPriceCoordinate] = useState<number | null>(null);
  const [priceCoordinates, setPriceCoordinates] = useState<PriceCoordinates | null>(null);

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleIntervalChange = async (newInterval: IntervalKey) => {
    try {
      setIsLoading(true);
      setInterval(newInterval);
      cleanupWebSocket();

      // Limpiar datos actuales
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData([]);
      }

      // Cargar nuevos datos
      await loadInitialData(currentSymbol);

      toast({
        title: 'Intervalo Cambiado',
        description: `Cambiado a ${INTERVALS[newInterval].label}`,
      });
    } catch (error) {
      console.error('Error al cambiar intervalo:', error);
      toast({
        title: 'Error',
        description: 'Error al cambiar el intervalo',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadInitialData = async (symbol: string) => {
    if (!symbol || !candlestickSeriesRef.current) return;

    try {
      const formattedSymbol = formatSymbolForBinance(symbol);
      console.log('Cargando datos históricos para:', formattedSymbol);

      const now = Date.now();
      const responses = await Promise.all([
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1500`),
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1500&endTime=${now - 90000000}`)
      ]);

      const datas = await Promise.all(responses.map(r => r.json()));

      if (datas.some(data => data.code !== undefined)) {
        throw new Error('Error en la respuesta de la API');
      }

      const allData = [...datas[1], ...datas[0]];
      console.log('Datos recibidos:', allData.length, 'velas');

      const candlesticks = allData.map((d: any) => ({
        time: Math.floor(d[0] / 1000) as Time,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      if (candlestickSeriesRef.current && candlesticks.length > 0) {
        candlestickSeriesRef.current.setData(candlesticks);
        handleAutoFit();

        historicalDataRef.current = candlesticks.map(c => ({ 
          close: c.close, 
          volume: c.volume 
        }));

        updateVolumeProfile(historicalDataRef.current);

        // Solo inicializar WebSocket después de cargar los datos históricos exitosamente
        setTimeout(() => {
          initializeWebSocket(formattedSymbol);
        }, 1000); // Pequeño delay para asegurar que los datos se hayan renderizado
      }
    } catch (error) {
      console.error('Error cargando datos históricos:', error);
      toast({
        title: 'Error',
        description: 'Error al cargar datos históricos',
        variant: 'destructive',
      });
    }
  };

  const initializeWebSocket = (symbol: string) => {
    try {
      cleanupWebSocket();

      const wsUrl = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`;
      console.log('Conectando WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket conectado');
        toast({
          title: 'Conectado',
          description: 'Conexión en tiempo real establecida',
        });
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

            if (candlestickSeriesRef.current) {
              candlestickSeriesRef.current.update(bar);
              const lastCandle = { close: parseFloat(kline.c), volume: parseFloat(kline.v) };
              historicalDataRef.current = [...historicalDataRef.current.slice(-1499), lastCandle];
              updateVolumeProfile(historicalDataRef.current);
            }
          }
        } catch (error) {
          console.error('Error procesando mensaje:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('Error de WebSocket:', error);
        toast({
          title: 'Error de Conexión',
          description: 'Error en la conexión de datos en tiempo real. Reintentando...',
          variant: 'destructive',
        });

        // Reintentar conexión después de un error
        setTimeout(() => {
          if (wsRef.current === ws) { // Solo reintentar si este websocket aún es el actual
            initializeWebSocket(symbol);
          }
        }, 5000);
      };

      ws.onclose = () => {
        console.log('WebSocket desconectado');
        // Reintentar conexión si se cierra inesperadamente
        setTimeout(() => {
          if (wsRef.current === ws) { // Solo reintentar si este websocket aún es el actual
            initializeWebSocket(symbol);
          }
        }, 5000);
      };
    } catch (error) {
      console.error('Error inicializando WebSocket:', error);
    }
  };

  const handleAutoFit = () => {
    if (!chartRef.current) return;

    const timeScale = chartRef.current.timeScale();
    const visibleRange = timeScale.getVisibleLogicalRange();

    if (visibleRange !== null) {
      const currentRange: LogicalRange = {
        from: visibleRange.from,
        to: visibleRange.to,
      };

      timeScale.fitContent();
      const newRange = timeScale.getVisibleLogicalRange();

      if (newRange !== null) {
        timeScale.setVisibleLogicalRange({
          from: currentRange.from,
          to: currentRange.to,
        });
        setTimeout(() => {
          timeScale.setVisibleLogicalRange(newRange);
        }, 50);
      }
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

  const formatSymbolForBinance = (symbol: string) => {
    return symbol
      .toUpperCase()
      .replace('BINANCE:', '')
      .replace('PERP', '');
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

      const minPrice = 90000;
      const maxPrice = 105000;

      setVisiblePriceRange({ 
        min: minPrice, 
        max: maxPrice 
      });

      const lastPoint = allData[allData.length - 1];
      if (!lastPoint) return;

      setCurrentChartPrice(lastPoint.close);

      if (candlestickSeriesRef.current) {
        const currentY = candlestickSeriesRef.current.priceToCoordinate(lastPoint.close);
        const minY = candlestickSeriesRef.current.priceToCoordinate(minPrice);
        const maxY = candlestickSeriesRef.current.priceToCoordinate(maxPrice);

        if (typeof currentY === 'number' && typeof minY === 'number' && typeof maxY === 'number') {
          const coordinates = {
            currentPrice: lastPoint.close,
            currentY,
            minPrice,
            minY,
            maxPrice,
            maxY
          };

          setPriceCoordinates(coordinates);
          setPriceCoordinate(currentY);

          console.log('Updated Price Coordinates:', coordinates);
        }
      }
    } catch (error) {
      console.error('Error updating visible price range:', error);
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
      cleanupWebSocket();
      chart.remove();
      chartRef.current = null;
      candlestickSeriesRef.current = null;
      historicalDataRef.current = [];
    };
  }, [currentSymbol]);

  useEffect(() => {
    if (!currentSymbol || !candlestickSeriesRef.current) return;

    initializeWebSocket(formatSymbolForBinance(currentSymbol));

  }, [currentSymbol, interval, candlestickSeriesRef]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card relative">
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <Select
          value={interval}
          onValueChange={handleIntervalChange}
          disabled={isLoading}
        >
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
      <div className="absolute top-2 right-2 z-10 flex gap-2">
        <Button
          onClick={handleAutoFit}
          className="bg-background hover:bg-background/90 shadow-md"
          size="icon"
          variant="outline"
          title="Ajustar a la vista"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}