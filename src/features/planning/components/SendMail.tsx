// src/features/planning/components/SendMail.tsx
import { Button } from "@/components/ui/button";
import { Mail, Loader2 } from "lucide-react";
import { toast } from 'sonner';
import { useState } from "react";

interface Session {
  date: string;
  day: number;
  session: string;
  startTime: string;
  endTime: string;
  duration: number;
}

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  sessions: Session[];
}

interface SendMailProps {
  planningData: any[];
  disabled?: boolean;
}

export function SendMail({ planningData, disabled = false }: SendMailProps) {
  const [isSending, setIsSending] = useState(false);

  const calculateDuration = (start: string, end: string): number => {
    if (!start || !end) return 0;
    
    const [startHour, startMinute] = start.split(':').map(Number);
    const [endHour, endMinute] = end.split(':').map(Number);
    
    const startDate = new Date(0, 0, 0, startHour, startMinute);
    const endDate = new Date(0, 0, 0, endHour, endMinute);
    
    return (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);
  };

  const handleSendEmails = async () => {
    if (!planningData?.length) {
      toast.error('Aucune donnée disponible pour envoyer les emails');
      return;
    }

    setIsSending(true);

    try {
      const teacherMap = new Map<string, Teacher>();

      // Process all planning data to group by teacher and collect sessions
      planningData.forEach((item: any) => {
        if (item.Enseignant_ID) {
          const teacherId = item.Enseignant_ID;
          const session = {
            date: item.Date || '',
            day: item.Jour || 0,
            session: item.Séance || '',
            startTime: item.Heure_Début || '',
            endTime: item.Heure_Fin || '',
            duration: calculateDuration(item.Heure_Début, item.Heure_Fin) || 0
          };

          if (!teacherMap.has(teacherId)) {
            teacherMap.set(teacherId, {
              id: teacherId,
              firstName: item.Prénom || '',
              lastName: item.Nom || '',
              email: item.Email || '',
              sessions: [session]
            });
          } else {
            const teacher = teacherMap.get(teacherId)!;
            teacher.sessions.push(session);
          }
        }
      });

      // Convert map to array and sort sessions by date and time
      const uniqueTeachers = Array.from(teacherMap.values()).map(teacher => ({
        ...teacher,
        sessions: teacher.sessions.sort((a, b) => {
          if (a.date < b.date) return -1;
          if (a.date > b.date) return 1;
          if (a.startTime < b.startTime) return -1;
          if (a.startTime > b.startTime) return 1;
          return 0;
        })
      }));
      
      if (uniqueTeachers.length === 0) {
        toast.error('Aucun enseignant valide trouvé pour envoyer les emails');
        return;
      }

      const response = await fetch('http://localhost:5000/api/send-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ teachers: uniqueTeachers }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || "Échec de l'envoi des emails");
      }

      const result = await response.json();
      
      toast.success('Emails envoyés avec succès', {
        description: `${result.sent || 0} emails ont été envoyés`,
        duration: 5000
      });
      
    } catch (error) {
      toast.error('Erreur', {
        description: error instanceof Error ? error.message : "Erreur inconnue lors de l'envoi des emails"
      });
      throw error;
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Button
      onClick={handleSendEmails}
      disabled={disabled || isSending}
      className="gap-2 bg-blue-600 hover:bg-blue-700"
    >
      {isSending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Envoi en cours...
        </>
      ) : (
        <>
          <Mail className="h-4 w-4" />
          Envoyer les convocations
        </>
      )}
    </Button>
  );
}