import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileCode } from 'lucide-react';
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, Tooltip } from '@/lib/recharts';

interface Props {
  testDistributionData: { name: string; value: number; color: string }[];
  testFiles: { path: string; name: string; category: string; testCount: number }[];
}

export function CodeQualityTestsTab({ testDistributionData, testFiles }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card variant="elevated">
        <CardHeader><CardTitle className="text-lg">Distribuição de Testes</CardTitle><CardDescription>Por categoria de teste</CardDescription></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPie>
                <Pie data={testDistributionData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {testDistributionData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.color} />))}
                </Pie>
                <Tooltip />
              </RechartsPie>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
      <Card variant="elevated">
        <CardHeader><CardTitle className="text-lg">Arquivos de Teste</CardTitle><CardDescription>Lista completa de arquivos</CardDescription></CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {testFiles.map((file) => (
              <div key={file.path} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                <div className="flex items-center gap-2"><FileCode className="h-4 w-4 text-muted-foreground" /><span className="text-sm font-mono">{file.name}</span></div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className={file.category === 'unit' ? 'bg-success/10 text-success' : file.category === 'integration' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}>{file.category}</Badge>
                  <span className="text-sm text-muted-foreground">{file.testCount} tests</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
