import { useEffect, useRef, useCallback } from 'react';
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
  const { currentSymbol, setCurrentSymbol } = useTrading();
  const { toast } = useToast();

  // Función para verificar y actualizar el símbolo actual
  const handleSymbolChange = useCallback((newSymbol: string) => {
    if (!newSymbol || newSymbol === currentSymbol) return;

    console.warn(`📊 TradingView - Cambio de símbolo detectado: ${currentSymbol} -> ${newSymbol}`);
    setCurrentSymbol(newSymbol);

    toast({
      title: "Símbolo Actualizado",
      description: `Cambiado de ${currentSymbol} a ${newSymbol}`,
      duration: 3000,
    });
  }, [currentSymbol, setCurrentSymbol, toast]);

  useEffect(() => {
    if (!container.current) return;

    console.warn('📊 TradingView - Iniciando widget...');

    // Cargar el script de TradingView
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    script.onload = () => {
      console.warn('📊 TradingView - Creando widget con símbolo:', currentSymbol);

      // Crear el widget
      widget.current = new window.TradingView.widget({
        container_id: container.current!.id,
        width: "100%",
        height: "100%",
        symbol: currentSymbol,
        interval: "D",
        timezone: "Etc/UTC",
        theme: "dark",
        style: "1",
        locale: "es",
        toolbar_bg: "#f1f3f6",
        enable_publishing: false,
        hide_side_toolbar: false,
        allow_symbol_change: true,
        studies: [
          "Volume@tv-basicstudies",
          "VWAP@tv-basicstudies"
        ],
        supported_resolutions: ["1", "5", "15", "30", "60", "D", "W"],
        save_image: true,
        // Configurar callbacks
        onChartReady: () => {
          console.warn('📊 TradingView - Chart listo, configurando listeners...');

          // Obtener la instancia del chart
          const chart = widget.current?.chart();
          if (!chart) {
            console.error('No se pudo obtener la instancia del chart');
            return;
          }

          // Suscribirse a cambios de símbolo directamente en el chart
          chart.onSymbolChanged().subscribe(null, (symbolData: any) => {
            console.warn('📊 TradingView - Evento onSymbolChanged:', symbolData);
            handleSymbolChange(symbolData.name);
          });

          // Verificar símbolo inicial
          const initialSymbol = chart.symbol();
          if (initialSymbol && initialSymbol !== currentSymbol) {
            handleSymbolChange(initialSymbol);
          }

          // Configurar verificación periódica del símbolo
          const checkInterval = setInterval(() => {
            const chartSymbol = chart.symbol();
            if (chartSymbol && chartSymbol !== currentSymbol) {
              console.warn('📊 TradingView - Cambio de símbolo detectado en verificación:', chartSymbol);
              handleSymbolChange(chartSymbol);
            }
          }, 1000);

          // Limpiar intervalo cuando el componente se desmonte
          return () => clearInterval(checkInterval);
        }
      });
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [currentSymbol, handleSymbolChange]);

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