import { useState } from 'react';
import { useTrading } from '@/lib/trading-context';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown } from 'lucide-react';

const orderSchema = z.object({
  quantity: z.number().positive('La cantidad debe ser positiva'),
  price: z.number().positive('El precio debe ser positivo'),
  stopLoss: z.number().positive('El stop loss debe ser positivo').optional(),
  takeProfit: z.number().positive('El take profit debe ser positivo').optional(),
  trailingStop: z.number().positive('El trailing stop debe ser positivo').optional(),
  trailingDistance: z.number().positive('La distancia del trailing debe ser positiva').optional(),
});

type OrderFormData = z.infer<typeof orderSchema>;

export default function OrderPanel() {
  const { currentSymbol, visiblePriceRange, placeOrder } = useTrading();
  const [orderSide, setOrderSide] = useState<'BUY' | 'SELL'>('BUY');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      quantity: 0,
      price: visiblePriceRange.high,
    },
  });

  const [useTrailingStop, setUseTrailingStop] = useState(false);

  const onSubmit = async (data: OrderFormData) => {
    try {
      await placeOrder({
        symbol: currentSymbol,
        side: orderSide,
        quantity: data.quantity,
        price: data.price,
        stopLoss: data.stopLoss,
        takeProfit: data.takeProfit,
        trailingStop: useTrailingStop ? {
          value: data.trailingStop!,
          distance: data.trailingDistance!,
        } : undefined,
      });

      toast({
        title: 'Orden colocada',
        description: `${orderSide} ${data.quantity} ${currentSymbol} a ${data.price}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo colocar la orden',
        variant: 'destructive',
      });
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
      <div className="flex gap-2 mb-2">
        <Button
          type="button"
          variant={orderSide === 'BUY' ? 'default' : 'outline'}
          onClick={() => setOrderSide('BUY')}
          className="flex-1 h-8 text-xs"
        >
          Comprar
        </Button>
        <Button
          type="button"
          variant={orderSide === 'SELL' ? 'destructive' : 'outline'}
          onClick={() => setOrderSide('SELL')}
          className="flex-1 h-8 text-xs"
        >
          Vender
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="quantity" className="text-xs">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            step="any"
            className="h-8 text-xs"
            {...form.register('quantity', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="price" className="text-xs">Precio</Label>
          <Input
            id="price"
            type="number"
            step="any"
            className="h-8 text-xs"
            {...form.register('price', { valueAsNumber: true })}
          />
        </div>
      </div>

      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full flex items-center justify-between p-0 h-8">
            <span className="text-xs">Opciones avanzadas</span>
            <ChevronDown className="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="stopLoss" className="text-xs">Stop Loss</Label>
              <Input
                id="stopLoss"
                type="number"
                step="any"
                className="h-8 text-xs"
                {...form.register('stopLoss', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="takeProfit" className="text-xs">Take Profit</Label>
              <Input
                id="takeProfit"
                type="number"
                step="any"
                className="h-8 text-xs"
                {...form.register('takeProfit', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="trailing-stop"
              checked={useTrailingStop}
              onCheckedChange={setUseTrailingStop}
              className="h-4 w-8"
            />
            <Label htmlFor="trailing-stop" className="text-xs">Trailing Stop</Label>
          </div>

          {useTrailingStop && (
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label htmlFor="trailingStop" className="text-xs">Valor</Label>
                <Input
                  id="trailingStop"
                  type="number"
                  step="any"
                  className="h-8 text-xs"
                  {...form.register('trailingStop', { valueAsNumber: true })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="trailingDistance" className="text-xs">Distancia</Label>
                <Input
                  id="trailingDistance"
                  type="number"
                  step="any"
                  className="h-8 text-xs"
                  {...form.register('trailingDistance', { valueAsNumber: true })}
                />
              </div>
            </div>
          )}
        </CollapsibleContent>
      </Collapsible>

      <Button type="submit" className="w-full h-8 text-xs">
        {orderSide === 'BUY' ? 'Comprar' : 'Vender'} {currentSymbol}
      </Button>
    </form>
  );
}