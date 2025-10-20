import { createFileRoute } from '@tanstack/react-router'
import SessionDetailPage from '@/features/AffectationManuelle/SessionDetail.tsx'

export const Route = createFileRoute('/_authenticated/AffectationManuelle/$sessionId')({
  component: SessionDetailPage,
})