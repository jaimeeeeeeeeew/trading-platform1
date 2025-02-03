import { useEffect, useRef } from 'react';
import { createChart } from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: 'solid', color: '#1a1a1a' },
        textColor: 'white',
      },
      grid: {
        vertLines: { color: '#2b2b2b' },
        horzLines: { color: '#2b2b2b' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
    });

    // Create candlestick series
    const candlestickSeries = chart.createPrimitive('Candlestick', {
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Create volume series
    const volumeSeries = chart.createPrimitive('Histogram', {
      color: '#26a69a',
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Create order profile series on the right
    const orderProfileSeries = chart.createPrimitive('Histogram', {
      color: '#4CAF50',
      priceScaleId: 'orderProfile',
      scaleMargins: {
        top: 0.1,
        bottom: 0.1,
      },
      position: 'right',
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
    const orderProfileData = [
      { price: 45000, volume: 100 },
      { price: 45500, volume: 200 },
      { price: 46000, volume: 150 },
      { price: 46500, volume: 300 },
    ];

    // Set the data
    candlestickSeries.setData(candlestickData);
    volumeSeries.setData(volumeData);

    // Transform and set order profile data
    const transformedOrderProfile = orderProfileData.map(item => ({
      time: item.price.toString(),
      value: item.volume,
      color: item.volume > 200 ? '#ef5350' : '#26a69a'
    }));
    orderProfileSeries.setData(transformedOrderProfile);

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