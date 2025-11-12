import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

console.log("🧪 [REGRESSION TEST] Testare validări pe analizele existente...\n");

// Fetch toate analizele
const { data: analyses, error } = await supabase
  .from('analyses')
  .select('id, file_name, metadata, analysis_text')
  .order('created_at', { ascending: false });

if (error) {
  console.error("❌ Eroare fetch analize:", error);
  Deno.exit(1);
}

console.log(`✅ Găsite ${analyses.length} analize\n`);

let testsPass = 0;
let testsFail = 0;
const failures: any[] = [];

for (const analysis of analyses) {
  // Test 1: Metadata există?
  if (!analysis.metadata) {
    testsFail++;
    failures.push({
      id: analysis.id,
      file: analysis.file_name,
      reason: "Lipsă metadata"
    });
    continue;
  }
  
  // Test 2: Are indicatori critici?
  const requiredFields = ['revenue', 'expenses', 'profit'];
  const missingFields = requiredFields.filter(f => !(f in analysis.metadata));
  
  if (missingFields.length > 0) {
    testsFail++;
    failures.push({
      id: analysis.id,
      file: analysis.file_name,
      reason: `Lipsă indicatori: ${missingFields.join(', ')}`
    });
    continue;
  }
  
  // Test 3: Anomalii excessive? (mai mult de 30 = posibilă problemă extracție)
  if (analysis.metadata.anomalies && analysis.metadata.anomalies.length > 30) {
    console.warn(`⚠️ ${analysis.file_name}: ${analysis.metadata.anomalies.length} anomalii`);
  }
  
  testsPass++;
}

console.log("\n" + "=".repeat(60));
console.log(`📊 REZULTATE TESTARE:`);
console.log(`✅ PASS: ${testsPass} analize (${((testsPass/analyses.length)*100).toFixed(1)}%)`);
console.log(`❌ FAIL: ${testsFail} analize (${((testsFail/analyses.length)*100).toFixed(1)}%)`);

if (failures.length > 0) {
  console.log("\n🔴 Analize cu probleme:");
  failures.slice(0, 10).forEach(f => {
    console.log(`- ${f.file}: ${f.reason}`);
  });
  if (failures.length > 10) {
    console.log(`... și încă ${failures.length - 10} analize`);
  }
}

// Exit code pentru CI/CD
Deno.exit(testsFail > (analyses.length * 0.1) ? 1 : 0); // Tolerăm max 10% eșecuri
