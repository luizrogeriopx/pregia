import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import Stripe from "stripe";

const getStripe = () => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) return null;
  return new Stripe(secretKey, {
    apiVersion: "2025-01-27.acacia" as any, // Standard API version
  });
};

/**
 * Server function to create a Stripe Checkout Session for subscription.
 * Integrates a mock sandbox mode when Stripe credentials are not configured.
 */
export const createCheckoutSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((origin: unknown) => {
    if (typeof origin !== "string" || !origin.trim()) {
      throw new Error("Origem inválida.");
    }
    return origin.trim();
  })
  .handler(async ({ data: origin, context }) => {
    const { supabase, userId } = context;
    const stripe = getStripe();

    // 1. Fetch user email from Supabase Auth
    const { data: { user }, error: userError } = await supabase.auth.admin.getUserById(userId);
    const email = user?.email || "";

    if (!stripe) {
      console.warn("[Stripe API] STRIPE_SECRET_KEY não encontrada no .env. Ativando Checkout Simulado.");
      
      // Sandbox Mock Mode Upgrade
      // Update subscription to Pro in Supabase
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);

      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: "pro",
          status: "active",
          current_period_end: nextMonth.toISOString(),
          cancel_at_period_end: false,
        }, { onConflict: "user_id" });

      if (subError) {
        console.error("[Mock Checkout] Erro ao atualizar assinatura:", subError);
        throw new Error("Erro ao atualizar sua assinatura na simulação.");
      }

      // Create a mock invoice in the database
      const mockInvoiceId = "in_mock_" + Math.random().toString(36).substring(2, 10);
      const { error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          user_id: userId,
          stripe_invoice_id: mockInvoiceId,
          amount: 2700, // R$ 27,00
          currency: "brl",
          status: "paid",
          invoice_pdf: "#",
          hosted_invoice_url: "#",
          period_start: new Date().toISOString(),
          period_end: nextMonth.toISOString(),
        });

      if (invoiceError) {
        console.error("[Mock Checkout] Erro ao inserir fatura:", invoiceError);
      }

      return { url: `${origin}/dashboard/billing?success=true` };
    }

    // 2. Real Stripe Flow
    try {
      const priceId = process.env.STRIPE_PRICE_ID;
      if (!priceId) {
        throw new Error("STRIPE_PRICE_ID não configurado no .env.");
      }

      // Check if user already has a customer ID
      const { data: subData } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      let customerId = subData?.stripe_customer_id;

      if (!customerId) {
        // Create a new Stripe Customer
        const customer = await stripe.customers.create({
          email,
          metadata: { userId },
        });
        customerId = customer.id;

        // Save customerId back to user subscription row
        await supabase
          .from("subscriptions")
          .upsert({ user_id: userId, stripe_customer_id: customerId }, { onConflict: "user_id" });
      }

      // Create Checkout Session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/dashboard/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/dashboard/billing?canceled=true`,
        metadata: { userId },
      });

      return { url: session.url || `${origin}/dashboard/billing` };
    } catch (err: any) {
      console.error("[Stripe Session Error]:", err);
      throw new Error(err?.message || "Erro ao iniciar sessão com o Stripe.");
    }
  });

/**
 * Server function to verify Stripe subscription after redirect
 */
export const verifySubscriptionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((sessionId: unknown) => {
    if (typeof sessionId !== "string" || !sessionId.trim()) {
      throw new Error("ID de sessão inválido.");
    }
    return sessionId.trim();
  })
  .handler(async ({ data: sessionId, context }) => {
    const { supabase, userId } = context;
    const stripe = getStripe();

    if (!stripe) {
      return { success: true, mock: true };
    }

    try {
      // Retrieve the checkout session
      const session = await stripe.checkout.sessions.retrieve(sessionId, {
        expand: ["subscription", "subscription.latest_invoice"],
      });

      if (session.payment_status !== "paid") {
        return { success: false, message: "O pagamento não foi confirmado ainda." };
      }

      const subscription = session.subscription as Stripe.Subscription;
      const latestInvoice = subscription?.latest_invoice as Stripe.Invoice;

      const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
      const stripeSubId = subscription.id;
      const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

      // Update subscription in database
      const { error: subError } = await supabase
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan: "pro",
          status: "active",
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubId,
          current_period_end: currentPeriodEnd,
          cancel_at_period_end: subscription.cancel_at_period_end,
        }, { onConflict: "user_id" });

      if (subError) throw subError;

      // Insert invoice if we got it
      if (latestInvoice) {
        await supabase
          .from("invoices")
          .upsert({
            user_id: userId,
            stripe_invoice_id: latestInvoice.id,
            amount: latestInvoice.amount_paid,
            currency: latestInvoice.currency,
            status: latestInvoice.status || "paid",
            invoice_pdf: latestInvoice.invoice_pdf || "#",
            hosted_invoice_url: latestInvoice.hosted_invoice_url || "#",
            period_start: new Date(latestInvoice.period_start * 1000).toISOString(),
            period_end: new Date(latestInvoice.period_end * 1000).toISOString(),
          }, { onConflict: "stripe_invoice_id" });
      }

      return { success: true };
    } catch (err: any) {
      console.error("[Stripe Verification Error]:", err);
      throw new Error("Erro ao verificar o pagamento. Se o valor foi cobrado, fale com o suporte.");
    }
  });

/**
 * Server function to generate Customer Portal URL to manage subscription
 */
export const createPortalSessionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((origin: unknown) => {
    if (typeof origin !== "string" || !origin.trim()) {
      throw new Error("Origem inválida.");
    }
    return origin.trim();
  })
  .handler(async ({ data: origin, context }) => {
    const { supabase, userId } = context;
    const stripe = getStripe();

    if (!stripe) {
      // Return a simulated portal action query parameter
      return { url: `${origin}/dashboard/billing?mock_portal=true` };
    }

    try {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_customer_id")
        .eq("user_id", userId)
        .maybeSingle();

      const customerId = sub?.stripe_customer_id;

      if (!customerId) {
        throw new Error("Você não possui uma assinatura ativa para gerenciar.");
      }

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: `${origin}/dashboard/billing`,
      });

      return { url: portalSession.url };
    } catch (err: any) {
      console.error("[Stripe Portal Error]:", err);
      throw new Error("Erro ao carregar o portal financeiro do Stripe.");
    }
  });

/**
 * Developer Sandbox helper function to simulate subsequent months of billing
 */
export const simulateNextMonthInvoiceFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Verify user has Pro first in simulation
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("current_period_end")
      .eq("user_id", userId)
      .single();

    if (!sub) {
      throw new Error("Você precisa estar ativo no plano Pro para simular mensalidades.");
    }

    const currentPeriod = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
    
    // Set next period: end date is shifted by +1 month
    const newPeriodStart = new Date(currentPeriod);
    const newPeriodEnd = new Date(currentPeriod);
    newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);

    // Update Subscription period in Supabase
    await supabase
      .from("subscriptions")
      .update({ current_period_end: newPeriodEnd.toISOString() })
      .eq("user_id", userId);

    // Insert mock invoice
    const mockInvoiceId = "in_mock_" + Math.random().toString(36).substring(2, 10);
    await supabase
      .from("invoices")
      .insert({
        user_id: userId,
        stripe_invoice_id: mockInvoiceId,
        amount: 2700, // R$ 27,00
        currency: "brl",
        status: "paid",
        invoice_pdf: "#",
        hosted_invoice_url: "#",
        period_start: newPeriodStart.toISOString(),
        period_end: newPeriodEnd.toISOString(),
        created_at: newPeriodStart.toISOString(), // Created at the beginning of the new period
      });

    return { success: true };
  });

/**
 * Developer Sandbox helper function to cancel simulation subscription
 */
export const simulateCancelSubscriptionFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Downgrade user back to free
    await supabase
      .from("subscriptions")
      .update({
        plan: "free",
        status: "active",
        current_period_end: null,
        cancel_at_period_end: false,
      })
      .eq("user_id", userId);

    return { success: true };
  });
