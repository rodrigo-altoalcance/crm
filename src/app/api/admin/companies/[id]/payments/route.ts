import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getProfile } from "@/lib/auth/getProfile"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("company_id", id)
    .order("paid_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const profile = await getProfile(supabase)
  if (profile?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { amount, currency, paid_at, notes } = await request.json()

  if (!amount || amount <= 0) {
    return NextResponse.json({ error: "El monto debe ser mayor a 0" }, { status: 400 })
  }
  if (!paid_at) {
    return NextResponse.json({ error: "La fecha de pago es requerida" }, { status: 400 })
  }

  const { data: payment, error } = await supabase
    .from("payments")
    .insert({
      company_id: id,
      amount,
      currency: currency || "CLP",
      paid_at,
      notes: notes || null,
      recorded_by: profile.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Update the company's next_payment_date based on payment_day
  const { data: company } = await supabase
    .from("companies")
    .select("payment_day")
    .eq("id", id)
    .single()

  if (company?.payment_day) {
    const paidDate = new Date(paid_at)
    // Next payment is the payment_day of the following month
    const nextPayment = new Date(paidDate.getFullYear(), paidDate.getMonth() + 1, company.payment_day)
    await supabase
      .from("companies")
      .update({ next_payment_date: nextPayment.toISOString().slice(0, 10) })
      .eq("id", id)
  }

  return NextResponse.json(payment, { status: 201 })
}
