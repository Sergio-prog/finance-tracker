# Plan 004: Add receipt photo uploads

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.

> **Drift check (run first)**: `git diff --stat d3d7ba8..HEAD -- src/features/finance/OperationDialog.tsx src/features/finance/FinanceApp.tsx src/server/trpc/repository.ts src/server/trpc/validators.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: direction
- **Planned at**: commit `1433604`, 2026-06-27 (refreshed during reconcile; originally `d3d7ba8`)

## Why this matters

The database schema (`src/server/db/schema.ts:78`) already has `photoUrl: text('photo_url')` on the transactions table. The zod validator accepts `photoUrl` as an optional URL string (`src/server/trpc/validators.ts:11`). The `OperationDialog` even renders an "Attach receipt photo" label with a file input (`src/features/finance/OperationDialog.tsx:322-330`). But the dialog always passes `photoUrl: ''` and never handles file selection or upload. This plan closes the gap: file selection → Supabase Storage upload → store public URL → show thumbnail in the transaction list.

## Current state

- `src/lib/supabase.ts` — exports `supabase` (or null if keys missing). Already a full Supabase client with `.storage` available.
- `src/features/finance/OperationDialog.tsx:322-330` — has a file input label for photo but the input is hidden (`className="sr-only"`) and never handled:

```tsx
<label className="flex min-h-20 cursor-pointer items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
  <span className="inline-flex items-center gap-3">
    <ImagePlus className="size-5 text-primary" />
    Attach receipt photo
  </span>
  <ChevronRight className="size-4" />
  <Input
    name="photo"
    type="file"
    accept="image/*"
    className="sr-only"
  />
</label>
```

- `src/features/finance/OperationDialog.tsx:142-155` — `handleSubmit` always passes `photoUrl: ''` on both create and update.
- `src/server/trpc/validators.ts:11` — `photoUrl: z.string().url().optional().or(z.literal(''))`
- `src/server/trpc/repository.ts:354-356` — `createTransaction` stores `photoUrl: input.photoUrl || null`
- `src/server/trpc/repository.ts:637` — `updateTransaction` handles `photoUrl` set to null for empty string
- `src/server/trpc/types.ts:24` — `photoUrl?: string | null`
- `src/features/finance/TransactionsPanel.tsx` — renders each transaction row but does not show any photo.

Repo conventions:
- Supabase client imported via `import { supabase } from '@/lib/supabase'`
- File operations use async/await with try/catch
- UI components from `@/components/ui/*`
- Icons from `lucide-react`

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `bun x tsc --noEmit`     | exit 0              |
| Lint      | `bun run lint`           | exit 0              |

## Scope

**In scope**:
- `src/features/finance/OperationDialog.tsx` — handle file selection, upload to Supabase, pass URL
- `src/features/finance/TransactionsPanel.tsx` — show photo thumbnail in transaction rows

**Out of scope**:
- Creating the Supabase Storage bucket — **the user must do this manually** (see Step 1 note below)
- Image compression, OCR, or processing
- Photo uploads from the REST API (CLI)
- Editing photos after upload

## Supabase Storage setup (user must do this once)

Before this code works, the user needs to create a storage bucket in Supabase:

1. Open Supabase Dashboard → Storage → Create bucket
2. Name: `receipts`
3. Public bucket (or private with RLS — for simplicity, public is fine for a personal app)
4. Add a policy allowing authenticated users to insert objects

**Do NOT create the bucket yourself.** Write the code and tell the user to run the Supabase setup.

## Git workflow

- Branch: `advisor/004-receipt-photos`
- Commit style: conventional commits, e.g. `feat: add receipt photo upload with Supabase Storage`
- Do NOT push or open a PR unless told to.

## Steps

### Step 1: Add photo upload utility

Create `src/lib/upload.ts` with a function that uploads a file to Supabase Storage and returns the public URL:

```ts
import { supabase } from './supabase'

const BUCKET = 'receipts'

export async function uploadReceiptPhoto(
  file: File,
  userId: string,
  transactionId: string,
): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/${transactionId}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true })

  if (error) throw error

  const { data: publicUrl } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(path)

  return publicUrl.publicUrl
}

export async function deleteReceiptPhoto(userId: string, transactionId: string) {
  if (!supabase) return

  // Try common extensions; best-effort cleanup
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    await supabase.storage
      .from(BUCKET)
      .remove([`${userId}/${transactionId}.${ext}`])
      .catch(() => {})
  }
}
```

### Step 2: Update OperationDialog to handle file selection

In `src/features/finance/OperationDialog.tsx`:

1. Add a `const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)` state variable.
2. Add a `const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photoUrl ?? null)` state variable.
3. Add an `onChange` handler on the hidden file `<Input>` that:
   - Reads the selected file
   - Sets `selectedPhoto` to the file
   - Creates a preview URL via `URL.createObjectURL(file)` and sets `photoPreview`
4. Show the preview image when `photoPreview` is not null, replacing the dashed-border label:

```tsx
{photoPreview ? (
  <div className="relative overflow-hidden rounded-md border">
    <img
      src={photoPreview}
      alt="Receipt preview"
      className="h-32 w-full object-cover"
    />
    <button
      type="button"
      className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground hover:text-foreground"
      onClick={() => {
        setSelectedPhoto(null)
        setPhotoPreview(initial?.photoUrl ?? null)
      }}
      aria-label="Remove photo"
    >
      <CircleX className="size-4" />
    </button>
  </div>
) : (
  <label className="flex min-h-20 cursor-pointer items-center justify-between rounded-md border border-dashed border-border bg-muted/30 px-4 text-sm text-muted-foreground">
    <span className="inline-flex items-center gap-3">
      <ImagePlus className="size-5 text-primary" />
      Attach receipt photo
    </span>
    <ChevronRight className="size-4" />
    <Input
      name="photo"
      type="file"
      accept="image/*"
      className="sr-only"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) {
          setSelectedPhoto(file)
          setPhotoPreview(URL.createObjectURL(file))
        }
      }}
    />
  </label>
)}
```

5. Update `handleSubmit` to upload the file before calling `onCreate`/`onUpdate`:

```tsx
async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if (!selectedCategoryId) return

  setIsSaving(true)
  try {
    let photoUrl = initial?.photoUrl ?? ''

    if (selectedPhoto) {
      // Upload happens client-side; use current user's ID
      // The upload utility needs the user ID — pass it via a new prop or hardcode
      // For now, we'll store the file reference and upload inside the dialog
      // The user ID comes from... actually we need it as a prop or from supabase
    }

    // ... rest of submit logic
  } finally {
    setIsSaving(false)
  }
}
```

**Important**: The upload needs the current user's Supabase auth UID. The supabase client is already initialized in `src/lib/supabase.ts`. In the dialog, get the user ID from Supabase:

```tsx
function getUserId(): string | null {
  // Attempt to get the current user ID from supabase auth
  return null // placeholder
}
```

A cleaner approach: pass `userId: string | null` as a prop to `OperationDialog`. But the `FinanceApp.tsx` doesn't currently surface it. The simplest path: pass it from `FinanceApp.tsx` by calling `supabase?.auth.getSession()` in a `useEffect` and threading it down.

**Alternative simpler approach (recommended)**: Upload directly from `OperationDialog` using the supabase client that already works in the browser. Since the user is authenticated via Supabase Auth, the storage bucket policy will use their JWT. The file path uses `userId` from the session:

```tsx
// In handleSubmit, before onCreate/onUpdate:
if (selectedPhoto) {
  const { data: { session } } = await supabase!.auth.getSession()
  const userId = session?.user?.id
  if (!userId) throw new Error('Not authenticated')
  photoUrl = await uploadReceiptPhoto(selectedPhoto, userId, 'temp')
}
```

But we don't have the transaction ID yet on create (it's generated by the DB). So for create, upload with a temp filename and later rename. Actually, simpler: upload with a UUID we generate client-side:

```tsx
import { nanoid } from 'nanoid' // or just use crypto.randomUUID()
```

Actually, `crypto.randomUUID()` is available in modern browsers. Use that:

```tsx
const tempId = crypto.randomUUID()
photoUrl = await uploadReceiptPhoto(selectedPhoto, userId, tempId)
```

**Final recommended approach for step 2**:
- Import `uploadReceiptPhoto` from `@/lib/upload`
- In `handleSubmit`, before `onCreate/onUpdate`, check if `selectedPhoto` is set
- If so, generate a temp ID, get user ID from supabase session, upload, then pass the URL
- On update, if a new photo replaces an old one, delete the old photo first

### Step 3: Add photo thumbnail to TransactionsPanel

In `src/features/finance/TransactionsPanel.tsx`, in the transaction row rendering (around the categoryIcon div), add a small photo thumbnail if `transaction.photoUrl` is present:

```tsx
{transaction.photoUrl ? (
  <div className="shrink-0 size-10 overflow-hidden rounded-md bg-muted">
    <img
      src={transaction.photoUrl}
      alt=""
      className="size-full object-cover"
      loading="lazy"
    />
  </div>
) : (
  <div className="grid size-10 shrink-0 place-items-center rounded-md bg-muted text-lg">
    {transaction.categoryIcon}
  </div>
)}
```

This replaces the existing icon div when a photo is available (showing both icon and photo side-by-side would look cluttered).

Alternatively, show a small photo indicator icon next to the category name:

```tsx
{transaction.photoUrl && (
  <Image className="size-3.5 shrink-0 text-muted-foreground" />
)}
```

**Recommendation**: Show the photo as a small (size-8) thumbnail replacing the category icon. Add `Image` from `lucide-react` import.

### Step 4: Verify

```bash
bun x tsc --noEmit
bun run lint
```

Fix any type errors or lint violations.

## Test plan

Manual verification after Supabase Storage bucket `receipts` is created:

- [ ] Open "Add transaction" dialog — the "Attach receipt photo" label appears
- [ ] Click the label — file picker opens (accepts images only)
- [ ] Select an image — preview shows in the dialog with a remove button
- [ ] Submit the form — the transaction is created with the photo URL
- [ ] The transaction row shows a photo thumbnail instead of the category icon
- [ ] Edit the transaction — the photo preview loads from the stored URL
- [ ] Replace the photo with a new file — old photo is deleted from storage, new one is uploaded
- [ ] Remove the photo — `photoUrl` is cleared

## Done criteria

Machine-checkable:

- [ ] `bun x tsc --noEmit` exits 0
- [ ] `bun run lint` exits 0
- [ ] `src/lib/upload.ts` exists with exported `uploadReceiptPhoto` and `deleteReceiptPhoto`
- [ ] `grep -rn "uploadReceiptPhoto" src/features/finance/OperationDialog.tsx` returns a match
- [ ] `grep -rn "uploadReceiptPhoto" src/lib/upload.ts` returns a match
- [ ] No files outside the in-scope list are modified

## User setup required

After the code is written and deployed, the user must:
1. Go to Supabase Dashboard → Storage → Create bucket `receipts`
2. Set it as a public bucket
3. Add an INSERT policy for `auth.uid()` = owner
4. (Or use the SQL editor to create the bucket and policy)

## STOP conditions

Stop and report back (do not improvise) if:

- The `supabase` client is `null` (Supabase env vars not set). Upload cannot work — report that the user needs Supabase credentials configured.
- The file input inside a `<label>` doesn't trigger the hidden `<Input>` properly — test manually and fix the event binding.
- `crypto.randomUUID()` is not available (old browser) — use `Math.random().toString(36).substring(2, 15)` as fallback.

## Maintenance notes

- The `upsert: true` in `uploadReceiptPhoto` means uploading a new photo for the same transaction overwrites the old one. The `deleteReceiptPhoto` is called before upload when replacing.
- Storage costs are minimal for personal use. Supabase free tier includes 1GB of storage.
- The file extension is extracted from the original filename — this is safe for a personal app.
