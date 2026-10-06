'use client'

import Link from 'next/link'
import { useDocuments, useDocument } from '@/hooks/useDocument'
import { useSettings } from '@/hooks/useSettings'
import { DOC_TYPE_LABELS, type Document, type DocumentType } from '@/models/document'
import { ArrowRight, GitBranch } from 'lucide-react'

export function DocumentFlow({ document }: { document: Document }) {
  const { data: settings } = useSettings()
  const { data: source } = useDocument(document.reference ?? 0)
  const { data: children } = useDocuments({ reference: document.id, page_size: 100 })
  const next: DocumentType[] = document.type === 'quotation' ? [...(settings?.enable_po ? ['po' as const] : []), ...(settings?.enable_pi ? ['pi' as const] : [])]
    : document.type === 'po' ? ['bill'] : document.type === 'pi' ? ['invoice']
    : document.type === 'bill' ? [...(settings?.enable_challan ? ['challan' as const] : []), ...(settings?.enable_dn ? ['dn' as const] : [])]
    : document.type === 'invoice' ? [...(settings?.enable_challan ? ['challan' as const] : []), ...(settings?.enable_cn ? ['cn' as const] : [])] : []
  if (!next.length && !document.reference && !children?.count) return null
  return <section className="mx-4 my-4 rounded-xl border bg-muted/20 p-4 space-y-3" aria-label="Document flow">
    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"><GitBranch className="h-4 w-4" />Document flow</div>
    <div className="flex items-center flex-wrap gap-2 text-sm">
      {source && <><Link href={`/documents/${source.id}`} className="rounded-lg border bg-background px-3 py-2 hover:border-primary">{source.doc_id}</Link><ArrowRight className="h-4 w-4 text-muted-foreground" /></>}
      <span className="rounded-lg bg-primary/10 text-primary font-medium px-3 py-2">{document.doc_id}</span>
      {!!children?.count && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
      {children?.results.map(child => <Link key={child.id} href={`/documents/${child.id}`} className="rounded-lg border bg-background px-3 py-2 hover:border-primary">{child.doc_id}</Link>)}
      {children && children.count > children.results.length && <Link href={`/documents?reference=${document.id}`} className="text-primary underline">View all {children.count}</Link>}
    </div>
    {document.is_active && next.length > 0 && <div className="flex items-center flex-wrap gap-2 pt-1">
      {next.map(type => <Link key={type} href={`/documents/new?type=${type}&reference=${document.id}&reference_type=${document.type}${document.contact ? `&contact=${document.contact}` : ''}`} className="rounded-lg border border-primary/30 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10">Create {DOC_TYPE_LABELS[type]}</Link>)}
    </div>}
    {['bill','invoice','cn','dn','challan'].includes(document.type) && <p className="text-xs text-muted-foreground">{document.stock_mode === 'none' && settings?.enable_challan ? 'Inventory is managed through the linked challan.' : document.stock_mode === 'record' ? 'Stock stays pending until you receive or dispatch it.' : document.stock_mode === 'actual' ? 'Stock movement is automatic for this document.' : 'This document does not move stock.'}</p>}
  </section>
}
