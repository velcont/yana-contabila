import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from "recharts";
import { ResilienceScore } from './types';

interface ResilienceChartsProps {
  resilienceScore: ResilienceScore;
}

export const ResilienceCharts = ({ resilienceScore }: ResilienceChartsProps) => {
  const radarData = [
    { dimension: 'Anticipare', value: resilienceScore.anticipation },
    { dimension: 'Coping', value: resilienceScore.coping },
    { dimension: 'Adaptare', value: resilienceScore.adaptation },
    { dimension: 'Robustețe', value: resilienceScore.robustness },
    { dimension: 'Redundanță', value: resilienceScore.redundancy },
    { dimension: 'Resurse', value: resilienceScore.resourcefulness },
    { dimension: 'Rapiditate', value: resilienceScore.rapidity }
  ];

  const barData = [
    { name: 'Anticipare (15%)', score: resilienceScore.anticipation },
    { name: 'Coping (25%)', score: resilienceScore.coping },
    { name: 'Adaptare (20%)', score: resilienceScore.adaptation },
    { name: 'Robustețe (20%)', score: resilienceScore.robustness },
    { name: 'Redundanță (10%)', score: resilienceScore.redundancy },
    { name: 'Resurse (5%)', score: resilienceScore.resourcefulness },
    { name: 'Rapiditate (5%)', score: resilienceScore.rapidity }
  ];

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Radar Chart - Dimensiuni Reziliență</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="dimension" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar name="Scor" dataKey="value" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribuție pe Dimensiuni</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip />
              <Bar dataKey="score" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
};
