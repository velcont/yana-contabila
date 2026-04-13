import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Download, CheckCircle2, XCircle, AlertTriangle, FileSpreadsheet } from 'lucide-react';
import { useState } from 'react';

export interface BilantData {
  bilant?: {
    activ?: Record<string, { initial?: number; final?: number }>;
    pasiv?: Record<string, { initial?: number; final?: number }>;
  };
  cpp?: Record<string, { precedent?: number; curent?: number }>;
  validari?: Array<{ regula: string; status: string; detalii?: string }>;
  echilibru?: boolean;
  companyName?: string;
  period?: string;
  cui?: string;
}

interface BilantArtifactProps {
  data: BilantData;
}

const formatNumber = (val?: number): string => {
  if (val === undefined || val === null) return '-';
  return val.toLocaleString('ro-RO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

// Structure of Bilant rows
const BILANT_ACTIV_ROWS = [
  { rd: 'rd01', label: 'I. Imobilizări necorporale', indent: 0 },
  { rd: 'rd02', label: '  Cheltuieli de dezvoltare', indent: 1 },
  { rd: 'rd03', label: '  Concesiuni, brevete, licențe', indent: 1 },
  { rd: 'rd04', label: '  Fond comercial', indent: 1 },
  { rd: 'rd05', label: '  Avansuri', indent: 1 },
  { rd: 'rd06', label: 'IMOBILIZĂRI NECORPORALE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd07', label: 'II. Imobilizări corporale', indent: 0 },
  { rd: 'rd08', label: '  Construcții', indent: 1 },
  { rd: 'rd09', label: '  Instalații tehnice', indent: 1 },
  { rd: 'rd10', label: '  Imobilizări în curs', indent: 1 },
  { rd: 'rd11', label: 'IMOBILIZĂRI CORPORALE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd12', label: 'III. Imobilizări financiare', indent: 0 },
  { rd: 'rd18', label: 'IMOBILIZĂRI FINANCIARE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd19', label: 'ACTIVE IMOBILIZATE - TOTAL (A)', indent: 0, isTotal: true, isMajor: true },
  { rd: 'rd20', label: 'I. Stocuri', indent: 0 },
  { rd: 'rd24', label: 'STOCURI - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd25', label: 'II. Creanțe', indent: 0 },
  { rd: 'rd29', label: '  Casa și conturi la bănci', indent: 1 },
  { rd: 'rd30', label: 'ACTIVE CIRCULANTE - TOTAL (B)', indent: 0, isTotal: true, isMajor: true },
  { rd: 'rd35', label: 'C. CHELTUIELI ÎN AVANS', indent: 0 },
  { rd: 'rd47', label: 'TOTAL ACTIV', indent: 0, isTotal: true, isMajor: true },
];

const BILANT_PASIV_ROWS = [
  { rd: 'rd64', label: 'I. Capital subscris vărsat', indent: 0 },
  { rd: 'rd65', label: '   Capital subscris nevărsat', indent: 1 },
  { rd: 'rd67', label: 'CAPITAL - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd68', label: 'II. Prime de capital', indent: 0 },
  { rd: 'rd69', label: 'III. Rezerve din reevaluare', indent: 0 },
  { rd: 'rd70', label: 'IV. Rezerve legale', indent: 0 },
  { rd: 'rd74', label: 'REZERVE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd76', label: 'Rezultatul reportat', indent: 0 },
  { rd: 'rd78', label: 'Profitul exercițiului', indent: 0 },
  { rd: 'rd79', label: 'Pierderea exercițiului', indent: 0 },
  { rd: 'rd82', label: 'Repartizarea profitului', indent: 0 },
  { rd: 'rd83', label: 'CAPITALURI PROPRII - TOTAL', indent: 0, isTotal: true, isMajor: true },
  { rd: 'rd84', label: 'Patrimoniul public', indent: 0 },
  { rd: 'rd85', label: 'CAPITALURI - TOTAL', indent: 0, isTotal: true, isMajor: true },
];

const CPP_ROWS = [
  { rd: 'rd01', label: '1. Cifra de afaceri netă', indent: 0, isMajor: true },
  { rd: 'rd10', label: 'VENITURI DIN EXPLOATARE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd32', label: 'CHELTUIELI DE EXPLOATARE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd33', label: 'PROFIT DIN EXPLOATARE', indent: 0, isMajor: true },
  { rd: 'rd34', label: 'PIERDERE DIN EXPLOATARE', indent: 0, isMajor: true },
  { rd: 'rd42', label: 'VENITURI FINANCIARE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd49', label: 'CHELTUIELI FINANCIARE - TOTAL', indent: 0, isTotal: true },
  { rd: 'rd58', label: 'VENITURI TOTALE', indent: 0, isTotal: true, isMajor: true },
  { rd: 'rd59', label: 'CHELTUIELI TOTALE', indent: 0, isTotal: true, isMajor: true },
  { rd: 'rd64', label: 'PROFIT NET', indent: 0, isMajor: true },
  { rd: 'rd65', label: 'PIERDERE NETĂ', indent: 0, isMajor: true },
];

export function BilantArtifact({ data }: BilantArtifactProps) {
  const [activeTab, setActiveTab] = useState<'bilant' | 'cpp' | 'validari'>('bilant');

  const okCount = data.validari?.filter(v => v.status === 'OK').length || 0;
  const errCount = data.validari?.filter(v => v.status === 'EROARE').length || 0;

  return (
    <Card className="p-4 bg-background/80 border-border/50 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-bold text-foreground text-sm">
              BILANȚ CONTABIL — {data.companyName || 'Firmă'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {data.period && `Perioadă: ${data.period}`}
              {data.cui && ` • CUI: ${data.cui}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.echilibru ? (
            <Badge variant="default" className="bg-green-600/20 text-green-400 border-green-600/30 text-xs">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Echilibrat
            </Badge>
          ) : (
            <Badge variant="destructive" className="text-xs">
              <XCircle className="h-3 w-3 mr-1" /> Dezechilibru
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            {okCount} OK / {errCount} Erori
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border/30 pb-1">
        {(['bilant', 'cpp', 'validari'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-medium rounded-t transition-colors ${
              activeTab === tab 
                ? 'bg-primary/20 text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab === 'bilant' ? 'Bilanț (F10)' : tab === 'cpp' ? 'Profit & Pierdere (F20)' : `Validări (${okCount + errCount})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="max-h-[500px] overflow-auto">
        {activeTab === 'bilant' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wide">A C T I V</h4>
            <BilantTable 
              rows={BILANT_ACTIV_ROWS} 
              data={data.bilant?.activ || {}} 
              col1="Sold inițial" 
              col2="Sold final" 
            />
            <h4 className="text-xs font-bold text-primary uppercase tracking-wide mt-4">P A S I V</h4>
            <BilantTable 
              rows={BILANT_PASIV_ROWS} 
              data={data.bilant?.pasiv || {}} 
              col1="Sold inițial" 
              col2="Sold final" 
            />
          </div>
        )}

        {activeTab === 'cpp' && (
          <div>
            <h4 className="text-xs font-bold text-primary uppercase tracking-wide mb-2">
              Contul de Profit și Pierdere
            </h4>
            <BilantTable 
              rows={CPP_ROWS} 
              data={data.cpp || {}} 
              col1="Precedent" 
              col2="Curent" 
              fieldNames={{ col1: 'precedent', col2: 'curent' }}
            />
          </div>
        )}

        {activeTab === 'validari' && (
          <div className="space-y-2">
            {data.validari?.map((v, i) => (
              <div key={i} className={`flex items-start gap-2 p-2 rounded text-xs ${
                v.status === 'OK' 
                  ? 'bg-green-500/10 border border-green-500/20' 
                  : 'bg-red-500/10 border border-red-500/20'
              }`}>
                {v.status === 'OK' ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-medium text-foreground">{v.regula}</span>
                  {v.detalii && <p className="text-muted-foreground mt-0.5">{v.detalii}</p>}
                </div>
              </div>
            )) || <p className="text-muted-foreground text-xs">Nu există validări.</p>}
          </div>
        )}
      </div>
    </Card>
  );
}

function BilantTable({ rows, data, col1, col2, fieldNames }: {
  rows: Array<{ rd: string; label: string; indent: number; isTotal?: boolean; isMajor?: boolean }>;
  data: Record<string, any>;
  col1: string;
  col2: string;
  fieldNames?: { col1: string; col2: string };
}) {
  const f1 = fieldNames?.col1 || 'initial';
  const f2 = fieldNames?.col2 || 'final';

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b border-border/30">
          <th className="text-left py-1 text-muted-foreground font-medium w-8">Nr.</th>
          <th className="text-left py-1 text-muted-foreground font-medium">Denumire indicator</th>
          <th className="text-right py-1 text-muted-foreground font-medium w-28">{col1}</th>
          <th className="text-right py-1 text-muted-foreground font-medium w-28">{col2}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(row => {
          const val = data[row.rd];
          const v1 = val?.[f1] ?? val?.initial ?? val?.precedent;
          const v2 = val?.[f2] ?? val?.final ?? val?.curent;
          const hasData = v1 !== undefined || v2 !== undefined;

          return (
            <tr 
              key={row.rd} 
              className={`border-b border-border/10 ${
                row.isMajor ? 'bg-primary/5 font-bold' : 
                row.isTotal ? 'font-semibold' : ''
              } ${!hasData ? 'opacity-50' : ''}`}
            >
              <td className="py-1 text-muted-foreground">{row.rd.replace('rd', '')}</td>
              <td className={`py-1 ${row.indent ? 'pl-' + (row.indent * 4) : ''}`}>
                {row.label}
              </td>
              <td className="py-1 text-right font-mono">{formatNumber(v1)}</td>
              <td className="py-1 text-right font-mono">{formatNumber(v2)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
