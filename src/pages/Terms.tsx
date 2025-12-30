import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import MiniFooter from '@/components/MiniFooter';

const Terms = () => {
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
            <CardTitle className="text-3xl">Termeni și Condiții</CardTitle>
            <p className="text-sm text-muted-foreground">
              Ultima actualizare: 30 Decembrie 2025
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert space-y-6">
            <h2>1. Acceptarea Termenilor</h2>
            <p>
              Prin accesarea și utilizarea platformei YANA (un serviciu <strong>SaaS - Software as a Service</strong>), 
              confirmați că acceptați acești termeni și condiții. Dacă nu sunteți de acord cu aceștia, 
              vă rugăm să nu utilizați serviciul.
            </p>
            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-3 rounded-md border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm m-0">
                <strong>IMPORTANT:</strong> Prin acceptarea acestor termeni, confirmați că ați citit și înțeles toate 
                clauzele prezentate mai jos, inclusiv limitările de răspundere și excluderile de garanție.
              </p>
            </div>

            <h2>2. Natura Serviciului</h2>
            <p>
              YANA este o platformă <strong>SaaS (Software as a Service)</strong> care oferă servicii de analiză 
              financiară automată bazate pe inteligență artificială. Serviciul este furnizat online, fără necesitatea 
              instalării de software local.
            </p>

            <h2>3. Descrierea Serviciului</h2>
            <p>YANA oferă următoarele funcționalități:</p>
            <ul>
              <li>Analiză automată a balanțelor contabile</li>
              <li>Generare de rapoarte financiare</li>
              <li>Asistent conversațional pentru întrebări financiare</li>
              <li>Indicatori de performanță (DSO, DPO, EBITDA, etc.)</li>
              <li>Alertă proactivă pentru probleme potențiale</li>
              <li>Interfață vocală pentru comenzi rapide</li>
              <li>Gestiune multi-companie</li>
            </ul>

            <h2>4. Înregistrare și Acces</h2>
            <p>Pentru a utiliza YANA, trebuie să creați un cont furnizând informații corecte și complete. Sunteți responsabil pentru:</p>
            <ul>
              <li>Păstrarea confidențialității credențialelor de autentificare</li>
              <li>Toate activitățile desfășurate sub contul dumneavoastră</li>
              <li>Notificarea imediată în cazul accesului neautorizat</li>
            </ul>
            <p><strong>Nu puteți crea un cont fără a accepta în mod explicit acești termeni și condiții.</strong></p>

            <h2>5. Perioadă de Probă Gratuită</h2>
            <p>Noii utilizatori primesc o perioadă de probă gratuită de <strong>30 de zile</strong> de la data înregistrării. După expirarea perioadei gratuite:</p>
            <ul>
              <li>Veți primi notificări cu <strong>7 zile</strong> înainte de expirare</li>
              <li>Veți primi notificări automate când vă apropiatide sfârșitul perioadei</li>
              <li>La expirare, accesul la platformă va fi restricționat până la efectuarea plății</li>
              <li>Datele dumneavoastră vor fi păstrate în siguranță și vor fi accesibile după reactivarea abonamentului</li>
            </ul>

            <h2>6. Planuri de Abonament și Tarife</h2>
            <p>YANA oferă un singur plan de abonament simplu și complet:</p>
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 my-4">
              <h3 className="font-semibold mb-2">Yana Strategic - 49 RON/lună + 20 Credite AI Incluse</h3>
              <ul>
                <li><strong>Preț:</strong> 49 lei/lună + TVA</li>
                <li><strong>Include:</strong> Analiză financiară NELIMITATĂ, Chat AI, Dashboard interactiv, Export rapoarte PDF/Word</li>
                <li><strong>20 Credite AI/lună incluse:</strong> Suficient pentru ~40 sesiuni strategice cu Yana Strategică</li>
                <li><strong>Acces complet la:</strong> Consilier Strategic AI, War Room Simulator, Battle Plan Export</li>
                <li><strong>Pentru:</strong> Antreprenori și IMM-uri care vor decizii bazate pe date</li>
              </ul>
              <p className="text-sm mt-2 text-muted-foreground">30 de zile gratuit • Anulare oricând • Fără card inițial</p>
            </div>
            
            <h3 className="font-semibold mt-4">6.3. Credite AI Incluse și Suplimentare</h3>
            <p>Abonamentul de 49 RON/lună <strong>include 20 credite AI lunar</strong> (suficient pentru ~40 sesiuni strategice). Aceste credite pot fi folosite pentru:</p>
            <ul>
              <li><strong>Consilier Strategic Yana</strong> - Consultanță strategică avansată</li>
              <li><strong>War Room Simulator</strong> - Simulări de scenarii</li>
              <li><strong>Battle Plan Export</strong> - Rapoarte strategice detaliate</li>
              <li><strong>Predicții financiare avansate</strong></li>
            </ul>
            <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-md border border-green-200 dark:border-green-800 my-4">
              <p className="text-sm m-0">
                <strong>INCLUS ÎN ABONAMENT:</strong> 20 credite AI/lună (~40 conversații strategice). 
                Dacă ai nevoie de mai mult, poți cumpăra pachete suplimentare oricând.
              </p>
            </div>

            <h4 className="font-semibold mt-3">Pachete Credite AI:</h4>
            <ul>
              <li><strong>Starter:</strong> 19 lei - 100 credite (~50 conversații)</li>
              <li><strong>Professional:</strong> 49 lei - 300 credite (~150 conversații)</li>
              <li><strong>Enterprise:</strong> 129 lei - 1000 credite (~500 conversații)</li>
            </ul>
            <p className="text-sm">
              <strong>Control complet:</strong> Setezi tu bugetul lunar pentru AI, primești alerte la 80% din buget, 
              și poți opri automat consumul. Vezi în timp real cheltuielile exacte. Zero costuri ascunse.
            </p>

            <h2>6.4. Politica de Rambursare pentru Credite AI</h2>
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-md border-2 border-red-300 dark:border-red-800 my-4">
              <p className="font-bold text-lg mb-2">🔴 IMPORTANT - Citește cu Atenție</p>
              <p className="mb-2"><strong>Creditele AI achiziționate NU sunt rambursabile după utilizare.</strong></p>
              
              <h4 className="font-semibold mt-3 mb-2">Ce înseamnă asta:</h4>
              <ul className="space-y-2">
                <li>✅ <strong>Credite neutilizate:</strong> Pot fi rambursate în primele 14 zile de la achiziție</li>
                <li>❌ <strong>Credite consumate:</strong> NU pot fi rambursate (costurile noastre reale cu AI au fost deja suportate)</li>
                <li>💡 <strong>Credite de probă GRATUITE:</strong> Utilizatorii premium primesc automat 50 RON (5000 cents) credite de testare înainte de a cumpăra pachete</li>
              </ul>

              <h4 className="font-semibold mt-3 mb-2">De ce această politică?</h4>
              <p className="text-sm">
                Când folosești Yana Strategica, fiecare conversație consumă resurse AI reale de la furnizori externi (Lovable AI Gateway + Google Gemini/OpenAI). 
                Aceste costuri sunt plătite de noi imediat, indiferent dacă ești sau nu mulțumit de răspuns.
              </p>

              <h4 className="font-semibold mt-3 mb-2">Protecția ta ca utilizator:</h4>
              <ul className="text-sm space-y-1">
                <li>🎁 <strong>50 RON credite gratuite de testare</strong> pentru toți utilizatorii premium (~25-50 conversații strategice)</li>
                <li>📊 <strong>Transparență totală:</strong> Vezi în timp real câte credite consumi</li>
                <li>🛡️ <strong>Control buget:</strong> Setezi limite și primești alerte înainte să depășești</li>
                <li>⏸️ <strong>Oprire automată:</strong> Când se termină bugetul, sistemul te oprește automat</li>
                <li>📚 <strong>Tutorial educativ:</strong> Învață cum să obții rezultate maxime din Yana</li>
              </ul>

              <p className="mt-3 font-bold text-base">
                📢 Recomandare: Testează întotdeauna cu creditele GRATUITE înainte de a cumpăra pachete mari!
              </p>
            </div>

            <h3 className="font-semibold mt-4">6.5. Metode de Plată</h3>
            <p>Plățile sunt procesate sigur prin <strong>Stripe</strong>, conform standardelor PCI-DSS. Acceptăm:</p>
            <ul>
              <li>Carduri de credit/debit (Visa, Mastercard, American Express)</li>
              <li>Plăți prin Google Pay și Apple Pay</li>
            </ul>

            <h3 className="font-semibold mt-4">6.6. Facturare și TVA</h3>
            <p>
              Toate prețurile afișate includ TVA conform legislației românești. 
              Veți primi factură fiscală automată pentru fiecare plată efectuată.
            </p>

            <h3 className="font-semibold mt-4">6.7. Transparență Totală</h3>
            <p>Ne angajăm să oferim:</p>
            <ul>
              <li>✓ Toate costurile afișate clar înainte de orice tranzacție</li>
              <li>✓ Control complet - tu decizi bugetul și când să cumperi credite</li>
              <li>✓ Zero taxe surpriză sau comisioane nedeclarate</li>
              <li>✓ Vizibilitate permanentă a costurilor în interfață</li>
              <li>✓ Alerte automate la apropierea de limita bugetului</li>
            </ul>
            <p>
              Pentru informații complete despre tarife, consultați <a href="/pricing" target="_blank" className="text-primary hover:underline font-semibold">Politica de Tarife</a>.
            </p>

            <h2>7. Utilizare Permisă</h2>
            <p>Vă este permis să:</p>
            <ul>
              <li>Încărcați balanțe contabile pentru analiza proprie sau a clienților dumneavoastră</li>
              <li>Generați și exportați rapoarte financiare</li>
              <li>Utilizați interfața conversațională pentru întrebări legate de analizele efectuate</li>
              <li>Partajați analize cu terți prin funcționalitatea de partajare a platformei</li>
            </ul>

            <h2>7. Utilizare Interzisă</h2>
            <p>Este strict interzis să:</p>
            <ul>
              <li>Folosiți platforma pentru activități ilegale sau frauduloase</li>
              <li>Încercați să accesați neautorizat sistemele sau datele altor utilizatori</li>
              <li>Copiați, modificați sau distribuiți codul sursă al platformei</li>
              <li>Utilizați roboți, scripturi automatizate sau alte mijloace pentru accesare abuzivă</li>
              <li>Încărcați conținut malițios (viruși, malware, etc.)</li>
              <li>Folosiți serviciul pentru spam sau hărțuire</li>
            </ul>

            <h2>8. Limitări ale Serviciului</h2>
            <p>Vă informăm că:</p>
            <ul>
              <li>Apelurile vocale folosesc o limită lunară de minute (10 minute/lună pentru utilizatori standard)</li>
              <li>Serviciul poate fi temporar indisponibil din cauza mentenanței programate</li>
              <li>Analizele sunt generate automat și nu înlocuiesc consultanța profesională</li>
            </ul>

            <h2>9. Proprietate Intelectuală</h2>
            <p>
              Toate drepturile de proprietate intelectuală asupra platformei YANA, inclusiv design, 
              logo, algoritmi și conținut, aparțin proprietarului serviciului și sunt protejate de 
              legile privind proprietatea intelectuală.
            </p>

            <h2>10. Proprietatea și Utilizarea Datelor</h2>
            <p><strong>Datele dumneavoastră vă aparțin.</strong> Încărcând documente financiare pe platformă:</p>
            <ul>
              <li>Păstrați proprietatea completă asupra datelor dumneavoastră</li>
              <li>Datele sunt folosite exclusiv pentru generarea analizelor solicitate de dumneavoastră</li>
              <li>Nu vindem, nu închiriem și nu distribuim datele dumneavoastră către terți</li>
              <li>Puteți șterge datele în orice moment din panoul de administrare</li>
            </ul>

            <h2>11. LIMITARE DE RĂSPUNDERE ȘI EXCLUDERI DE GARANȚIE</h2>
            <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-md border-2 border-red-300 dark:border-red-800">
              <p className="font-bold text-lg mb-2">⚠️ DISCLAIMER IMPORTANT - YANA STRATEGICA</p>
              <p><strong>Proprietarul platformei YANA, Suciu Gyorfi Nicolae, NU OFERĂ NICIO GARANȚIE</strong> cu privire la:</p>
              <ul className="my-2">
                <li>Acuratețea, completitudinea sau corectitudinea analizelor generate de platformă</li>
                <li>Funcționarea neîntreruptă sau fără erori a aplicației</li>
                <li>Adecvarea serviciului pentru anumite scopuri specifice</li>
                <li><strong>Calitatea sau succesul strategiilor generate de Yana Strategica</strong></li>
              </ul>
              <p className="mt-3">
                <strong>Analizele financiare generate de YANA sunt informative și NU constituie consultanță financiară, 
                juridică sau fiscală profesională.</strong> Aceste analize sunt destinate exclusiv pentru informare 
                și nu trebuie utilizate ca unic suport pentru luarea deciziilor importante de afaceri.
              </p>

              <h4 className="font-bold mt-4 mb-2">Despre Yana Strategica (Consilier Strategic AI):</h4>
              <p className="mb-2">
                Yana Strategica este un <strong>asistent AI pentru brainstorming strategic</strong>, NU un consultant uman certificat. 
                Oferă sugestii și framework-uri de gândire bazate pe date generale, dar:
              </p>
              <ul className="space-y-1 text-sm">
                <li>❌ NU are acces la date reale de piață actualizate în timp real</li>
                <li>❌ NU cunoaște situația concretă a industriei tale locale</li>
                <li>❌ NU poate garanta succesul implementării strategiilor sugerate</li>
                <li>❌ NU înlocuiește experiența unui consultant uman cu experiență practică</li>
                <li>⚠️ Calitatea răspunsurilor depinde 100% de <strong>completitudinea datelor pe care le furnizezi</strong></li>
              </ul>

              <p className="mt-3 font-bold text-red-600 dark:text-red-400">
                Șanse realiste de succes: ~30-45% pentru sfaturi valoroase, ~15-25% pentru soluții concrete care rezolvă problema.
              </p>

              <p className="mt-3">
                <strong>Recomandare obligatorie:</strong> Folosește Yana Strategica ca punct de plecare pentru idei, 
                dar consultă întotdeauna profesioniști umani (consultanți de business, contabili, avocați) înainte de 
                a implementa decizii importante.
              </p>
              <p className="mt-3"><strong>Utilizați serviciul PE PROPRIUL RISC.</strong> Suciu Gyorfi Nicolae nu poate fi tras la răspundere pentru:</p>
              <ul className="my-2">
                <li>Pierderi financiare rezultate din utilizarea sau interpretarea analizelor</li>
                <li>Decizii de afaceri luate pe baza informațiilor furnizate de platformă</li>
                <li>Erori sau inexactități în analizele generate</li>
                <li>Pierderea datelor din cauze tehnice</li>
                <li>Întreruperi ale serviciului</li>
              </ul>
              <p className="mt-3 font-bold mb-0">
                Prin acceptarea acestor termeni, recunoașteți și sunteți de acord că utilizați YANA în cunoștință 
                de cauză și că veți consulta întotdeauna profesioniști calificați (contabili, consultanți fiscali, 
                avocați) pentru decizii importante.
              </p>
            </div>

            <h2>12. Abonamente și Plăți</h2>
            <p>
              Pentru a continua utilizarea serviciului după perioada gratuită de 30 zile, trebuie să 
              achiziționați un abonament prin intermediul platformei noastre de plată Stripe.
            </p>
            <ul>
              <li>Plățile sunt procesate securizat prin Stripe</li>
              <li>Abonamentele sunt facturate lunar sau anual, în funcție de planul ales</li>
              <li>Prețurile sunt afișate în lei românești (RON) și includ TVA</li>
              <li>Puteți anula abonamentul în orice moment din panoul de administrare</li>
              <li>La anulare, veți avea acces până la sfârșitul perioadei deja plătite</li>
            </ul>

            <h2>13. Încetarea Serviciului</h2>
            <p>Ne rezervăm dreptul de a suspenda sau închide contul dumneavoastră dacă:</p>
            <ul>
              <li>Încălcați acești termeni și condiții</li>
              <li>Nu efectuați plata abonamentului</li>
              <li>Folosiți serviciul în mod abuziv sau ilegal</li>
            </ul>
            <p>De asemenea, puteți închide contul în orice moment prin intermediul setărilor de cont.</p>

            <h2>14. Modificări ale Termenilor</h2>
            <p>
              Ne rezervăm dreptul de a modifica acești termeni în orice moment. Veți fi notificat 
              prin email sau prin intermediul platformei cu privire la modificările majore. 
              Continuarea utilizării serviciului după notificare constituie acceptarea noilor termeni.
            </p>

            <h2>15. Lege Aplicabilă</h2>
            <p>
              Acești termeni sunt guvernați de legile României. Orice litigiu va fi soluționat de 
              instanțele competente din România.
            </p>

            <h2>16. Date de Contact și Înregistrare Acceptare</h2>
            <p>
              <strong>Proprietar:</strong> Suciu Gyorfi Nicolae<br />
              <strong>Email:</strong> office@velcont.com<br />
              <strong>CIF:</strong> 48607440
            </p>
            <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md border border-blue-200 dark:border-blue-800">
              <p className="text-sm m-0">
                <strong>Notă importantă:</strong> La acceptarea acestor termeni, se înregistrează automat:
                adresa dumneavoastră de email, adresa IP de la care ați acceptat termenii și data/ora exactă 
                a acceptării. Aceste informații sunt păstrate în scopuri legale și de conformitate.
              </p>
            </div>

            <h2>17. Dispoziții Finale</h2>
            <p>
              Acești termeni constituie acordul complet între părți referitor la utilizarea serviciului YANA.
              Dacă o clauză este declarată nulă sau nevalidă, restul termenilor rămân în vigoare.
            </p>

            <div className="bg-yellow-50 dark:bg-yellow-950/20 p-4 rounded-md border-2 border-yellow-300 dark:border-yellow-800 mt-6">
              <p className="font-bold text-center text-lg m-0">
                ⚠️ ATENȚIE: Utilizați YANA ca instrument de asistență, NU ca înlocuitor pentru consultanța profesională! ⚠️
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <MiniFooter />
    </div>
  );
};

export default Terms;
