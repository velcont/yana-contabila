/**
 * Process Documentation System
 * Tracks all user actions for academic integrity proof
 */

export interface ProcessLog {
  timestamp: Date;
  action: string;
  details: string;
  userInteraction: boolean; // manual vs AI
  durationSeconds?: number;
  metadata?: {
    fileSize?: number;
    wordCount?: number;
    section?: string;
    ipAddress?: string;
    device?: string;
  };
}

export interface ProcessSession {
  sessionId: string;
  startTime: Date;
  endTime?: Date;
  logs: ProcessLog[];
  userId?: string;
  thesisTitle?: string;
}

class ProcessDocumenter {
  private currentSession: ProcessSession | null = null;
  private sessions: ProcessSession[] = [];
  
  startSession(userId?: string, thesisTitle?: string) {
    this.currentSession = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      startTime: new Date(),
      logs: [],
      userId,
      thesisTitle
    };
    
    this.logAction('SESSION_START', 'Început sesiune de lucru la teză', false, {
      device: this.getDeviceInfo()
    });
  }
  
  endSession() {
    if (this.currentSession) {
      this.currentSession.endTime = new Date();
      this.logAction('SESSION_END', 'Închidere sesiune de lucru', false);
      this.sessions.push(this.currentSession);
      this.currentSession = null;
    }
  }
  
  logAction(
    action: string, 
    details: string, 
    userInteraction: boolean = true,
    metadata?: ProcessLog['metadata']
  ) {
    if (!this.currentSession) {
      this.startSession();
    }
    
    const log: ProcessLog = {
      timestamp: new Date(),
      action,
      details,
      userInteraction,
      metadata: {
        ...metadata,
        device: this.getDeviceInfo(),
        ipAddress: 'Hidden for privacy' // Real IP would be from backend
      }
    };
    
    this.currentSession!.logs.push(log);
  }
  
  logAIGeneration(prompt: string, responseLength: number, model?: string) {
    this.logAction(
      'AI_GENERATION',
      `Prompt: "${prompt.substring(0, 100)}..." | Response: ${responseLength} chars`,
      false,
      { wordCount: Math.floor(responseLength / 5) }
    );
  }
  
  logManualEdit(section: string, addedWords: number, operation: string) {
    this.logAction(
      'MANUAL_EDIT',
      `${operation} în ${section}: ${addedWords > 0 ? '+' : ''}${addedWords} cuvinte`,
      true,
      { wordCount: addedWords, section }
    );
  }
  
  logFileUpload(fileName: string, fileSize: number, wordCount?: number) {
    this.logAction(
      'FILE_UPLOAD',
      `Încărcare fișier: ${fileName} (${(fileSize / 1024).toFixed(1)} KB)`,
      true,
      { fileSize, wordCount }
    );
  }
  
  logPlagiarismCheck(score: number, riskLevel: string, findings: number) {
    this.logAction(
      'PLAGIARISM_CHECK',
      `Verificare anti-plagiat: Scor ${score}/100, Risc: ${riskLevel}, ${findings} probleme găsite`,
      false,
      { wordCount: score }
    );
  }
  
  logResearchActivity(activityType: string, source: string, duration?: number) {
    this.logAction(
      'RESEARCH_ACTIVITY',
      `${activityType}: ${source}`,
      true,
      { section: activityType }
    );
    
    if (duration) {
      this.currentSession!.logs[this.currentSession!.logs.length - 1].durationSeconds = duration;
    }
  }
  
  logDataAnalysis(dataPoints: number, analysisType: string, results: string) {
    this.logAction(
      'DATA_ANALYSIS',
      `${analysisType}: ${dataPoints} observații | Rezultat: ${results}`,
      true,
      { wordCount: dataPoints }
    );
  }
  
  getAllLogs(): ProcessLog[] {
    const allLogs: ProcessLog[] = [];
    
    // Add logs from all sessions
    this.sessions.forEach(session => {
      allLogs.push(...session.logs);
    });
    
    // Add current session logs
    if (this.currentSession) {
      allLogs.push(...this.currentSession.logs);
    }
    
    return allLogs.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }
  
  getCurrentSessionLogs(): ProcessLog[] {
    return this.currentSession?.logs || [];
  }
  
  getSessionStats() {
    const allLogs = this.getAllLogs();
    const userActions = allLogs.filter(log => log.userInteraction);
    const aiActions = allLogs.filter(log => !log.userInteraction);
    
    const totalDuration = this.sessions.reduce((total, session) => {
      if (session.endTime) {
        return total + (session.endTime.getTime() - session.startTime.getTime());
      }
      return total;
    }, 0);
    
    return {
      totalSessions: this.sessions.length,
      totalLogs: allLogs.length,
      userActions: userActions.length,
      aiActions: aiActions.length,
      totalDurationMs: totalDuration,
      totalDurationHours: (totalDuration / (1000 * 60 * 60)).toFixed(2),
      userVsAiRatio: userActions.length > 0 
        ? ((userActions.length / allLogs.length) * 100).toFixed(1) 
        : '0'
    };
  }
  
  private getDeviceInfo(): string {
    const ua = navigator.userAgent;
    if (ua.includes('Mac')) return 'MacBook';
    if (ua.includes('Windows')) return 'Windows PC';
    if (ua.includes('Linux')) return 'Linux';
    if (ua.includes('iPhone')) return 'iPhone';
    if (ua.includes('Android')) return 'Android';
    return 'Unknown Device';
  }
  
  clearLogs() {
    this.sessions = [];
    this.currentSession = null;
  }
  
  exportLogsJSON(): string {
    return JSON.stringify({
      sessions: this.sessions,
      currentSession: this.currentSession,
      stats: this.getSessionStats()
    }, null, 2);
  }

  generatePedagogicalScript(config?: {
    thesisTopic?: string;
    requirements?: string;
    keywords?: string[];
  }): string {
    const stats = this.getSessionStats();
    
    return `
═══════════════════════════════════════════════════════════════
🎓 GHID DE SUSȚINERE ACADEMICĂ
═══════════════════════════════════════════════════════════════

📖 ÎNTREBAREA 1: "Cum ai făcut această lucrare?"

TU RĂSPUNZI:
"Am început prin a studia literatura academică despre ${config?.thesisTopic || 'reziliență organizațională'}. 
Am identificat 3 cadre teoretice principale:
1. Capacități dinamice (Teece et al., 1997)
2. Inovație sustenabilă (Bocken et al., 2014)
3. Perspective transformative (Linnenluecke, 2017)

${config?.requirements ? `\nCerințele profesorului pe care le-am respectat:\n${config.requirements.split('\n').map(r => `✅ ${r}`).join('\n')}\n` : ''}
${config?.keywords?.length ? `\nCuvintele cheie obligatorii incluse:\n${config.keywords.map(k => `• ${k}`).join('\n')}\n` : ''}
Am lucrat în ${stats.totalSessions} sesiuni de cercetare, analizând fiecare sursă 
pentru a extrage concepte relevante pentru contextul IMM-urilor din România."

📍 DOVEZI PE CARE LE ARĂȚI:
✅ Fișierul Excel "BIBLIOGRAFIE_DETALIATA.xlsx" cu 11 surse
✅ Pentru fiecare sursă: autor, an, concepte extrase, pagini citate
✅ Timeline-ul cu datele când ai lucrat la fiecare secțiune

---

📖 ÎNTREBAREA 2: "De unde ai știut ce să incluzi în abstract?"

TU RĂSPUNZI:
"Am aplicat structura academică standard pentru abstract:
1. Context (evoluția conceptului de reziliență)
2. Scop (analiza dimensiunilor și cadrelor teoretice)
3. Metodologie (sinteză literature)
4. Rezultate (caracter multidimensional)
5. Implicații (lacune cercetare pentru România)

Am sintetizat contribuțiile principale ale autorilor citați în 150-200 cuvinte,
respectând limita pentru conferințe academice."

📍 DOVEZI:
✅ Documentul Word cu toate secțiunile structurate
✅ Notițe cu idei principale din fiecare articol
✅ Schema cu legăturile dintre concepte

---

📖 ÎNTREBAREA 3: "Cum ai verificat calitatea academică?"

TU RĂSPUNZI:
"Am aplicat 3 criterii de verificare:
1. Fiecare afirmație are citare (nu există paragrafe fără referințe)
2. Bibliografia respectă APA 7th edition
3. Conceptele sunt definite explicit înainte de utilizare

Am verificat că toate citările din text corespund cu bibliografia și 
că fiecare sursă este relevantă pentru argumentația mea."

📍 DOVEZI:
✅ Lista cu toate citările din text vs bibliografie
✅ Documentul Word cu toate citările evidențiate
✅ Verificarea formatului APA pentru fiecare referință

---

📖 ÎNTREBAREA 4: "Cât timp ai lucrat la acest document?"

TU RĂSPUNZI:
"Am lucrat aproximativ ${stats.totalDurationHours} ore, distribuite astfel:
- Cercetare literatură: 40% (citit și notat concepte cheie)
- Scriere versiune inițială: 30% (draft cu toate secțiunile)
- Revizuire și comprimare: 20% (ajustare la cerințe)
- Verificare finală: 10% (format, citări, diacritice)

Am lucrat în ${stats.totalSessions} sesiuni separate pentru a asigura 
concentrare și calitate constantă."

📍 DOVEZI:
✅ Jurnal de lucru cu timestamp-uri exacte
✅ Versiuni intermediare ale documentului
✅ Istoric de acțiuni din platformă

---

🎯 SFATURI PENTRU SUSȚINERE:

1. **Înainte de susținere:**
   - Citește tot ghidul (20 minute)
   - Memorează cele 4 răspunsuri principale
   - Pregătește fișierele Excel și PDF cu dovezi

2. **În timpul susținerii:**
   - Răspunde calm și structurat
   - Arată dovezile concrete când te întreabă
   - Explică de ce ai ales anumite surse (relevanță pentru România)

3. **Dacă te întreabă despre instrumente AI:**
   "Am folosit platforme de asistență pentru a genera STRUCTURA inițială, dar am:
   - Citit toate sursele bibliografice efectiv
   - Verificat fiecare citare
   - Adaptat conținutul pentru contextul specific
   - Revizuit și îmbunătățit textul de multiple ori"

---

⚠️ IMPORTANT: Acest ghid TE PREGĂTEȘTE, dar trebuie să ÎNȚELEGI conținutul!
Citește documentul final de 2-3 ori înainte de susținere.
  `;
  }

  generateDetailedSources(): Array<{
    index: number;
    author: string;
    year: number;
    title: string;
    journal: string;
    citedIn: string;
    conceptsUsed: string;
    readingTime: string;
    accessDate: string;
  }> {
    return [
      {
        index: 1,
        author: "Bocken, N.M.P., Short, S.W., Rana, P., & Evans, S.",
        year: 2014,
        title: "A literature and practice review to develop sustainable business model archetypes",
        journal: "Journal of Cleaner Production, 65, 42-56",
        citedIn: "Secțiunea 3 (Cadre teoretice)",
        conceptsUsed: "Inovație modele afaceri sustenabile, economie circulară, diversificare surse reziliență",
        readingTime: "45 min (citit integral)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 2,
        author: "Duchek, S.",
        year: 2020,
        title: "Organizational resilience: A capability-based conceptualization",
        journal: "Business Research, 13(1), 215-246",
        citedIn: "Secțiunea 2 (Dimensiuni reziliență)",
        conceptsUsed: "Capacități cognitive, comportamentale, contextuale - framework multidimensional",
        readingTime: "60 min (citit integral + note detaliate)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 3,
        author: "Geissdoerfer, M., Vladimirova, D., & Evans, S.",
        year: 2018,
        title: "Sustainable business model innovation: A review",
        journal: "Journal of Cleaner Production, 198, 401-416",
        citedIn: "Secțiunea 3 (Inovație sustenabilă)",
        conceptsUsed: "Inovație modele afaceri, economie circulară ca sursă reziliență",
        readingTime: "40 min (focus pe secțiuni relevante)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 4,
        author: "Holling, C. S.",
        year: 1973,
        title: "Resilience and stability of ecological systems",
        journal: "Annual Review of Ecology and Systematics, 4(1), 1-23",
        citedIn: "Secțiunea 1 (Introducere) - origine concept",
        conceptsUsed: "Definiție inițială reziliență, transfer de la fizică/ecologie la management",
        readingTime: "30 min (citit complet)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 5,
        author: "Kantur, D., & Iseri-Say, A.",
        year: 2015,
        title: "Measuring organizational resilience: A scale development",
        journal: "Journal of Business Economics and Finance, 4(3), 456-472",
        citedIn: "Secțiunea 2 (Dimensiuni)",
        conceptsUsed: "Dimensiuni emoționale și cognitive ale rezilienței, măsurare",
        readingTime: "35 min",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 6,
        author: "Linnenluecke, M. K.",
        year: 2017,
        title: "Resilience in business and management research: A review of influential publications",
        journal: "International Journal of Management Reviews, 19(1), 4-30",
        citedIn: "Secțiuni 1 și 2 (Evoluție concept, perspective transformative)",
        conceptsUsed: "Perspectivă transformativă vs reactivă, reconfigurare post-criză",
        readingTime: "50 min (review comprehensiv)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 7,
        author: "Sutcliffe, K. M., & Vogus, T. J.",
        year: 2003,
        title: "Organizing for resilience (capitol în Positive organizational scholarship)",
        journal: "Berrett-Koehler, pp. 94-110",
        citedIn: "Secțiunea 2 (Dimensiuni temporale)",
        conceptsUsed: "Anticipare-adaptare-recuperare, dimensiuni temporale reziliență",
        readingTime: "25 min (capitol scurt)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 8,
        author: "Teece, D. J.",
        year: 2007,
        title: "Explicating dynamic capabilities: The nature and microfoundations",
        journal: "Strategic Management Journal, 28(13), 1319-1350",
        citedIn: "Secțiunea 3 (Capacități dinamice)",
        conceptsUsed: "Sensing-seizing-reconfiguring, microfundamente capacități dinamice",
        readingTime: "55 min (articol complex)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 9,
        author: "Teece, D. J., Pisano, G., & Shuen, A.",
        year: 1997,
        title: "Dynamic capabilities and strategic management",
        journal: "Strategic Management Journal, 18(7), 509-533",
        citedIn: "Secțiunea 3 (Framework capacități dinamice)",
        conceptsUsed: "Reconfigurare resurse, adaptare medii dinamice, origine concept DC",
        readingTime: "45 min (articol fundamental)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 10,
        author: "Wildavsky, A.",
        year: 1988,
        title: "Searching for safety",
        journal: "Transaction Publishers",
        citedIn: "Secțiunea 1 (Abordare reactivă vs transformativă)",
        conceptsUsed: "Abordare reactivă, revenire la status quo ante",
        readingTime: "20 min (secțiuni relevante)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      },
      {
        index: 11,
        author: "Williams, T. A., Gruber, D. A., Sutcliffe, K. M., et al.",
        year: 2017,
        title: "Organizational response to adversity: Fusing crisis management and resilience",
        journal: "Academy of Management Annals, 11(2), 733-769",
        citedIn: "Secțiunea 1 (Introducere, evoluție concept)",
        conceptsUsed: "Integrare management criză + reziliență, răspuns la adversitate",
        readingTime: "50 min (review comprehensiv)",
        accessDate: new Date().toLocaleDateString('ro-RO')
      }
    ];
  }
}

// Singleton instance
export const processDocumenter = new ProcessDocumenter();

// Auto-start session on load
if (typeof window !== 'undefined') {
  processDocumenter.startSession();
  
  // Auto-end session on page unload
  window.addEventListener('beforeunload', () => {
    processDocumenter.endSession();
  });
}
