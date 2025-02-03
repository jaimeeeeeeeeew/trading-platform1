import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface OrderBookEntry {
  Price: number;
  Quantity: number;
}

interface Transaction {
  volume: string;
  price: string;
}

interface TransactionListProps {
  transactions: Transaction[];
  orderBook?: {
    futures: {
      asks: OrderBookEntry[];
      bids: OrderBookEntry[];
    };
    spot: {
      asks: OrderBookEntry[];
      bids: OrderBookEntry[];
    };
  };
}

export default function TransactionList({ transactions, orderBook }: TransactionListProps) {
  return (
    <div className="flex-1">
      <Tabs defaultValue="transactions">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="transactions" className="flex-1">Transacciones</TabsTrigger>
          <TabsTrigger value="orders" className="flex-1">Órdenes Límite</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {transactions.map((transaction, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center p-2 rounded-lg bg-card/50 text-sm"
                >
                  <span className="font-medium">{transaction.volume}</span>
                  <span className="text-muted-foreground">{transaction.price}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="orders">
          <ScrollArea className="h-[200px]">
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Futuros</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-primary mb-1">Compras</div>
                    {orderBook?.futures.bids.slice(0, 5).map((order, idx) => (
                      <div key={idx} className="flex justify-between text-xs p-1 bg-primary/10 rounded">
                        <span>{order.Price.toFixed(1)}</span>
                        <span>{order.Quantity.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-destructive mb-1">Ventas</div>
                    {orderBook?.futures.asks.slice(0, 5).map((order, idx) => (
                      <div key={idx} className="flex justify-between text-xs p-1 bg-destructive/10 rounded">
                        <span>{order.Price.toFixed(1)}</span>
                        <span>{order.Quantity.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Spot</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-xs text-primary mb-1">Compras</div>
                    {orderBook?.spot.bids.slice(0, 5).map((order, idx) => (
                      <div key={idx} className="flex justify-between text-xs p-1 bg-primary/10 rounded">
                        <span>{order.Price.toFixed(1)}</span>
                        <span>{order.Quantity.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="text-xs text-destructive mb-1">Ventas</div>
                    {orderBook?.spot.asks.slice(0, 5).map((order, idx) => (
                      <div key={idx} className="flex justify-between text-xs p-1 bg-destructive/10 rounded">
                        <span>{order.Price.toFixed(1)}</span>
                        <span>{order.Quantity.toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}