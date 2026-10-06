'use client'
import { Button } from '@/components/ui/button'
export function PageControls({ page, count, pageSize=20, onChange }: { page:number; count:number; pageSize?:number; onChange:(page:number)=>void }) {
  const pages = Math.max(1,Math.ceil(count/pageSize))
  if (pages<=1) return null
  return <div className="flex items-center justify-between gap-3 py-4 text-sm"><Button variant="outline" disabled={page<=1} onClick={()=>onChange(page-1)}>Previous</Button><span className="text-muted-foreground">Page {page} of {pages} · {count} results</span><Button variant="outline" disabled={page>=pages} onClick={()=>onChange(page+1)}>Next</Button></div>
}
