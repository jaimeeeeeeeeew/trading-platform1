import { useEffect, useRef } from 'react';
import { createChart, IChartApi, HistogramData } from 'lightweight-charts';

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
      rightPriceScale: {
        visible: true,
        borderColor: '#2b2b2b',
      },
    });

    // Create candlestick series
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Create volume series
    const volumeSeries = chart.addHistogramSeries({
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

    // Create order profile series (vertical histogram)
    const orderProfileSeries = chart.addHistogramSeries({
      color: '#4CAF50',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'orderProfile',
      base: 0,
      overlay: true,
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
    });

    // Sample data
    const candlestickData = [
      { time: '2024-02-01', open: 45000, high: 46000, low: 44000, close: 45500 },
      { time: '2024-02-02', open: 45500, high: 47000, low: 45000, close: 46800 },
    ];

    const volumeData = [
      { time: '2024-02-01', value: 1000, color: '#26a69a' },
      { time: '2024-02-02', value: 2000, color: '#ef5350' },
    ];

    // Order profile data - will be updated in real-time
    const orderProfileData: HistogramData[] = [
      { time: 45000, value: 100, color: '#4CAF50' },
      { time: 45500, value: 200, color: '#4CAF50' },
      { time: 46000, value: 150, color: '#ef5350' },
      { time: 46500, value: 300, color: '#ef5350' },
    ];

    // Set the data
    candlestickSeries.setData(candlestickData);
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