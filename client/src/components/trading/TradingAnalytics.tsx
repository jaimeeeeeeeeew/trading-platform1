import { useState } from 'react';
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
  TrendingDown
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

export default function TradingAnalytics() {
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();
  const [date, setDate] = useState<DateRange | undefined>({
    from: addDays(new Date(), -30),
    to: new Date(),
  });

  const handleSaveApiKey = () => {
    if (!apiKey) {
      toast({
        title: "Error",
        description: "Por favor ingresa una API key válida",
        variant: "destructive",
      });
      return;
    }

    // TODO: Implementar guardado seguro de API key
    toast({
      title: "Éxito",
      description: "API key guardada correctamente",
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="space-y-1">
          <Label htmlFor="api-key" className="text-[10px]">API Key del Exchange</Label>
          <div className="flex gap-1">
            <Input
              id="api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Ingresa tu API key"
              className="text-[10px] h-6"
            />
            <Button 
              onClick={handleSaveApiKey}
              className="h-6 text-[10px] px-2"
            >
              Guardar
            </Button>
          </div>
        </div>
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

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-6">
          <TabsTrigger value="performance" className="text-[10px]">Rendimiento</TabsTrigger>
          <TabsTrigger value="analysis" className="text-[10px]">Análisis</TabsTrigger>
          <TabsTrigger value="suggestions" className="text-[10px]">Sugerencias</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="PnL Periodo"
              value="+12.45%"
              trend="up"
              icon={<BarChart className="h-3 w-3" />}
            />
            <MetricCard
              title="Win Rate"
              value="68%"
              trend="up"
              icon={<Activity className="h-3 w-3" />}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <MetricCard
              title="Racha Ganadora"
              value="8 trades"
              trend="up"
              icon={<Trophy className="h-3 w-3" />}
            />
            <MetricCard
              title="Racha Perdedora"
              value="3 trades"
              trend="down"
              icon={<TrendingDown className="h-3 w-3" />}
            />
          </div>

          <div className="space-y-1">
            <h4 className="text-[10px] font-medium">Estadísticas Detalladas</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Trades:</span>
                <span className="font-medium">156</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trades Ganadores:</span>
                <span className="font-medium text-primary">106</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Trades Perdedores:</span>
                <span className="font-medium text-destructive">50</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Promedio R/R:</span>
                <span className="font-medium">1:2.5</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mejor Trade:</span>
                <span className="font-medium text-primary">+5.8%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peor Trade:</span>
                <span className="font-medium text-destructive">-2.1%</span>
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
                Análisis de comportamiento basado en tus últimas operaciones:
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Riesgo promedio:</span>
                  <span className="font-medium">1.2%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ratio R/R promedio:</span>
                  <span className="font-medium">1:2.5</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiempo promedio trade:</span>
                  <span className="font-medium">4h 23m</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Drawdown máximo:</span>
                  <span className="font-medium text-destructive">-8.3%</span>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="suggestions">
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              <h3 className="text-[10px] font-medium">Sugerencias AI</h3>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] text-muted-foreground">
                Sugerencias basadas en el análisis de tu operativa:
              </p>
              <ul className="text-[10px] space-y-0.5">
                <li>• Considera reducir el tiempo en operaciones perdedoras</li>
                <li>• Tu mejor rendimiento es en operaciones cortas</li>
                <li>• Las entradas más exitosas son durante la sesión europea</li>
                <li>• Has mostrado mejor desempeño en tendencias alcistas</li>
                <li>• Tu gestión de riesgo es más efectiva en pares mayores</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
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