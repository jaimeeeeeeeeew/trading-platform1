import { useEffect, useRef } from 'react';
import { createChart, ColorType, Time } from 'lightweight-charts';
import type { IChartApi, SeriesOptionsCommon } from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    const chartInstance = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a1a' },
        textColor: 'white',
      },
      grid: {
        vertLines: { color: '#2b2b2b' },
        horzLines: { color: '#2b2b2b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      rightPriceScale: {
        visible: true,
        borderColor: '#2b2b2b',
      },
    });

    // Store the chart instance in the ref
    chart.current = chartInstance;

    // Create series
    const candleSeries = chartInstance.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Create volume series
    const volumeSeries = chartInstance.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Create order profile series
    const orderProfileSeries = chartInstance.addHistogramSeries({
      color: '#4CAF50',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'order-profile',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    // Sample data
    const candlestickData = [
      { time: '2024-02-01' as Time, open: 45000, high: 46000, low: 44000, close: 45500 },
      { time: '2024-02-02' as Time, open: 45500, high: 47000, low: 45000, close: 46800 },
    ];

    const volumeData = [
      { time: '2024-02-01' as Time, value: 1000, color: '#26a69a' },
      { time: '2024-02-02' as Time, value: 2000, color: '#ef5350' },
    ];

    const orderProfileData = [
      { time: '2024-02-01' as Time, value: 100, color: '#4CAF50' },
      { time: '2024-02-02' as Time, value: 200, color: '#4CAF50' },
      { time: '2024-02-01' as Time, value: 150, color: '#ef5350' },
      { time: '2024-02-02' as Time, value: 300, color: '#ef5350' },
    ];

    // Set the data
    candleSeries.setData(candlestickData);
    volumeSeries.setData(volumeData);
    orderProfileSeries.setData(orderProfileData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chart.current) {
        chart.current.remove();
      }
    };
  }, []);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        ref={chartContainerRef}
        className="w-full h-full"
      />
    </div>
  );
}