import { Bar, BarChart, CartesianGrid, XAxis, Tooltip } from 'recharts'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { MoreHorizontal } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState } from 'react'

import { ChartContainer } from '@/components/ui/chart'
import type { ChartConfig } from '@/components/ui/chart'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { itemMotion, listMotion, pageMotion, tapMotion } from './animations'
import { formatCompactMoney, formatMoney } from './format'
import { groupTransactions, summarizeTransactions } from './metrics'
import type { Period, Transaction } from '@/server/trpc/types'

const chartConfig = {
  spent: { label: 'Spent', color: 'var(--primary)' },
  gained: { label: 'Gained', color: 'var(--chart-profit)' },
} satisfies ChartConfig

type TransactionsPanelProps = {
  transactions: Transaction[]
  onEdit?: (transaction: Transaction) => void
  onDelete?: (id: string) => void
}

export function TransactionsPanel({
  transactions,
  onEdit,
  onDelete,
}: TransactionsPanelProps) {
  const [period, setPeriod] = useState<Period>('month')
  const summary = useMemo(
    () => summarizeTransactions(transactions),
    [transactions],
  )
  const chartData = useMemo(
    () => groupTransactions(transactions, period),
    [period, transactions],
  )
  const currency = transactions[0]?.currency ?? 'USD'
  const hasTransactions = transactions.length > 0

  return (
    <motion.section className="grid min-w-0 gap-6" {...pageMotion}>
      <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <p className="text-sm text-muted-foreground">Selected period</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:flex">
            <Metric label="Spent" value={formatMoney(summary.spent, currency)} />
            <Metric
              label="Gained"
              value={formatMoney(summary.gained, currency)}
            />
          </div>
        </div>
        <Tabs
          value={period}
          onValueChange={(value) => setPeriod(value as Period)}
        >
          <TabsList className="grid w-full grid-cols-4 md:w-auto">
            {(['day', 'week', 'month', 'year'] as const).map((item) => (
              <TabsTrigger key={item} value={item} asChild>
                <motion.button type="button" {...tapMotion}>
                  {item[0].toUpperCase()}
                  {item.slice(1)}
                </motion.button>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="overflow-hidden rounded-xl border bg-card/60 p-4 shadow-sm backdrop-blur-sm">
        {hasTransactions ? (
          <ChartContainer
            config={chartConfig}
            className="h-[220px] w-full max-w-full sm:h-[280px]"
          >
            <BarChart
              data={chartData}
              accessibilityLayer
              margin={{ top: 8, right: 4, left: 4, bottom: 4 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                fontSize={11}
                interval="preserveStartEnd"
                minTickGap={16}
              />
              <Tooltip content={<MoneyTooltip currency={currency} />} />
              <Bar
                dataKey="spent"
                fill="var(--color-spent)"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
                animationDuration={700}
              />
              <Bar
                dataKey="gained"
                fill="var(--color-gained)"
                radius={[6, 6, 0, 0]}
                maxBarSize={28}
                animationDuration={700}
              />
            </BarChart>
          </ChartContainer>
        ) : (
          <EmptyChart />
        )}
      </div>

      <motion.div
        className="grid gap-1"
        variants={listMotion}
        initial="hidden"
        animate="show"
      >
        {hasTransactions ? (
          transactions.map((transaction, index) => (
            <motion.div key={transaction.id} variants={itemMotion} layout>
              <div className="group flex items-center gap-1 rounded-md px-2 py-3 transition-colors hover:bg-muted/30">
                <button
                  type="button"
                  className="flex-1 cursor-pointer text-left"
                  onClick={() => onEdit?.(transaction)}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-lg">
                      {transaction.categoryIcon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="truncate font-medium">
                          {transaction.categoryName}
                        </p>
                        {transaction.labels.map((label) => (
                          <span
                            key={label}
                            className="max-w-28 truncate text-xs text-muted-foreground sm:max-w-none"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                      <p className="truncate text-sm text-muted-foreground">
                        {transaction.operationDate}
                        {transaction.note ? ` · ${transaction.note}` : ''}
                      </p>
                    </div>
                    <p
                      className={
                        transaction.type === 'income'
                          ? 'shrink-0 text-right text-sm font-semibold text-emerald-700 sm:text-base'
                          : 'shrink-0 text-right text-sm font-semibold sm:text-base'
                      }
                    >
                      {transaction.type === 'income' ? '+' : '-'}
                      {formatCompactMoney(
                        transaction.amountMinor,
                        transaction.currency,
                      )}
                    </p>
                  </div>
                </button>
                {onDelete ? (
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
                    <PopoverContent align="end" className="w-40 p-1">
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-destructive hover:bg-muted"
                        onClick={() => onDelete(transaction.id)}
                      >
                        Delete
                      </button>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
              {index < transactions.length - 1 ? <Separator /> : null}
            </motion.div>
          ))
        ) : (
          <motion.div
            className="rounded-md border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground"
            variants={itemMotion}
          >
            There are no transactions for this period.
          </motion.div>
        )}
      </motion.div>
    </motion.section>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <motion.div
      className="min-w-0 rounded-md border bg-card px-3 py-2"
      {...tapMotion}
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-lg font-semibold tabular-nums sm:text-xl">
        {value}
      </p>
    </motion.div>
  )
}

function MoneyTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color: string
    dataKey: string
  }>
  label?: string
  currency?: string
}) {
  if (!active || !payload?.length) return null

  const safeCurrency = currency ?? 'USD'

  return (
    <div className="grid min-w-36 gap-1.5 rounded-xl border border-border/60 bg-background/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-sm">
      <p className="font-medium text-muted-foreground">{label}</p>
      <div className="grid gap-1.5">
        {payload.map((entry) => {
          const isSpent = entry.dataKey === 'spent'
          return (
            <div key={entry.name} className="flex items-center gap-2">
              <div
                className="grid size-5 place-items-center rounded-md"
                style={{
                  background: isSpent
                    ? 'color-mix(in oklab, var(--primary) 15%, transparent)'
                    : 'color-mix(in oklab, var(--chart-profit) 15%, transparent)',
                  color: isSpent
                    ? 'var(--primary)'
                    : 'var(--chart-profit)',
                }}
              >
                {isSpent ? (
                  <TrendingDown className="size-3" />
                ) : (
                  <TrendingUp className="size-3" />
                )}
              </div>
              <span className="text-muted-foreground">
                {isSpent ? 'Spent' : 'Gained'}
              </span>
              <span className="ml-auto font-mono font-semibold tabular-nums">
                {isSpent ? '-' : '+'}
                {formatCompactMoney(
                  Math.round(Math.abs(entry.value) * 100),
                  safeCurrency,
                )}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function EmptyChart() {
  return (
    <div className="grid min-h-[220px] place-items-center px-3 py-6 text-center">
      <div className="grid max-w-sm gap-4">
        <div className="mx-auto flex h-28 w-52 items-end justify-center gap-2 rounded-md bg-muted/40 px-5 pb-5">
          {[34, 58, 42, 76, 50, 88, 62].map((height, index) => (
            <motion.span
              key={height}
              className="w-4 rounded-t-full bg-primary/25"
              initial={{ height: 4, opacity: 0 }}
              animate={{ height: `${height}%`, opacity: 0.45 + index * 0.06 }}
              transition={{ delay: index * 0.04, duration: 0.35 }}
              style={{
                height: `${height}%`,
              }}
            />
          ))}
        </div>
        <div>
          <p className="font-medium">
            There are no transactions for this period
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add income or expenses and the chart will fill this view.
          </p>
        </div>
      </div>
    </div>
  )
}
