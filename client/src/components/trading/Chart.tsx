import { useEffect, useRef, useState } from 'react';
import { createChart, Time, ISeriesApi, CandlestickData, LogicalRange } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
//import { ArrowLeftRight } from 'lucide-react'; // Removed import
import { Button } from '@/components/ui/button';
import { VolumeProfile } from './VolumeProfile';
import { tradingViewService } from '@/lib/tradingview-service';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SecondaryIndicator from './SecondaryIndicator';

interface PriceCoordinates {
  currentPrice: number;
  currentY: number;
  minPrice: number;
  minY: number;
  maxPrice: number;
  maxY: number;
}

interface SecondaryIndicators {
  fundingRate: number[];
  longShortRatio: number[];
  deltaCvd: number[];
  rsi: number[];
  timestamps: number[];
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

    // Ajustar el rango para que cubra todo el espectro visible
    const dataMinPrice = Math.floor(currentPrice * 0.95);
    const dataMaxPrice = Math.ceil(currentPrice * 1.05);
    const interval = 10; // Siempre generar barras cada 10 dólares

    // Asegurarnos de que generamos una barra para cada nivel de precio
    for (let price = dataMinPrice; price <= dataMaxPrice; price += interval) {
      const distanceFromCurrent = Math.abs(price - currentPrice);
      // Ajustar la fórmula para que genere más volumen cerca del precio actual
      const volumeBase = Math.max(0, 1 - (distanceFromCurrent / (currentPrice * 0.02)) ** 2);
      const randomFactor = 0.8 + Math.random() * 0.4; // Menos variación aleatoria
      const volume = volumeBase * randomFactor * 1000;

      console.log(`Generating bar for price ${price} with volume ${volume}`);
      volumeProfileData.push({ price, volume, normalizedVolume: 0 });
    }

    // Normalizar los volúmenes
    const maxVolume = Math.max(...volumeProfileData.map(d => d.volume));
    const normalizedData = volumeProfileData.map(data => ({
      ...data,
      normalizedVolume: data.volume / maxVolume
    }));

    console.log(`Generated ${normalizedData.length} bars from ${dataMinPrice} to ${dataMaxPrice}`);
    return normalizedData;
  } catch (error) {
    console.error('Error generating volume profile:', error);
    return [];
  }
};

type ActiveIndicator = 'none' | 'rsi' | 'funding' | 'longShort' | 'deltaCvd';

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
  const [secondaryIndicators, setSecondaryIndicators] = useState<SecondaryIndicators>({
    fundingRate: [],
    longShortRatio: [],
    deltaCvd: [],
    rsi: [],
    timestamps: []
  });
  const [activeIndicator, setActiveIndicator] = useState<ActiveIndicator>('none');
  const [visibleRange, setVisibleRange] = useState<{from: number; to: number} | null>(null);

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const handleIntervalChange = async (newInterval: IntervalKey) => {
    try {
      if (isLoading) return;
      setIsLoading(true);

      console.log('Changing interval from', interval, 'to', newInterval);

      // 1. Desconectar WebSocket y limpiar datos
      cleanupWebSocket();

      // 2. Limpiar completamente el estado
      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData([]);
      }
      historicalDataRef.current = [];
      setVolumeProfileData([]);

      // 3. Cambiar el intervalo
      setInterval(newInterval);

      // 4. Esperar a que el estado se actualice
      await new Promise(resolve => setTimeout(resolve, 100));

      // 5. Cargar nuevos datos
      const formattedSymbol = formatSymbolForBinance(currentSymbol);

      const now = Date.now();
      const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

      try {
        const candlesticks = await tradingViewService.getHistory({
          symbol: formattedSymbol,
          resolution: tradingViewService.intervalToResolution(newInterval), // Usar el nuevo intervalo directamente
          from: Math.floor(ninetyDaysAgo / 1000),
          to: Math.floor(now / 1000)
        });

        if (candlestickSeriesRef.current && candlesticks && candlesticks.length > 0) {
          const formattedCandlesticks = candlesticks.map(candle => ({
            time: parseInt(candle.time) as Time,
            open: candle.open,
            high: candle.high,
            low: candle.low,
            close: candle.close,
            volume: candle.volume || 0
          }));

          // Establecer los nuevos datos
          candlestickSeriesRef.current.setData(formattedCandlesticks);
          handleAutoFit();

          // Actualizar el historial
          historicalDataRef.current = formattedCandlesticks.map(c => ({
            close: c.close,
            volume: c.volume
          }));

          updateVolumeProfile(historicalDataRef.current);

          // Iniciar nuevo WebSocket
          initializeWebSocket(formattedSymbol);
        }
      } catch (error) {
        console.error('Error loading data for new interval:', error);
        toast({
          title: 'Error',
          description: 'Error loading data for the new interval',
          variant: 'destructive',
        });
      }

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

  const initializeWebSocket = (symbol: string) => {
    try {
      cleanupWebSocket();

      const wsUrl = `wss://fstream.binance.com/ws/${symbol.toLowerCase()}@kline_${interval}`;
      console.log('Connecting WebSocket:', wsUrl);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for interval:', interval);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.e === 'kline' && data.k.i === interval && data.s === symbol.toUpperCase()) {
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

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  };

  const loadInitialData = async (symbol: string) => {
    if (!symbol || !candlestickSeriesRef.current) return;

    try {
      const formattedSymbol = formatSymbolForBinance(symbol);
      console.log('Loading historical data for:', formattedSymbol, 'interval:', interval);

      const now = Date.now();
      const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

      // Guardar el intervalo actual para validación
      const currentInterval = interval;

      let candlesticks;
      try {
        candlesticks = await tradingViewService.getHistory({
          symbol: formattedSymbol,
          resolution: tradingViewService.intervalToResolution(currentInterval),
          from: Math.floor(ninetyDaysAgo / 1000),
          to: Math.floor(now / 1000)
        });

        // Verificar que el intervalo no haya cambiado durante la carga
        if (currentInterval !== interval) {
          console.log('Interval changed during data fetch, aborting');
          return;
        }

        console.log('Successfully fetched candlesticks:', candlesticks.length, 'for interval:', interval);
      } catch (fetchError) {
        console.error('Error fetching candlesticks:', fetchError);
        throw fetchError;
      }

      if (candlestickSeriesRef.current && candlesticks && candlesticks.length > 0) {
        // Verificar nuevamente el intervalo
        if (currentInterval !== interval) {
          console.log('Interval changed before processing data, aborting');
          return;
        }

        const formattedCandlesticks = candlesticks.map(candle => ({
          time: parseInt(candle.time) as Time,
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume || 0
        }));

        // Una última verificación antes de establecer los datos
        if (currentInterval !== interval) {
          console.log('Interval changed before setting data, aborting');
          return;
        }

        candlestickSeriesRef.current.setData(formattedCandlesticks);
        handleAutoFit();

        historicalDataRef.current = formattedCandlesticks.map(c => ({ 
          close: c.close, 
          volume: c.volume 
        }));

        updateVolumeProfile(historicalDataRef.current);

        // Esperar antes de iniciar el WebSocket
        await new Promise(resolve => setTimeout(resolve, 500));

        // Verificación final antes de iniciar WebSocket
        if (currentInterval !== interval) {
          console.log('Interval changed before WebSocket initialization, aborting');
          return;
        }

        cleanupWebSocket();
        initializeWebSocket(formattedSymbol);

        toast({
          title: 'Data Loaded',
          description: `Loaded ${formattedCandlesticks.length} historical candles for ${interval}`,
        });
      } else {
        console.error('No candlesticks data available or series not initialized');
        throw new Error('No data available');
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

  const handleAutoFit = () => {
    if (!chartRef.current) return;

    const timeScale = chartRef.current.timeScale();
    timeScale.fitContent();
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

      const visibleLogicalRange = timeScale.getVisibleLogicalRange();
      if (visibleLogicalRange) {
        setVisibleRange(visibleLogicalRange);
      }

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

  const fetchSecondaryIndicators = async (symbol: string) => {
    try {
      const now = Date.now();
      // Create timestamps in ascending order (oldest to newest)
      const timestamps = Array.from({ length: 100 }, (_, i) => now - (99 - i) * 60000);

      setSecondaryIndicators({
        fundingRate: Array.from({ length: 100 }, () => (Math.random() - 0.5) * 0.002),
        longShortRatio: Array.from({ length: 100 }, () => 1 + Math.random()),
        deltaCvd: Array.from({ length: 100 }, () => Math.random() * 1000 - 500),
        rsi: Array.from({ length: 100 }, () => Math.random() * 100),
        timestamps
      });
    } catch (error) {
      console.error('Error fetching secondary indicators:', error);
    }
  };

  const handleResize = () => {
    if (!container.current || !chartRef.current) return;

    const { width, height } = container.current.getBoundingClientRect();
    const indicatorHeight = activeIndicator !== 'none' ? height * 0.2 : 0;

    chartRef.current.applyOptions({ 
      width,
      height: height - indicatorHeight,
      layout: {
        background: { color: '#151924' },
        textColor: '#DDD',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      }
    });
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
    handleResize();
    fetchSecondaryIndicators(currentSymbol);
  }, [activeIndicator, currentSymbol]);

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

      <div className="absolute top-2 right-24 z-10 flex gap-2">
        <Button
          variant={activeIndicator === 'rsi' ? 'default' : 'outline'}
          className="h-7 text-xs px-2 bg-background"
          onClick={() => setActiveIndicator(prev => prev === 'rsi' ? 'none' : 'rsi')}
        >
          RSI
        </Button>
        <Button
          variant={activeIndicator === 'funding' ? 'default' : 'outline'}
          className="h-7 text-xs px-2 bg-background"
          onClick={() => setActiveIndicator(prev => prev === 'funding' ? 'none' : 'funding')}
        >
          Funding
        </Button>
        <Button
          variant={activeIndicator === 'longShort' ? 'default' : 'outline'}
          className="h-7 text-xs px-2 bg-background"
          onClick={() => setActiveIndicator(prev => prev === 'longShort' ? 'none' : 'longShort')}
        >
          L/S Ratio
        </Button>
        <Button
          variant={activeIndicator === 'deltaCvd' ? 'default' : 'outline'}
          className="h-7 text-xs px-2 bg-background"
          onClick={() => setActiveIndicator(prev => prev === 'deltaCvd' ? 'none' : 'deltaCvd')}
        >
          Delta CVD
        </Button>
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
              visibleLogicalRange={visibleRange}
            />
          </div>
        )}

        {activeIndicator !== 'none' && (
          <div 
            className="absolute bottom-0 left-0 w-full bg-card-foreground/5"
            style={{ height: '20%' }}
          >
            {activeIndicator === 'rsi' && (
              <SecondaryIndicator
                data={secondaryIndicators.rsi}
                timestamps={secondaryIndicators.timestamps}
                height={container.current?.clientHeight ? container.current.clientHeight * 0.2 : 100}
                color="#ef5350"
              />
            )}
            {activeIndicator === 'funding' && (
              <SecondaryIndicator
                data={secondaryIndicators.fundingRate}
                timestamps={secondaryIndicators.timestamps}
                height={container.current?.clientHeight ? container.current.clientHeight * 0.2 : 100}
                color="#26a69a"
              />
            )}
            {activeIndicator === 'longShort' && (
              <SecondaryIndicator
                data={secondaryIndicators.longShortRatio}
                timestamps={secondaryIndicators.timestamps}
                height={container.current?.clientHeight ? container.current.clientHeight * 0.2 : 100}
                color="#42a5f5"
              />
            )}
            {activeIndicator === 'deltaCvd' && (
              <SecondaryIndicator
                data={secondaryIndicators.deltaCvd}
                timestamps={secondaryIndicators.timestamps}
                height={container.current?.clientHeight ? container.current.clientHeight * 0.2 : 100}
                color="#7e57c2"
              />
            )}
          </div>
        )}
      </div>

      <div className="absolute top-2 right-2 z-10">
        <Button
          onClick={handleAutoFit}
          className="bg-background hover:bg-background/90 shadow-md w-8 h-8 text-sm font-medium"
          variant="outline"
          title="Autoajustar"
        >
          A
        </Button>
      </div>
    </div>
  );
}