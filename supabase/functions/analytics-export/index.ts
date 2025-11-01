import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExportData {
  format: 'csv' | 'pdf';
  stats: any;
  featureUsage: any[];
  dailyActivity: any[];
}

function generateCSV(data: ExportData): string {
  const lines: string[] = [];
  
  // Header
  lines.push('YANA Analytics Report');
  lines.push(`Generated: ${new Date().toLocaleString('ro-RO')}`);
  lines.push('');
  
  // Overview Stats
  lines.push('OVERVIEW STATISTICS');
  lines.push('Metric,Value');
  lines.push(`Total Users,${data.stats.totalUsers}`);
  lines.push(`Active Users (30d),${data.stats.activeUsers}`);
  lines.push(`New Users This Month,${data.stats.newUsersThisMonth}`);
  lines.push(`Engagement Rate,${((data.stats.activeUsers / data.stats.totalUsers) * 100).toFixed(2)}%`);
  lines.push('');
  
  // Feature Usage
  lines.push('TOP FEATURES');
  lines.push('Feature,Count,Percentage');
  data.featureUsage.forEach((feature: any) => {
    lines.push(`${feature.feature},${feature.count},${feature.percentage.toFixed(2)}%`);
  });
  lines.push('');
  
  // Daily Activity
  lines.push('DAILY ACTIVITY (Last 14 Days)');
  lines.push('Date,Users,Events');
  data.dailyActivity.forEach((day: any) => {
    lines.push(`${day.date},${day.users},${day.events}`);
  });
  
  return lines.join('\n');
}

function generatePDF(data: ExportData): string {
  // Simplified PDF generation using HTML-like structure
  // In production, use a proper PDF library like pdfmake
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>YANA Analytics Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; }
    h1 { color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background-color: #f8f9fa; font-weight: bold; }
    .metric { display: inline-block; margin: 10px 20px 10px 0; }
    .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
    .metric-label { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <h1>📊 YANA Analytics Report</h1>
  <p><strong>Generated:</strong> ${new Date().toLocaleString('ro-RO')}</p>
  
  <h2>Overview Statistics</h2>
  <div>
    <div class="metric">
      <div class="metric-value">${data.stats.totalUsers}</div>
      <div class="metric-label">Total Users</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.stats.activeUsers}</div>
      <div class="metric-label">Active Users (30d)</div>
    </div>
    <div class="metric">
      <div class="metric-value">${data.stats.newUsersThisMonth}</div>
      <div class="metric-label">New Users This Month</div>
    </div>
    <div class="metric">
      <div class="metric-value">${((data.stats.activeUsers / data.stats.totalUsers) * 100).toFixed(1)}%</div>
      <div class="metric-label">Engagement Rate</div>
    </div>
  </div>
  
  <h2>Top Features (Last 30 Days)</h2>
  <table>
    <thead>
      <tr>
        <th>Feature</th>
        <th>Count</th>
        <th>Percentage</th>
      </tr>
    </thead>
    <tbody>
      ${data.featureUsage.map((f: any) => `
        <tr>
          <td>${f.feature}</td>
          <td>${f.count}</td>
          <td>${f.percentage.toFixed(2)}%</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <h2>Daily Activity (Last 14 Days)</h2>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Active Users</th>
        <th>Total Events</th>
      </tr>
    </thead>
    <tbody>
      ${data.dailyActivity.map((d: any) => `
        <tr>
          <td>${d.date}</td>
          <td>${d.users}</td>
          <td>${d.events}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999;">
    <p>YANA - Your AI Financial Advisor • Generated with Lovable Cloud</p>
  </div>
</body>
</html>
  `;
  
  return html;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Check if user is admin
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!userRole || userRole.role !== 'admin') {
      throw new Error('Admin access required');
    }

    // Parse request body
    const { format, stats, featureUsage, dailyActivity }: ExportData = await req.json();

    let content: string;
    let contentType: string;

    if (format === 'csv') {
      content = generateCSV({ format, stats, featureUsage, dailyActivity });
      contentType = 'text/csv';
    } else if (format === 'pdf') {
      content = generatePDF({ format, stats, featureUsage, dailyActivity });
      contentType = 'text/html'; // For simplicity, returning HTML. Use PDF library for production
    } else {
      throw new Error('Invalid format');
    }

    return new Response(content, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="analytics-${new Date().toISOString().split('T')[0]}.${format}"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Export failed' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
