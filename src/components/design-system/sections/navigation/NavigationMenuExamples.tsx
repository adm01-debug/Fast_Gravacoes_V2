import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CodeBlock } from '@/components/ui/code-block';
import { NavigationMenu, NavigationMenuContent, NavigationMenuItem, NavigationMenuLink, NavigationMenuList, NavigationMenuTrigger, navigationMenuTriggerStyle } from '@/components/ui/navigation-menu';
import { Code, FileText, HelpCircle, Home, Menu, MessageSquare, Package, Settings, Users } from 'lucide-react';

export function NavigationMenuExamples() {
  return (
    <>
      <Card className="card-interactive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Menu className="h-5 w-5 text-primary" />Navigation Menu</CardTitle>
          <CardDescription>Menu de navegação com dropdowns e submenus</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Menu Básico</h4>
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Produtos</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid gap-3 p-4 w-[400px] md:w-[500px] md:grid-cols-2">
                      <li className="row-span-3">
                        <NavigationMenuLink asChild>
                          <a className="flex h-full w-full select-none flex-col justify-end rounded-md bg-gradient-to-b from-muted/50 to-muted p-6 no-underline outline-none focus:shadow-md" href="/design-system">
                            <Package className="h-6 w-6" /><div className="mb-2 mt-4 text-lg font-medium">Catálogo</div>
                            <p className="text-sm leading-tight text-muted-foreground">Explore nosso catálogo completo de produtos.</p>
                          </a>
                        </NavigationMenuLink>
                      </li>
                      {['Novidades', 'Promoções', 'Mais Vendidos'].map(item => (
                        <li key={item}><NavigationMenuLink asChild><a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground" href="/design-system"><div className="text-sm font-medium leading-none">{item}</div></a></NavigationMenuLink></li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <NavigationMenuTrigger>Recursos</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2">
                      {[{ icon: FileText, name: 'Documentação', desc: 'Guias e tutoriais completos.' },
                        { icon: Code, name: 'API Reference', desc: 'Referência completa da API.' },
                        { icon: HelpCircle, name: 'Suporte', desc: 'Central de ajuda e FAQ.' },
                        { icon: MessageSquare, name: 'Comunidade', desc: 'Fórum e discussões.' }
                      ].map(r => (
                        <li key={r.name}><NavigationMenuLink asChild><a className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground" href="/design-system"><div className="text-sm font-medium leading-none flex items-center gap-2"><r.icon className="h-4 w-4" />{r.name}</div><p className="line-clamp-2 text-sm leading-snug text-muted-foreground">{r.desc}</p></a></NavigationMenuLink></li>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem><NavigationMenuLink className={navigationMenuTriggerStyle()} href="/design-system">Preços</NavigationMenuLink></NavigationMenuItem>
                <NavigationMenuItem><NavigationMenuLink className={navigationMenuTriggerStyle()} href="/design-system">Contato</NavigationMenuLink></NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Links Simples</h4>
            <NavigationMenu>
              <NavigationMenuList>
                {[{ icon: Home, label: 'Home' }, { icon: Users, label: 'Equipe' }, { icon: Settings, label: 'Configurações' }].map(l => (
                  <NavigationMenuItem key={l.label}><NavigationMenuLink className={navigationMenuTriggerStyle()} href="/design-system"><l.icon className="h-4 w-4 mr-2" />{l.label}</NavigationMenuLink></NavigationMenuItem>
                ))}
              </NavigationMenuList>
            </NavigationMenu>
          </div>
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Exemplos de Código</h4>
            <CodeBlock label="Navigation Menu" code={`<NavigationMenu>
  <NavigationMenuList>
    <NavigationMenuItem>
      <NavigationMenuTrigger>Produtos</NavigationMenuTrigger>
      <NavigationMenuContent>
        <ul className="grid gap-3 p-4 w-[400px]">...</ul>
      </NavigationMenuContent>
    </NavigationMenuItem>
  </NavigationMenuList>
</NavigationMenu>`} />
          </div>
        </CardContent>
      </Card>

      <Card className="card-interactive border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HelpCircle className="h-5 w-5 text-primary" />Guia de Uso</CardTitle>
          <CardDescription>Quando usar cada componente de navegação</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2"><h4 className="font-semibold text-sm">Breadcrumb</h4><p className="text-xs text-muted-foreground">Use para mostrar a hierarquia de navegação e permitir retorno fácil a páginas anteriores.</p></div>
            <div className="space-y-2"><h4 className="font-semibold text-sm">Tabs</h4><p className="text-xs text-muted-foreground">Use para organizar conteúdo relacionado em uma mesma página, alternando entre diferentes visualizações.</p></div>
            <div className="space-y-2"><h4 className="font-semibold text-sm">Navigation Menu</h4><p className="text-xs text-muted-foreground">Use para navegação principal do site com submenus ricos em conteúdo.</p></div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
