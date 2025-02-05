import { useEffect, useRef } from 'react';
import { 
  createChart,
  ColorType,
  LineStyle,
  CrosshairMode,
  IChartApi,
  ISeriesPrimitive,
  CandlestickSeriesOptions
} from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';
import { TradingViewDataFeed } from '@/lib/tradingview-feed';

interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);
  const dataFeed = useRef<TradingViewDataFeed | null>(null);
  const { currentSymbol, updatePriceRange, updateTimeRange } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    if (!container.current) return;

    try {
      // Create chart instance
      const chartInstance = createChart(container.current, {
        layout: {
          background: { color: '#1a1a1a' },
          textColor: '#DDD',
        },
        grid: {
          vertLines: { color: '#2B2B43', style: LineStyle.Solid },
          horzLines: { color: '#2B2B43', style: LineStyle.Solid },
        },
        crosshair: {
          mode: CrosshairMode.Normal,
        },
        timeScale: {
          timeVisible: true,
          secondsVisible: false,
          borderColor: '#2B2B43',
        },
        rightPriceScale: {
          borderColor: '#2B2B43',
        },
        width: container.current.clientWidth,
        height: container.current.clientHeight,
      });

      chart.current = chartInstance;

      // Initialize DataFeed
      dataFeed.current = new TradingViewDataFeed(currentSymbol);

      // Create candlestick series
      const candlestickSeriesOptions: CandlestickSeriesOptions = {
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350'
      };

      const candleSeries = chartInstance.addCandlestickSeries(candlestickSeriesOptions);

      // Create volume series
      const volumeSeries = chartInstance.addHistogramSeries({
        color: '#26a69a',
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: '',
        scaleMargins: {
          top: 0.8,
          bottom: 0,
        },
      });

      // Subscribe to data updates
      dataFeed.current.onScaleUpdate((data) => {
        console.log('📊 Scale update:', data);
        if (data.priceRange) {
          updatePriceRange({
            high: data.priceRange.high,
            low: data.priceRange.low,
            max: data.priceRange.max,
            min: data.priceRange.min
          });
        }
      });

      // Subscribe to historical data
      dataFeed.current.subscribeBars((bars: Bar[]) => {
        if (bars.length > 0) {
          const candleData = bars.map(bar => ({
            time: bar.time,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close
          }));

          const volumeData = bars.map(bar => ({
            time: bar.time,
            value: bar.volume,
            color: bar.close >= bar.open ? '#26a69a50' : '#ef535050'
          }));

          candleSeries.setData(candleData);
          volumeSeries.setData(volumeData);
        }
      });

      // Handle window resizing
      const handleResize = () => {
        if (container.current && chart.current) {
          chart.current.applyOptions({
            width: container.current.clientWidth,
            height: container.current.clientHeight
          });
        }
      };

      window.addEventListener('resize', handleResize);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (chart.current) {
          chart.current.remove();
        }
        if (dataFeed.current) {
          dataFeed.current.disconnect();
        }
      };
    } catch (error) {
      console.error('Error creating chart:', error);
      toast({
        title: 'Error',
        description: 'Failed to initialize chart',
        variant: 'destructive'
      });
    }
  }, [currentSymbol, updatePriceRange, updateTimeRange]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        ref={container}
        className="w-full h-full"
      />
    </div>
  );
}