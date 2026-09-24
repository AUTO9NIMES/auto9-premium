import type { Appointment } from "../../../lib/crm";

export type CustomerPlanningSelection = {
  nextAppointment: Appointment | null;
  latestCompletedAppointment: Appointment | null;
  planningAppointment: Appointment | null;
};

export async function getCustomer360RenderedAt(): Promise<number> {
  return Date.now();
}

function scheduledTime(appointment: Appointment): number | null {
  if (!appointment.scheduled_at) return null;

  const value = new Date(appointment.scheduled_at).getTime();
  return Number.isNaN(value) ? null : value;
}

export function selectCustomerPlanningAppointment(
  appointments: readonly Appointment[],
  now: number,
): CustomerPlanningSelection {
  let nextAppointment: Appointment | null = null;
  let nextTime = Number.POSITIVE_INFINITY;

  let latestCompletedAppointment: Appointment | null = null;
  let latestCompletedTime = Number.NEGATIVE_INFINITY;

  for (const appointment of appointments) {
    const time = scheduledTime(appointment);
    if (time === null) continue;

    if (
      appointment.status === "CONFIRMED" &&
      time >= now &&
      time < nextTime
    ) {
      nextAppointment = appointment;
      nextTime = time;
    }

    if (
      appointment.status === "COMPLETED" &&
      time < now &&
      time > latestCompletedTime
    ) {
      latestCompletedAppointment = appointment;
      latestCompletedTime = time;
    }
  }

  return {
    nextAppointment,
    latestCompletedAppointment,
    planningAppointment: nextAppointment ?? latestCompletedAppointment,
  };
}
