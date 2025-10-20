import { createFileRoute } from '@tanstack/react-router'
import PlanningPage from '@/features/planning'

export const Route = createFileRoute('/_authenticated/planning/')({
  component: PlanningPage,
})