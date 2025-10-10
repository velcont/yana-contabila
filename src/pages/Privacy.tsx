import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const Privacy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Înapoi
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Politică de Confidențialitate</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Introducere</h2>
            <p>
              Suciu Gyorfi Nicolae ("noi", "nostru" sau "compania") operează platforma YANA 
              (yana-contabila.velcont.com). Această Politică de Confidențialitate 
              explică modul în care colectăm, utilizăm, dezvăluim și protejăm 
              informațiile dumneavoastră personale în conformitate cu Regulamentul 
              General privind Protecția Datelor (GDPR) și legislația română.
            </p>

            <h2>2. Operator de Date</h2>
            <p>
              <strong>Operator de date:</strong> Suciu Gyorfi Nicolae<br />
              <strong>Adresă:</strong> România<br />
              <strong>Email contact DPO:</strong> office@velcont.com
            </p>

            <h2>3. Ce Date Colectăm</h2>
            
            <h3>3.1 Date de Identificare</h3>
            <ul>
              <li><strong>Email:</strong> Pentru autentificare și comunicare</li>
              <li><strong>Nume complet:</strong> Pentru personalizare (opțional)</li>
              <li><strong>Parolă:</strong> Stocată criptată (hash)</li>
            </ul>

            <h3>3.2 Date Despre Companie</h3>
            <ul>
              <li><strong>CUI:</strong> Cod Unic de Înregistrare</li>
              <li><strong>Denumire firmă:</strong> Numele companiei</li>
              <li><strong>Date de contact:</strong> Telefon, adresă (opțional)</li>
              <li><strong>Date fiscale:</strong> Tip impozitare, plătitor TVA</li>
            </ul>

            <h3>3.3 Date Financiare</h3>
            <ul>
              <li><strong>Bilanțuri contabile:</strong> Fișiere Excel încărcate</li>
              <li><strong>Rezultate analize:</strong> Output-ul AI generat</li>
              <li><strong>Documente anexate:</strong> Fișiere PDF/Excel suplimentare</li>
            </ul>

            <h3>3.4 Date de Utilizare</h3>
            <ul>
              <li><strong>Conversații chat:</strong> Istoric mesaje cu AI</li>
              <li><strong>Audiouri vocale:</strong> Înregistrări conversații vocale (temporare)</li>
              <li><strong>Analytics:</strong> Pagini vizitate, funcționalități folosite</li>
              <li><strong>Loguri sistem:</strong> Erori, acțiuni utilizator, timestamp-uri</li>
              <li><strong>Date tehnice:</strong> IP, browser, device, user agent</li>
            </ul>

            <h2>4. Scopul Prelucrării Datelor</h2>
            
            <h3>4.1 Temeiul Legal (GDPR Art. 6)</h3>
            
            <h4>a) Executarea Contractului (Art. 6(1)(b))</h4>
            <ul>
              <li>Furnizarea serviciului de analiză financiară</li>
              <li>Generarea analizelor AI</li>
              <li>Stocarea și procesarea datelor financiare</li>
            </ul>

            <h4>b) Consimțământ (Art. 6(1)(a))</h4>
            <ul>
              <li>Marketing și comunicări promoționale</li>
              <li>Conversații vocale (înregistrate temporar)</li>
              <li>Analytics avansat</li>
            </ul>

            <h4>c) Interes Legitim (Art. 6(1)(f))</h4>
            <ul>
              <li>Îmbunătățirea serviciului și algoritmilor AI</li>
              <li>Securitate și prevenirea fraudelor</li>
              <li>Debugging și rezolvarea problemelor tehnice</li>
            </ul>

            <h4>d) Obligații Legale (Art. 6(1)(c))</h4>
            <ul>
              <li>Conformare cu legislația fiscală și contabilă</li>
              <li>Păstrarea documentelor conform legii</li>
            </ul>

            <h2>5. Cum Utilizăm Datele</h2>
            
            <h3>5.1 Funcționalități Principale</h3>
            <ul>
              <li><strong>Analiză AI:</strong> Procesăm bilanțurile pentru a genera analize automate</li>
              <li><strong>Chatbot:</strong> Răspundem la întrebări folosind istoricul conversațiilor</li>
              <li><strong>Voice AI:</strong> Procesăm audiouri pentru conversații vocale</li>
              <li><strong>Comparații:</strong> Comparăm analize între perioade și companii</li>
            </ul>

            <h3>5.2 Îmbunătățiri</h3>
            <ul>
              <li>Antrenarea și îmbunătățirea modelelor AI (date anonimizate)</li>
              <li>Detectarea pattern-urilor financiare comune</li>
              <li>Optimizarea performanței sistemului</li>
            </ul>

            <h3>5.3 Comunicare</h3>
            <ul>
              <li>Notificări despre starea contului</li>
              <li>Alerte proactive despre situația financiară</li>
              <li>Actualizări despre funcționalități noi</li>
              <li>Email-uri de recuperare parolă</li>
            </ul>

            <h2>6. Partajarea Datelor cu Terți</h2>
            
            <h3>6.1 Furnizori de Servicii (Procesatori)</h3>
            <p>Partajăm date cu următorii furnizori, toți având contracte DPA (Data Processing Agreement):</p>
            
            <ul>
              <li>
                <strong>Supabase (Hosting & Database):</strong> Stocarea datelor, autentificare
                <br /><em>Locație: UE, Conform GDPR</em>
              </li>
              <li>
                <strong>OpenAI (API AI):</strong> Procesarea text-urilor pentru analize AI
                <br /><em>Locație: SUA, Transfer legal sub DPA</em>
                <br /><em>Notă: Nu antrenează modele cu datele tale (opt-out by default)</em>
              </li>
              <li>
                <strong>Resend (Email):</strong> Trimitere email-uri transacționale
                <br /><em>Locație: SUA, Conform GDPR</em>
              </li>
              <li>
                <strong>Sentry (Monitoring Erori):</strong> Tracking erori pentru debugging
                <br /><em>Locație: SUA, Conform GDPR, date sanitizate</em>
              </li>
            </ul>

            <h3>6.2 NU Vindem Date</h3>
            <p>
              <strong>Declarație fermă:</strong> Nu vindem, închiriem sau partajăm datele 
              dumneavoastră personale cu terți pentru scopuri de marketing.
            </p>

            <h3>6.3 Dezvăluiri Legale</h3>
            <p>Putem dezvălui date dacă:</p>
            <ul>
              <li>Cerut de lege sau instanțe judecătorești</li>
              <li>Necesar pentru protejarea drepturilor noastre legale</li>
              <li>Investigații privind fraude sau securitate</li>
            </ul>

            <h2>7. Transferuri Internaționale de Date</h2>
            <p>
              Anumite date sunt procesate de furnizori din SUA (OpenAI, Resend). 
              Aceste transferuri sunt legale deoarece:
            </p>
            <ul>
              <li>Avem contracte DPA (Data Processing Agreements)</li>
              <li>Furnizorii respectă Standard Contractual Clauses (SCC) UE</li>
              <li>OpenAI are certificare SOC 2 și ISO 27001</li>
            </ul>

            <h2>8. Stocarea și Retenția Datelor</h2>
            
            <h3>8.1 Perioade de Retenție</h3>
            <ul>
              <li><strong>Date cont activ:</strong> Cât timp contul este activ</li>
              <li><strong>Analize financiare:</strong> 5 ani (obligație legală contabilă)</li>
              <li><strong>Conversații chat:</strong> 2 ani sau până la ștergere</li>
              <li><strong>Audiouri vocale:</strong> Șterse imediat după procesare (maxim 24h)</li>
              <li><strong>Loguri sistem:</strong> 90 zile</li>
              <li><strong>Analytics:</strong> 24 luni în formă anonimizată</li>
            </ul>

            <h3>8.2 După Ștergerea Contului</h3>
            <ul>
              <li>Date personale identificabile: Șterse în 30 zile</li>
              <li>Date financiare: Arhivate anonim pentru conformare legală (5 ani)</li>
              <li>Backup-uri: Șterse în maxim 90 zile</li>
            </ul>

            <h2>9. Securitatea Datelor</h2>
            
            <h3>9.1 Măsuri Tehnice</h3>
            <ul>
              <li><strong>Criptare:</strong> HTTPS/TLS pentru toate conexiunile</li>
              <li><strong>Parole:</strong> Hash-uri bcrypt (nu stocăm parole în clar)</li>
              <li><strong>Database:</strong> Row Level Security (RLS) în Supabase</li>
              <li><strong>API:</strong> Rate limiting și autentificare JWT</li>
              <li><strong>Audituri:</strong> Logging complet al acțiunilor</li>
            </ul>

            <h3>9.2 Măsuri Organizaționale</h3>
            <ul>
              <li>Acces restricționat doar pentru personalul autorizat</li>
              <li>Contracte de confidențialitate pentru angajați</li>
              <li>Politici interne de securitate</li>
              <li>Testing regulat de securitate</li>
            </ul>

            <h2>10. Drepturile Dumneavoastră (GDPR)</h2>
            
            <h3>10.1 Dreptul de Acces (Art. 15)</h3>
            <p>
              Puteți solicita o copie a tuturor datelor personale pe care le deținem despre dumneavoastră.
            </p>

            <h3>10.2 Dreptul la Rectificare (Art. 16)</h3>
            <p>
              Puteți corecta datele inexacte din profilul dumneavoastră.
            </p>

            <h3>10.3 Dreptul la Ștergere / "Dreptul de a fi uitat" (Art. 17)</h3>
            <p>
              Puteți solicita ștergerea datelor, cu excepția celor păstrate pentru obligații legale.
            </p>

            <h3>10.4 Dreptul la Restricționarea Prelucrării (Art. 18)</h3>
            <p>
              Puteți solicita suspendarea temporară a prelucrării datelor.
            </p>

            <h3>10.5 Dreptul la Portabilitate (Art. 20)</h3>
            <p>
              Puteți exporta datele într-un format structurat (JSON/CSV) pentru transfer la alt serviciu.
            </p>

            <h3>10.6 Dreptul la Opoziție (Art. 21)</h3>
            <p>
              Puteți refuza prelucrarea bazată pe interes legitim sau marketing.
            </p>

            <h3>10.7 Retragerea Consimțământului (Art. 7(3))</h3>
            <p>
              Unde prelucrarea se bazează pe consimțământ, îl puteți retrage oricând.
            </p>

            <h3>10.8 Cum Exercitați Aceste Drepturi</h3>
            <p>
              Trimiteți un email la <strong>office@velcont.com</strong> cu subiectul 
              "GDPR Request" și vom răspunde în maxim 30 de zile.
            </p>

            <h2>11. Cookie-uri și Tehnologii Similare</h2>
            
            <h3>11.1 Cookie-uri Esențiale</h3>
            <ul>
              <li><strong>Sesiune autentificare:</strong> JWT token pentru login</li>
              <li><strong>Preferințe UI:</strong> Temă (dark/light), limbă</li>
            </ul>

            <h3>11.2 Cookie-uri Analytics</h3>
            <ul>
              <li><strong>Tracking utilizare:</strong> Pagini vizitate, durata sesiunii</li>
              <li><strong>Condiție:</strong> Necesită consimțământ explicit</li>
            </ul>

            <h3>11.3 Gestionare Cookie-uri</h3>
            <p>
              Puteți gestiona cookie-urile din setările browser-ului. Dezactivarea 
              cookie-urilor esențiale poate afecta funcționalitatea platformei.
            </p>

            <h2>12. Minori</h2>
            <p>
              Serviciul nostru nu este destinat persoanelor sub 18 ani. Nu colectăm 
              în mod intenționat date de la minori. Dacă descoperiți că un minor 
              a furnizat date, vă rugăm să ne contactați.
            </p>

            <h2>13. Modificări ale Politicii</h2>
            <p>
              Putem actualiza această politică periodic. Vă vom notifica prin:
            </p>
            <ul>
              <li>Email către adresa de contact</li>
              <li>Notificare în aplicație</li>
              <li>Banner pe site cu minimum 15 zile înainte</li>
            </ul>

            <h2>14. Plângeri la ANSPDCP</h2>
            <p>
              Dacă considerați că drepturile dumneavoastră GDPR au fost încălcate, 
              puteți depune o plângere la:
            </p>
            <p>
              <strong>Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP)</strong><br />
              B-dul G-ral. Gheorghe Magheru nr. 28-30, Sector 1, București<br />
              Tel: +40 318 059 211 sau +40 318 059 212<br />
              Email: anspdcp@dataprotection.ro<br />
              Website: <a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer">www.dataprotection.ro</a>
            </p>

            <h2>15. Contact</h2>
            <p>
              Pentru orice întrebări despre această politică sau exercitarea drepturilor GDPR:
            </p>
            <ul>
              <li><strong>Email DPO:</strong> office@velcont.com</li>
              <li><strong>Subiect email:</strong> "GDPR Request" sau "Privacy Question"</li>
              <li><strong>Timp de răspuns:</strong> Maximum 30 de zile</li>
            </ul>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Rezumat GDPR:</strong> Datele dumneavoastră sunt protejate conform 
                celor mai înalte standarde europene. Aveți control complet asupra informațiilor 
                personale și le puteți accesa, modifica sau șterge oricând. Nu vindem datele 
                dumneavoastră nimănui.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Privacy;
