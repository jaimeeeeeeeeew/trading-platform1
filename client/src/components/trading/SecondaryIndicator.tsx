import { useEffect, useRef } from 'react';
import { createChart, ISeriesApi, Time } from 'lightweight-charts';

interface SecondaryIndicatorProps {
  data: number[];
  timestamps: number[];
  height: number;
  color?: string;
  type?: 'line' | 'histogram' | 'candles';
}

export default function SecondaryIndicator({ 
  data, 
  timestamps, 
  height, 
  color = '#2962FF',
  type = 'line'
}: SecondaryIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line" | "Histogram" | "Candlestick"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🎨 Creating secondary indicator chart:', { type, dataPoints: data.length });

    const chart = createChart(containerRef.current, {
      layout: {
        background: { color: 'transparent' },
        textColor: '#DDD',
      },
      grid: {
        vertLines: { color: '#1e222d' },
        horzLines: { color: '#1e222d' },
      },
      width: containerRef.current.clientWidth,
      height: height,
      rightPriceScale: {
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    chartRef.current = chart;

    let series;
    if (type === 'histogram') {
      console.log('📊 Creating histogram series');
      series = chart.addHistogramSeries({
        color: color,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      });
    } else {
      console.log('📈 Creating line series');
      series = chart.addLineSeries({
        color: color,
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      });
    }

    seriesRef.current = series;

    if (data && data.length > 0 && timestamps && timestamps.length > 0) {
      console.log('📊 Setting chart data:', { 
        dataPoints: data.length, 
        timestampPoints: timestamps.length,
        firstValue: data[0],
        firstTimestamp: timestamps[0]
      });

      const chartData = data.map((value, index) => ({
        time: Math.floor(timestamps[index] / 1000) as Time,
        value: value,
        color: value >= 0 ? '#26a69a' : '#ef5350' // Verde para positivo, rojo para negativo
      }));

      series.setData(chartData);
    } else {
      console.warn('⚠️ No data available for secondary indicator');
    }

    const handleResize = () => {
      if (!containerRef.current || !chart) return;
      const { width } = containerRef.current.getBoundingClientRect();
      chart.applyOptions({ width, height });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, timestamps, height, color, type]);

  return (
    <div ref={containerRef} className="w-full h-full" />
  );
}