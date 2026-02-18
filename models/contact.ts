// models/contact.ts

export interface AdditionalContact {
  name: string
  phone: string
}

export interface Contact {
  id: number
  company_name: string | null
  contact_name: string | null
  phone: string | null
  additional_contacts: AdditionalContact[]
  opening_balance: string
  gstin: string | null
  address: string | null
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ContactFormData {
  company_name?: string
  contact_name?: string
  phone?: string
  additional_contacts?: AdditionalContact[]
  opening_balance?: string
  gstin?: string
  address?: string
  notes?: string
}

export const getContactDisplayName = (contact: Contact): string =>
  contact.company_name || contact.contact_name || `Contact #${contact.id}`

export const getContactInitial = (contact: Contact): string => {
  const name = contact.company_name || contact.contact_name || '?'
  return name.charAt(0).toUpperCase()
}

export const isCompanyContact = (contact: Contact): boolean =>
  !!contact.company_name
