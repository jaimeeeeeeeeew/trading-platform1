import { useEffect, useRef } from 'react';
import { useTrading } from '@/lib/trading-context';
import { useToast } from '@/hooks/use-toast';

declare global {
  interface Window {
    TradingView: any;
  }
}

export default function Chart() {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<any>(null);
  const { currentSymbol } = useTrading();
  const { toast } = useToast();

  useEffect(() => {
    const loadTradingView = () => {
      if (!container.current) {
        console.error('❌ Container no encontrado');
        return;
      }

      try {
        // Crear el widget con configuración extendida
        widget.current = new window.TradingView.widget({
          container_id: container.current!.id,
          width: "100%",
          height: "100%",
          symbol: "BTCUSDT",
          interval: "1",
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "es",
          enable_publishing: false,
          allow_symbol_change: true,
          hide_side_toolbar: false,
          debug: true,
          autosize: true,
          studies: [
            "RSI@tv-basicstudies",
            "MASimple@tv-basicstudies",
            "MACD@tv-basicstudies"
          ],
          // Eventos del gráfico
          onChartReady: () => {
            const chart = widget.current.chart();
            console.log("🎯 Chart Ready Event Triggered");

            // Intentar acceder a la instancia de la biblioteca
            console.log("📚 TradingView Library:", window.TradingView);

            // Registrar eventos de barra
            chart.onBarUpdate(() => {
              const data = chart.chartData();
              console.log("📊 Bar Update:", data);
            });

            // Registrar eventos de cursor
            chart.onCrosshairMove(param => {
              console.log("🎯 Crosshair Move:", param);
            });

            // Obtener estudios activos
            const studies = chart.getAllStudies();
            console.log("📈 Active Studies:", studies);

            // Suscribirse a cambios en el símbolo
            chart.onSymbolChange(symbolData => {
              console.log("💱 Symbol Changed:", symbolData);
            });

            // Intentar acceder a los datos históricos
            chart.requestHistoryData({
              callback: (data) => {
                console.log("📅 Historical Data:", data);
              }
            });

            // Configurar un intervalo para monitorear datos en tiempo real
            const interval = setInterval(() => {
              try {
                // Obtener datos de la serie principal
                const mainSeries = chart.mainSeries();
                const lastPrice = mainSeries.lastPrice();
                const priceData = mainSeries.priceData();

                console.log("💰 Current Trading Data:", {
                  lastPrice,
                  priceData
                });

                // Obtener información del símbolo
                const symbolInfo = chart.symbolInfo();
                console.log("ℹ️ Symbol Info:", symbolInfo);

                // Obtener rango visible
                const visibleRange = chart.getVisibleRange();
                console.log("👁️ Visible Range:", visibleRange);

              } catch (error) {
                console.error("❌ Error monitoring data:", error);
              }
            }, 1000);

            return () => clearInterval(interval);
          },
          // Otros eventos
          onAutoSaveNeeded: () => console.log("💾 Auto Save Needed"),
          onDataLoaded: () => console.log("📥 Data Loaded"),
          onMarksUpdated: () => console.log("📌 Marks Updated"),
          onTimescaleUpdate: () => console.log("⏱️ Timescale Updated"),
        });

      } catch (error) {
        console.error('❌ Error initializing TradingView:', error);
        toast({
          title: "Error",
          description: "No se pudo inicializar el gráfico",
          duration: 3000,
        });
      }
    };

    // Cargar el script de TradingView
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = loadTradingView;
    script.onerror = () => {
      console.error('❌ Error loading TradingView script');
      toast({
        title: "Error",
        description: "No se pudo cargar TradingView",
        duration: 3000,
      });
    };

    document.head.appendChild(script);

    // Cleanup
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border bg-card">
      <div
        id="tradingview_widget"
        ref={container}
        className="w-full h-full"
      />
    </div>
  );
}