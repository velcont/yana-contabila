import { useUserRole } from './useUserRole';

export interface TutorialStep {
  page: string;
  title: string;
  description: string;
  highlight?: string;
  action?: string;
}

export const useTutorialSteps = () => {
  const { isAdmin } = useUserRole();

  const userSteps: TutorialStep[] = [
    {
      page: '/app',
      title: 'Bine ai venit la Yana!',
      description: 'Noua interfață simplificată cu 3 carduri principale pentru gestionarea afacerii tale.',
    },
    {
      page: '/app',
      title: '📊 Card Analiză Balanței',
      description: 'Aici accesezi Chat AI pentru întrebări despre balanță și Dashboard-ul complet cu grafice și rapoarte.',
      highlight: '[data-tour="card-analiza-balanta"]',
    },
    {
      page: '/app',
      title: '🧠 YANA - Partenerul Tău Strategic',
      description: 'Consultanță financiară, fiscală și strategică AI. Accesează toate funcționalitățile YANA dintr-un singur loc.',
      highlight: '[data-tour="card-yana"]',
    },
    {
      page: '/app',
      title: '💼 Card Marketplace',
      description: 'Găsește contabilul perfect pentru firma ta și primește oferte personalizate.',
      highlight: '[data-tour="card-marketplace"]',
    },
    {
      page: '/app?view=analiza-balanta',
      title: 'Încarcă Balanța în Chat AI',
      description: 'Click pe butonul cu agrafa din Chat AI pentru a încărca balanța Excel și a primi analiza instantanee.',
      highlight: '[data-tour="chat-upload-button"]',
    },
    {
      page: '/app',
      title: 'Dashboard cu Grafice',
      description: 'Aici găsești istoricul analizelor tale, grafice interactive și indicatori financiari. Vei vedea evoluția în timp a firmei tale.',
      highlight: '[data-tour="dashboard-button"]',
    },
    {
      page: '/app',
      title: 'Conversații Vocale',
      description: 'Poți vorbi cu Yana folosind vocea! Activează microfonul și discută natural despre situația financiară.',
      highlight: '[data-tour="voice-button"]',
    },
    {
      page: '/app',
      title: 'Istoric Conversații',
      description: 'Toate conversațiile tale cu Yana sunt salvate aici. Poți reveni oricând la discuțiile anterioare.',
      highlight: '[data-tour="history-button"]',
    },
    {
      page: '/app',
      title: 'Grafice Interactive',
      description: 'Vizualizează evoluția indicatorilor financiari în timp: profit, lichiditate, solvabilitate și mai mult.',
      highlight: '[data-tour="tab-analytics"]',
    },
    {
      page: '/app',
      title: 'Alerte Proactive',
      description: 'Primești notificări automate pentru probleme financiare critice și oportunități de îmbunătățire.',
      highlight: '[data-tour="tab-alerts"]',
    },
    {
      page: '/app',
      title: 'Predicții AI',
      description: 'AI-ul Yana prezice evoluția viitoare bazată pe datele istorice și tendințele identificate.',
      highlight: '[data-tour="tab-predictions"]',
    },
    {
      page: '/app',
      title: 'Analiză Reziliență',
      description: 'Evaluează capacitatea firmei de a rezista în fața crizelor și șocurilor economice.',
      highlight: '[data-tour="tab-resilience"]',
    },
    {
      page: '/app',
      title: 'Comparație Multi-Firmă',
      description: 'Compară performanța financiară între mai multe firme pentru a identifica cele mai bune practici.',
      highlight: '[data-tour="tab-multi-company"]',
    },
    {
      page: '/app',
      title: 'Știri Fiscale',
      description: 'Rămâi la curent cu ultimele modificări legislative și fiscale relevante pentru afacerea ta.',
      highlight: '[data-tour="tab-news"]',
    },
    {
      page: '/app',
      title: 'Dosarul Meu',
      description: 'Istoricul complet al tuturor analizelor tale cu opțiuni de export, partajare și ștergere.',
      highlight: '[data-tour="tab-history"]',
    },
    // YanaCRM - Introducere (8 pași)
    {
      page: '/yanacrm',
      title: '🎯 Bine ai venit la YanaCRM!',
      description: 'YanaCRM este centrul tău de comandă pentru gestionarea eficientă a tuturor clienților contabili. Hai să explorăm împreună!',
      highlight: '[data-tour="yanacrm-header"]',
    },
    {
      page: '/yanacrm',
      title: '📊 Vizualizare Clienți Rapid',
      description: 'Aici vezi toți clienții tăi cu informații în timp real: CUI, regim TVA, ultimele analize. Un singur click te duce la detalii complete.',
      highlight: '[data-tour="clients-table"]',
    },
    {
      page: '/yanacrm',
      title: '➕ Adaugă Clienți Instant',
      description: 'Ai 3 modalități: Invită client (primesc email automat), Adaugă manual (cu CUI și date fiscale), Import CSV (pentru migrare masivă).',
      highlight: '[data-tour="add-client-buttons"]',
    },
    {
      page: '/yanacrm',
      title: '🔍 Filtrare Inteligentă',
      description: 'Filtrează clienții după regim TVA, TVA la încasare, sau tip impozitare. Perfect pentru trimiterea de alerte specifice!',
      highlight: '[data-tour="fiscal-filters"]',
    },
    {
      page: '/yanacrm',
      title: '🛡️ Verificare Due Diligence',
      description: 'Verifică automat reputația oricărui client: validare ANAF, căutare probleme legale, rating risc. Protejează-ți firma!',
      highlight: '[data-tour="due-diligence-tab"]',
      action: 'click-due-diligence-tab',
    },
    {
      page: '/yanacrm',
      title: '📅 Termene Fiscale',
      description: 'Gestionează termenele pentru TOȚI clienții: TVA, CAS, CASS, declarații profit. Alertele automate te salvează de amenzi.',
      highlight: '[data-tour="deadlines-tab"]',
      action: 'click-deadlines-tab',
    },
    {
      page: '/yanacrm',
      title: '📧 Email Marketing Integrat',
      description: 'Trimite newsletter cu modificări legislative, oferte speciale, sau rapoarte lunare. Template-uri salvate pentru viteză.',
      highlight: '[data-tour="email-tab"]',
      action: 'click-email-tab',
    },
    {
      page: '/yanacrm',
      title: '💬 Mesagerie Client',
      description: 'Comunică direct cu clienții din platformă. Conversațiile sunt salvate și pot fi căutate oricând.',
      highlight: '[data-tour="messaging-tab"]',
      action: 'click-messaging-tab',
    },
    // Dosare Lunare - Setup Inițial (5 pași)
    {
      page: '/yanacrm',
      title: '📂 Dosare Lunare - Ce Sunt?',
      description: 'Dosarele Lunare automatizează procesul tău lunar pentru fiecare client: de la primirea documentelor până la depunerea declarațiilor. Totul urmărit în timp real!',
      highlight: '[data-tour="workflows-tab"]',
      action: 'click-workflows-tab',
    },
    {
      page: '/yanacrm',
      title: '🔧 Pasul 1: Creează Șablon Default',
      description: 'Înainte de a crea dosare, ai nevoie de un ȘABLON cu etapele tale standard. Click pe "Șabloane" pentru a crea procesul tău.',
      highlight: '[data-tour="templates-subtab"]',
      action: 'click-templates-subtab',
    },
    {
      page: '/yanacrm',
      title: '⭐ Șablon Standard cu 5 Etape',
      description: 'Sistemul îți propune un șablon default: (1) Primire Documente, (2) Introducere Acte, (3) Salarizare, (4) Verificare Balanță, (5) Declarații. Click "Creează Șablon Default".',
      highlight: '[data-tour="create-default-template-btn"]',
    },
    {
      page: '/yanacrm',
      title: '✏️ Personalizează Șablonul',
      description: 'Pentru fiecare etapă poți seta: Zile estimate (ex: 2 zile), Rol responsabil (Recepționist, Contabil Junior, HR, Senior, Declarații). Salvează când ești gata.',
      highlight: '[data-tour="template-stages"]',
    },
    {
      page: '/yanacrm',
      title: '👥 Pasul 2: Adaugă Echipa',
      description: 'Click pe "Echipa Client" pentru a adăuga membrii echipei tale. Fiecare membru are un rol (ex: Ana = Contabil Junior, Maria = Contabil HR).',
      highlight: '[data-tour="team-subtab"]',
      action: 'click-team-subtab',
    },
    // Dosare Lunare - Utilizare Avansată (12 pași)
    {
      page: '/yanacrm',
      title: '🎬 Creare Workflow pentru Client',
      description: 'Selectează un client din dropdown, apoi alege luna (ex: Ianuarie 2025). Click "Creează Workflow" și șablonul tău devine un dosar activ!',
      highlight: '[data-tour="company-selector"]',
    },
    {
      page: '/yanacrm',
      title: '📊 Vizualizare Calendar Lunar',
      description: 'Vezi toate dosarele lunare într-o vedere calendar. Filtrează după status: Nu început, În lucru, Finalizat, În întârziere.',
      highlight: '[data-tour="workflow-calendar"]',
    },
    {
      page: '/yanacrm',
      title: '🔄 Statusuri Workflow',
      description: 'Fiecare workflow are status color-coded: 🟢 Finalizat (verde), 🔵 În lucru (albastru), 🔴 În întârziere (roșu), ⚪ Nu început (gri).',
      highlight: '[data-tour="workflow-status-badges"]',
    },
    {
      page: '/yanacrm',
      title: '📝 Etapele Workflow-ului',
      description: 'Fiecare dosar are 5 etape (din șablon). Pentru fiecare etapă vezi: Nume (ex: "Introducere Acte"), Zile estimate (ex: 3 zile), Status actual (emoji icon).',
      highlight: '[data-tour="workflow-stages"]',
    },
    {
      page: '/yanacrm',
      title: '▶️ Start Etapă',
      description: 'Click "▶️ Start" pe o etapă pentru a începe lucrul. Statusul devine "🔄 În lucru" și se salvează data de început.',
      highlight: '[data-tour="stage-start-btn"]',
    },
    {
      page: '/yanacrm',
      title: '✅ Finalizare Etapă',
      description: 'Când termini, click "✅ Finalizează". Se salvează data finalizării și progresul total crește automat (ex: 20% → 40%).',
      highlight: '[data-tour="stage-complete-btn"]',
    },
    {
      page: '/yanacrm',
      title: '👤 Asignare Responsabil',
      description: 'Click "Editează Workflow" pentru a asigna fiecare etapă unui membru din echipă. Ex: Etapa 2 = Ana Popescu (Contabil Junior).',
      highlight: '[data-tour="edit-workflow-btn"]',
    },
    {
      page: '/yanacrm',
      title: '📈 Urmărire Progres',
      description: 'Progresul este calculat automat: 5 etape × 20% fiecare = 100%. Vezi în timp real: "Progres: 60% (3/5 etape completate)".',
      highlight: '[data-tour="workflow-progress"]',
    },
    {
      page: '/yanacrm',
      title: '⚠️ Alerte Întârzieri',
      description: 'Dacă o etapă depășește zilele estimate, workflow-ul devine "🔴 În întârziere". Primești notificare automată pe email.',
      highlight: '[data-tour="overdue-badge"]',
    },
    {
      page: '/yanacrm',
      title: '🔁 Workflow-uri Recurente',
      description: 'La începutul fiecărei luni noi, creezi automat un workflow nou pentru fiecare client activ. Procesul se repetă lunar.',
      highlight: '[data-tour="monthly-creation"]',
    },
    {
      page: '/yanacrm',
      title: '📊 Rapoarte Echipă',
      description: 'Vezi cât de încărcată este echipa: Ana (5 dosare în lucru), Maria (3 dosare). Distribuie sarcinile echitabil.',
      highlight: '[data-tour="team-workload"]',
    },
    {
      page: '/yanacrm',
      title: '🎯 Gata! Ești Expert YanaCRM',
      description: 'Acum stăpânești toate funcțiile YanaCRM: gestionare clienți, workflow-uri lunare, echipă și email marketing. Mult succes!',
    },
  ];

  const adminSteps: TutorialStep[] = [...userSteps];

  return {
    steps: isAdmin ? adminSteps : userSteps,
    isAdmin,
  };
};
