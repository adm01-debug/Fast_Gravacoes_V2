import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CodeBlock } from '@/components/ui/code-block';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Palette } from 'lucide-react';

export function ColorsSection() {
  return (
    <>
            <Card className="card-interactive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-primary" />
                  Paleta de Cores
                </CardTitle>
                <CardDescription>Tokens de cores do design system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* Primary Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cores Principais</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-primary glow-primary" />
                      <p className="text-sm font-medium">Primary</p>
                      <p className="text-xs text-muted-foreground">--primary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-secondary glow-secondary" />
                      <p className="text-sm font-medium">Secondary</p>
                      <p className="text-xs text-muted-foreground">--secondary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-accent glow-accent" />
                      <p className="text-sm font-medium">Accent</p>
                      <p className="text-xs text-muted-foreground">--accent</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-muted border" />
                      <p className="text-sm font-medium">Muted</p>
                      <p className="text-xs text-muted-foreground">--muted</p>
                    </div>
                  </div>
                </div>

                {/* Semantic Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cores Semânticas</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-[hsl(var(--success))] glow-success" />
                      <p className="text-sm font-medium">Success</p>
                      <p className="text-xs text-muted-foreground">--success</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-[hsl(var(--warning))] glow-warning" />
                      <p className="text-sm font-medium">Warning</p>
                      <p className="text-xs text-muted-foreground">--warning</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg bg-destructive" />
                      <p className="text-sm font-medium">Destructive</p>
                      <p className="text-xs text-muted-foreground">--destructive</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg gradient-primary" />
                      <p className="text-sm font-medium">Gradient Primary</p>
                      <p className="text-xs text-muted-foreground">.gradient-primary</p>
                    </div>
                  </div>
                </div>

                {/* Gamification Colors */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Cores Gamificação</h4>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[hsl(var(--xp))]" />
                      <p className="text-sm font-medium">XP</p>
                      <p className="text-xs text-muted-foreground">--xp</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[hsl(var(--coins))]" />
                      <p className="text-sm font-medium">Coins</p>
                      <p className="text-xs text-muted-foreground">--coins</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[hsl(var(--streak))]" />
                      <p className="text-sm font-medium">Streak</p>
                      <p className="text-xs text-muted-foreground">--streak</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[hsl(var(--gold))]" />
                      <p className="text-sm font-medium">Gold</p>
                      <p className="text-xs text-muted-foreground">--gold</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[hsl(var(--silver))]" />
                      <p className="text-sm font-medium">Silver</p>
                      <p className="text-xs text-muted-foreground">--silver</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-16 rounded-lg bg-[hsl(var(--bronze))]" />
                      <p className="text-sm font-medium">Bronze</p>
                      <p className="text-xs text-muted-foreground">--bronze</p>
                    </div>
                  </div>
                </div>

                {/* Gradients */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gradientes Base</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg gradient-primary" />
                      <p className="text-sm font-medium">Gradient Primary</p>
                      <p className="text-xs text-muted-foreground">.gradient-primary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg gradient-secondary" />
                      <p className="text-sm font-medium">Gradient Secondary</p>
                      <p className="text-xs text-muted-foreground">.gradient-secondary</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-20 rounded-lg gradient-success" />
                      <p className="text-sm font-medium">Gradient Success</p>
                      <p className="text-xs text-muted-foreground">.gradient-success</p>
                    </div>
                  </div>
                </div>

                {/* New Gradient Variants */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Gradientes Primary - Variantes</h4>
                  <p className="text-sm text-muted-foreground">Variantes de intensidade do gradiente primary para diferentes contextos de UI</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <div className="h-24 rounded-lg gradient-primary-subtle flex items-center justify-center">
                        <span className="text-sm font-medium text-foreground">Subtle</span>
                      </div>
                      <p className="text-sm font-medium">Gradient Primary Subtle</p>
                      <p className="text-xs text-muted-foreground">.gradient-primary-subtle</p>
                      <p className="text-xs text-muted-foreground">Uso: backgrounds suaves, cards secundários</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-24 rounded-lg gradient-primary flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">Default</span>
                      </div>
                      <p className="text-sm font-medium">Gradient Primary</p>
                      <p className="text-xs text-muted-foreground">.gradient-primary</p>
                      <p className="text-xs text-muted-foreground">Uso: CTAs principais, destaques</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-24 rounded-lg gradient-primary-intense flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">Intense</span>
                      </div>
                      <p className="text-sm font-medium">Gradient Primary Intense</p>
                      <p className="text-xs text-muted-foreground">.gradient-primary-intense</p>
                      <p className="text-xs text-muted-foreground">Uso: botões premium, destaques fortes</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-24 rounded-lg gradient-primary-vivid flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-foreground">Vivid</span>
                      </div>
                      <p className="text-sm font-medium">Gradient Primary Vivid</p>
                      <p className="text-xs text-muted-foreground">.gradient-primary-vivid</p>
                      <p className="text-xs text-muted-foreground">Uso: badges especiais, animações</p>
                    </div>
                  </div>
                </div>

                {/* Gradient Usage Examples */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exemplos de Uso</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Cards com Gradientes</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-lg gradient-primary-subtle border border-border/50">
                          <p className="text-sm font-medium">Card Subtle</p>
                          <p className="text-xs text-muted-foreground mt-1">Background suave</p>
                        </div>
                        <div className="p-4 rounded-lg gradient-primary">
                          <p className="text-sm font-medium text-primary-foreground">Card Primary</p>
                          <p className="text-xs text-primary-foreground/80 mt-1">Destaque principal</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Botões com Gradientes</p>
                      <div className="flex flex-wrap gap-3">
                        <Button variant="gradient-subtle" size="sm">Subtle</Button>
                        <Button variant="gradient" size="sm">Default</Button>
                        <Button variant="gradient-intense" size="sm">Intense</Button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gradient Code Examples */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Código CSS</h4>
                  <CodeBlock
                    label="index.css"
                    showLineNumbers
                    code={`/* Gradientes Primary - Definições em index.css */

/* Subtle - Para backgrounds suaves */
.gradient-primary-subtle {
  background: linear-gradient(
    135deg,
    hsl(var(--primary) / 0.1) 0%,
    hsl(var(--primary) / 0.2) 100%
  );
}

/* Default - Gradiente padrão */
.gradient-primary {
  background: linear-gradient(
    135deg,
    hsl(var(--primary)) 0%,
    hsl(var(--primary-glow)) 100%
  );
}

/* Intense - Para destaques fortes */
.gradient-primary-intense {
  background: linear-gradient(
    135deg,
    hsl(var(--primary)) 0%,
    hsl(calc(var(--primary-hue) + 15) 85% 55%) 100%
  );
}

/* Vivid - Máxima saturação */
.gradient-primary-vivid {
  background: linear-gradient(
    135deg,
    hsl(var(--primary)) 0%,
    hsl(calc(var(--primary-hue) + 30) 100% 50%) 50%,
    hsl(var(--primary)) 100%
  );
}`}
                  />
                </div>

                {/* Gradient Comparison Table */}
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Comparação de Variantes</h4>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Variante</TableHead>
                          <TableHead>Classe CSS</TableHead>
                          <TableHead>Intensidade</TableHead>
                          <TableHead>Caso de Uso</TableHead>
                          <TableHead>Preview</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">Subtle</TableCell>
                          <TableCell><code className="text-xs text-primary">.gradient-primary-subtle</code></TableCell>
                          <TableCell>10-20%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">Backgrounds, cards secundários</TableCell>
                          <TableCell><div className="w-16 h-6 rounded gradient-primary-subtle" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Default</TableCell>
                          <TableCell><code className="text-xs text-primary">.gradient-primary</code></TableCell>
                          <TableCell>100%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">CTAs, botões principais</TableCell>
                          <TableCell><div className="w-16 h-6 rounded gradient-primary" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Intense</TableCell>
                          <TableCell><code className="text-xs text-primary">.gradient-primary-intense</code></TableCell>
                          <TableCell>120%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">Botões premium, headers</TableCell>
                          <TableCell><div className="w-16 h-6 rounded gradient-primary-intense" /></TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">Vivid</TableCell>
                          <TableCell><code className="text-xs text-primary">.gradient-primary-vivid</code></TableCell>
                          <TableCell>150%</TableCell>
                          <TableCell className="text-sm text-muted-foreground">Badges especiais, animações</TableCell>
                          <TableCell><div className="w-16 h-6 rounded gradient-primary-vivid" /></TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
    </>
  );
}
