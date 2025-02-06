import { useEffect, useRef } from 'react';
import { createChart, ISeriesApi, Time } from 'lightweight-charts';

interface SecondaryIndicatorProps {
  data: number[];
  timestamps: number[];
  height: number;
  color?: string;
}

export default function SecondaryIndicator({ data, timestamps, height, color = '#2962FF' }: SecondaryIndicatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

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
      height: height - 40, // Ajustamos por el espacio del título
    });

    chartRef.current = chart;

    const lineSeries = chart.addLineSeries({
      color: color,
      lineWidth: 2,
    });

    seriesRef.current = lineSeries;

    const chartData = data.map((value, index) => ({
      time: Math.floor(timestamps[index] / 1000) as Time,
      value: value
    }));

    lineSeries.setData(chartData);

    const handleResize = () => {
      if (!containerRef.current || !chart) return;

      const { width } = containerRef.current.getBoundingClientRect();
      chart.applyOptions({ width, height: height - 40 });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, timestamps, height, color]);

  return <div ref={containerRef} className="w-full h-full" />;
}