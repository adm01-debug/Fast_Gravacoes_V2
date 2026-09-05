export interface StudioConfig {
  id: string;
  label: string;
  techniques?: string[];
}

export interface BenchmarkConfig {
  label: string;
  target: number;
  desc: string;
}

export const STUDIOS: StudioConfig[] = [
  { id: 'all', label: 'Todos os Studios' },
  { id: 'serigrafia_textil', label: 'Studio Serigrafia Têxtil', techniques: ['serigrafia'] },
  { id: 'serigrafia_cilindrica', label: 'Studio Serigrafia Cilíndrica', techniques: ['serigrafia'] },
  { id: 'serigrafia_vinilica', label: 'Studio Serigrafia Vinílica', techniques: ['serigrafia'] },
  { id: 'personalizacao_uv', label: 'Studio UV Premium', techniques: ['digital_uv', 'uv'] },
  { id: 'laser', label: 'Studio Laser Precision', techniques: ['laser'] },
];

export const INDUSTRY_BENCHMARKS: Record<string, BenchmarkConfig> = {
  world_class: { label: 'World Class (Geral)', target: 85, desc: 'Padrão ouro de excelência industrial global.' },
  corporate_gifts: { label: 'Brindes Corporativos (FAST)', target: 82, desc: 'Foco em setup rápido e alta variabilidade de produtos.' },
  automotive: { label: 'Automotivo', target: 80, desc: 'Alta automação e processos rígidos de qualidade.' },
  food_bev: { label: 'Alimentos & Bebidas', target: 75, desc: 'Foco em disponibilidade e conformidade sanitária.' },
  textile: { label: 'Têxtil', target: 65, desc: 'Alta variabilidade de setup e troca de lotes.' },
  general: { label: 'Manufatura Geral', target: 60, desc: 'Processos manuais ou semi-automáticos.' },
};
