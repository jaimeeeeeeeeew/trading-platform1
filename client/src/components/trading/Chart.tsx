import { useEffect, useRef } from 'react';
import { createChart, ColorType, CrosshairMode } from 'lightweight-charts';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chart = useRef<any>(null);
  const candleSeries = useRef<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Crear el gráfico
    chart.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight,
      layout: {
        background: { type: ColorType.Solid, color: '#000000' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.5)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.5)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.8)',
        timeVisible: true,
        secondsVisible: true,
      },
    });

    // Crear serie de velas
    candleSeries.current = chart.current.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Conectar a SSE para datos en tiempo real
    const eventSource = new EventSource('/api/market-data');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('📊 Datos recibidos:', data);

        // Crear datos de vela
        const candleData = {
          time: Date.now() / 1000,
          open: data.direccion - 10,
          high: data.direccion + Math.random() * 20,
          low: data.direccion - Math.random() * 20,
          close: data.direccion
        };

        candleSeries.current.update(candleData);

        // Imprimir información detallada
        console.log('=== DATOS DEL MERCADO ===');
        console.log(`Precio actual: $${data.direccion}`);
        console.log('Dominancia compradores:', data.dominancia.left);
        console.log('Dominancia vendedores:', data.dominancia.right);
        console.log('Delta futuros +:', data.delta_futuros.positivo);
        console.log('Delta futuros -:', data.delta_futuros.negativo);
        console.log('Delta spot +:', data.delta_spot.positivo);
        console.log('Delta spot -:', data.delta_spot.negativo);
        console.log('Últimas transacciones:', data.transacciones);
        console.log('========================');
      } catch (error) {
        console.error('Error procesando datos:', error);
      }
    };

    const handleResize = () => {
      if (chartContainerRef.current && chart.current) {
        chart.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      eventSource.close();
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