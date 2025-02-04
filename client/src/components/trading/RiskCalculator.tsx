import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';

export default function RiskCalculator() {
  const [calculationType, setCalculationType] = useState<'sl' | 'amount'>('sl');
  const [accountCapital, setAccountCapital] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const { toast } = useToast();

  const calculateRisk = () => {
    const capital = parseFloat(accountCapital);
    const risk = parseFloat(riskPercentage) / 100;
    const entry = parseFloat(entryPrice);
    const capitalAtRisk = capital * risk;

    if (isNaN(capital) || isNaN(risk) || isNaN(entry)) {
      toast({
        title: 'Error',
        description: 'Por favor, ingresa valores numéricos válidos',
        variant: 'destructive',
      });
      return;
    }

    if (calculationType === 'sl') {
      const amount = parseFloat(investmentAmount);
      if (isNaN(amount)) {
        toast({
          title: 'Error',
          description: 'Por favor, ingresa un monto válido',
          variant: 'destructive',
        });
        return;
      }
      // SL = Entrada - (Capital a perder / Monto invertido)
      const sl = entry - (capitalAtRisk / amount);
      setStopLoss(sl.toFixed(2));
    } else {
      const sl = parseFloat(stopLoss);
      if (isNaN(sl)) {
        toast({
          title: 'Error',
          description: 'Por favor, ingresa un stop loss válido',
          variant: 'destructive',
        });
        return;
      }
      // Monto a invertir = Capital a perder / |Entrada - SL|
      const amount = capitalAtRisk / Math.abs(entry - sl);
      setInvestmentAmount(amount.toFixed(2));
    }
  };

  return (
    <Card className="p-4 h-full bg-card">
      <div className="grid grid-cols-6 gap-2 h-full">
        <div className="space-y-1 col-span-2">
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={accountCapital}
              onChange={(e) => setAccountCapital(e.target.value)}
              placeholder="Capital"
              className="h-7 text-xs"
            />
            <RadioGroup value={riskPercentage} onValueChange={setRiskPercentage} className="flex">
              <div className="flex items-center gap-1">
                <RadioGroupItem value="1" id="r1" className="h-3 w-3" />
                <Label htmlFor="r1" className="text-[10px]">1%</Label>
              </div>
              <div className="flex items-center gap-1 ml-2">
                <RadioGroupItem value="2" id="r2" className="h-3 w-3" />
                <Label htmlFor="r2" className="text-[10px]">2%</Label>
              </div>
            </RadioGroup>
          </div>
          <Input
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="Entrada"
            className="h-7 text-xs"
          />
        </div>

        <div className="space-y-1 col-span-2">
          <RadioGroup 
            value={calculationType} 
            onValueChange={(value) => setCalculationType(value as 'sl' | 'amount')}
            className="flex gap-2 h-7 items-center"
          >
            <div className="flex items-center gap-1">
              <RadioGroupItem value="sl" id="c1" className="h-3 w-3" />
              <Label htmlFor="c1" className="text-[10px]">Stop Loss</Label>
            </div>
            <div className="flex items-center gap-1">
              <RadioGroupItem value="amount" id="c2" className="h-3 w-3" />
              <Label htmlFor="c2" className="text-[10px]">Monto</Label>
            </div>
          </RadioGroup>
          <Input
            type="number"
            value={calculationType === 'sl' ? investmentAmount : stopLoss}
            onChange={(e) => calculationType === 'sl' 
              ? setInvestmentAmount(e.target.value) 
              : setStopLoss(e.target.value)}
            placeholder={calculationType === 'sl' ? "Monto" : "Stop Loss"}
            className="h-7 text-xs"
          />
        </div>

        <div className="col-span-2 flex flex-col justify-between">
          <Button onClick={calculateRisk} className="h-7 text-xs mb-1">
            Calcular
          </Button>
          <div className="bg-muted p-2 rounded text-[10px]">
            <p className="font-medium mb-1">Resultado:</p>
            <p className="font-semibold">
              {calculationType === 'sl' 
                ? `SL: ${stopLoss || '---'}`
                : `Monto: ${investmentAmount || '---'}`}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}