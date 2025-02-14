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

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: 'solid', color: 'transparent' },
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
      series = chart.addHistogramSeries({
        color: color,
        priceFormat: {
          type: 'price',
          precision: 6,
          minMove: 0.000001,
        },
      });
    } else if (type === 'candles') {
      series = chart.addCandlestickSeries({
        upColor: '#26a69a',
        downColor: '#ef5350',
        borderVisible: false,
        wickUpColor: '#26a69a',
        wickDownColor: '#ef5350',
      });
    } else {
      series = chart.addLineSeries({
        color: color,
        lineWidth: 2,
        priceFormat: {
          type: 'price',
          precision: 2,
          minMove: 0.01,
        },
      });
    }

    seriesRef.current = series;

    const chartData = data.map((value, index) => {
      const time = Math.floor(timestamps[index] / 1000) as Time;

      if (type === 'candles') {
        // Para las velas de OI, usamos el valor como precio de cierre
        // y generamos valores sintéticos para open/high/low
        return {
          time,
          open: value * 0.998,
          high: value * 1.002,
          low: value * 0.997,
          close: value
        };
      } else {
        return {
          time,
          value: value
        };
      }
    });

    series.setData(chartData);

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