import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);
  const candlestickSeries = useRef<any>(null);
  const volumeSeries = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Crear el gráfico principal
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#111320' },
        textColor: '#FFFFFF',
      },
      grid: {
        vertLines: { color: '#1f2937' },
        horzLines: { color: '#1f2937' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
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

    // Crear la serie de velas
    candlestickSeries.current = chart.current.addCandlestickSeries({
      upColor: '#089981',
      downColor: '#F23645',
      borderUpColor: '#089981',
      borderDownColor: '#F23645',
      wickUpColor: '#089981',
      wickDownColor: '#F23645',
    });

    // Crear la serie de volumen en un panel separado
    volumeSeries.current = chart.current.addBarSeries({
      overlay: true,
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8, // Ajusta esto para cambiar la posición vertical del volumen
        bottom: 0,
      },
    });

    // Datos de ejemplo para las velas
    const candleData = [
      { time: '2024-02-03', open: 40000, high: 41000, low: 39000, close: 40500 },
      { time: '2024-02-03', open: 40500, high: 41500, low: 40000, close: 41000 },
      { time: '2024-02-03', open: 41000, high: 42000, low: 40500, close: 41500 },
    ];

    // Datos de ejemplo para el volumen
    const volumeData = [
      { time: '2024-02-03', value: 200, color: '#089981' },
      { time: '2024-02-03', value: 150, color: '#F23645' },
      { time: '2024-02-03', value: 300, color: '#089981' },
    ];

    candlestickSeries.current.setData(candleData);
    volumeSeries.current.setData(volumeData);

    // Actualizar el tamaño del gráfico cuando cambie el tamaño de la ventana
    const handleResize = () => {
      if (chartContainerRef.current) {
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
        style={{ height: "calc(100vh - 2rem)" }}
        className="w-full"
      />
    </div>
  );
}