import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Github, Calendar, Shield } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

export const IntellectualPropertyCertificate = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCertificate = () => {
    setIsGenerating(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      let yPosition = margin;

      // Header
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("CERTIFICAT DE DATA", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;
      
      doc.setFontSize(18);
      doc.text("PROPRIETATE INTELECTUALA", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 15;

      // Box
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.rect(margin, yPosition, pageWidth - 2 * margin, 30);
      yPosition += 8;

      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      doc.text("Aplicatie Web: YANA - Your Accountant's New Assistant", margin + 5, yPosition);
      yPosition += 7;
      doc.text("Repository GitHub: https://github.com/velcont/yana-contabila", margin + 5, yPosition);
      yPosition += 7;
      doc.text(`Data generare certificat: ${new Date().toLocaleDateString('ro-RO', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, margin + 5, yPosition);
      yPosition += 15;

      // Section 1: Informatii Generale
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("1. INFORMATII GENERALE", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const generalInfo = [
        "Denumire aplicatie: YANA (Your Accountant's New Assistant)",
        "Descriere: Platforma SaaS pentru analiza financiara si asistenta contabila AI",
        "Tip aplicatie: Web Application (React + TypeScript + Supabase)",
        "Autor: Dezvoltat in platforma Lovable.dev",
        "Status: In dezvoltare activa",
        "Scop: Inregistrare drepturi de autor ORDA Romania"
      ];

      generalInfo.forEach(line => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 5;

      // Section 2: Dovada Timestamp GitHub
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("2. DOVADA TIMESTAMP GITHUB", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Repository: https://github.com/velcont/yana-contabila", margin + 5, yPosition);
      yPosition += 6;
      doc.text("Status: Private Repository", margin + 5, yPosition);
      yPosition += 6;
      doc.text("Total Commits: 494+ (la data generarii)", margin + 5, yPosition);
      yPosition += 6;
      doc.text("Branch principal: main", margin + 5, yPosition);
      yPosition += 6;
      
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.text("Nota: Fiecare commit GitHub contine hash criptografic SHA-256 unic si timestamp", margin + 5, yPosition);
      doc.text("verificabil, reprezentand dovada infalsificabila a datei de creare.", margin + 5, yPosition + 5);
      yPosition += 15;

      // New page
      doc.addPage();
      yPosition = margin;

      // Section 3: Istoric Dezvoltare
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("3. ISTORIC DEZVOLTARE", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const timeline = [
        "Ianuarie 2025: Initiere proiect in platforma Lovable",
        "Februarie 2025: Dezvoltare functionalitati core (analiza financiara AI)",
        "Martie 2025: Implementare sistem CRM contabil",
        "Aprilie 2025: Integrare Stripe pentru subscriptii",
        "Mai 2025: Sistem avansat de chat AI cu context financiar",
        "Iunie 2025: Optimizari si pregatire inregistrare copyright"
      ];

      timeline.forEach(line => {
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // Section 4: Componente Tehnice Principale
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("4. COMPONENTE TEHNICE PRINCIPALE", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const components = [
        "Frontend: React 18.3.1 + TypeScript + Tailwind CSS",
        "Backend: Supabase (PostgreSQL + Edge Functions)",
        "AI Integration: OpenAI GPT-4, Gemini Pro (pentru analiza financiara)",
        "Plati: Stripe (subscriptii si facturare)",
        "Autentificare: Supabase Auth cu RLS policies",
        "Analiza Financiara: Parser propriu pentru balante contabile",
        "Chat AI: Sistem conversational cu memorie contextuala",
        "CRM: Management clienti pentru cabinete contabile",
        "Email: Integrare Resend pentru notificari automatizate",
        "Storage: Supabase Storage pentru documente si atasamente"
      ];

      components.forEach(line => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // Section 5: Functionalitati Unice
      if (yPosition > pageHeight - 50) {
        doc.addPage();
        yPosition = margin;
      }

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("5. FUNCTIONALITATI UNICE SI INOVATIVE", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const features = [
        "1. Parser Inteligent Balante: Algoritm propriu pentru extragerea datelor din PDF/Excel",
        "2. AI Insights Proactive: Detectie automata anomalii (DSO ridicat, EBITDA negativ)",
        "3. Chat Contextual: Conversatii AI cu memorie despre analizele anterioare",
        "4. Multi-Company Management: Gestionare simultan a mai multor societati",
        "5. CRM Contabil: Specific pentru cabinete contabile (task-uri, deadline-uri fiscale)",
        "6. Sistem Subscriptii: Gestiune autonoma abonamente (trial, basic, pro)",
        "7. Portal Client: Acces controlat pentru clientii cabinetelor contabile",
        "8. Email Broadcasting: Campanii email segmentate pentru clienti",
        "9. Analiza Comparativa: Comparare multipla perioade/companii",
        "10. Export PDF Personalizat: Rapoarte branduite cu logo-ul contabilului"
      ];

      features.forEach(line => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // New page for documentation
      doc.addPage();
      yPosition = margin;

      // Section 6: Instructiuni Export Git
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("6. INSTRUCTIUNI OBTINERE DOVEZI SUPLIMENTARE", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("A. Export Istoric Git (Terminal):", margin + 5, yPosition);
      yPosition += 6;

      doc.setFontSize(10);
      doc.setFont("courier", "normal");
      doc.setTextColor(60, 60, 60);
      doc.text("git clone https://github.com/velcont/yana-contabila.git", margin + 5, yPosition);
      yPosition += 5;
      doc.text("cd yana-contabila", margin + 5, yPosition);
      yPosition += 5;
      doc.text("git log --all --pretty=format:\"%H | %an | %ad | %s\" \\", margin + 5, yPosition);
      yPosition += 5;
      doc.text("  --date=iso > git-history-certificate.txt", margin + 5, yPosition);
      yPosition += 10;

      doc.setTextColor(0, 0, 0);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("B. Screenshot-uri Necesare:", margin + 5, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      const screenshots = [
        "1. Pagina repository GitHub (cu numarul total de commits vizibil)",
        "2. Pagina de commits (showing 494+ commits cu timestamps)",
        "3. Interfata Lovable cu istoricul versiunilor",
        "4. Pagina Settings -> General din GitHub (ownership proof)"
      ];

      screenshots.forEach(line => {
        doc.text(line, margin + 8, yPosition);
        yPosition += 6;
      });
      yPosition += 8;

      doc.setFont("helvetica", "bold");
      doc.text("C. GitHub Release (Recomandat):", margin + 5, yPosition);
      yPosition += 6;

      doc.setFont("helvetica", "normal");
      const releaseSteps = [
        "1. Acceseaza: https://github.com/velcont/yana-contabila/releases",
        "2. Click 'Create a new release'",
        "3. Tag: v1.0-copyright-orda",
        "4. Title: Versiune pentru Inregistrare ORDA",
        "5. Description: Data si scop (inregistrare drepturi de autor)",
        "6. Attach: ZIP cu codul sursa (GitHub genereaza automat)"
      ];

      releaseSteps.forEach(line => {
        doc.text(line, margin + 8, yPosition);
        yPosition += 6;
      });
      yPosition += 10;

      // Section 7: Certificare Blockchain (optional)
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("7. CERTIFICARE BLOCKCHAIN (OPTIONALA)", margin, yPosition);
      yPosition += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text("Pentru dovada suplimentara infalsificabila:", margin + 5, yPosition);
      yPosition += 6;
      doc.text("1. Viziteaza: https://opentimestamps.org/", margin + 8, yPosition);
      yPosition += 6;
      doc.text("2. Upload fisierul git-history-certificate.txt", margin + 8, yPosition);
      yPosition += 6;
      doc.text("3. Primesti certificat Bitcoin blockchain (dovada criptografica)", margin + 8, yPosition);
      yPosition += 6;
      doc.text("4. Pastreaza fisierul .ots generat (verificabil la infinit)", margin + 8, yPosition);
      yPosition += 15;

      // Footer/Declaration
      doc.addPage();
      yPosition = margin;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("8. DECLARATIE DE AUTENTICITATE", margin, yPosition);
      yPosition += 10;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const declaration = [
        "Subsemnatul declar ca:",
        "",
        "1. Aplicatia YANA (Your Accountant's New Assistant) este o creatie originala,",
        "   dezvoltata integral in platforma Lovable.dev incepand cu ianuarie 2025.",
        "",
        "2. Codul sursa complet este stocat in repository GitHub privat:",
        "   https://github.com/velcont/yana-contabila",
        "",
        "3. Fiecare commit GitHub contine timestamp criptografic verificabil,",
        "   reprezentand dovada infalsificabila a datei de creare.",
        "",
        "4. Aplicatia integreaza tehnologii open-source si SaaS (React, Supabase,",
        "   OpenAI API), dar logica de business, flow-urile, componentele si",
        "   functionalitatea generala sunt originale si unice.",
        "",
        "5. Acest certificat este generat automat de aplicatie si contine",
        "   timestamp-ul precis al momentului generarii.",
        "",
        "6. Documentele atasate (git log, screenshots GitHub, release-uri)",
        "   servesc ca dovezi suplimentare pentru inregistrarea drepturilor",
        "   de autor la ORDA Romania."
      ];

      declaration.forEach(line => {
        if (yPosition > pageHeight - 30) {
          doc.addPage();
          yPosition = margin;
        }
        doc.text(line, margin + 5, yPosition);
        yPosition += 6;
      });

      yPosition += 15;

      // Signature section
      doc.setFont("helvetica", "bold");
      doc.text("Data: _______________________", margin + 5, yPosition);
      yPosition += 15;
      doc.text("Semnatura: _______________________", margin + 5, yPosition);

      // Footer on every page
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setFont("helvetica", "italic");
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Pagina ${i} din ${totalPages} | Generat: ${new Date().toLocaleString('ro-RO')} | YANA Intellectual Property Certificate`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save
      const fileName = `YANA_Certificat_Proprietate_Intelectuala_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success("Certificat generat cu succes!", {
        description: "PDF-ul a fost descărcat. Include-l în documentația pentru ORDA."
      });
    } catch (error) {
      console.error("Error generating certificate:", error);
      toast.error("Eroare la generarea certificatului");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <CardTitle>Certificat Proprietate Intelectuală</CardTitle>
        </div>
        <CardDescription>
          Generează certificat complet de dată pentru înregistrarea drepturilor de autor la ORDA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <p className="font-medium">Certificat PDF Complet</p>
              <p className="text-muted-foreground text-xs">
                Include toate informațiile necesare pentru ORDA
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Github className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <p className="font-medium">Dovezi GitHub Timestamp</p>
              <p className="text-muted-foreground text-xs">
                Instrucțiuni export git log cu hash-uri criptografice
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 text-primary" />
            <div>
              <p className="font-medium">Istoric Complet Dezvoltare</p>
              <p className="text-muted-foreground text-xs">
                Timeline și componente tehnice detaliate
              </p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button 
            onClick={generateCertificate} 
            disabled={isGenerating}
            className="w-full"
            size="lg"
          >
            <Download className="mr-2 h-5 w-5" />
            {isGenerating ? "Generare..." : "Descarcă Certificat Complet"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
          <p className="font-medium mb-1">📋 Ce include certificatul:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Informații generale aplicație și autor</li>
            <li>Link repository GitHub + statistici commits</li>
            <li>Istoric dezvoltare cronologic</li>
            <li>Lista completă componente tehnice</li>
            <li>Funcționalități unice și inovative</li>
            <li>Instrucțiuni export git log</li>
            <li>Pași pentru GitHub Release</li>
            <li>Opțiuni certificare blockchain</li>
            <li>Declarație de autenticitate</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
