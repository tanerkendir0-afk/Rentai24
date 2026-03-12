import { storage } from "./storage";

interface CalendarCredentials {
  accessToken: string;
}

async function getGoogleCalendarCredentials(): Promise<CalendarCredentials | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? "repl " + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? "depl " + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken || !hostname) return null;

  try {
    const response = await fetch(
      "https://" + hostname + "/api/v2/connection?include_secrets=true&connector_names=google-calendar",
      {
        headers: {
          Accept: "application/json",
          "X-Replit-Token": xReplitToken,
        },
      }
    );
    const data = await response.json();
    const settings = data.items?.[0]?.settings;
    if (!settings?.access_token) return null;
    return { accessToken: settings.access_token };
  } catch {
    return null;
  }
}

export async function createCalendarEvent(params: {
  userId: number;
  agentType: string;
  title: string;
  attendeeEmail: string;
  date: string;
  time: string;
  durationMinutes: number;
  description?: string;
}): Promise<{ success: boolean; message: string; eventId?: string }> {
  const credentials = await getGoogleCalendarCredentials();

  const startDateTime = new Date(`${params.date}T${params.time}:00`);
  const endDateTime = new Date(startDateTime.getTime() + params.durationMinutes * 60 * 1000);

  if (credentials) {
    try {
      const event = {
        summary: params.title,
        description: params.description || "",
        start: { dateTime: startDateTime.toISOString(), timeZone: "UTC" },
        end: { dateTime: endDateTime.toISOString(), timeZone: "UTC" },
        attendees: [{ email: params.attendeeEmail }],
        reminders: { useDefault: true },
      };

      const response = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events?sendUpdates=all",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${credentials.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
        }
      );

      if (response.ok) {
        const created = await response.json();
        await storage.createAgentAction({
          userId: params.userId,
          agentType: params.agentType,
          actionType: "meeting_created",
          description: `Meeting created on Google Calendar: "${params.title}" with ${params.attendeeEmail} on ${params.date} at ${params.time} (${params.durationMinutes}min)`,
          metadata: {
            title: params.title,
            attendeeEmail: params.attendeeEmail,
            date: params.date,
            time: params.time,
            duration: params.durationMinutes,
            description: params.description,
            googleEventId: created.id,
            htmlLink: created.htmlLink,
          },
        });
        return {
          success: true,
          message: `Meeting "${params.title}" created on Google Calendar for ${params.date} at ${params.time} with ${params.attendeeEmail}. Calendar invite sent.`,
          eventId: created.id,
        };
      }

      const errorData = await response.json().catch(() => ({}));
      console.error("Google Calendar API error:", errorData);
    } catch (err) {
      console.error("Google Calendar create error:", err);
    }
  }

  await storage.createAgentAction({
    userId: params.userId,
    agentType: params.agentType,
    actionType: "meeting_created",
    description: `Meeting scheduled (no calendar connected): "${params.title}" with ${params.attendeeEmail} on ${params.date} at ${params.time} (${params.durationMinutes}min)`,
    metadata: {
      title: params.title,
      attendeeEmail: params.attendeeEmail,
      date: params.date,
      time: params.time,
      duration: params.durationMinutes,
      description: params.description,
      calendarConnected: false,
    },
  });

  return {
    success: true,
    message: `Meeting "${params.title}" scheduled for ${params.date} at ${params.time} (${params.durationMinutes} minutes) with ${params.attendeeEmail}. Note: Google Calendar is not connected — connect it to automatically send calendar invites.`,
  };
}
