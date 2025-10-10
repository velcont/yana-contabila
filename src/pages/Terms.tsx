import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

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
              Ultima actualizare: {new Date().toLocaleDateString('ro-RO')}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none dark:prose-invert">
            <h2>1. Acceptarea Termenilor</h2>
            <p>
              Prin accesarea și utilizarea platformei YANA (denumită în continuare "Serviciul"), 
              operată de Suciu Gyorfi Nicolae, vă exprimați acordul de a respecta și de a fi obligat de 
              prezentii Termeni și Condiții. Dacă nu sunteți de acord cu acești termeni, 
              vă rugăm să nu utilizați Serviciul.
            </p>

            <h2>2. Descrierea Serviciului</h2>
            <p>
              YANA este o platformă de analiză financiară bazată pe inteligență artificială, 
              care oferă:
            </p>
            <ul>
              <li>Analiză automată a balanțelor contabile</li>
              <li>Interpretare AI a datelor financiare</li>
              <li>Rapoarte și predicții financiare</li>
              <li>Asistență chatbot pentru întrebări financiare</li>
              <li>Conversații vocale (limitate la 10 minute/lună pentru utilizatori standard)</li>
            </ul>

            <h2>3. Înregistrare și Cont</h2>
            <h3>3.1 Cerințe de Înregistrare</h3>
            <p>
              Pentru a utiliza Serviciul, trebuie să vă creați un cont furnizând:
            </p>
            <ul>
              <li>O adresă de email validă</li>
              <li>O parolă securizată</li>
              <li>Informații despre companie (CUI, denumire)</li>
            </ul>

            <h3>3.2 Securitatea Contului</h3>
            <p>
              Sunteți responsabil pentru:
            </p>
            <ul>
              <li>Menținerea confidențialității parolei</li>
              <li>Toate activitățile care au loc sub contul dumneavoastră</li>
              <li>Notificarea imediată în cazul accesului neautorizat</li>
            </ul>

            <h2>4. Utilizarea Serviciului</h2>
            <h3>4.1 Utilizare Permisă</h3>
            <p>
              Vă este permis să utilizați Serviciul pentru:
            </p>
            <ul>
              <li>Analiza datelor financiare ale companiilor proprii</li>
              <li>Generarea de rapoarte și analize</li>
              <li>Consultarea asistentului AI pentru întrebări financiare legitime</li>
            </ul>

            <h3>4.2 Utilizare Interzisă</h3>
            <p>
              NU aveți voie să:
            </p>
            <ul>
              <li>Încărcați date false sau înșelătoare</li>
              <li>Utilizați Serviciul pentru activități ilegale</li>
              <li>Încercați să accesați sistemele sau datele altor utilizatori</li>
              <li>Supraîncărcați sistemul prin cereri excesive</li>
              <li>Copiați, modificați sau distribuiți conținutul Serviciului fără autorizație</li>
              <li>Utilizați bot-uri sau scripturi automate (cu excepția API-ului oficial)</li>
            </ul>

            <h2>5. Limitări ale Serviciului</h2>
            <h3>5.1 Conversații Vocale</h3>
            <p>
              Utilizatorii standard beneficiază de maximum 10 minute de conversații vocale pe lună. 
              Administratorii au minute nelimitate. Datorită costurilor mari de întreținere, 
              această limită este necesară pentru sustenabilitatea serviciului.
            </p>

            <h3>5.2 Disponibilitate</h3>
            <p>
              Ne rezervăm dreptul de a:
            </p>
            <ul>
              <li>Întrerupe temporar serviciul pentru mentenanță</li>
              <li>Modifica funcționalitățile existente</li>
              <li>Adăuga sau elimina funcționalități</li>
            </ul>

            <h2>6. Proprietate Intelectuală</h2>
            <p>
              Serviciul, inclusiv dar fără a se limita la software, design, text, grafică, 
              și alte materiale, sunt proprietatea lui Suciu Gyorfi Nicolae și sunt protejate de legile 
              privind drepturile de autor și proprietatea intelectuală din România și internaționale.
            </p>

            <h2>7. Datele Dumneavoastră</h2>
            <h3>7.1 Proprietate</h3>
            <p>
              Rămâneți proprietarul datelor financiare pe care le încărcați în sistem.
            </p>

            <h3>7.3 Utilizarea Datelor pentru Îmbunătățiri</h3>
            <p>
              Putem utiliza date anonimizate și agregate pentru:
            </p>
            <ul>
              <li>Îmbunătățirea algoritmilor AI</li>
              <li>Dezvoltarea de noi funcționalități</li>
              <li>Analize statistice generale</li>
            </ul>

            <h2>8. Limitarea Răspunderii</h2>
            <h3>8.1 Acuratețea Analizelor</h3>
            <p>
              <strong>IMPORTANT:</strong> Analizele și predicțiile furnizate de YANA sunt generate 
              automat prin inteligență artificială și au scop informativ. NU constituie:
            </p>
            <ul>
              <li>Consiliere financiară profesională</li>
              <li>Recomandări de investiții</li>
              <li>Garanții privind performanța financiară</li>
            </ul>

            <h3>8.2 Limitare Generală</h3>
            <p>
              În nicio circumstanță Suciu Gyorfi Nicolae nu va fi răspunzător pentru:
            </p>
            <ul>
              <li>Pierderi financiare directe sau indirecte</li>
              <li>Pierderi de date sau profit</li>
              <li>Întreruperi ale activității</li>
              <li>Decizii luate pe baza analizelor AI</li>
            </ul>

            <h2>9. Abonamente și Plăți</h2>
            <p>
              Detaliile privind abonamentele, tarifele și metodele de plată vor fi comunicate 
              separat. Ne rezervăm dreptul de a modifica prețurile cu o notificare prealabilă 
              de minimum 30 de zile.
            </p>

            <h2>10. Încetarea Serviciului</h2>
            <h3>10.1 Încetare din Partea Dumneavoastră</h3>
            <p>
              Puteți înceta utilizarea Serviciului oricând prin ștergerea contului.
            </p>

            <h3>10.2 Încetare din Partea Noastră</h3>
            <p>
              Putem suspenda sau închide contul dumneavoastră dacă:
            </p>
            <ul>
              <li>Încălcați acești Termeni și Condiții</li>
              <li>Utilizați serviciul în mod fraudulos</li>
              <li>Nu plătiți taxele datorate</li>
              <li>Solicitați acest lucru</li>
            </ul>

            <h2>11. Modificări ale Termenilor</h2>
            <p>
              Ne rezervăm dreptul de a modifica acești termeni oricând. Vă vom notifica 
              prin email sau prin notificare în aplicație cu minimum 15 zile înainte de 
              intrarea în vigoare a modificărilor. Utilizarea continuă a Serviciului după 
              modificări constituie acceptarea noilor termeni.
            </p>

            <h2>12. Legea Aplicabilă</h2>
            <p>
              Acești Termeni și Condiții sunt guvernați de legile României. Orice dispută 
              va fi soluționată de instanțele competente din România.
            </p>

            <h2>13. Contact</h2>
            <p>
              Pentru întrebări referitoare la acești termeni, ne puteți contacta la:
            </p>
            <ul>
              <li><strong>Email:</strong> office@velcont.com</li>
              <li><strong>Adresă:</strong> Suciu Gyorfi Nicolae, România</li>
            </ul>

            <h2>14. Dispoziții Finale</h2>
            <p>
              Dacă oricare dintre clauzele acestor termeni este considerată invalidă sau 
              inaplicabilă, celelalte clauze rămân în vigoare. Nerevendicarea unui drept 
              sau prevedere nu constituie o renunțare la acel drept.
            </p>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Declarație de Responsabilitate:</strong> Utilizând YANA, 
                recunoașteți și acceptați că deciziile financiare luate pe baza analizelor 
                furnizate sunt responsabilitatea dumneavoastră exclusivă. Vă recomandăm să 
                consultați întotdeauna un contabil sau consilier financiar autorizat pentru 
                decizii importante.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
