import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  BarChart,
  Activity,
  TrendingUp,
  Calendar,
  AlertCircle,
  Trophy,
  TrendingDown,
  Key
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DateRange } from 'react-day-picker';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { bingXService } from '@/lib/bingx-service';
import { useTrading } from '@/lib/trading-context';

interface TradingMetrics {
  totalPnL: number;
  winRate: number;
  winningStreak: number;
  losingStreak: number;
  avgWinAmount: number;
  avgLossAmount: number;
  totalTrades: number;
  profitableTrades: number;
  unprofitableTrades: number;
}

export default function TradingAnalytics() {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [metrics, setMetrics] = useState<TradingMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { currentSymbol } = useTrading();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const fetchMetrics = async () => {
    if (!date?.from || !date?.to || !currentSymbol) {
      console.log('Missing required data for fetching metrics:', { date, currentSymbol });
      return;
    }

    try {
      setIsLoading(true);
      console.log('Fetching metrics for:', {
        symbol: currentSymbol.replace('BINANCE:', '').replace('PERP', ''),
        from: date.from.getTime(),
        to: date.to.getTime()
      });

      const response = await bingXService.calculatePnLMetrics(
        currentSymbol.replace('BINANCE:', '').replace('PERP', ''),
        date.from.getTime(),
        date.to.getTime()
      );

      console.log('Received metrics:', response);
      setMetrics(response);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al obtener métricas de trading',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveApiKey = async () => {
    if (!apiKey || !apiSecret) {
      toast({
        title: "Error",
        description: "Por favor ingresa tanto la API key como el API secret",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsLoading(true);
      bingXService.setApiCredentials(apiKey, apiSecret);

      // Test the connection before saving credentials
      const isValid = await bingXService.testConnection();

      if (!isValid) {
        throw new Error('No se pudo validar las credenciales');
      }

      // If we get here, the credentials are valid
      localStorage.setItem('bingx_api_key', apiKey);
      localStorage.setItem('bingx_api_secret', apiSecret);

      toast({
        title: "Éxito",
        description: "Credenciales guardadas y validadas correctamente",
      });

      await fetchMetrics();
    } catch (error) {
      console.error('Error validating API credentials:', error);

      // Clear stored credentials on error
      localStorage.removeItem('bingx_api_key');
      localStorage.removeItem('bingx_api_secret');
      setApiKey('');
      setApiSecret('');

      toast({
        title: "Error de validación",
        description: error instanceof Error ? error.message : "Error al validar las credenciales. Por favor verifica tus datos.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const savedApiKey = localStorage.getItem('bingx_api_key');
    const savedApiSecret = localStorage.getItem('bingx_api_secret');

    if (savedApiKey && savedApiSecret) {
      setApiKey(savedApiKey);
      setApiSecret(savedApiSecret);
      bingXService.setApiCredentials(savedApiKey, savedApiSecret);
      fetchMetrics();
    }
  }, []);

  useEffect(() => {
    if (apiKey && apiSecret && date?.from && date?.to && currentSymbol) {
      fetchMetrics();
    }
  }, [date, currentSymbol]);

  return (
    <div className="space-y-2">
      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-6">
          <TabsTrigger value="performance" className="text-[10px]">Rendimiento</TabsTrigger>
          <TabsTrigger value="analysis" className="text-[10px]">Análisis</TabsTrigger>
          <TabsTrigger value="suggestions" className="text-[10px]">Sugerencias</TabsTrigger>
          <TabsTrigger value="apis" className="text-[10px]">APIs</TabsTrigger>
        </TabsList>

        <TabsContent value="apis">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Key className="h-4 w-4" />
                <h3 className="text-sm font-medium">Configuración de APIs</h3>
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Ingresa tu BingX API Key"
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">La API Key de tu cuenta de BingX</p>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="api-secret">API Secret</Label>
                  <Input
                    id="api-secret"
                    type="password"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="Ingresa tu BingX API Secret"
                    className="h-8"
                  />
                  <p className="text-[10px] text-muted-foreground">El API Secret de tu cuenta de BingX</p>
                </div>
                <Button 
                  onClick={handleSaveApiKey}
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? 'Guardando...' : 'Guardar Credenciales'}
                </Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="performance" className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="PnL Periodo"
              value={metrics ? `${metrics.totalPnL?.toFixed(2) || '0.00'}%` : '0.00%'}
              trend={metrics?.totalPnL >= 0 ? 'up' : 'down'}
              icon={<BarChart className="h-3 w-3" />}
            />
            <MetricCard
              title="Win Rate"
              value={metrics ? `${metrics.winRate?.toFixed(2) || '0.00'}%` : '0.00%'}
              trend={metrics?.winRate >= 50 ? 'up' : 'down'}
              icon={<Activity className="h-3 w-3" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="Racha Ganadora"
              value={metrics ? `${metrics.winningStreak} trades` : '0 trades'}
              trend="up"
              icon={<Trophy className="h-3 w-3" />}
            />
            <MetricCard
              title="Racha Perdedora"
              value={metrics ? `${metrics.losingStreak} trades` : '0 trades'}
              trend="down"
              icon={<TrendingDown className="h-3 w-3" />}
            />
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] font-medium">Estadísticas Detalladas</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trades:</span>
                <span className="font-medium">{metrics?.totalTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trades Ganadores:</span>
                <span className="font-medium text-primary">{metrics?.profitableTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trades Perdedores:</span>
                <span className="font-medium text-destructive">{metrics?.unprofitableTrades || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promedio Ganancia:</span>
                <span className="font-medium text-primary">${metrics?.avgWinAmount?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promedio Pérdida:</span>
                <span className="font-medium text-destructive">${metrics?.avgLossAmount?.toFixed(2) || '0.00'}</span>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analysis">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              <h3 className="text-[10px] font-medium">Análisis de Riesgo</h3>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">
                Análisis basado en tus operaciones del periodo seleccionado:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Win Rate:</span>
                  <span className="font-medium">{metrics ? `${metrics.winRate?.toFixed(2) || '0.00'}%` : '0.00%'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mejor Racha:</span>
                  <span className="font-medium">{metrics?.winningStreak || 0} trades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Peor Racha:</span>
                  <span className="font-medium">{metrics?.losingStreak || 0} trades</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">PnL Total:</span>
                  <span className={cn(
                    "font-medium",
                    metrics?.totalPnL >= 0 ? "text-primary" : "text-destructive"
                  )}>
                    {metrics ? `${metrics.totalPnL?.toFixed(2) || '0.00'}%` : '0.00%'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <h3 className="text-[10px] font-medium">Sugerencias</h3>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">
                Sugerencias basadas en el análisis de tu operativa:
              </p>
              {metrics && (
                <ul className="text-[10px] space-y-0.5">
                  {metrics.winRate < 50 && (
                    <li>• Considera mejorar tu estrategia de entrada, tu win rate está por debajo del 50%</li>
                  )}
                  {metrics.losingStreak > 5 && (
                    <li>• Tu racha perdedora es significativa, revisa tu gestión de riesgo</li>
                  )}
                  {metrics.avgLossAmount > metrics.avgWinAmount && (
                    <li>• Tus pérdidas promedio son mayores que tus ganancias, ajusta tu ratio riesgo/beneficio</li>
                  )}
                  {metrics.totalPnL < 0 && (
                    <li>• Tu PnL es negativo, considera tomar un descanso y revisar tu estrategia</li>
                  )}
                  <li>• Mantén un diario de trading para identificar patrones en tus operaciones</li>
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
      <div className="flex items-center justify-between mb-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant={"outline"}
              className={cn(
                "justify-start text-left font-normal h-6",
                !date && "text-muted-foreground"
              )}
            >
              <Calendar className="mr-2 h-3 w-3" />
              {date?.from ? (
                date.to ? (
                  <>
                    {format(date.from, "LLL dd", { locale: es })} -{" "}
                    {format(date.to, "LLL dd, y", { locale: es })}
                  </>
                ) : (
                  format(date.from, "LLL dd, y", { locale: es })
                )
              ) : (
                <span>Selecciona un rango</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <CalendarComponent
              initialFocus
              mode="range"
              defaultMonth={date?.from}
              selected={date}
              onSelect={setDate}
              numberOfMonths={2}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}

function MetricCard({ title, value, trend, icon }: MetricCardProps) {
  return (
    <div className="bg-card-foreground/5 rounded p-2 space-y-1">
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-muted-foreground">{title}</p>
        {icon}
      </div>
      <div className="flex items-center gap-1">
        <span className="text-sm font-semibold">{value}</span>
        <TrendingUp className={`h-3 w-3 ${
          trend === 'up' ? 'text-primary' : 
          trend === 'down' ? 'text-destructive' : 
          'text-muted-foreground'
        }`} />
      </div>
    </div>
  );
}