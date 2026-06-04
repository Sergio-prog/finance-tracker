import {
  BarChart3,
  Bell,
  CreditCard,
  Loader2,
  ReceiptText,
  Settings,
} from 'lucide-react'
import { MotionConfig, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { pageMotion } from './animations'
import { OperationDialog } from './OperationDialog'
import { SettingsPanel } from './SettingsPanel'
import { SubscriptionsPanel } from './SubscriptionsPanel'
import {
  getInitialAccent,
  getInitialBackground,
  getInitialBgAnimation,
  isThemeMode,
  resolveThemeMode,
} from './theme'
import { TransactionsPanel } from './TransactionsPanel'
import { useFinanceData } from './useFinanceData'
import type { Accent, Background, ThemeMode } from './theme'
import type { Subscription, Transaction } from '@/server/trpc/types'

const darkModeQuery = '(prefers-color-scheme: dark)'

function getInitialThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'

  const storedTheme = window.localStorage.getItem('theme')

  return isThemeMode(storedTheme) ? storedTheme : 'dark'
}

export function FinanceApp() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode)
  const [accent, setAccent] = useState<Accent>(getInitialAccent)
  const [background, setBackground] = useState<Background>(getInitialBackground)
  const [bgAnimation, setBgAnimation] = useState<boolean>(getInitialBgAnimation)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [editingSub, setEditingSub] = useState<Subscription | null>(null)
  const {
    profile,
    categories,
    transactions,
    subscriptions,
    labels,
    apiKeyInfo,
    isLoading,
    error,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    addCategory,
    addLabel,
    removeLabel,
    saveProfile,
    regenerateApiKey,
    revokeApiKey,
  } = useFinanceData()
  const labelOptions = useMemo(
    () => labels.map((label) => label.name),
    [labels],
  )

  useEffect(() => {
    function applyTheme() {
      document.documentElement.classList.toggle(
        'dark',
        resolveThemeMode(themeMode) === 'dark',
      )
    }

    applyTheme()
    window.localStorage.setItem('theme', themeMode)

    if (themeMode !== 'system') return

    const mediaQuery = window.matchMedia(darkModeQuery)
    mediaQuery.addEventListener('change', applyTheme)

    return () => mediaQuery.removeEventListener('change', applyTheme)
  }, [themeMode])

  useEffect(() => {
    document.documentElement.dataset.accent = accent
    window.localStorage.setItem('accent', accent)
  }, [accent])

  useEffect(() => {
    document.documentElement.dataset.background = background
    window.localStorage.setItem('background', background)
  }, [background])

  useEffect(() => {
    window.localStorage.setItem('bgAnimation', String(bgAnimation))
  }, [bgAnimation])

  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider>
        <main className="relative min-h-svh">
          <div
            aria-hidden="true"
            className="bg-layer fixed inset-0 -z-10"
            style={{ backgroundImage: 'var(--app-background)' }}
            data-bg-layout={background}
            data-bg-animation={bgAnimation ? 'true' : 'false'}
          />
          <motion.div
            className="mx-auto grid min-h-svh w-full max-w-[1680px] grid-rows-[auto_1fr] px-4 py-4 pb-24 sm:px-5 md:px-6 md:pb-4 lg:px-6"
            {...pageMotion}
          >
            <header className="flex items-center justify-between gap-3 border-b pb-4">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.svg"
                  alt="Ledger"
                  className="size-10 shrink-0"
                />
                <div>
                  <h1 className="text-xl font-semibold tracking-normal">
                    Ledger
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Expenses, income, and recurring services
                  </p>
                </div>
              </div>
              <div className="hidden items-center gap-2 md:flex">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Notifications"
                >
                  <Bell />
                </Button>
              </div>
            </header>

            <Tabs
              defaultValue="transactions"
              className="grid min-h-0 gap-4 pt-4"
            >
              <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)] xl:gap-8">
                <aside className="hidden lg:block">
                  <TabsList className="grid grid-cols-1 h-auto w-full gap-2 bg-transparent p-0">
                    <NavItem value="transactions" icon={<ReceiptText />}>
                      Transactions
                    </NavItem>
                    <NavItem value="subscriptions" icon={<CreditCard />}>
                      Subscriptions
                    </NavItem>
                    <NavItem value="settings" icon={<Settings />}>
                      Settings
                    </NavItem>
                  </TabsList>
                </aside>

                <section className="min-w-0">
                  {isLoading ? (
                    <div className="grid min-h-80 place-items-center rounded-md border bg-card">
                      <Loader2 className="size-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <>
                      <TabsContent value="transactions" className="m-0">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="flex items-center gap-2 font-medium">
                            <BarChart3 className="size-4" />
                            Transactions
                          </p>
                          <OperationDialog
                            categories={categories}
                            labelOptions={labelOptions}
                            onCreate={addTransaction}
                            onCreateCategory={addCategory}
                            onAddLabel={addLabel}
                            initial={editingTx}
                            onUpdate={updateTransaction}
                            onDelete={deleteTransaction}
                            onClose={() => setEditingTx(null)}
                          />
                        </div>
                        {error ? (
                          <StatusMessage message={error} />
                        ) : (
                          <TransactionsPanel
                            transactions={transactions}
                            onEdit={setEditingTx}
                            onDelete={deleteTransaction}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="subscriptions" className="m-0">
                        {error ? (
                          <StatusMessage message={error} />
                        ) : (
                          <SubscriptionsPanel
                            categories={categories}
                            subscriptions={subscriptions}
                            onCreate={addSubscription}
                            onCreateCategory={addCategory}
                            onEdit={setEditingSub}
                            onDelete={deleteSubscription}
                            editingSub={editingSub}
                            onUpdate={updateSubscription}
                            onCloseDialog={() => setEditingSub(null)}
                          />
                        )}
                      </TabsContent>
                      <TabsContent value="settings" className="m-0">
                        <SettingsPanel
                          themeMode={themeMode}
                          onThemeModeChange={setThemeMode}
                          accent={accent}
                          onAccentChange={setAccent}
                          background={background}
                          onBackgroundChange={setBackground}
                          bgAnimation={bgAnimation}
                          onBgAnimationChange={setBgAnimation}
                          profile={profile}
                          labels={labels}
                          onAddLabel={addLabel}
                          onRemoveLabel={removeLabel}
                          onSaveProfile={saveProfile}
                          apiKeyInfo={apiKeyInfo}
                          onRegenerateApiKey={regenerateApiKey}
                          onRevokeApiKey={revokeApiKey}
                        />
                      </TabsContent>
                    </>
                  )}
                </section>
              </div>

              <nav className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 backdrop-blur pb-[env(safe-area-inset-bottom)] lg:hidden">
                <TabsList className="grid w-full grid-cols-3 gap-0 rounded-none bg-transparent p-0">
                  <TabsTrigger
                    value="transactions"
                    className="flex-col gap-0.5 py-2 data-[state=active]:bg-background"
                  >
                    <ReceiptText className="size-5" />
                    <span className="text-[10px] leading-tight">Transactions</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="subscriptions"
                    className="flex-col gap-0.5 py-2 data-[state=active]:bg-background"
                  >
                    <CreditCard className="size-5" />
                    <span className="text-[10px] leading-tight">Subscriptions</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="settings"
                    className="flex-col gap-0.5 py-2 data-[state=active]:bg-background"
                  >
                    <Settings className="size-5" />
                    <span className="text-[10px] leading-tight">Settings</span>
                  </TabsTrigger>
                </TabsList>
              </nav>
            </Tabs>
          </motion.div>
        </main>
      </TooltipProvider>
    </MotionConfig>
  )
}

function StatusMessage({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {message}
    </div>
  )
}

function NavItem({
  value,
  icon,
  children,
}: {
  value: string
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <TabsTrigger
      value={value}
      asChild
      className="h-12 w-full justify-start gap-3 px-4 text-left data-[state=active]:bg-card data-[state=active]:shadow-sm [&_svg]:size-5"
    >
      <motion.button>
        {icon}
        <span className="min-w-0 truncate">{children}</span>
      </motion.button>
    </TabsTrigger>
  )
}
