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
    // 1. Verificar si el contenedor existe
    if (!container.current) {
      console.error('❌ Error: Contenedor no encontrado');
      return;
    }
    console.warn('✅ Contenedor encontrado:', container.current.id);

    // 2. Verificar si TradingView ya existe
    if (window.TradingView) {
      console.warn('⚠️ TradingView ya está cargado');
    } else {
      console.warn('📥 Cargando TradingView...');
    }

    console.warn('📊 TradingView - Iniciando widget...');

    // Cargar el script de TradingView
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;

    // 3. Verificar errores de carga del script
    script.onerror = () => {
      console.error('❌ Error al cargar el script de TradingView');
    };

    script.onload = () => {
      console.warn('📊 TradingView - Script cargado');

      // 4. Verificar si TradingView está disponible
      if (!window.TradingView) {
        console.error('❌ Error: window.TradingView no está disponible después de cargar el script');
        return;
      }

      console.warn('📊 TradingView - Creando widget con símbolo:', currentSymbol);

      // Crear el widget
      try {
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

            // 1. Obtener la instancia del chart
            const chart = widget.current?.chart();
            if (!chart) {
              console.error('No se pudo obtener la instancia del chart');
              return;
            }

            // 2. Suscribirse a eventos nativos del chart
            chart.onSymbolChanged().subscribe(null, (symbolData: any) => {
              console.warn('📊 TradingView - Evento onSymbolChanged:', symbolData);
              handleSymbolChange(symbolData.name);
            });

            // 3. Configurar MutationObserver para detectar cambios en el DOM
            const symbolElement = document.querySelector('.chart-container .symbol-text');
            if (symbolElement) {
              console.warn('📊 TradingView - Elemento de símbolo encontrado:', symbolElement);
              const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                  if (mutation.type === 'characterData' || mutation.type === 'childList') {
                    const newSymbol = (mutation.target as HTMLElement).textContent;
                    if (newSymbol) {
                      console.warn('📊 TradingView - Cambio detectado por MutationObserver:', newSymbol);
                      handleSymbolChange(newSymbol);
                    }
                  }
                });
              });

              observer.observe(symbolElement, {
                characterData: true,
                childList: true,
                subtree: true
              });
            } else {
              console.error('❌ No se encontró el elemento del símbolo en el DOM');
            }

            // 4. Verificación periódica como respaldo
            const checkInterval = setInterval(() => {
              const chartSymbol = chart.symbol();
              if (chartSymbol && chartSymbol !== currentSymbol) {
                console.warn('📊 TradingView - Cambio detectado en verificación periódica:', chartSymbol);
                handleSymbolChange(chartSymbol);
              }
            }, 1000);

            // Limpiar observadores cuando el componente se desmonte
            return () => {
              clearInterval(checkInterval);
              symbolElement && observer?.disconnect();
            };
          }
        });
        console.warn('✅ Widget creado exitosamente');
      } catch (error) {
        console.error('❌ Error al crear el widget:', error);
      }
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