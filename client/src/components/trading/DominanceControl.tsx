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
  
  // Calcular el color de la barra de dominancia
  const getProgressColor = (dominance: number) => {
    if (dominance > 50) {
      return `bg-gradient-to-r from-green-500 to-green-${Math.round((dominance - 50) * 2)}00`;
    } else if (dominance < 50) {
      return `bg-gradient-to-r from-red-${Math.round((50 - dominance) * 2)}00 to-red-500`;
    }
    return 'bg-gray-500'; // Neutral
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">Rango de análisis</h4>
          <p className="text-sm text-muted-foreground">
            Ajusta el porcentaje para el cálculo de dominancia
          </p>
        </div>
        <span className="text-2xl font-bold">{percentage}%</span>
      </div>
      
      <Slider
        value={[percentage]}
        onValueChange={([value]) => onPercentageChange(value)}
        min={1}
        max={20}
        step={1}
        className="w-full"
      />

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Dominancia</span>
          <span>{dominancePercentage.toFixed(1)}%</span>
        </div>
        <Progress 
          value={dominancePercentage} 
          className={`h-2 ${getProgressColor(dominancePercentage)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-4 pt-2">
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Bids Total</div>
          <div className="text-lg font-semibold text-green-500">{bidsTotalInRange.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-sm text-muted-foreground">Asks Total</div>
          <div className="text-lg font-semibold text-red-500">{asksTotalInRange.toFixed(2)}</div>
        </div>
      </div>

      <div className="pt-2 text-center">
        <div className="text-sm text-muted-foreground">BTC Amount</div>
        <div className="text-xl font-bold">{Math.floor(btcAmount)} BTC</div>
      </div>
    </Card>
  );
};
