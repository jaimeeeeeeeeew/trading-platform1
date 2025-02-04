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
  Settings,
  AlertCircle
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export default function TradingAnalytics() {
  const [apiKey, setApiKey] = useState('');
  const { toast } = useToast();

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
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="api-key" className="text-xs">API Key del Exchange</Label>
        <div className="flex gap-2">
          <Input
            id="api-key"
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Ingresa tu API key"
            className="text-xs h-8"
          />
          <Button 
            onClick={handleSaveApiKey}
            className="h-8 text-xs"
          >
            Guardar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="performance" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="performance" className="text-xs">Rendimiento</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs">Análisis</TabsTrigger>
          <TabsTrigger value="suggestions" className="text-xs">Sugerencias</TabsTrigger>
        </TabsList>

        <TabsContent value="performance">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <BarChart className="h-4 w-4" />
                <h3 className="text-sm font-medium">Performance</h3>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <MetricCard
                  title="PnL Diario"
                  value="+2.45%"
                  trend="up"
                />
                <MetricCard
                  title="Win Rate"
                  value="68%"
                  trend="up"
                />
              </div>
              {/* TODO: Agregar gráficos de rendimiento */}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="analysis">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                <h3 className="text-sm font-medium">Análisis de Riesgo</h3>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Análisis de comportamiento basado en tus últimas operaciones:
                </p>
                <ul className="text-xs space-y-1">
                  <li>• Riesgo promedio por operación: 1.2%</li>
                  <li>• Ratio riesgo/beneficio: 1:2.5</li>
                  <li>• Tiempo promedio en operación: 4h 23m</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="suggestions">
          <Card className="p-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <h3 className="text-sm font-medium">Sugerencias AI</h3>
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Sugerencias basadas en el análisis de tu operativa:
                </p>
                {/* TODO: Integrar con OpenAI para sugerencias personalizadas */}
                <ul className="text-xs space-y-1">
                  <li>• Considera reducir el tiempo en operaciones perdedoras</li>
                  <li>• Tu mejor rendimiento es en operaciones cortas</li>
                  <li>• Las entradas más exitosas son durante la sesión europea</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  trend: 'up' | 'down' | 'neutral';
}

function MetricCard({ title, value, trend }: MetricCardProps) {
  return (
    <div className="bg-card-foreground/5 rounded-lg p-2 space-y-1">
      <p className="text-[10px] text-muted-foreground">{title}</p>
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
