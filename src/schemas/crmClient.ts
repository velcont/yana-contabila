import { z } from "zod";

// Romanian CUI validation regex (numeric, 2-10 digits, may start with RO)
const cuiRegex = /^(RO)?[0-9]{2,10}$/;

// Email validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation (Romanian format)
const phoneRegex = /^(\+4|4|07)[0-9]{8,9}$/;

export const crmClientSchema = z.object({
  company_name: z.string()
    .trim()
    .min(1, "Numele companiei este obligatoriu")
    .max(255, "Numele companiei nu poate depăși 255 caractere")
    .refine(
      (val) => val.length >= 3,
      { message: "Numele companiei trebuie să aibă minimum 3 caractere" }
    ),
  
  cui: z.string()
    .trim()
    .optional()
    .refine(
      (val) => !val || cuiRegex.test(val),
      { message: "CUI invalid. Format: RO12345678 sau 12345678 (2-10 cifre)" }
    ),
  
  registration_number: z.string()
    .trim()
    .max(50, "Numărul de înregistrare nu poate depăși 50 caractere")
    .optional(),
  
  address: z.string()
    .trim()
    .max(500, "Adresa nu poate depăși 500 caractere")
    .optional(),
  
  phone: z.string()
    .trim()
    .optional()
    .refine(
      (val) => !val || phoneRegex.test(val.replace(/[\s-]/g, '')),
      { message: "Telefon invalid. Format: +40731234567 sau 0731234567" }
    ),
  
  contact_person: z.string()
    .trim()
    .max(255, "Numele persoanei de contact nu poate depăși 255 caractere")
    .optional(),
  
  contact_email: z.string()
    .trim()
    .optional()
    .refine(
      (val) => !val || emailRegex.test(val),
      { message: "Email invalid" }
    ),
  
  notes: z.string()
    .trim()
    .max(5000, "Notele nu pot depăși 5,000 caractere")
    .optional(),
  
  vat_payer: z.enum(["da", "nu"], {
    errorMap: () => ({ message: "Valoare invalidă pentru plătitor TVA" })
  }),
  
  vat_regime: z.string()
    .trim()
    .max(50)
    .optional(),
  
  tax_regime: z.string()
    .trim()
    .max(50)
    .optional(),
  
  billing_cycle: z.string()
    .trim()
    .max(50),
  
  client_status: z.string()
    .trim()
    .max(50),
  
  client_category: z.string()
    .trim()
    .max(100)
    .optional(),
});

export type CRMClientFormData = z.infer<typeof crmClientSchema>;
