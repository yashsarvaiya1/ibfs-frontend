// models/settings.ts

export interface Settings {
  id: number
  header_image: string | null
  sign_image: string | null
  auto_stock: boolean
  auto_transaction: boolean
  enable_po: boolean
  enable_quotation: boolean
  enable_pi: boolean
  enable_challan: boolean
  enable_vouchers: boolean
  enable_interest: boolean
  enable_cn: boolean
  enable_dn: boolean
  created_at: string
  updated_at: string
}

export type SettingsUpdate = Partial<Omit<Settings, 'id' | 'created_at' | 'updated_at'>>
