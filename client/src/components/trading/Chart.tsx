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

      // Limpiar conexión y datos actuales
      cleanupWebSocket();
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData([]);
      }
      historicalDataRef.current = [];

      // Cargar nuevos datos
      await loadInitialData(currentSymbol);

      toast({
        title: 'Interval Changed',
        description: `Changed to ${INTERVALS[newInterval].label}`,
      });
    } catch (error) {
      console.error('Error changing interval:', error);
      toast({
        title: 'Error',
        description: 'Error changing interval',
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
      console.log('Loading historical data for:', formattedSymbol);

      // Calcular timestamps para la carga de datos
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      // Cargar datos en chunks para mejor manejo de memoria
      const responses = await Promise.all([
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1000&endTime=${now}`),
        fetch(`https://fapi.binance.com/fapi/v1/klines?symbol=${formattedSymbol}&interval=${interval}&limit=1000&endTime=${thirtyDaysAgo}`)
      ]);

      const datas = await Promise.all(responses.map(r => r.json()));

      if (datas.some(data => data.code !== undefined)) {
        throw new Error('API response error');
      }

      // Combinar y ordenar datos
      const allData = [...datas[1], ...datas[0]].sort((a, b) => a[0] - b[0]);
      console.log('Received data:', allData.length, 'candles');

      const candlesticks = allData.map((d: any) => ({
        time: Math.floor(d[0] / 1000) as Time,
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
        volume: parseFloat(d[5])
      }));

      if (candlestickSeriesRef.current && candlesticks.length > 0) {
        // Limpiar datos anteriores
        candlestickSeriesRef.current.setData([]);
        historicalDataRef.current = [];

        // Establecer nuevos datos
        candlestickSeriesRef.current.setData(candlesticks);
        handleAutoFit();

        historicalDataRef.current = candlesticks.map(c => ({ 
          close: c.close, 
          volume: c.volume 
        }));

        updateVolumeProfile(historicalDataRef.current);

        // Inicializar WebSocket después de cargar datos históricos
        setTimeout(() => {
          cleanupWebSocket(); // Asegurar que no hay conexiones previas
          initializeWebSocket(formattedSymbol);
        }, 1000);
      }
    } catch (error) {
      console.error('Error loading historical data:', error);
      toast({
        title: 'Error',
        description: 'Error loading historical data',
        variant: 'destructive',
      });
    }
  };

  const initializeWebSocket = (symbol: string) => {
    try {
      cleanupWebSocket();

      const wsUrl = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`;
      console.log('Connecting WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        toast({
          title: 'Connected',
          description: 'Real-time connection established',
        });
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === 'kline' && data.s === symbol.toUpperCase()) {
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
          console.error('Error processing message:', error);
        }
      };

      let reconnectTimeout: NodeJS.Timeout;

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        toast({
          title: 'Connection Error',
          description: 'Real-time data connection error. Retrying...',
          variant: 'destructive',
        });
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        // Intentar reconexión solo si el websocket actual es el que se cerró
        if (wsRef.current === ws) {
          clearTimeout(reconnectTimeout);
          reconnectTimeout = setTimeout(() => {
            initializeWebSocket(symbol);
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
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