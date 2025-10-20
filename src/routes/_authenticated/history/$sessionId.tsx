import { createFileRoute } from '@tanstack/react-router'
import SessionDetailPage from '@/features/history/SessionDetail'

export const Route = createFileRoute('/_authenticated/history/$sessionId')({
  component: SessionDetailPage,
})