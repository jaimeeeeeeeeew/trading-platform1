import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);

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

    // Crear la serie de volumen
    volumeSeriesRef.current = chart.current.addHistogramSeries({
      color: '#089981',
      priceFormat: {
        type: 'volume',
      },
      priceScaleId: 'volume',
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });

    // Función para actualizar los datos del volumen
    const updateVolumeProfile = () => {
      // Aquí agregaremos los datos de las órdenes límite
      // Por ahora usamos datos de ejemplo
      const volumeData = [
        { time: '2024-02-03', value: 200, color: '#089981' },
        { time: '2024-02-03', value: 150, color: '#F23645' },
        { time: '2024-02-03', value: 300, color: '#089981' },
      ];

      volumeSeriesRef.current.setData(volumeData);
    };

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
    updateVolumeProfile();

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