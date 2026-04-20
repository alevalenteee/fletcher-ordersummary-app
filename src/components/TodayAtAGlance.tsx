import React from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { Package, MapPin, Layers, Boxes } from 'lucide-react';
import { Destination, Order, Product } from '@/types';
import { computeOrderStats } from '@/utils/orderStats';
import { getDestinationAccent } from '@/utils/destinationColors';

interface TodayAtAGlanceProps {
  orders: Order[];
  productData: Product[];
  destinations?: Destination[];
}

// Subtle spring-driven count-up used for each stat number. Rolls the value
// smoothly when the underlying stat changes rather than snapping, which gives
// the strip a calm, polished feel without being flashy.
const CountUp: React.FC<{ value: number; decimals?: number }> = ({ value, decimals = 0 }) => {
  const mv = useMotionValue(0);
  const spring = useSpring(mv, { stiffness: 90, damping: 22, mass: 0.8 });
  const display = useTransform(spring, latest => {
    const n = decimals > 0 ? Number(latest.toFixed(decimals)) : Math.round(latest);
    return n.toLocaleString();
  });

  React.useEffect(() => {
    mv.set(value);
  }, [mv, value]);

  return <motion.span>{display}</motion.span>;
};

const StatCell: React.FC<{
  label: string;
  value: number;
  decimals?: number;
  icon: React.ReactNode;
  delay: number;
}> = ({ label, value, decimals, icon, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay }}
    className="flex items-center gap-3 py-3 px-4 sm:px-5 first:pl-5 last:pr-5"
  >
    <div className="p-1.5 rounded-md bg-neutral-100 text-neutral-500 shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="text-lg font-semibold tracking-tight text-neutral-900 tabular-nums leading-tight">
        <CountUp value={value} decimals={decimals} />
      </div>
    </div>
  </motion.div>
);

export const TodayAtAGlance: React.FC<TodayAtAGlanceProps> = ({
  orders,
  productData,
  destinations = [],
}) => {
  const stats = React.useMemo(
    () => computeOrderStats(orders, productData),
    [orders, productData]
  );

  // Show up to the six most-frequented destinations as accent dots. They
  // share the same palette used for the card left-borders, so the strip
  // visually ties into the list below.
  const topDestinations = React.useMemo(
    () => stats.destinationCounts.slice(0, 6),
    [stats.destinationCounts]
  );

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      className="mb-4 bg-white rounded-card border border-neutral-200/70 shadow-card overflow-hidden"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-neutral-100">
        <StatCell
          label="Orders"
          value={stats.orders}
          icon={<Package className="w-3.5 h-3.5" />}
          delay={0.02}
        />
        <StatCell
          label="Bales"
          value={stats.bales}
          decimals={stats.bales % 1 === 0 ? 0 : 1}
          icon={<Layers className="w-3.5 h-3.5" />}
          delay={0.06}
        />
        <StatCell
          label="Packs"
          value={stats.packs}
          icon={<Boxes className="w-3.5 h-3.5" />}
          delay={0.1}
        />
        <StatCell
          label="Destinations"
          value={stats.destinations}
          icon={<MapPin className="w-3.5 h-3.5" />}
          delay={0.14}
        />
      </div>
      {topDestinations.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
          className="px-5 py-2.5 border-t border-neutral-100 flex items-center gap-2 flex-wrap"
        >
          <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Today
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {topDestinations.map(d => {
              const accent = getDestinationAccent(d.name, destinations);
              return (
                <div
                  key={d.name}
                  className="inline-flex items-center gap-1.5 text-xs text-neutral-700"
                  title={`${d.name} — ${d.count} order${d.count === 1 ? '' : 's'}`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: accent.dot }}
                  />
                  <span className="font-medium">{d.name}</span>
                  <span className="text-neutral-400 tabular-nums">{d.count}</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
