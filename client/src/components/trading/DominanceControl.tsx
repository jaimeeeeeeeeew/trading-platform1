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
    <Card className="p-2 space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-[10px] font-medium leading-none">Dominancia</h4>
        </div>
        <span className="text-sm font-bold">{percentage}%</span>
      </div>

      <Slider
        value={[percentage]}
        onValueChange={([value]) => onPercentageChange(value)}
        min={1}
        max={20}
        step={1}
        className="w-full"
      />

      <div className="space-y-1">
        <div className="flex justify-between text-[10px]">
          <span>Dominancia</span>
          <span>{dominancePercentage.toFixed(1)}%</span>
        </div>
        <Progress 
          value={dominancePercentage} 
          className={`h-1.5 ${getProgressColor(dominancePercentage)}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-1">
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground">Bids</div>
          <div className="text-xs font-semibold text-green-500">{bidsTotalInRange.toFixed(2)}</div>
        </div>
        <div className="text-center">
          <div className="text-[9px] text-muted-foreground">Asks</div>
          <div className="text-xs font-semibold text-red-500">{asksTotalInRange.toFixed(2)}</div>
        </div>
      </div>

      <div className="text-center border-t border-border/20 pt-1">
        <div className="text-[9px] text-muted-foreground">BTC</div>
        <div className="text-xs font-bold">{Math.floor(btcAmount)}</div>
      </div>
    </Card>
  );
};