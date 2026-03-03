export interface Settings {
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
