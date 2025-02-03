import { useEffect, useRef } from 'react';
import { 
  createChart, 
  IChartApi,
  ISeriesApi,
  CandlestickData,
  HistogramData
} from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Crear el gráfico principal
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: 'solid', color: '#111320' },
        textColor: '#FFFFFF',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      rightPriceScale: {
        borderColor: '#1f2937',
      },
      timeScale: {
        borderColor: '#1f2937',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    chartRef.current = chart;

    // Crear la serie de velas
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#089981',
      downColor: '#F23645',
      borderUpColor: '#089981',
      borderDownColor: '#F23645',
      wickUpColor: '#089981',
      wickDownColor: '#F23645',
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Crear la serie de volumen
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

    volumeSeriesRef.current = volumeSeries;

    // Datos de ejemplo para las velas
    const candleData: CandlestickData[] = [
      { time: '2024-02-03', open: 40000, high: 41000, low: 39000, close: 40500 },
      { time: '2024-02-03', open: 40500, high: 41500, low: 40000, close: 41000 },
      { time: '2024-02-03', open: 41000, high: 42000, low: 40500, close: 41500 },
    ];

    // Datos de ejemplo para el volumen
    const volumeData: HistogramData[] = [
      { time: '2024-02-03', value: 200, color: '#089981' },
      { time: '2024-02-03', value: 150, color: '#F23645' },
      { time: '2024-02-03', value: 300, color: '#089981' },
    ];

    candlestickSeries.setData(candleData);
    volumeSeries.setData(volumeData);

    // Actualizar el tamaño del gráfico cuando cambie el tamaño de la ventana
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
        style={{ height: "calc(100vh - 2rem)" }}
        className="w-full"
      />
    </div>
  );
}