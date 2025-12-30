import { Download, Maximize2, BarChart3, PieChart, Table2, Swords, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
} from 'recharts';

interface Artifact {
  type: 'radar_chart' | 'bar_chart' | 'line_chart' | 'table' | 'download' | 'war_room' | 'battle_plan';
  data: unknown;
  title?: string;
  downloadUrl?: string;
  fileName?: string;
}

interface ArtifactRendererProps {
  artifact: Artifact;
}

export function ArtifactRenderer({ artifact }: ArtifactRendererProps) {
  switch (artifact.type) {
    case 'radar_chart':
      return <RadarChartArtifact data={artifact.data as Record<string, number>} title={artifact.title} />;
    case 'bar_chart':
      return <BarChartArtifact data={artifact.data as Record<string, number>} title={artifact.title} />;
    case 'line_chart':
      return <LineChartArtifact data={artifact.data as Array<{ name: string; value: number }>} title={artifact.title} />;
    case 'table':
      return <TableArtifact data={artifact.data as Array<Record<string, unknown>>} title={artifact.title} />;
    case 'download':
      return <DownloadArtifact url={artifact.downloadUrl!} fileName={artifact.fileName!} title={artifact.title} />;
    case 'war_room':
      return <WarRoomArtifact data={artifact.data} title={artifact.title} />;
    case 'battle_plan':
      return <BattlePlanArtifact data={artifact.data} title={artifact.title} />;
    default:
      return null;
  }
}

function RadarChartArtifact({ data, title }: { data: Record<string, number>; title?: string }) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    subject: key.charAt(0).toUpperCase() + key.slice(1),
    value,
    fullMark: 100,
  }));

  return (
    <Card className="p-4 bg-background/50">
      {title && <h4 className="text-sm font-medium mb-3">{title}</h4>}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={chartData}>
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} />
            <Radar
              name="Scor"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.3}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function BarChartArtifact({ data, title }: { data: Record<string, number>; title?: string }) {
  const chartData = Object.entries(data).map(([key, value]) => ({
    name: key,
    value,
  }));

  return (
    <Card className="p-4 bg-background/50">
      {title && <h4 className="text-sm font-medium mb-3">{title}</h4>}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function LineChartArtifact({ data, title }: { data: Array<{ name: string; value: number }>; title?: string }) {
  return (
    <Card className="p-4 bg-background/50">
      {title && <h4 className="text-sm font-medium mb-3">{title}</h4>}
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function TableArtifact({ data, title }: { data: Array<Record<string, unknown>>; title?: string }) {
  if (!data || data.length === 0) return null;
  
  const columns = Object.keys(data[0]);

  return (
    <Card className="p-4 bg-background/50 overflow-hidden">
      {title && <h4 className="text-sm font-medium mb-3">{title}</h4>}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map(col => (
                <th key={col} className="text-left py-2 px-3 font-medium text-muted-foreground">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.slice(0, 10).map((row, i) => (
              <tr key={i} className="border-b border-border/50">
                {columns.map(col => (
                  <td key={col} className="py-2 px-3 text-foreground">
                    {String(row[col] ?? '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {data.length > 10 && (
          <p className="text-xs text-muted-foreground mt-2 text-center">
            Afișate {10} din {data.length} rânduri
          </p>
        )}
      </div>
    </Card>
  );
}

function DownloadArtifact({ url, fileName, title }: { url: string; fileName: string; title?: string }) {
  return (
    <Card className="p-4 bg-background/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{title || fileName}</p>
            <p className="text-xs text-muted-foreground">{fileName}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href={url} download={fileName}>
            <Download className="h-4 w-4 mr-2" />
            Descarcă
          </a>
        </Button>
      </div>
    </Card>
  );
}

function WarRoomArtifact({ data, title }: { data: unknown; title?: string }) {
  return (
    <Card className="p-4 bg-background/50 border-warning/30">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
          <Swords className="h-5 w-5 text-warning" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{title || 'War Room'}</p>
          <p className="text-xs text-muted-foreground">Simulare strategică disponibilă</p>
        </div>
        <Button variant="outline" size="sm">
          <Maximize2 className="h-4 w-4 mr-2" />
          Deschide
        </Button>
      </div>
    </Card>
  );
}

function BattlePlanArtifact({ data, title }: { data: unknown; title?: string }) {
  return (
    <Card className="p-4 bg-background/50 border-success/30">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
          <Target className="h-5 w-5 text-success" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-foreground">{title || 'Battle Plan'}</p>
          <p className="text-xs text-muted-foreground">Plan de acțiune generat</p>
        </div>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>
    </Card>
  );
}