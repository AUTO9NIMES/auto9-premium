import "server-only";

import { supabaseRest } from "./supabase";

export type ManualRevenueEntry = {
  leadId: string;
  amount: number;
  method: "CASH" | "CARD" | "BANK_TRANSFER";
  receivedAt: string;
};

type ActivityRow = {
  lead_id: string | null;
  event_type: string;
  event_data: Record<string, unknown> | null;
  created_at: string;
};

type ServiceRow = {
  lead_id: string;
  base_price: number | null;
  created_at: string | null;
};

type JobRow = {
  id: string;
  lead_id: string | null;
};

function paymentMethod(value: unknown): ManualRevenueEntry["method"] | null {
  if (value === "CASH") return "CASH";
  if (value === "CARD") return "CARD";
  if (value === "BANK_TRANSFER" || value === "CARD_BANK") return "BANK_TRANSFER";
  return null;
}

export async function getManualRevenueEntries(
  businessId: string,
  canonicalPayments: Array<{ job_id: string }>,
): Promise<ManualRevenueEntry[]> {
  const [activityRaw, servicesRaw, jobsRaw] = await Promise.all([
    supabaseRest<ActivityRow[]>(
      "activity_log",
      "GET",
      null,
      `business_id=eq.${businessId}&event_type=in.(crm_v2.step.completed,crm_v2.step.reopened)&order=created_at.desc&limit=5000&select=lead_id,event_type,event_data,created_at`,
    ),
    supabaseRest<ServiceRow[]>(
      "lead_services",
      "GET",
      null,
      `business_id=eq.${businessId}&order=created_at.desc&limit=5000&select=lead_id,base_price,created_at`,
    ),
    supabaseRest<JobRow[]>(
      "jobs",
      "GET",
      null,
      `business_id=eq.${businessId}&limit=5000&select=id,lead_id`,
    ),
  ]);

  const activity = (activityRaw as ActivityRow[] | null) ?? [];
  const services = (servicesRaw as ServiceRow[] | null) ?? [];
  const jobs = (jobsRaw as JobRow[] | null) ?? [];

  const servicePriceByLead = new Map<string, number>();
  for (const service of services) {
    if (servicePriceByLead.has(service.lead_id)) continue;
    const amount = Number(service.base_price);
    if (Number.isFinite(amount) && amount > 0) {
      servicePriceByLead.set(service.lead_id, amount);
    }
  }

  const jobLeadById = new Map<string, string>();
  for (const job of jobs) {
    if (job.lead_id) jobLeadById.set(job.id, job.lead_id);
  }

  const canonicalPaidLeads = new Set<string>();
  for (const payment of canonicalPayments) {
    const leadId = jobLeadById.get(payment.job_id);
    if (leadId) canonicalPaidLeads.add(leadId);
  }

  const latestPaymentByLead = new Map<
    string,
    { receivedAt: string; method: ManualRevenueEntry["method"]; amount: number | null }
  >();
  const latestReopenByLead = new Map<string, string>();

  for (const row of activity) {
    const leadId = row.lead_id;
    if (!leadId || row.event_data?.step_key !== "PAID") continue;

    if (row.event_type === "crm_v2.step.reopened") {
      if (!latestReopenByLead.has(leadId)) latestReopenByLead.set(leadId, row.created_at);
      continue;
    }

    if (row.event_type !== "crm_v2.step.completed" || latestPaymentByLead.has(leadId)) {
      continue;
    }

    const method = paymentMethod(row.event_data?.payment_method);
    if (!method) continue;

    const rawAmount = Number(row.event_data?.payment_amount);
    latestPaymentByLead.set(leadId, {
      receivedAt: row.created_at,
      method,
      amount: Number.isFinite(rawAmount) && rawAmount > 0 ? rawAmount : null,
    });
  }

  const entries: ManualRevenueEntry[] = [];
  for (const [leadId, payment] of latestPaymentByLead) {
    if (canonicalPaidLeads.has(leadId)) continue;

    const reopenedAt = latestReopenByLead.get(leadId);
    if (reopenedAt && new Date(reopenedAt).getTime() > new Date(payment.receivedAt).getTime()) {
      continue;
    }

    const amount = payment.amount ?? servicePriceByLead.get(leadId) ?? 0;
    if (!(amount > 0)) continue;

    entries.push({
      leadId,
      amount,
      method: payment.method,
      receivedAt: payment.receivedAt,
    });
  }

  return entries;
}
