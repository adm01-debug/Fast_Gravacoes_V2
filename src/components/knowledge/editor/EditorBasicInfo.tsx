import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductCategory, Material } from '@/hooks/useTechnicalSheets';
import { Info, Plus, Trash2, CheckSquare, AlertTriangle, Package, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export interface EditorFormData {
  technique_id: string;
  product_category_id: string;
  material_id: string;
  title: string;
  description: string;
  estimated_time_minutes: string;
  recommended_machine_id: string;
  ink_specifications: string;
  tooling_specifications: string;
  squeegee_passes: string;
  pressure: string;
  speed: string;
  temperature: string;
  squeegee_passes_min: string;
  squeegee_passes_max: string;
  pressure_min: string;
  pressure_max: string;
  speed_min: string;
  speed_max: string;
  temperature_min: string;
  temperature_max: string;
  gap_specifications: string;
  challenges_notes: string;
  failure_scenarios: string;
  quality_requirements: string;
  setup_instructions: string;
  quality_checklist: Array<{ id: string; description: string; required: boolean }>;
  consumables: Array<{ id: string; name: string; quantity: string; alternative?: string }>;
  gold_standard_image_url: string;
  failure_standard_image_url: string;
  version: string;
}

interface EditorBasicInfoProps {
  formData: EditorFormData;
  setFormData: (data: EditorFormData | ((prev: EditorFormData) => EditorFormData)) => void;
  techniques: Array<{ id: string; name: string; color: string; short_name: string }>;
  categories: ProductCategory[];
  materials: Material[];
  machines: Array<{ id: string; name: string; code: string }>;
}

export function EditorBasicInfo({ formData, setFormData, techniques, categories, materials, machines }: EditorBasicInfoProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Informações Básicas</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Técnica *</Label>
          <Select value={formData.technique_id} onValueChange={(v) => setFormData({...formData, technique_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione a técnica" /></SelectTrigger>
            <SelectContent>
              {techniques.map(t => (
                <SelectItem key={t.id} value={t.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    {t.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Categoria de Produto</Label>
          <Select value={formData.product_category_id} onValueChange={(v) => setFormData({...formData, product_category_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione a categoria" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Material</Label>
          <Select value={formData.material_id} onValueChange={(v) => setFormData({...formData, material_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione o material" /></SelectTrigger>
            <SelectContent>
              {materials.map(m => (<SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Máquina Recomendada</Label>
          <Select value={formData.recommended_machine_id} onValueChange={(v) => setFormData({...formData, recommended_machine_id: v})}>
            <SelectTrigger><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
            <SelectContent>
              {machines.map(m => (<SelectItem key={m.id} value={m.id}>{m.name} ({m.code})</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-3 space-y-2">
          <Label>Título *</Label>
          <Input value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} placeholder="Ex: Serigrafia em Camiseta 100% Algodão" />
        </div>
        <div className="space-y-2">
          <Label>Versão</Label>
          <Input value={formData.version} disabled className="bg-muted" />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Descrição</Label>
        <Textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} placeholder="Descrição geral do processo..." rows={3} />
      </div>
      <div className="space-y-2">
        <Label>Tempo Estimado (minutos)</Label>
        <Input type="number" value={formData.estimated_time_minutes} onChange={(e) => setFormData({...formData, estimated_time_minutes: e.target.value})} placeholder="Ex: 30" />
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          Configurações Técnicas e Regulagem
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Especificação de Tinta / Solventes</Label>
            <Input
              value={formData.ink_specifications}
              onChange={(e) => setFormData({...formData, ink_specifications: e.target.value})}
              placeholder="Ex: Tinta Vinílica Branca + 10% Retardador"
            />
          </div>
          <div className="space-y-2">
            <Label>Ferramental (Rodo, Lâmina, etc.)</Label>
            <Input
              value={formData.tooling_specifications}
              onChange={(e) => setFormData({...formData, tooling_specifications: e.target.value})}
              placeholder="Ex: Rodo Poliuretano 70 shores"
            />
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Passadas (Rodo)</Label>
              <Input
                value={formData.squeegee_passes}
                onChange={(e) => setFormData({...formData, squeegee_passes: e.target.value})}
                placeholder="Valor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                value={formData.squeegee_passes_min}
                onChange={(e) => setFormData({...formData, squeegee_passes_min: e.target.value})}
                placeholder="Mín"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                value={formData.squeegee_passes_max}
                onChange={(e) => setFormData({...formData, squeegee_passes_max: e.target.value})}
                placeholder="Máx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Pressão</Label>
              <Input
                value={formData.pressure}
                onChange={(e) => setFormData({...formData, pressure: e.target.value})}
                placeholder="Valor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                value={formData.pressure_min}
                onChange={(e) => setFormData({...formData, pressure_min: e.target.value})}
                placeholder="Mín"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                value={formData.pressure_max}
                onChange={(e) => setFormData({...formData, pressure_max: e.target.value})}
                placeholder="Máx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Velocidade</Label>
              <Input
                value={formData.speed}
                onChange={(e) => setFormData({...formData, speed: e.target.value})}
                placeholder="Valor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                value={formData.speed_min}
                onChange={(e) => setFormData({...formData, speed_min: e.target.value})}
                placeholder="Mín"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                value={formData.speed_max}
                onChange={(e) => setFormData({...formData, speed_max: e.target.value})}
                placeholder="Máx"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-2">
              <Label>Temperatura</Label>
              <Input
                value={formData.temperature}
                onChange={(e) => setFormData({...formData, temperature: e.target.value})}
                placeholder="Valor"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Mínimo</Label>
              <Input
                value={formData.temperature_min}
                onChange={(e) => setFormData({...formData, temperature_min: e.target.value})}
                placeholder="Mín"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Máximo</Label>
              <Input
                value={formData.temperature_max}
                onChange={(e) => setFormData({...formData, temperature_max: e.target.value})}
                placeholder="Máx"
              />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-500" />
            Configuração e Preparação (Setup)
          </h3>
          <div className="space-y-2">
            <Label>Guia de Configuração da Máquina</Label>
            <Textarea
              value={formData.setup_instructions}
              onChange={(e) => setFormData({...formData, setup_instructions: e.target.value})}
              placeholder="Descreva o setup da máquina, ferramenta/matriz e passos de preparação..."
              rows={3}
            />
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-success" />
              Checklist de Qualidade
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem = { id: crypto.randomUUID(), description: '', required: true };
                setFormData({...formData, quality_checklist: [...formData.quality_checklist, newItem]});
              }}
              className="h-8 gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar Critério
            </Button>
          </div>

          <div className="space-y-2">
            {formData.quality_checklist.length === 0 && (
              <p className="text-xs text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                Nenhum critério de qualidade definido.
              </p>
            )}
            {formData.quality_checklist.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg border border-border/50">
                <div className="flex-1 space-y-2">
                  <Input
                    value={item.description}
                    onChange={(e) => {
                      const newList = [...formData.quality_checklist];
                      newList[index].description = e.target.value;
                      setFormData({...formData, quality_checklist: newList});
                    }}
                    placeholder="Ex: Impressão sem falhas de cobertura"
                    className="h-8"
                  />
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`req-${item.id}`}
                      checked={item.required}
                      onCheckedChange={(checked) => {
                        const newList = [...formData.quality_checklist];
                        newList[index].required = !!checked;
                        setFormData({...formData, quality_checklist: newList});
                      }}
                    />
                    <Label htmlFor={`req-${item.id}`} className="text-xs cursor-pointer">Obrigatório para aprovação</Label>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    const newList = formData.quality_checklist.filter((_, i) => i !== index);
                    setFormData({...formData, quality_checklist: newList});
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              Insumos e Consumíveis
            </h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newItem = { id: crypto.randomUUID(), name: '', quantity: '', alternative: '' };
                setFormData({...formData, consumables: [...formData.consumables, newItem]});
              }}
              className="h-8 gap-1"
            >
              <Plus className="h-3 w-3" /> Adicionar Insumo
            </Button>
          </div>

          <div className="space-y-2">
            {formData.consumables.length === 0 && (
              <p className="text-xs text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                Nenhum insumo definido.
              </p>
            )}
            {formData.consumables.map((item, index) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-secondary/10 rounded-lg border border-border/50">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Nome</Label>
                    <Input
                      value={item.name}
                      onChange={(e) => {
                        const newList = [...formData.consumables];
                        newList[index].name = e.target.value;
                        setFormData({...formData, consumables: newList});
                      }}
                      placeholder="Ex: Tinta Branca"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Quantidade Sugerida</Label>
                    <Input
                      value={item.quantity}
                      onChange={(e) => {
                        const newList = [...formData.consumables];
                        newList[index].quantity = e.target.value;
                        setFormData({...formData, consumables: newList});
                      }}
                      placeholder="Ex: 500ml"
                      className="h-8 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] uppercase">Alternativa Compatível</Label>
                    <Input
                      value={item.alternative}
                      onChange={(e) => {
                        const newList = [...formData.consumables];
                        newList[index].alternative = e.target.value;
                        setFormData({...formData, consumables: newList});
                      }}
                      placeholder="Ex: Tinta Branca Marca Y"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 self-end"
                  onClick={() => {
                    const newList = formData.consumables.filter((_, i) => i !== index);
                    setFormData({...formData, consumables: newList});
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Maximize2 className="h-4 w-4 text-success" />
            Padrões Visuais de Qualidade
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>URL da Imagem - Padrão de Ouro</Label>
              <Input
                value={formData.gold_standard_image_url}
                onChange={(e) => setFormData({...formData, gold_standard_image_url: e.target.value})}
                placeholder="https://exemplo.com/imagem-ouro.jpg"
              />
              <p className="text-[10px] text-muted-foreground">URL da imagem que representa o resultado perfeito.</p>
            </div>
            <div className="space-y-2">
              <Label>URL da Imagem - Padrão de Falha</Label>
              <Input
                value={formData.failure_standard_image_url}
                onChange={(e) => setFormData({...formData, failure_standard_image_url: e.target.value})}
                placeholder="https://exemplo.com/imagem-falha.jpg"
              />
              <p className="text-[10px] text-muted-foreground">URL da imagem que representa erros a serem evitados.</p>
            </div>
          </div>
        </div>

        <Separator className="my-6" />

        <div className="space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" />
            Orientações de Produção e Qualidade
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>GAP / Distanciamento</Label>
              <Input
                value={formData.gap_specifications}
                onChange={(e) => setFormData({...formData, gap_specifications: e.target.value})}
                placeholder="Ex: GAP de 3mm entre tela e substrato"
              />
            </div>
            <div className="space-y-2">
              <Label>Requisitos de Qualidade (Resumo)</Label>
              <Input
                value={formData.quality_requirements}
                onChange={(e) => setFormData({...formData, quality_requirements: e.target.value})}
                placeholder="Ex: Sem rebarbas, brilho uniforme"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Desafios e Pontos de Atenção</Label>
            <Textarea
              value={formData.challenges_notes}
              onChange={(e) => setFormData({...formData, challenges_notes: e.target.value})}
              placeholder="Descreva os principais desafios técnicos deste trabalho..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-rose-600">Cenários de Falha (O que evitar)</Label>
            <Textarea
              value={formData.failure_scenarios}
              onChange={(e) => setFormData({...formData, failure_scenarios: e.target.value})}
              placeholder="Descreva situações que levam à perda de peças..."
              rows={2}
            />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

import { Separator } from '@/components/ui/separator';
