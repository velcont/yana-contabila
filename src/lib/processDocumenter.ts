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
