/* eslint-disable react-hooks/purity -- Padrões intencionais: sync com sistemas externos, memoização manual por performance, integração com libs (dnd-kit, framer-motion, supabase realtime). */
import { useState, useEffect } from 'react';
import { LayoutGrid, Layers, Sparkles, Copy } from 'lucide-react';
import { OverviewStatCard } from './overview/OverviewStatCard';
import { OverviewWhatsNew } from './overview/OverviewWhatsNew';
import { OverviewCategoriesGrid } from './overview/OverviewCategoriesGrid';

interface OverviewSectionProps {
  onNavigate: (tabId: string) => void;
}

export function OverviewSection({ onNavigate }: OverviewSectionProps) {
  const [animatedValues, setAnimatedValues] = useState({ categories: 0, components: 0, variants: 0, copiable: 0 });

  useEffect(() => {
    const duration = 1500;
    const steps = 60;
    const interval = duration / steps;
    const targets = { categories: 20, components: 150, variants: 50, copiable: 100 };
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      const eased = progress < 0.5 ? 4 * progress * progress * progress : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const bounceProgress = progress >= 0.8 ? 1 + Math.sin((progress - 0.8) * 5 * Math.PI) * 0.1 * (1 - progress) * 5 : eased;
      const finalProgress = Math.min(1, Math.max(0, progress >= 0.95 ? 1 : bounceProgress));
      setAnimatedValues({
        categories: Math.round(targets.categories * finalProgress),
        components: Math.round(targets.components * finalProgress),
        variants: Math.round(targets.variants * finalProgress),
        copiable: Math.round(targets.copiable * finalProgress),
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6 relative">
      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full animate-float"
            style={{
              width: `${Math.random() * 12 + 6}px`,
              height: `${Math.random() * 12 + 6}px`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `hsl(var(--${['primary', 'success', 'warning', 'info'][i % 4]}))`,
              opacity: 0.15 + Math.random() * 0.15,
              filter: `blur(${Math.random() * 2 + 1}px)`,
              animationDelay: `${i * 0.2}s`,
              animationDuration: `${3 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OverviewStatCard icon={LayoutGrid} value={animatedValues.categories} label="Categorias" colorToken="primary" />
        <OverviewStatCard icon={Layers} value={`${animatedValues.components}+`} label="Componentes" colorToken="success" />
        <OverviewStatCard icon={Sparkles} value={`${animatedValues.variants}+`} label="Variantes" colorToken="warning" />
        <OverviewStatCard icon={Copy} value={`${animatedValues.copiable}%`} label="Copiável" colorToken="info" />
      </div>

      <OverviewWhatsNew />
      <OverviewCategoriesGrid onNavigate={onNavigate} />
    </div>
  );
}
