import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useToast } from '@/hooks/use-toast';
import { Card } from '@/components/ui/card';
import { Calculator } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import TradingAnalytics from './TradingAnalytics';

export default function RiskCalculator() {
  const [showCalculator, setShowCalculator] = useState(true);
  const [calculationType, setCalculationType] = useState<'sl' | 'amount'>('sl');
  const [direction, setDirection] = useState<'long' | 'short'>('long');
  const [accountCapital, setAccountCapital] = useState('');
  const [riskPercentage, setRiskPercentage] = useState('1');
  const [entryPrice, setEntryPrice] = useState('');
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const { toast } = useToast();

  const validateInputs = () => {
    const capital = parseFloat(accountCapital);
    const risk = parseFloat(riskPercentage);
    const entry = parseFloat(entryPrice);

    if (isNaN(capital) || capital <= 0) {
      toast({
        title: 'Error',
        description: 'El capital debe ser un número positivo',
        variant: 'destructive',
      });
      return false;
    }

    if (isNaN(risk) || risk <= 0 || risk > 100) {
      toast({
        title: 'Error',
        description: 'El porcentaje de riesgo debe estar entre 0 y 100',
        variant: 'destructive',
      });
      return false;
    }

    if (isNaN(entry) || entry <= 0) {
      toast({
        title: 'Error',
        description: 'El precio de entrada debe ser un número positivo',
        variant: 'destructive',
      });
      return false;
    }

    return true;
  };

  const calculateRisk = () => {
    if (!validateInputs()) return;

    const capital = parseFloat(accountCapital);
    const risk = parseFloat(riskPercentage) / 100;
    const entry = parseFloat(entryPrice);
    const maxLossAmount = capital * risk;

    console.log('Capital:', capital);
    console.log('Riesgo %:', risk * 100);
    console.log('Pérdida máxima:', maxLossAmount);
    console.log('Precio entrada:', entry);
    console.log('Dirección:', direction);

    if (calculationType === 'sl') {
      const amount = parseFloat(investmentAmount);
      if (isNaN(amount) || amount <= 0) {
        toast({
          title: 'Error',
          description: 'El monto a invertir debe ser un número positivo',
          variant: 'destructive',
        });
        return;
      }

      // Calcular el Stop Loss según la dirección
      let sl;
      if (direction === 'long') {
        sl = entry - (maxLossAmount / amount);
        if (sl >= entry) {
          toast({
            title: 'Error',
            description: 'El stop loss debe ser menor al precio de entrada para posiciones long',
            variant: 'destructive',
          });
          return;
        }
      } else { // short
        sl = entry + (maxLossAmount / amount);
        if (sl <= entry) {
          toast({
            title: 'Error',
            description: 'El stop loss debe ser mayor al precio de entrada para posiciones short',
            variant: 'destructive',
          });
          return;
        }
      }

      if (sl <= 0) {
        toast({
          title: 'Error',
          description: 'El stop loss calculado es inválido. Ajusta el monto o el riesgo.',
          variant: 'destructive',
        });
        return;
      }

      // Verificar pérdida potencial
      const priceDiff = direction === 'long' ? entry - sl : sl - entry;
      const potentialLoss = amount * Math.abs(priceDiff);

      if (Math.abs(potentialLoss - maxLossAmount) > 0.01) {
        toast({
          title: 'Advertencia',
          description: `La pérdida potencial (${potentialLoss.toFixed(2)}) es diferente al riesgo máximo (${maxLossAmount.toFixed(2)})`,
          variant: 'destructive',
        });
        return;
      }

      setStopLoss(sl.toFixed(2));
      toast({
        title: 'Cálculo completado',
        description: `Stop Loss calculado: ${sl.toFixed(2)}`,
      });

    } else {
      const sl = parseFloat(stopLoss);
      if (isNaN(sl) || sl <= 0) {
        toast({
          title: 'Error',
          description: 'El stop loss debe ser un número positivo',
          variant: 'destructive',
        });
        return;
      }

      // Validar SL según dirección
      if (direction === 'long' && sl >= entry) {
        toast({
          title: 'Error',
          description: 'Para posiciones long, el stop loss debe ser menor al precio de entrada',
          variant: 'destructive',
        });
        return;
      }

      if (direction === 'short' && sl <= entry) {
        toast({
          title: 'Error',
          description: 'Para posiciones short, el stop loss debe ser mayor al precio de entrada',
          variant: 'destructive',
        });
        return;
      }

      // Calcular el monto a invertir
      const priceDiff = direction === 'long' ? entry - sl : sl - entry;
      if (Math.abs(priceDiff) < 0.00001) {
        toast({
          title: 'Error',
          description: 'La diferencia entre entrada y stop loss es demasiado pequeña',
          variant: 'destructive',
        });
        return;
      }

      const amount = maxLossAmount / Math.abs(priceDiff);
      setInvestmentAmount(amount.toFixed(8));
      toast({
        title: 'Cálculo completado',
        description: `Monto a invertir calculado: ${amount.toFixed(8)}`,
      });
    }
  };

  return (
    <Card className="p-2 h-full bg-[#151924] flex flex-col">
      <div className="flex items-center justify-between mb-2 h-6">
        <div className="flex items-center gap-1">
          <Calculator className="h-3 w-3 text-muted-foreground" />
          <span className="text-xs font-medium">Panel Trading</span>
        </div>
        <div className="flex items-center gap-1">
          <Label htmlFor="calculator-switch" className="text-[10px]">
            Calculadora
          </Label>
          <Switch
            id="calculator-switch"
            checked={showCalculator}
            onCheckedChange={setShowCalculator}
            className="h-4 w-7"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {showCalculator ? (
          <div className="space-y-2">
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

            <div className="space-y-1">
              <Label className="text-[10px]">Dirección</Label>
              <RadioGroup 
                value={direction} 
                onValueChange={(value) => setDirection(value as 'long' | 'short')}
                className="flex justify-center gap-4"
              >
                <div className="flex items-center gap-1">
                  <RadioGroupItem value="long" id="d1" className="h-3 w-3" />
                  <Label htmlFor="d1" className="text-[10px]">Long</Label>
                </div>
                <div className="flex items-center gap-1">
                  <RadioGroupItem value="short" id="d2" className="h-3 w-3" />
                  <Label htmlFor="d2" className="text-[10px]">Short</Label>
                </div>
              </RadioGroup>
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

            <div className="space-y-1">
              <Input
                type="number"
                value={calculationType === 'sl' ? investmentAmount : stopLoss}
                onChange={(e) => calculationType === 'sl' 
                  ? setInvestmentAmount(e.target.value) 
                  : setStopLoss(e.target.value)}
                placeholder={calculationType === 'sl' ? "Monto a invertir" : "Stop Loss"}
                className="h-7 text-xs"
              />
              <p className="text-[10px] text-muted-foreground ml-1">
                {calculationType === 'sl' 
                  ? "* Cuántas monedas (apalancamiento incluido)" 
                  : "* ¿Dónde quieres el stop?"}
              </p>
            </div>

            <Button onClick={calculateRisk} className="w-full h-7 text-xs">
              Calcular
            </Button>

            <div className="bg-[#151924] p-2 rounded text-[10px]">
              <p className="font-medium mb-1">Resultado:</p>
              <p className="font-semibold">
                {calculationType === 'sl' 
                  ? `Stop Loss: ${stopLoss || '---'}`
                  : `Monto a invertir: ${investmentAmount || '---'}`}
              </p>
            </div>
          </div>
        ) : (
          <TradingAnalytics />
        )}
      </div>
    </Card>
  );
}