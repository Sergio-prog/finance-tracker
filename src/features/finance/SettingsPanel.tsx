import { LogIn, LogOut, Moon, Monitor, PlusCircle, Sun, Tags, Trash2 } from 'lucide-react'
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
import type { ThemeMode } from './theme'
import { supabase } from '@/lib/supabase'

type SettingsPanelProps = {
  themeMode: ThemeMode
  onThemeModeChange: (themeMode: ThemeMode) => void
  profile: Profile
  labels: Label[]
  onAddLabel: (input: { name: string }) => Promise<void>
  onRemoveLabel: (input: { id: string }) => Promise<void>
  onSaveProfile: (input: { defaultCurrency?: string }) => Promise<void>
}

export function SettingsPanel({
  themeMode,
  onThemeModeChange,
  profile,
  labels,
  onAddLabel,
  onRemoveLabel,
  onSaveProfile,
}: SettingsPanelProps) {
  const [user, setUser] = useState<User | null>(null)
  const [labelDraft, setLabelDraft] = useState('')
  const [addingLabel, setAddingLabel] = useState(false)

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
          <Separator />
          <div className="grid gap-3">
            <div>
              <p className="font-medium">Theme</p>
              <p className="text-sm text-muted-foreground">
                Choose app appearance for this device.
              </p>
            </div>
            <ThemeModePicker
              value={themeMode}
              onValueChange={onThemeModeChange}
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
