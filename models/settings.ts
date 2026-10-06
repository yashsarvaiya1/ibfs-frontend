export interface Settings {
  company_name: string
  company_address: string
  company_phone: string
  company_email: string
  company_gstin: string
  payment_details: string
  print_terms: string
  signatory_name: string
  letterhead_mode: 'banner' | 'page'
  letterhead_height_mm: number
  letterhead_footer_mm: number
  id:                 number
  header_image:       string | null
  sign_image:         string | null
  header_image_url:   string | null
  sign_image_url:     string | null
  auto_stock:         boolean
  auto_transaction:   boolean
  enable_po:          boolean
  enable_quotation:   boolean
  enable_pi:          boolean
  enable_challan:     boolean
  enable_vouchers:    boolean
  enable_interest:    boolean
  enable_cn:          boolean
  enable_dn:          boolean
}

export interface SettingsUpdate {
  company_name?: string
  company_address?: string
  company_phone?: string
  company_email?: string
  company_gstin?: string
  payment_details?: string
  print_terms?: string
  signatory_name?: string
  letterhead_mode?: 'banner' | 'page'
  letterhead_height_mm?: number
  letterhead_footer_mm?: number
  header_image?:      string | null 
  sign_image?:        string | null
  auto_stock?:        boolean
  auto_transaction?:  boolean
  enable_po?:         boolean
  enable_quotation?:  boolean
  enable_pi?:         boolean
  enable_challan?:    boolean
  enable_vouchers?:   boolean
  enable_interest?:   boolean
  enable_cn?:         boolean
  enable_dn?:         boolean
}
