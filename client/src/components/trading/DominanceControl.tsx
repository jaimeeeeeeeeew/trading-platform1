import { Slider } from "@/components/ui/slider";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface DominanceControlProps {
  percentage: number;
  onPercentageChange: (value: number) => void;
  dominanceData: {
    bidsTotalInRange: number;
    asksTotalInRange: number;
    dominancePercentage: number;
    btcAmount: number;
  };
}

export const DominanceControl = ({ 
  percentage, 
  onPercentageChange,
  dominanceData 
}: DominanceControlProps) => {
  const { bidsTotalInRange, asksTotalInRange, dominancePercentage, btcAmount } = dominanceData;

  const getProgressStyles = (dominance: number) => {
    // Si dominancia > 50%, el verde será más prominente
    if (dominance > 50) {
      return {
        background: `linear-gradient(to right, 
          rgba(34, 197, 94, 1) 0%, 
          rgba(34, 197, 94, 1) ${dominance}%, 
          rgba(239, 68, 68, 0.5) ${dominance}%, 
          rgba(239, 68, 68, 0.5) 100%
        )`
      };
    }
    // Si dominancia < 50%, el rojo será más prominente
    return {
      background: `linear-gradient(to right, 
        rgba(34, 197, 94, 0.5) 0%, 
        rgba(34, 197, 94, 0.5) ${dominance}%, 
        rgba(239, 68, 68, 1) ${dominance}%, 
        rgba(239, 68, 68, 1) 100%
      )`
    };
  };

  return (
    <Card className="p-4 space-y-4">
      {/* Barra de dominancia - Ahora más prominente */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-medium">Dominancia</span>
          <span className="font-bold">{dominancePercentage.toFixed(1)}%</span>
        </div>
        <div className="h-4"> {/* Aumentado altura de la barra */}
          <Progress 
            value={dominancePercentage} 
            style={getProgressStyles(dominancePercentage)}
            className="h-full rounded-full"
          />
        </div>
        <div className="grid grid-cols-2 gap-4 pt-1">
          <div className="text-center">
            <div className="text-sm font-medium text-green-500">Compras</div>
            <div className="text-lg font-bold text-green-500">{bidsTotalInRange.toFixed(2)}</div>
          </div>
          <div className="text-center">
            <div className="text-sm font-medium text-red-500">Ventas</div>
            <div className="text-lg font-bold text-red-500">{asksTotalInRange.toFixed(2)}</div>
          </div>
        </div>
      </div>

      {/* Control de rango - Ahora menos prominente */}
      <div className="space-y-2 pt-2 border-t border-border/20">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Rango de análisis</span>
          <span className="text-sm font-medium">{percentage}%</span>
        </div>
        <Slider
          value={[percentage]}
          onValueChange={([value]) => onPercentageChange(value)}
          min={1}
          max={20}
          step={1}
          className="w-full"
        />
      </div>

      <div className="text-center pt-2 border-t border-border/20">
        <div className="text-xs text-muted-foreground">Volumen BTC</div>
        <div className="text-sm font-bold">{Math.floor(btcAmount)} BTC</div>
      </div>
    </Card>
  );
};