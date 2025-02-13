import { useEffect, useRef, useState } from 'react';
import { createChart, Time, ISeriesApi, CandlestickData } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { VolumeProfile } from './VolumeProfile';
import { tradingViewService } from '@/lib/tradingview-service';
import { useSocketIO } from '@/hooks/use-socket-io';
import { useMarketData } from '@/hooks/use-market-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import SecondaryIndicator from './SecondaryIndicator';
import { Input } from "@/components/ui/input";
import { useState as useState2, useEffect as useEffect2, useRef as useRef2 } from 'react';

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

interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: Time;
}

interface GroupedCandle {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
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
type ActiveIndicator = 'none' | 'rsi' | 'funding' | 'longShort' | 'deltaCvd';

interface UseSocketIOOptions {
  onProfileData?: (data: Array<{ price: number; volume: number; side: 'bid' | 'ask' }>) => void;
  onPriceUpdate?: (price: number) => void;
}

interface Props {
  data: {
    price: number;
    volume: number;
    normalizedVolume: number;
    side: 'bid' | 'ask';
  }[];
  width: number;
  height: number;
  visiblePriceRange: {
    min: number;
    max: number;
  };
  currentPrice: number;
  priceCoordinate: number | null;
  priceCoordinates: PriceCoordinates | null;
  maxVisibleBars: number;
  priceBucketSize?: number;
}

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
  const [volumeProfileData, setVolumeProfileData] = useState<Array<{ price: number; volume: number; normalizedVolume: number; side: 'bid' | 'ask' }>>([]);
  const [maxVisibleBars, setMaxVisibleBars] = useState<number>(200);
  const [customBars, setCustomBars] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [priceBucketSize, setPriceBucketSize] = useState<number>(10);
  const [grouping, setGrouping] = useState<'1' | '5' | '10'>('1');

  const { data: marketData, volumeProfile: orderbookVolumeProfile } = useMarketData();

  const [currentChartPrice, setCurrentChartPrice] = useState<number>(0);
  const [visiblePriceRange, setVisiblePriceRange] = useState<{min: number, max: number}>({
    min: 0,
    max: 0
  });

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
  const [crosshairData, setCrosshairData] = useState<OHLCVData | null>(null);
  const [crosshairPrice, setCrosshairPrice] = useState<number | null>(null);

  const { socket } = useSocketIO({
    onProfileData: (profileData) => {
      if (!profileData || profileData.length === 0) return;

      const maxVolume = Math.max(...profileData.map(item => item.volume));
      const normalizedData = profileData.map(item => ({
        price: item.price,
        volume: item.volume,
        normalizedVolume: item.volume / maxVolume,
        side: item.side
      }));

      setVolumeProfileData(normalizedData);
    },
    onPriceUpdate: (newPrice) => {
      setCurrentChartPrice(newPrice);
      updatePriceCoordinate();
    }
  });

  const cleanupWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  const groupCandles = (candles: CandlestickData[], groupSize: number): GroupedCandle[] => {
    if (groupSize === 1) return candles as GroupedCandle[];
    if (!candles || candles.length === 0) return [];

    const grouped: GroupedCandle[] = [];
    for (let i = 0; i < candles.length; i += groupSize) {
      const group = candles.slice(i, Math.min(i + groupSize, candles.length));
      if (group.length === 0) continue;

      const groupedCandle: GroupedCandle = {
        time: group[0].time,
        open: group[0].open,
        high: Math.max(...group.map(c => c.high)),
        low: Math.min(...group.map(c => c.low)),
        close: group[group.length - 1].close,
        volume: group.reduce((sum, c) => sum + (c.volume || 0), 0)
      };

      grouped.push(groupedCandle);
    }

    return grouped;
  };

  const handleIntervalChange = async (newInterval: IntervalKey) => {
    try {
      if (isLoading) return;
      setIsLoading(true);

      cleanupWebSocket();

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData([]);
      }
      historicalDataRef.current = [];
      setVolumeProfileData([]);
      setInterval(newInterval);

      await new Promise(resolve => setTimeout(resolve, 100));

      const formattedSymbol = formatSymbolForBinance(currentSymbol);

      const now = Date.now();
      const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);

      try {
        const candlesticks = await tradingViewService.getHistory({
          symbol: formattedSymbol,
          resolution: tradingViewService.intervalToResolution(newInterval),
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

          // Aplicar agrupamiento a los datos históricos
          const groupedCandlesticks = groupCandles(formattedCandlesticks, parseInt(grouping));
          candlestickSeriesRef.current.setData(groupedCandlesticks);
          handleAutoFit();

          historicalDataRef.current = groupedCandlesticks.map(c => ({
            close: c.close,
            volume: c.volume
          }));

          updateVolumeProfile(historicalDataRef.current);
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
            const newBar = {
              time: Math.floor(kline.t / 1000) as Time,
              open: parseFloat(kline.o),
              high: parseFloat(kline.h),
              low: parseFloat(kline.l),
              close: parseFloat(kline.c),
              volume: parseFloat(kline.v)
            };

            if (candlestickSeriesRef.current) {
              const groupSize = parseInt(grouping);
              const lastBars = historicalDataRef.current
                .slice(-groupSize + 1)
                .map((bar, index) => ({
                  time: Math.floor(Date.now() / 1000 - (groupSize - index - 1) * 60) as Time,
                  open: bar.close,
                  high: bar.close,
                  low: bar.close,
                  close: bar.close,
                  volume: bar.volume
                }));

              const barsToGroup = [...lastBars, newBar];
              const groupedBar = groupCandles(barsToGroup, groupSize)[0];

              if (groupedBar) {
                candlestickSeriesRef.current.update(groupedBar);
                historicalDataRef.current = [...historicalDataRef.current.slice(-(1500 - groupSize)), {
                  close: groupedBar.close,
                  volume: groupedBar.volume
                }];
                updateVolumeProfile(historicalDataRef.current);
              }
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
      const now = Date.now();
      const ninetyDaysAgo = now - (90 * 24 * 60 * 60 * 1000);
      const currentInterval = interval;

      let candlesticks;
      try {
        candlesticks = await tradingViewService.getHistory({
          symbol: formattedSymbol,
          resolution: tradingViewService.intervalToResolution(currentInterval),
          from: Math.floor(ninetyDaysAgo / 1000),
          to: Math.floor(now / 1000)
        });

        if (currentInterval !== interval) {
          console.log('Interval changed during data fetch, aborting');
          return;
        }

      } catch (fetchError) {
        console.error('Error fetching candlesticks:', fetchError);
        throw fetchError;
      }

      if (candlestickSeriesRef.current && candlesticks && candlesticks.length > 0) {
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

        const groupedCandlesticks = groupCandles(formattedCandlesticks, parseInt(grouping));
        candlestickSeriesRef.current.setData(groupedCandlesticks);
        handleAutoFit();

        historicalDataRef.current = groupedCandlesticks.map(c => ({
          close: c.close,
          volume: c.volume
        }));

        updateVolumeProfile(historicalDataRef.current);
        initializeWebSocket(formattedSymbol);

        toast({
          title: 'Data Loaded',
          description: `Loaded ${groupedCandlesticks.length} historical candles for ${interval}`,
        });
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
    chartRef.current.timeScale().fitContent();
  };

  const updatePriceCoordinate = () => {
    if (!candlestickSeriesRef.current || !currentChartPrice) return;

    const currentY = candlestickSeriesRef.current.priceToCoordinate(currentChartPrice);
    const minY = candlestickSeriesRef.current.priceToCoordinate(visiblePriceRange.min);
    const maxY = candlestickSeriesRef.current.priceToCoordinate(visiblePriceRange.max);

    if (currentY !== null && minY !== null && maxY !== null) {
      setPriceCoordinate(currentY);
      setPriceCoordinates({
        currentPrice: currentChartPrice,
        currentY,
        minPrice: visiblePriceRange.min,
        minY,
        maxPrice: visiblePriceRange.max,
        maxY
      });

      console.log('Price coordinates updated:', {
        price: currentChartPrice,
        y: currentY,
        range: { min: minY, max: maxY }
      });
    }
  };

  const formatSymbolForBinance = (symbol: string) => {
    return symbol
      .toUpperCase()
      .replace('BINANCE:', '')
      .replace('PERP', '');
  };


  const updateVolumeProfile = (data: { close: number; volume: number }[]) => {
    try {
      if (!data || data.length === 0) return;

      const currentPrice = data[data.length - 1].close;
      if (!currentPrice || isNaN(currentPrice)) return;

      setCurrentChartPrice(currentPrice);
    } catch (error) {
      console.error('Error updating volume profile:', error);
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

  const calculateChange = (open?: number, close?: number) => {
    if (!open || !close) return 0;
    return ((close - open) / open) * 100;
  };

  const [priceScaleInfo, setPriceScaleInfo] = useState<{
    visiblePrices: Array<{price: number, coordinate: number}>;
    priceStep: number;
    maxPrice: number;
    minPrice: number;
  }>({
    visiblePrices: [],
    priceStep: 200,
    maxPrice: 0,
    minPrice: 0
  });

  const updatePriceScaleInfo = () => {
    if (!chartRef.current || !candlestickSeriesRef.current) return;

    try {
        const series = candlestickSeriesRef.current;
        const logicalRange = chartRef.current.timeScale().getVisibleLogicalRange();

        if (!logicalRange) return;

        const visibleBars = chartRef.current.timeScale().getVisibleRange();
        if (!visibleBars) return;

        const { min: minPrice, max: maxPrice } = visiblePriceRange;

        const range = maxPrice - minPrice;

        const priceStep = 10;

        const numSteps = Math.floor(range / priceStep);
        const prices: Array<{price: number, coordinate: number}> = [];

        for (let i = 0; i <= numSteps; i++) {
            const price = minPrice + (i * priceStep);
            const coordinate = series.priceToCoordinate(price);

            if (coordinate !== null) {
                prices.push({
                    price,
                    coordinate
                });
            }
        }

        setPriceScaleInfo({
            visiblePrices: prices,
            priceStep,
            maxPrice,
            minPrice
        });

    } catch (error) {
        console.error('Error updating price scale info:', error);
    }
  };

  const handleVisibleRangeChange = () => {
    if (!candlestickSeriesRef.current || !currentChartPrice || !container.current) return;

    try {
        const series = candlestickSeriesRef.current;

        const currentPrice = currentChartPrice;
        const minPrice = currentPrice * 0.85; 
        const maxPrice = currentPrice * 1.15; 

        console.log('Actualizando rango de precios:', {
          currentPrice,
          minPrice,
          maxPrice
        });

        setVisiblePriceRange({
            min: minPrice,
            max: maxPrice
        });

        const currentY = series.priceToCoordinate(currentPrice);
        const minY = series.priceToCoordinate(minPrice);
        const maxY = series.priceToCoordinate(maxPrice);

        if (minY !== null && maxY !== null && currentY !== null) {
            setPriceCoordinate(currentY);
            setPriceCoordinates({
                currentPrice,
                currentY,
                minPrice,
                minY,
                maxPrice,
                maxY
            });
        }

    } catch (error) {
        console.error('Error updating visible range:', error);
    }
  };

  useEffect(() => {
    if (marketData?.currentPrice) {
      const price = marketData.currentPrice;
      setCurrentChartPrice(price);
      setVisiblePriceRange({
        min: price * 0.85, 
        max: price * 1.15  
      });

      console.log('Actualizando precio y rango:', {
        price,
        min: price * 0.85,
        max: price * 1.15
      });
    }
  }, [marketData?.currentPrice]);

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
          width: 1,
          color: '#6B7280',
          style: 1,
          labelBackgroundColor: '#1e222d',
          labelVisible: true,
          visible: true,
        },
        horzLine: {
          width: 1,
          color: '#6B7280',
          style: 1,
          labelBackgroundColor: '#1e222d',
          labelVisible: true,
          visible: true,
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
        entireTextOnly: false,
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

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      handleVisibleRangeChange();
      updatePriceScaleInfo();
    });

    chart.subscribeCrosshairMove((param) => {
      if (!param.point || !candlestickSeriesRef.current) return;

      if (param.time) {
        const data = param.seriesData.get(candlestickSeries) as CandlestickData;
        if (data) {
          setCrosshairData(data as any);
          updatePriceScaleInfo();
          handleVisibleRangeChange();
        }
      }
    });

    loadInitialData(currentSymbol);
    handleResize();
    window.addEventListener('resize', handleResize);

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
  }, [activeIndicator]);

  useEffect(() => {
    if (!socket) return;

    const handlePriceUpdate = (newPrice: number) => {
      setCurrentChartPrice(newPrice);
      updatePriceCoordinate();
    };

    socket.on('price_update', handlePriceUpdate);

    return () => {
      socket.off('price_update', handlePriceUpdate);
    };
  }, [socket]);

  useEffect(() => {
    updatePriceCoordinate();
  }, [currentChartPrice, visiblePriceRange]);

  useEffect(() => {
    if (!orderbookVolumeProfile.length) return;

    const handleVolumeProfileUpdate = () => {
      if (!candlestickSeriesRef.current) return;

      const maxVolume = Math.max(...orderbookVolumeProfile.map(d => d.volume));
      const normalizedData = orderbookVolumeProfile
        .filter(data => data.price >= visiblePriceRange.min && data.price <= visiblePriceRange.max)
        .map(data => ({
          ...data,
          normalizedVolume: data.volume / maxVolume
        }));

      setVolumeProfileData(normalizedData);
    };

    handleVolumeProfileUpdate();
  }, [orderbookVolumeProfile, visiblePriceRange]);

  // Add new effect to handle grouping changes
  useEffect(() => {
    if (!candlestickSeriesRef.current || !historicalDataRef.current) return;

    try {
      const rawData = historicalDataRef.current.map((candle, index) => ({
        time: Math.floor(Date.now() / 1000 - (historicalDataRef.current.length - index) * 60) as Time,
        open: candle.close, // Using close as open since we don't have the original OHLC data
        high: candle.close,
        low: candle.close,
        close: candle.close,
        volume: candle.volume
      }));

      const groupedData = groupCandles(rawData, parseInt(grouping));

      if (candlestickSeriesRef.current) {
        candlestickSeriesRef.current.setData(groupedData);
      }

      toast({
        title: 'Grouping Updated',
        description: `Changed grouping to ${grouping === '1' ? 'none' : `${grouping}x`}`,
      });

    } catch (error) {
      console.error('Error updating grouping:', error);
      toast({
        title: 'Error',
        description: 'Failed to update grouping',
        variant: 'destructive',
      });
    }
  }, [grouping]);

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

        <Select
          value={grouping}
          onValueChange={(value) => setGrouping(value as '1' | '5' | '10')}
        >
          <SelectTrigger className="w-28 bg-background">
            <SelectValue placeholder="Group" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">No Group</SelectItem>
            <SelectItem value="5">Group x5</SelectItem>
            <SelectItem value="10">Group x10</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {crosshairData && (
        <div className="absolute top-14 left-2 z-10 bg-background/90 p-2 rounded-md border border-border shadow-lg text-xs flex items-center gap-2">
          <div className={`flex items-center gap-2 ${calculateChange(crosshairData.open, crosshairData.close) >= 0
            ? 'text-green-500'
            : 'text-red-500'}`}>
            <span className="font-mono text-xs">
              {crosshairData.open?.toFixed(2) || '0.00'}
            </span>
            <span className="font-mono text-xs">
              {crosshairData.high?.toFixed(2) || '0.00'}
            </span>
            <span className="font-mono text-xs">
              {crosshairData.low?.toFixed(2) || '0.00'}
            </span>
            <span className="font-mono text-xs">
              {crosshairData.close?.toFixed(2) || '0.00'}
            </span>
            <span className="font-mono text-xs">
              {calculateChange(crosshairData.open, crosshairData.close).toFixed(2)}%
            </span>
          </div>
        </div>
      )}

      <div className="absolute top-2 right-24 z-10">
        <Select
          value={activeIndicator}
          onValueChange={(value) => setActiveIndicator(value as ActiveIndicator)}
        >
          <SelectTrigger className="w-32 bg-background">
            <SelectValue placeholder="Indicadores" defaultValue="Indicadores">Indicadores</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Ninguno</SelectItem>
            <SelectItem value="rsi">RSI</SelectItem>
            <SelectItem value="funding">Funding Rate</SelectItem>
            <SelectItem value="longShort">Long/Short Ratio</SelectItem>
            <SelectItem value="deltaCvd">Delta CVD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-full h-full relative" style={{ minHeight: '400px' }}>
        <div ref={container} className="w-full h-full" />

        {container.current && orderbookVolumeProfile.length > 0 && currentChartPrice && (
          <div
            className="absolute right-0 top-0 h-full pointer-events-none"
            style={{
              width: '450px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 100
            }}
          >
            <VolumeProfile
              data={volumeProfileData}
              width={450}
              height={container.current.clientHeight}
              visiblePriceRange={visiblePriceRange}
              currentPrice={currentChartPrice}
              priceCoordinate={priceCoordinate}
              priceCoordinates={priceCoordinates}
              maxVisibleBars={maxVisibleBars}
              priceBucketSize={priceBucketSize}
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