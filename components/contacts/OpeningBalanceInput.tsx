'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

export type OpeningBalanceDirection = 'they_owe_us' | 'we_owe_them'

export function OpeningBalanceInput({ amount, direction, onAmount, onDirection }: {
  amount: string; direction: OpeningBalanceDirection
  onAmount: (value: string) => void; onDirection: (value: OpeningBalanceDirection) => void
}) {
  return <div className="space-y-2">
    <Label htmlFor="contact-opening-balance">Opening balance</Label>
    <Input id="contact-opening-balance" type="number" inputMode="decimal" min={0} step="0.01" placeholder="0.00" value={amount} onChange={event => onAmount(event.target.value)} />
    <Tabs value={direction} onValueChange={value => onDirection(value as OpeningBalanceDirection)}>
      <TabsList className="w-full"><TabsTrigger value="they_owe_us" className="flex-1 text-xs">They owe us</TabsTrigger><TabsTrigger value="we_owe_them" className="flex-1 text-xs">We owe them</TabsTrigger></TabsList>
    </Tabs>
    <p className="text-xs text-muted-foreground">Balance from before the entries in this app.</p>
  </div>
}
