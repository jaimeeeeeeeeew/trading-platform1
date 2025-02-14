import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrendAlertProps {
  trend: 'ALCISTA' | 'BAJISTA' | null;
}

export const TrendAlert = ({ trend }: TrendAlertProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (trend) {
      setIsVisible(true);
      const timer = setTimeout(() => setIsVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [trend]);

  return (
    <AnimatePresence>
      {isVisible && trend && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className={`fixed top-4 right-4 z-50 rounded-lg p-4 shadow-lg ${
            trend === 'ALCISTA' ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{
            backdropFilter: 'blur(8px)',
            backgroundColor: trend === 'ALCISTA' ? 'rgba(34, 197, 94, 0.9)' : 'rgba(239, 68, 68, 0.9)'
          }}
        >
          <div className="flex items-center gap-2 text-white">
            {trend === 'ALCISTA' ? (
              <TrendingUp className="h-6 w-6 animate-bounce" />
            ) : (
              <TrendingDown className="h-6 w-6 animate-bounce" />
            )}
            <span className="text-lg font-bold">{trend}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};