// models/contact.ts

export interface AdditionalContact {
  name: string
  number: string
  role: string
}

export interface Contact {
  id: number
  company_name: string | null
  contact_name: string
  phone: string
  additional_contacts: AdditionalContact[]
  opening_balance: string        // Decimal comes as string from DRF
  gstin: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type ContactCreate = Omit<Contact, 'id' | 'created_at' | 'updated_at'>
export type ContactUpdate = Partial<ContactCreate>

// Derived helper — display name
export const getContactDisplayName = (c: Contact): string =>
  c.company_name || c.contact_name
