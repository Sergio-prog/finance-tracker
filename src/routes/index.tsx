import { createFileRoute } from '@tanstack/react-router'

import { FinanceApp } from '@/features/finance/FinanceApp'

export const Route = createFileRoute('/')({ component: Home })

function Home() {
  return <FinanceApp />
}
