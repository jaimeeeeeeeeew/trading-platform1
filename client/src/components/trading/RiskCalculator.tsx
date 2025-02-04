import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface RiskCalculatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function RiskCalculator({ open, onOpenChange }: RiskCalculatorProps) {
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Calculadora de Gestión de Riesgo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="account-capital">Capital de la cuenta</Label>
            <Input
              id="account-capital"
              type="number"
              value={accountCapital}
              onChange={(e) => setAccountCapital(e.target.value)}
              placeholder="Ej: 10000"
            />
          </div>

          <div className="space-y-2">
            <Label>Porcentaje de riesgo</Label>
            <RadioGroup value={riskPercentage} onValueChange={setRiskPercentage}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="1" id="r1" />
                  <Label htmlFor="r1">1%</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="2" id="r2" />
                  <Label htmlFor="r2">2%</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="entry-price">Precio de entrada</Label>
            <Input
              id="entry-price"
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="Ej: 45000"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de cálculo</Label>
            <RadioGroup value={calculationType} onValueChange={(value) => setCalculationType(value as 'sl' | 'amount')}>
              <div className="flex gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sl" id="c1" />
                  <Label htmlFor="c1">Calcular Stop Loss</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="amount" id="c2" />
                  <Label htmlFor="c2">Calcular Monto</Label>
                </div>
              </div>
            </RadioGroup>
          </div>

          {calculationType === 'sl' ? (
            <div className="space-y-2">
              <Label htmlFor="investment-amount">Monto a invertir</Label>
              <Input
                id="investment-amount"
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                placeholder="Ej: 1000"
              />
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="stop-loss">Stop Loss</Label>
              <Input
                id="stop-loss"
                type="number"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                placeholder="Ej: 44000"
              />
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium">Resultado:</p>
            <p className="text-lg font-semibold">
              {calculationType === 'sl' 
                ? `Stop Loss: ${stopLoss || '---'}`
                : `Monto a invertir: ${investmentAmount || '---'}`}
            </p>
          </div>

          <Button onClick={calculateRisk} className="w-full">
            Calcular
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
