import {
  Calendar,
  CheckCircle2,
  ExternalLink,
  Gift,
  MoreHorizontal,
  RotateCcw,
  ShoppingCart,
  Trash2,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { itemMotion, listMotion, pageMotion } from '@/features/finance/animations'
import { formatMoney, buildRateMap, convertAmountMinor } from '@/features/finance/format'
import { WishlistDialog } from './WishlistDialog'
import type { Category, ExchangeRateEntry, WishlistItem } from '@/server/trpc/types'

type WishlistPanelProps = {
  categories: Category[]
  items: WishlistItem[]
  mainCurrency?: string
  exchangeRates?: ExchangeRateEntry[]
  onCreate: (input: {
    title: string
    description?: string
    imageUrl?: string
    url?: string
    plannedDate?: string
    amount?: number
    currency?: string
    categoryId?: string
  }) => Promise<void>
  onUpdate: (input: {
    id: string
    title?: string
    description?: string
    imageUrl?: string
    url?: string
    plannedDate?: string
    isBought?: boolean
    amount?: number
    currency?: string
    categoryId?: string
    createTransaction?: boolean
  }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function WishlistPanel({
  categories,
  items,
  mainCurrency = 'USD',
  exchangeRates = [],
  onCreate,
  onUpdate,
  onDelete,
}: WishlistPanelProps) {
  const [editingItem, setEditingItem] = useState<WishlistItem | null>(null)
  const [markingBought, setMarkingBought] = useState<string | null>(null)

  const rateMap = useMemo(
    () => buildRateMap(exchangeRates),
    [exchangeRates],
  )

  const active = items.filter((w) => !w.isBought)
  const bought = items.filter((w) => w.isBought)
  const totalValue = items
    .filter((w) => !w.isBought && w.amountMinor && w.currency)
    .reduce((sum, w) => {
      if (w.currency === mainCurrency) return sum + (w.amountMinor ?? 0)
      const converted = convertAmountMinor(
        w.amountMinor!,
        w.currency!,
        mainCurrency,
        rateMap,
      )
      return sum + (converted ?? w.amountMinor ?? 0)
    }, 0)

  async function handleMarkBought(item: WishlistItem, createTx: boolean) {
    setMarkingBought(item.id)
    try {
      await onUpdate({
        id: item.id,
        isBought: true,
        createTransaction: createTx && Boolean(item.amountMinor && item.currency),
      })
    } finally {
      setMarkingBought(null)
    }
  }

  async function handleUnmarkBought(item: WishlistItem) {
    setMarkingBought(item.id)
    try {
      await onUpdate({
        id: item.id,
        isBought: false,
      })
    } finally {
      setMarkingBought(null)
    }
  }

  return (
    <motion.section className="grid gap-6" {...pageMotion}>
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">
            {active.length} {active.length === 1 ? 'wish' : 'wishes'} active
            {bought.length > 0 && ` · ${bought.length} bought`}
          </p>
          {totalValue > 0 ? (
            <p className="mt-2 text-lg font-semibold tabular-nums sm:text-xl">
              ~{formatMoney(totalValue, mainCurrency)} total
            </p>
          ) : null}
        </div>
        <WishlistDialog
          categories={categories}
          onCreate={onCreate}
          initial={editingItem ?? undefined}
          onUpdate={async (input) => {
            await onUpdate(input)
            setEditingItem(null)
          }}
          onDelete={async (id) => {
            await onDelete(id)
            setEditingItem(null)
          }}
          onClose={() => setEditingItem(null)}
        />
      </div>

      <motion.div
        className="grid content-start gap-1"
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        {active.length > 0 ? (
          <>
            <p className="px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Wishlist
            </p>
            {active.map((item, index) => (
              <WishlistItemRow
                key={item.id}
                item={item}
                index={index}
                total={active.length}
                onEdit={setEditingItem}
                onDelete={onDelete}
                onMarkBought={(createTx) => handleMarkBought(item, createTx)}
                isMarking={markingBought === item.id}
                mainCurrency={mainCurrency}
                rateMap={rateMap}
              />
            ))}
          </>
        ) : null}

        {bought.length > 0 ? (
          <>
            <p className="mt-2 px-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Bought
            </p>
            {bought.map((item, index) => (
              <WishlistItemRow
                key={item.id}
                item={item}
                index={index}
                total={bought.length}
                onEdit={setEditingItem}
                onDelete={onDelete}
                onUnmarkBought={() => handleUnmarkBought(item)}
                isBought
                isMarking={markingBought === item.id}
                mainCurrency={mainCurrency}
                rateMap={rateMap}
              />
            ))}
          </>
        ) : null}

        {items.length === 0 ? (
          <motion.div
            className="grid min-h-52 place-items-center rounded-md border border-dashed bg-muted/20 p-6 text-center"
            variants={itemMotion}
          >
            <div className="grid max-w-xs gap-3 justify-items-center">
              <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
                <Gift className="size-5" />
              </div>
              <div>
                <p className="font-medium">Your wishlist is empty</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add things you want to buy — track prices, plan dates, and
                  create transactions when you purchase them.
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </motion.div>
    </motion.section>
  )
}

function WishlistItemRow({
  item,
  index,
  total,
  onEdit,
  onDelete,
  onMarkBought,
  onUnmarkBought,
  isMarking,
  isBought,
  mainCurrency,
  rateMap,
}: {
  item: WishlistItem
  index: number
  total: number
  onEdit: (item: WishlistItem) => void
  onDelete: (id: string) => Promise<void>
  onMarkBought?: (createTx: boolean) => void
  onUnmarkBought?: () => void
  isMarking?: boolean
  isBought?: boolean
  mainCurrency: string
  rateMap: Record<string, number>
}) {
  const isConverted =
    !isBought &&
    item.currency !== null &&
    item.currency !== mainCurrency
  const convertedAmount =
    isConverted && item.amountMinor && item.currency
      ? convertAmountMinor(
          item.amountMinor,
          item.currency,
          mainCurrency,
          rateMap,
        )
      : null
  return (
    <motion.div variants={itemMotion} layout>
      <div
        className={`group flex items-center gap-3 rounded-md px-2 py-3 transition-colors hover:bg-muted/30 ${isBought ? 'opacity-60' : ''}`}
      >
        {/* Image thumbnail */}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="size-12 shrink-0 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-12 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Gift className="size-5" />
          </div>
        )}

        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer text-left"
          onClick={() => onEdit(item)}
        >
          <div className="flex items-center gap-2">
            <p
              className={`truncate font-medium ${isBought ? 'line-through' : ''}`}
            >
              {item.title}
            </p>
            {isBought ? (
              <Badge variant="outline" className="shrink-0 gap-1">
                <CheckCircle2 className="size-3" />
                Bought
              </Badge>
            ) : null}
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {item.amountMinor && item.currency ? (
              <span className="font-medium tabular-nums text-foreground">
                {formatMoney(item.amountMinor, item.currency)}
                {isConverted && convertedAmount !== null ? (
                  <span
                    className="ml-1 text-xs text-muted-foreground"
                    title={`1 ${item.currency} = ${(convertedAmount / item.amountMinor!).toFixed(4)} ${mainCurrency}`}
                  >
                    ≈ {formatMoney(convertedAmount, mainCurrency)}
                  </span>
                ) : null}
              </span>
            ) : null}
            {item.plannedDate ? (
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" />
                {item.plannedDate}
              </span>
            ) : null}
            {item.description ? (
              <span className="hidden truncate sm:inline">
                {item.description}
              </span>
            ) : null}
          </div>
        </button>

        {/* Actions */}
        {isBought && onUnmarkBought ? (
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1 px-2.5 text-xs"
            onClick={(e) => {
              e.stopPropagation()
              onUnmarkBought()
            }}
            disabled={isMarking}
          >
            <RotateCcw className="size-3.5" />
            <span className="hidden sm:inline">Return</span>
          </Button>
        ) : null}

        {!isBought && onMarkBought ? (
          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 px-2.5 text-xs"
              onClick={(e) => {
                e.stopPropagation()
                onMarkBought(false)
              }}
              disabled={isMarking}
            >
              <CheckCircle2 className="size-3.5" />
              <span className="hidden sm:inline">Bought</span>
            </Button>
            {item.amountMinor && item.currency ? (
              <Button
                size="sm"
                className="h-8 gap-1 px-2.5 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkBought(true)
                }}
                disabled={isMarking}
              >
                <ShoppingCart className="size-3.5" />
                <span className="hidden sm:inline">Buy & Tx</span>
              </Button>
            ) : null}
          </div>
        ) : null}

        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
              onClick={(e) => e.stopPropagation()}
              aria-label="More options"
            >
              <MoreHorizontal className="size-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="size-4" />
                Open link
              </a>
            ) : null}
            {isBought && onUnmarkBought ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation()
                  onUnmarkBought()
                }}
              >
                <RotateCcw className="size-4" />
                Return to wishlist
              </button>
            ) : null}
            {onMarkBought && !isBought ? (
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkBought(false)
                }}
              >
                <CheckCircle2 className="size-4" />
                Mark bought
              </button>
            ) : null}
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(item.id)
              }}
            >
              <Trash2 className="size-4" />
              Delete
            </button>
          </PopoverContent>
        </Popover>
      </div>
      {index < total - 1 ? <Separator /> : null}
    </motion.div>
  )
}
