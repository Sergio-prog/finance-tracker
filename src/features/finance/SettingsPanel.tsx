import { Copy, Key, LogIn, LogOut, Moon, Monitor, PlusCircle, RefreshCw, Shield, Sun, Tags, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { itemMotion, listMotion, pageMotion, springTransition, tapMotion } from './animations'
import { cn } from '@/lib/utils'
import { currencies } from './currency'
import type { Label, Profile } from '@/server/trpc/types'
import type { Accent, Background, ThemeMode } from './theme'
import { accentLabels, accents, backgrounds } from './theme'
import { supabase } from '@/lib/supabase'
import type { ApiKeyInfo } from './useFinanceData'

type SettingsPanelProps = {
  themeMode: ThemeMode
  onThemeModeChange: (themeMode: ThemeMode) => void
  accent: Accent
  onAccentChange: (accent: Accent) => void
  background: Background
  onBackgroundChange: (background: Background) => void
  profile: Profile
  labels: Label[]
  onAddLabel: (input: { name: string }) => Promise<void>
  onRemoveLabel: (input: { id: string }) => Promise<void>
  onSaveProfile: (input: { defaultCurrency?: string }) => Promise<void>
  apiKeyInfo: ApiKeyInfo | null
  onRegenerateApiKey: () => Promise<{ apiKey: string; prefix: string }>
  onRevokeApiKey: () => Promise<void>
}

export function SettingsPanel({
  themeMode,
  onThemeModeChange,
  accent,
  onAccentChange,
  background,
  onBackgroundChange,
  profile,
  labels,
  onAddLabel,
  onRemoveLabel,
  onSaveProfile,
  apiKeyInfo,
  onRegenerateApiKey,
  onRevokeApiKey,
}: SettingsPanelProps) {
  const [user, setUser] = useState<User | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)
  const [apiKeyReveal, setApiKeyReveal] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [apiKeyLoading, setApiKeyLoading] = useState(false)

  useEffect(() => {
    if (!supabase) return

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => data.subscription.unsubscribe()
  }, [])

  async function signInWithGoogle() {
    if (!supabase) return

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
  }

  async function signOut() {
    await supabase?.auth.signOut()
  }

  async function handleAddLabel() {
    const name = labelDraft.trim()
    if (!name) return

    setAddingLabel(true)
    try {
      await onAddLabel({ name })
      setLabelDraft('')
    } finally {
      setAddingLabel(false)
    }
  }

  async function handleRegenerateApiKey() {
    setApiKeyLoading(true)
    try {
      const result = await onRegenerateApiKey()
      setApiKeyReveal(result.apiKey)
      setCopied(false)
    } finally {
      setApiKeyLoading(false)
    }
  }

  async function handleRevokeApiKey() {
    setApiKeyLoading(true)
    try {
      await onRevokeApiKey()
      setApiKeyReveal(null)
    } finally {
      setApiKeyLoading(false)
    }
  }

  async function handleCopyKey() {
    if (!apiKeyReveal) return
    await navigator.clipboard.writeText(apiKeyReveal)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.section className="grid gap-6" {...pageMotion}>
      <div className="grid content-start gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Account</p>
          <h2 className="text-2xl font-semibold">Settings</h2>
        </div>
        <div className="grid gap-4 rounded-md border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">Google login</p>
              <p className="text-sm text-muted-foreground">
                {user ? user.email : 'Connect Supabase keys to enable OAuth.'}
              </p>
            </div>
            {user ? (
              <Button variant="outline" onClick={signOut}>
                <LogOut />
                Sign out
              </Button>
            ) : (
              <Button onClick={signInWithGoogle} disabled={!supabase}>
                <LogIn />
                Google
              </Button>
            )}
          </div>
          <Separator />
          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <div>
              <p className="font-medium">Default currency</p>
              <p className="text-sm text-muted-foreground">
                Used for summaries and new forms.
              </p>
            </div>
            <Select
              value={profile.defaultCurrency}
              onValueChange={(value) => onSaveProfile({ defaultCurrency: value })}
            >
              <SelectTrigger className="w-full sm:w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    {currency.symbol} {currency.code}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Appearance mode for this device.
              </p>
            </div>
            <ThemeModePicker
              value={themeMode}
              onValueChange={onThemeModeChange}
            />
          </div>
          <Separator />
          <div className="grid gap-3">
            <div>
              <p className="font-medium">Accent color</p>
              <p className="text-sm text-muted-foreground">
                Primary accent for buttons, charts, and highlights.
              </p>
            </div>
            <AccentPicker value={accent} onValueChange={onAccentChange} />
          </div>
          <Separator />
          <div className="grid gap-3">
            <div>
              <p className="font-medium">Background</p>
              <p className="text-sm text-muted-foreground">
                Background style for the app.
              </p>
            </div>
            <BackgroundPicker
              value={background}
              onValueChange={onBackgroundChange}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Install mode</p>
              <p className="text-sm text-muted-foreground">
                Manifest is configured for standalone usage.
              </p>
            </div>
            <Switch defaultChecked />
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Labels</p>
                <p className="text-sm text-muted-foreground">
                  Manage your labels. They appear in the add transaction form.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={labelDraft}
                maxLength={32}
                placeholder="Add label"
                onChange={(event) => setLabelDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    handleAddLabel()
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                disabled={addingLabel || !labelDraft.trim()}
                onClick={handleAddLabel}
              >
                <PlusCircle />
                Add
              </Button>
            </div>
            <motion.div
              className="flex flex-wrap gap-2"
              variants={listMotion}
              initial="hidden"
              animate="show"
            >
              {labels.length > 0 ? (
                labels.map((label) => (
                  <motion.div key={label.id} variants={itemMotion} layout>
                    <Badge variant="secondary" className="rounded-full gap-1.5 px-3 py-1">
                      <Tags className="size-3" />
                      {label.name}
                      <button
                        type="button"
                        aria-label={`Remove ${label.name}`}
                        className="ml-0.5 rounded-full hover:bg-muted-foreground/20"
                        onClick={() => onRemoveLabel({ id: label.id })}
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </Badge>
                  </motion.div>
                ))
              ) : (
                <p className="py-3 text-sm text-muted-foreground">
                  No labels yet. Add your first one.
                </p>
              )}
            </motion.div>
          </div>
        </div>

        <div className="rounded-md border bg-card p-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">API Key</p>
                <p className="text-sm text-muted-foreground">
                  Give this key to agents or integrations.
                </p>
              </div>
              <Shield className="size-4 text-muted-foreground" />
            </div>

            {apiKeyReveal ? (
              <div className="grid gap-3">
                <div className="rounded-md border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-700">
                  Copy this key now — you will not be able to see it again.
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    value={apiKeyReveal}
                    readOnly
                    className="font-mono text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyKey}
                  >
                    {copied ? <span className="text-xs">✓</span> : <Copy className="size-4" />}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setApiKeyReveal(null)}
                >
                  <Key className="size-4" />
                  Hide key
                </Button>
              </div>
            ) : apiKeyInfo?.prefix ? (
              <div className="grid gap-3">
                <div className="flex items-center gap-2 rounded-md bg-muted px-3 py-2">
                  <Key className="size-4 text-muted-foreground" />
                  <span className="font-mono text-sm">
                    {apiKeyInfo.prefix}••••••••••••••••••••••••••••••••••
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={apiKeyLoading}
                    onClick={handleRegenerateApiKey}
                    className="flex-1"
                  >
                    <RefreshCw className="size-4" />
                    Regenerate
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={apiKeyLoading}
                    onClick={handleRevokeApiKey}
                    className="flex-1"
                  >
                    <Trash2 className="size-4" />
                    Revoke
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                <p className="text-sm text-muted-foreground">
                  No API key active. Generate one to let agents access your data.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={apiKeyLoading}
                  onClick={handleRegenerateApiKey}
                >
                  <Key className="size-4" />
                  Generate API key
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  )
}

const themeOptions = [
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'system', label: 'System', icon: Monitor },
] satisfies {
  value: ThemeMode
  label: string
  icon: React.ComponentType<{ className?: string }>
}[]

const accentColors: Record<Accent, string> = {
  default: 'oklch(0.58 0.145 58)',
  emerald: 'oklch(0.55 0.18 155)',
  sky: 'oklch(0.55 0.16 240)',
  violet: 'oklch(0.55 0.2 290)',
  rose: 'oklch(0.55 0.18 360)',
}

function AccentPicker({
  value,
  onValueChange,
}: {
  value: Accent
  onValueChange: (value: Accent) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Accent color"
      className="grid grid-cols-5 gap-2"
    >
      {accents.map((accent) => {
        const selected = accent === value

        return (
          <motion.button
            key={accent}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border-2 px-2 py-3 transition-all',
              selected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-transparent hover:border-border',
            )}
            {...tapMotion}
            onClick={() => onValueChange(accent)}
          >
            <span
              className="size-6 rounded-full ring-1 ring-inset ring-black/10"
              style={{ background: accentColors[accent] }}
            />
            <span
              className={cn(
                'text-xs leading-tight',
                selected ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {accentLabels[accent]}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

const backgroundHints: Record<Background, { ring: string; label: string }> = {
  default: { ring: 'bg-gradient-to-b from-primary/40 to-transparent', label: 'Gradient' },
  subtle: { ring: 'bg-muted-foreground/20', label: 'Solid' },
  warm: { ring: 'bg-gradient-to-b from-amber-500/30 to-transparent', label: 'Warm' },
  cool: { ring: 'bg-gradient-to-b from-sky-500/30 to-transparent', label: 'Cool' },
}

function BackgroundPicker({
  value,
  onValueChange,
}: {
  value: Background
  onValueChange: (value: Background) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Background style"
      className="grid grid-cols-4 gap-2"
    >
      {backgrounds.map((bg) => {
        const selected = bg === value
        const hint = backgroundHints[bg]

        return (
          <motion.button
            key={bg}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg border-2 bg-card px-2 py-2.5 transition-all',
              selected
                ? 'border-primary shadow-sm'
                : 'border-transparent hover:border-border',
            )}
            {...tapMotion}
            onClick={() => onValueChange(bg)}
          >
            <div
              className={cn(
                'h-5 w-full rounded-sm ring-1 ring-inset ring-border',
                hint.ring,
              )}
            />
            <span
              className={cn(
                'text-xs leading-tight',
                selected ? 'font-medium text-foreground' : 'text-muted-foreground',
              )}
            >
              {hint.label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}

function ThemeModePicker({
  value,
  onValueChange,
}: {
  value: ThemeMode
  onValueChange: (value: ThemeMode) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="grid grid-cols-3 rounded-full bg-muted p-1"
    >
      {themeOptions.map((option) => {
        const Icon = option.icon
        const selected = option.value === value

        return (
          <motion.button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            className={cn(
              'relative inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition',
              selected
                ? 'text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
            {...tapMotion}
            onClick={() => onValueChange(option.value)}
          >
            {selected ? (
              <motion.span
                layoutId="theme-mode-indicator"
                className="absolute inset-0 rounded-full bg-background shadow-sm"
                transition={springTransition}
              />
            ) : null}
            <Icon className="relative size-4 shrink-0" />
            <span className="relative truncate">{option.label}</span>
          </motion.button>
        )
      })}
    </div>
  )
}
