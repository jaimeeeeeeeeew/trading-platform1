import { useState } from 'react';
import { useTrading } from '@/lib/trading-context';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

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
    <Card className="p-4 bg-[rgb(26,26,26)]">
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="flex gap-2 mb-4">
          <Button
            type="button"
            variant={orderSide === 'BUY' ? 'default' : 'outline'}
            onClick={() => setOrderSide('BUY')}
            className="flex-1"
          >
            Comprar
          </Button>
          <Button
            type="button"
            variant={orderSide === 'SELL' ? 'destructive' : 'outline'}
            onClick={() => setOrderSide('SELL')}
            className="flex-1"
          >
            Vender
          </Button>
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            step="any"
            {...form.register('quantity', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">Precio</Label>
          <Input
            id="price"
            type="number"
            step="any"
            {...form.register('price', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="stopLoss">Stop Loss</Label>
          <Input
            id="stopLoss"
            type="number"
            step="any"
            {...form.register('stopLoss', { valueAsNumber: true })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="takeProfit">Take Profit</Label>
          <Input
            id="takeProfit"
            type="number"
            step="any"
            {...form.register('takeProfit', { valueAsNumber: true })}
          />
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="trailing-stop"
            checked={useTrailingStop}
            onCheckedChange={setUseTrailingStop}
          />
          <Label htmlFor="trailing-stop">Usar Trailing Stop</Label>
        </div>

        {useTrailingStop && (
          <>
            <div className="space-y-2">
              <Label htmlFor="trailingStop">Valor del Trailing Stop</Label>
              <Input
                id="trailingStop"
                type="number"
                step="any"
                {...form.register('trailingStop', { valueAsNumber: true })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trailingDistance">Distancia del Trailing</Label>
              <Input
                id="trailingDistance"
                type="number"
                step="any"
                {...form.register('trailingDistance', { valueAsNumber: true })}
              />
            </div>
          </>
        )}

        <Button type="submit" className="w-full">
          {orderSide === 'BUY' ? 'Comprar' : 'Vender'} {currentSymbol}
        </Button>
      </form>
    </Card>
  );
}
