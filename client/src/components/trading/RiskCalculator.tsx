import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';

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
      <div className="flex items-center gap-2 mb-2">
        <Calculator className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-medium">Calculadora de Riesgo</h3>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="account-capital" className="text-[10px]">Capital</Label>
            <Input
              id="account-capital"
              type="number"
              value={accountCapital}
              onChange={(e) => setAccountCapital(e.target.value)}
              placeholder="10000"
              className="h-7 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="risk-percentage" className="text-[10px]">Riesgo %</Label>
            <Input
              id="risk-percentage"
              type="number"
              value={riskPercentage}
              onChange={(e) => setRiskPercentage(e.target.value)}
              placeholder="1"
              min="0.1"
              step="0.1"
              className="h-7 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1">
          <Label htmlFor="entry-price" className="text-[10px]">Precio de entrada</Label>
          <Input
            id="entry-price"
            type="number"
            value={entryPrice}
            onChange={(e) => setEntryPrice(e.target.value)}
            placeholder="45000"
            className="h-7 text-xs"
          />
        </div>

        <RadioGroup 
          value={calculationType} 
          onValueChange={(value) => setCalculationType(value as 'sl' | 'amount')}
          className="flex justify-center gap-4"
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

        <Button onClick={calculateRisk} className="w-full h-7 text-xs">
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
    </Card>
  );
}