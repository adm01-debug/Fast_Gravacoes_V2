import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { Trophy, Check, X, Target, Star, Plus, Trash2, Zap } from 'lucide-react';

export function ButtonsSection() {
  return (
    <>
            <Card className="card-interactive card-shine">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Variantes de Botões
                </CardTitle>
                <CardDescription>Todas as variantes disponíveis para o componente Button</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Standard Variants */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variantes Padrão</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="default">Default</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="link">Link</Button>
                    <Button variant="destructive">Destructive</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="warning">Warning</Button>
                    <Button variant="subtle">Subtle</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <CodeBlock code={'<Button variant="default">\n  Texto\n</Button>'} label="Default" />
                    <CodeBlock code={'<Button variant="secondary">\n  Texto\n</Button>'} label="Secondary" />
                    <CodeBlock code={'<Button variant="outline">\n  Texto\n</Button>'} label="Outline" />
                    <CodeBlock code={'<Button variant="destructive">\n  Texto\n</Button>'} label="Destructive" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <CodeBlock code={'<Button variant="ghost">\n  Texto\n</Button>'} label="Ghost" />
                    <CodeBlock code={'<Button variant="link">\n  Texto\n</Button>'} label="Link" />
                    <CodeBlock code={'<Button variant="success">\n  Texto\n</Button>'} label="Success" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CodeBlock code={'<Button variant="warning">\n  Texto\n</Button>'} label="Warning" />
                    <CodeBlock code={'<Button variant="subtle">\n  Texto\n</Button>'} label="Subtle" />
                  </div>
                </div>

                {/* Gaming/Gradient Variants */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Variantes Gaming/Gradiente</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="gradient">Gradient</Button>
                    <Button variant="gradient-subtle">Gradient Subtle</Button>
                    <Button variant="gradient-intense">Gradient Intense</Button>
                    <Button variant="gradient-secondary">Gradient Secondary</Button>
                    <Button variant="gradient-success">Gradient Success</Button>
                    <Button variant="glow">Glow</Button>
                    <Button variant="glass">Glass</Button>
                    <Button variant="premium">Premium</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <CodeBlock code={'<Button variant="gradient">\n  Texto\n</Button>'} label="Gradient" />
                    <CodeBlock code={'<Button variant="gradient-subtle">\n  Texto\n</Button>'} label="Gradient Subtle (Novo)" />
                    <CodeBlock code={'<Button variant="gradient-intense">\n  Texto\n</Button>'} label="Gradient Intense (Novo)" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <CodeBlock code={'<Button variant="gradient-secondary">\n  Texto\n</Button>'} label="Gradient Secondary" />
                    <CodeBlock code={'<Button variant="gradient-success">\n  Texto\n</Button>'} label="Gradient Success" />
                    <CodeBlock code={'<Button variant="glow">\n  Texto\n</Button>'} label="Glow" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CodeBlock code={'<Button variant="glass">\n  Texto\n</Button>'} label="Glass" />
                    <CodeBlock code={'<Button variant="premium">\n  Texto\n</Button>'} label="Premium" />
                  </div>
                </div>

                {/* Gradient States */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estados de Gradiente</h4>
                  <p className="text-sm text-muted-foreground">Os botões gradient agora possuem transições de cor para estados hover, active e disabled.</p>
                  <div className="flex flex-wrap gap-3 items-center">
                    <Button variant="gradient">Normal</Button>
                    <span className="text-muted-foreground">→</span>
                    <Button variant="gradient" className="gradient-primary-hover">Hover</Button>
                    <span className="text-muted-foreground">→</span>
                    <Button variant="gradient" className="gradient-primary-active">Active</Button>
                    <span className="text-muted-foreground">→</span>
                    <Button variant="gradient" disabled>Disabled</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CodeBlock
                      code={`.gradient-primary { /* Normal state */ }
.gradient-primary-hover { /* Hover: lighter tones */ }
.gradient-primary-active { /* Active: darker tones */ }
.gradient-primary-disabled { /* Disabled: desaturated */ }`}
                      label="Classes CSS de Estado"
                    />
                    <CodeBlock
                      code={`// Aplicado automaticamente no Button
variant="gradient" // Usa transições automáticas

// Para uso manual em outros elementos:
className="gradient-primary-subtle"`}
                      label="Uso"
                    />
                  </div>
                </div>

                {/* With Shimmer */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Com Efeito Shimmer</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="gradient" shimmer>Gradient + Shimmer</Button>
                    <Button variant="default" shimmer>Default + Shimmer</Button>
                    <Button variant="gradient-success" shimmer>Success + Shimmer</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <CodeBlock code={'<Button variant="gradient" shimmer>\n  Texto\n</Button>'} label="Gradient + Shimmer" />
                    <CodeBlock code={'<Button variant="default" shimmer>\n  Texto\n</Button>'} label="Default + Shimmer" />
                    <CodeBlock code={'<Button variant="gradient-success" shimmer>\n  Texto\n</Button>'} label="Success + Shimmer" />
                  </div>
                </div>

                {/* Sizes */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tamanhos</h4>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="sm">Small</Button>
                    <Button size="default">Default</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </div>
                </div>

                {/* Icon Sizes */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tamanhos de Ícone</h4>

                  {/* Visual Examples */}
                  <div className="flex flex-wrap items-end gap-4">
                    <div className="flex flex-col items-center gap-2">
                      <Button size="icon-xs" variant="outline"><Star className="h-3 w-3" /></Button>
                      <span className="text-xs text-muted-foreground">icon-xs</span>
                      <span className="text-[10px] text-muted-foreground/60">24×24px</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Button size="icon-sm" variant="outline"><Star /></Button>
                      <span className="text-xs text-muted-foreground">icon-sm</span>
                      <span className="text-[10px] text-muted-foreground/60">32×32px</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Button size="icon" variant="outline"><Star /></Button>
                      <span className="text-xs text-muted-foreground">icon</span>
                      <span className="text-[10px] text-muted-foreground/60">40×40px</span>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <Button size="icon-lg" variant="outline"><Star /></Button>
                      <span className="text-xs text-muted-foreground">icon-lg</span>
                      <span className="text-[10px] text-muted-foreground/60">48×48px</span>
                    </div>
                  </div>

                  {/* Examples with variants */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="icon-sm" variant="gradient"><Plus /></Button>
                    <Button size="icon" variant="gradient"><Plus /></Button>
                    <Button size="icon-lg" variant="gradient"><Plus /></Button>
                    <Button size="icon-sm" variant="destructive"><Trash2 /></Button>
                    <Button size="icon" variant="destructive"><Trash2 /></Button>
                    <Button size="icon-lg" variant="destructive"><Trash2 /></Button>
                  </div>

                  {/* Code Examples */}
                  <div className="space-y-3 mt-4">
                    <h5 className="text-xs font-medium text-muted-foreground">Código de Uso</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <CodeBlock
                        code={'<Button size="icon-xs">\n  <Star className="h-3 w-3" />\n</Button>'}
                        label="Icon XS (24px)"
                      />
                      <CodeBlock
                        code={'<Button size="icon-sm">\n  <Plus />\n</Button>'}
                        label="Icon Small (32px)"
                      />
                      <CodeBlock
                        code={'<Button size="icon">\n  <Plus />\n</Button>'}
                        label="Icon Default (40px)"
                      />
                      <CodeBlock
                        code={'<Button size="icon-lg">\n  <Plus />\n</Button>'}
                        label="Icon Large (48px)"
                      />
                    </div>
                  </div>
                </div>

                {/* With Icons */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Com Ícones</h4>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="gradient"><Trophy className="h-4 w-4" /> Conquista</Button>
                    <Button variant="gradient-success"><Check className="h-4 w-4" /> Confirmar</Button>
                    <Button variant="destructive"><X className="h-4 w-4" /> Cancelar</Button>
                    <Button variant="outline"><Target className="h-4 w-4" /> Meta</Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CodeBlock
                      code={'<Button variant="gradient">\n  <Trophy className="h-4 w-4" />\n  Conquista\n</Button>'}
                      label="Ícone à esquerda"
                    />
                    <CodeBlock
                      code={'<Button variant="gradient-success">\n  <Check className="h-4 w-4" />\n  Confirmar\n</Button>'}
                      label="Success com ícone"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <CodeBlock
                      code={'<Button variant="destructive">\n  <X className="h-4 w-4" />\n  Cancelar\n</Button>'}
                      label="Destructive com ícone"
                    />
                    <CodeBlock
                      code={'<Button variant="outline">\n  <Target className="h-4 w-4" />\n  Meta\n</Button>'}
                      label="Outline com ícone"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
    </>
  );
}
