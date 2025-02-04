import { useEffect, useRef } from 'react';
import { createChart, ColorType } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useMarketData } from '@/lib/use-market-data';

export default function Chart() {
  const { currentSymbol } = useTrading();
  const { data: marketData } = useMarketData();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);
  const series = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Inicializar el gráfico
    chart.current = createChart(chartContainerRef.current, {
      layout: {
        background: { color: '#1a1a1a' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2b2b43' },
        horzLines: { color: '#2b2b43' },
      },
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      timeScale: {
        timeVisible: true,
        secondsVisible: true,
      },
    });

    // Crear la serie de líneas
    series.current = chart.current.addLineSeries({
      color: '#2962FF',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      priceLineVisible: true,
      priceLineWidth: 1,
      priceLineColor: '#2962FF',
      priceLineStyle: 3,
    });

    // Manejar el redimensionamiento
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

  // Actualizar datos cuando cambian
  useEffect(() => {
    if (series.current && marketData) {
      const price = parseFloat(marketData.ask_limit);
      if (!isNaN(price)) {
        series.current.update({
          time: Date.now() / 1000,
          value: price,
        });
      }
    }
  }, [marketData]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-[#1a1a1a]">
      <div
        ref={chartContainerRef}
        className="w-full h-full"
      />
    </div>
  );
}