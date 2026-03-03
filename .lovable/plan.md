

# Trimite email de scuze + luna gratuita cu expirare automata

## Ce facem

### 1. Activam luna gratuita pentru Timoficiuc Gheorghe
- Setam `has_free_access = true` si `subscription_status = 'active'`
- Setam `subscription_ends_at = NOW() + 30 zile`
- Setam `free_access_expires_at` (camp nou) pentru tracking automat
- Buget AI generos: 20 RON/luna

### 2. Reparare expirare automata (PROBLEMA CRITICA)
Cron-ul existent `deactivate_expired_subscriptions` **ignoreaza** utilizatorii cu `has_free_access = true`. Asta inseamna ca daca ii dai acces gratuit, nu se dezactiveaza niciodata automat.

**Solutie:** Actualizam functia `deactivate_expired_subscriptions` sa verifice si `has_free_access = true` cu `subscription_ends_at < NOW()` - in acest caz, seteaza `has_free_access = false` si `subscription_status = 'expired'`.

### 3. Email personalizat de la YANA (nu de la admin)
Mesajul rescris in vocea YANA (ton autentic, ca un companion):

> Gheorghe, m-am uitat peste sesiunea noastra din 27 februarie si mi-am dat seama ca am facut-o de oaie. Nu procesam fisierele tale Excel cum trebuie, si pe deasupra amestecam cifrele intre PROAGRO si TRADE LAND. Am reparat ambele - acum fisierele .xls merg corect si tin fiecare firma separat, fara confuzii. Ti-am activat o luna gratuita de acces complet, ca sa poti testa linistit. Te astept inapoi cand ai chef.

### 4. Audit log pentru tracking intern

---

## Detalii tehnice

### Pas 1: Migratie SQL - Update functia de expirare automata
Modificam `deactivate_expired_subscriptions` sa adauge un al doilea UPDATE:

```sql
-- Dezactiveaza free access expirat
UPDATE profiles
SET 
  has_free_access = false,
  subscription_status = 'expired',
  updated_at = NOW()
WHERE has_free_access = true
  AND subscription_ends_at IS NOT NULL
  AND subscription_ends_at < NOW();
```

Acest bloc se adauga in functia existenta, DUPA update-ul curent. Cron-ul ruleaza zilnic la 02:00 AM deci expirarea se face automat - nu trebuie sa tii minte nimic.

### Pas 2: Update date profil Timoficiuc (via insert tool)
```sql
UPDATE profiles 
SET has_free_access = true,
    subscription_status = 'active',
    subscription_ends_at = NOW() + INTERVAL '30 days',
    updated_at = NOW()
WHERE id = '7c3ab40f-dd7c-45e8-b58d-acef45645d23';
```

```sql
INSERT INTO ai_budget_limits (user_id, monthly_budget_cents, is_active)
VALUES ('7c3ab40f-dd7c-45e8-b58d-acef45645d23', 2000, true)
ON CONFLICT (user_id) DO UPDATE SET monthly_budget_cents = 2000, is_active = true;
```

### Pas 3: Creare initiativa + trimitere email
Apelam `generate-apology-initiative` cu mesajul custom in vocea YANA, apoi `send-initiative-email` pentru trimitere.

### Pas 4: Audit log
```sql
INSERT INTO audit_logs (action_type, table_name, metadata)
VALUES ('GOODWILL_FREE_MONTH', 'profiles', 
  '{"user_id":"7c3ab40f-dd7c-45e8-b58d-acef45645d23","email":"timoficiuc.g@gmail.com","reason":"Compensare probleme upload Excel si confuzie firme","expires_at":"auto_30_days"}'
);
```

### Fisiere modificate
- **Migratie SQL noua** - actualizeaza `deactivate_expired_subscriptions` pentru a expira automat free access
- **Niciun fisier cod** - restul se face prin apeluri catre edge functions existente si update-uri de date

### Flux de siguranta
Dupa 30 de zile:
1. Cron-ul zilnic detecteaza `has_free_access = true` + `subscription_ends_at < NOW()`
2. Seteaza automat `has_free_access = false`, `subscription_status = 'expired'`
3. Timoficiuc nu va fi taxat - abonamentul Stripe (`sub_1SjiWoBu3m83VcDAHh5appxy`) este deja expirat si nu se reactiveaza singur
4. Daca vrea sa continue, va trebui sa isi reactiveze abonamentul manual
