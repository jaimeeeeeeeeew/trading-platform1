import { ScrollArea } from '@/components/ui/scroll-area';

interface Transaction {
  volume: string;
  price: string;
}

interface TransactionListProps {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: TransactionListProps) {
  return (
    <div className="flex-1">
      <h3 className="text-sm font-medium mb-2">Transacciones</h3>
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
    </div>
  );
}
