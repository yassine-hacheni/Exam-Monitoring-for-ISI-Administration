import { createFileRoute } from '@tanstack/react-router'
import HistoryPage from '@/features/AffectationManuelle'

export const Route = createFileRoute('/_authenticated/AffectationManuelle/')({
  component: HistoryPage,
})