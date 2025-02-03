import { useEffect, useRef } from 'react';
import { createChart, ColorType, IChartApi } from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi>();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
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
    });

    // Create the main candlestick series
    const mainSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Add volume histogram
    const volumeSeries = chart.addHistogramSeries({
      color: '#26a69a',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: '', // Set to empty to overlay
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Add order profile histogram on the right
    const orderProfileSeries = chart.addHistogramSeries({
      color: '#4CAF50',
      base: 0,
      priceFormat: {
        type: 'volume',
      },
      overlay: true,
      priceScaleId: 'overlay-scale',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    // Sample data - Replace with real data from your API
    const candlestickData = [
      { time: '2024-02-01', open: 45000, high: 46000, low: 44000, close: 45500 },
      { time: '2024-02-02', open: 45500, high: 47000, low: 45000, close: 46800 },
      // Add more data points...
    ];

    const volumeData = [
      { time: '2024-02-01', value: 1000, color: '#26a69a' },
      { time: '2024-02-02', value: 2000, color: '#ef5350' },
      // Add more volume data...
    ];

    const orderProfileData = [
      { time: '2024-02-01', value: 500, color: '#4CAF50' },
      { time: '2024-02-02', value: 800, color: '#ef5350' },
      // Add more order profile data...
    ];

    mainSeries.setData(candlestickData);
    volumeSeries.setData(volumeData);
    orderProfileSeries.setData(orderProfileData);

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
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