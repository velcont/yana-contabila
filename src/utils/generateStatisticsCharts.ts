import { StatisticsData } from './parseStatisticsExcel';

export interface ChartImage {
  type: 'histogram-somaj' | 'histogram-pib' | 'pie-somaj' | 'timeline';
  title: string;
  base64: string;
}

export const generateStatisticsCharts = async (data: StatisticsData): Promise<ChartImage[]> => {
  const charts: ChartImage[] = [];
  
  // Pentru generarea graficelor, vom crea canvasuri temporare
  // și vom exporta imaginile ca base64
  
  // 1. Histogramă Șomaj (X)
  const histogramSomaj = await generateHistogram(
    data.observations.map(o => o.somaj),
    'Rata șomajului (%)',
    'Distribuția ratei șomajului în România (2009-2024)'
  );
  charts.push({
    type: 'histogram-somaj',
    title: 'Figura 1. Distribuția ratei șomajului în România (2009-2024)',
    base64: histogramSomaj
  });
  
  // 2. Histogramă PIB (Y)
  const histogramPib = await generateHistogram(
    data.observations.map(o => o.pib),
    'PIB trimestrial (miliarde lei)',
    'Distribuția PIB trimestrial în România (2009-2024)'
  );
  charts.push({
    type: 'histogram-pib',
    title: 'Figura 2. Distribuția PIB trimestrial în România (2009-2024)',
    base64: histogramPib
  });
  
  // 3. Grafic cerc - Structură șomaj
  const pieSomaj = await generatePieChart(data.observations.map(o => o.somaj));
  charts.push({
    type: 'pie-somaj',
    title: 'Figura 3. Structura ratei șomajului pe categorii',
    base64: pieSomaj
  });
  
  // 4. Cronogramă - Evoluție simultană
  const timeline = await generateTimeline(data.observations);
  charts.push({
    type: 'timeline',
    title: 'Figura 4. Evoluția simultană șomaj-PIB în România (2009-2024)',
    base64: timeline
  });
  
  return charts;
};

async function generateHistogram(values: number[], xLabel: string, title: string): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 500;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Nu s-a putut crea contextul canvas');
  
  // Background alb
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Calculăm histograma
  const min = Math.min(...values);
  const max = Math.max(...values);
  const binCount = Math.ceil(Math.sqrt(values.length)); // Regula lui Sturges
  const binWidth = (max - min) / binCount;
  
  const bins = Array(binCount).fill(0);
  values.forEach(v => {
    const binIndex = Math.min(Math.floor((v - min) / binWidth), binCount - 1);
    bins[binIndex]++;
  });
  
  const maxBinCount = Math.max(...bins);
  
  // Marje
  const marginLeft = 80;
  const marginRight = 40;
  const marginTop = 80;
  const marginBottom = 80;
  const chartWidth = canvas.width - marginLeft - marginRight;
  const chartHeight = canvas.height - marginTop - marginBottom;
  
  // Desenăm axele
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginLeft, marginTop);
  ctx.lineTo(marginLeft, marginTop + chartHeight);
  ctx.lineTo(marginLeft + chartWidth, marginTop + chartHeight);
  ctx.stroke();
  
  // Desenăm barele
  const barWidth = chartWidth / binCount;
  ctx.fillStyle = '#3b82f6';
  
  bins.forEach((count, i) => {
    const barHeight = (count / maxBinCount) * chartHeight;
    const x = marginLeft + i * barWidth;
    const y = marginTop + chartHeight - barHeight;
    ctx.fillRect(x + 2, y, barWidth - 4, barHeight);
  });
  
  // Labels
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(title, canvas.width / 2, 40);
  
  ctx.font = '12px Arial';
  ctx.fillText(xLabel, canvas.width / 2, canvas.height - 20);
  
  ctx.save();
  ctx.translate(20, canvas.height / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Frecvență', 0, 0);
  ctx.restore();
  
  // Labels pe axe
  ctx.font = '10px Arial';
  ctx.textAlign = 'center';
  for (let i = 0; i <= binCount; i++) {
    const value = min + i * binWidth;
    const x = marginLeft + i * barWidth;
    ctx.fillText(value.toFixed(1), x, marginTop + chartHeight + 20);
  }
  
  return canvas.toDataURL('image/png');
}

async function generatePieChart(somajValues: number[]): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Nu s-a putut crea contextul canvas');
  
  // Background alb
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Categorii
  const scazut = somajValues.filter(v => v < 5).length;
  const mediu = somajValues.filter(v => v >= 5 && v < 7).length;
  const ridicat = somajValues.filter(v => v >= 7).length;
  const total = somajValues.length;
  
  const data = [
    { label: 'Șomaj scăzut (<5%)', count: scazut, color: '#10b981' },
    { label: 'Șomaj mediu (5-7%)', count: mediu, color: '#f59e0b' },
    { label: 'Șomaj ridicat (>7%)', count: ridicat, color: '#ef4444' }
  ];
  
  // Desenăm pie chart
  const centerX = 300;
  const centerY = 300;
  const radius = 150;
  
  let currentAngle = -Math.PI / 2;
  
  data.forEach(item => {
    const sliceAngle = (item.count / total) * 2 * Math.PI;
    
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
    ctx.closePath();
    ctx.fill();
    
    // Border
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    
    currentAngle += sliceAngle;
  });
  
  // Legendă
  let legendY = 150;
  data.forEach(item => {
    ctx.fillStyle = item.color;
    ctx.fillRect(550, legendY, 30, 20);
    
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`${item.label}: ${((item.count / total) * 100).toFixed(1)}%`, 590, legendY + 15);
    
    legendY += 40;
  });
  
  // Titlu
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Structura ratei șomajului pe categorii', canvas.width / 2, 40);
  
  return canvas.toDataURL('image/png');
}

async function generateTimeline(observations: Array<{period: string, somaj: number, pib: number}>): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1000;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Nu s-a putut crea contextul canvas');
  
  // Background alb
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  const marginLeft = 80;
  const marginRight = 100;
  const marginTop = 80;
  const marginBottom = 80;
  const chartWidth = canvas.width - marginLeft - marginRight;
  const chartHeight = canvas.height - marginTop - marginBottom;
  
  // Normalizăm datele pentru a le desena pe același grafic
  const somajValues = observations.map(o => o.somaj);
  const pibValues = observations.map(o => o.pib);
  
  const somajMin = Math.min(...somajValues);
  const somajMax = Math.max(...somajValues);
  const pibMin = Math.min(...pibValues);
  const pibMax = Math.max(...pibValues);
  
  // Axe
  ctx.strokeStyle = '#333333';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(marginLeft, marginTop);
  ctx.lineTo(marginLeft, marginTop + chartHeight);
  ctx.lineTo(marginLeft + chartWidth, marginTop + chartHeight);
  ctx.stroke();
  
  // Linia șomaj (stânga)
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 3;
  ctx.beginPath();
  observations.forEach((obs, i) => {
    const x = marginLeft + (i / (observations.length - 1)) * chartWidth;
    const y = marginTop + chartHeight - ((obs.somaj - somajMin) / (somajMax - somajMin)) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // Linia PIB (dreapta)
  ctx.strokeStyle = '#3b82f6';
  ctx.lineWidth = 3;
  ctx.beginPath();
  observations.forEach((obs, i) => {
    const x = marginLeft + (i / (observations.length - 1)) * chartWidth;
    const y = marginTop + chartHeight - ((obs.pib - pibMin) / (pibMax - pibMin)) * chartHeight;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  
  // Titlu
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 16px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('Evoluția simultană șomaj-PIB în România (2009-2024)', canvas.width / 2, 40);
  
  // Legendă
  ctx.font = '14px Arial';
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(marginLeft + 20, 20, 20, 10);
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'left';
  ctx.fillText('Rata șomajului', marginLeft + 45, 30);
  
  ctx.fillStyle = '#3b82f6';
  ctx.fillRect(marginLeft + 200, 20, 20, 10);
  ctx.fillStyle = '#000000';
  ctx.fillText('PIB', marginLeft + 225, 30);
  
  // Labels axă Y stânga (șomaj)
  ctx.font = '10px Arial';
  ctx.textAlign = 'right';
  ctx.fillStyle = '#ef4444';
  for (let i = 0; i <= 5; i++) {
    const value = somajMin + (somajMax - somajMin) * (i / 5);
    const y = marginTop + chartHeight - (i / 5) * chartHeight;
    ctx.fillText(value.toFixed(1), marginLeft - 10, y + 4);
  }
  
  // Labels axă Y dreapta (PIB)
  ctx.textAlign = 'left';
  ctx.fillStyle = '#3b82f6';
  for (let i = 0; i <= 5; i++) {
    const value = pibMin + (pibMax - pibMin) * (i / 5);
    const y = marginTop + chartHeight - (i / 5) * chartHeight;
    ctx.fillText(value.toFixed(0), marginLeft + chartWidth + 10, y + 4);
  }
  
  // Labels axă X (perioade - doar câteva)
  ctx.fillStyle = '#000000';
  ctx.textAlign = 'center';
  ctx.font = '9px Arial';
  const step = Math.floor(observations.length / 8);
  observations.forEach((obs, i) => {
    if (i % step === 0 || i === observations.length - 1) {
      const x = marginLeft + (i / (observations.length - 1)) * chartWidth;
      ctx.fillText(obs.period, x, marginTop + chartHeight + 20);
    }
  });
  
  return canvas.toDataURL('image/png');
}
