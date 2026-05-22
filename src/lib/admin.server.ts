import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateCPF } from "./utils";

/**
 * Helper function to verify admin access.
 * Automatically promotes the user to Admin if there are no admins registered in the database,
 * making initial setup and local development friction-free.
 */
const verifyAdminAccess = async (supabase: any, userId: string) => {
  // 1. Check if user is already an admin
  const { data: roleData } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (roleData) return true;

  // 2. If not admin, check if any admin exists in the system
  const { data: admins } = await supabase
    .from("user_roles")
    .select("id")
    .eq("role", "admin")
    .limit(1);

  if (!admins || admins.length === 0) {
    // Promote this first user to Admin
    console.log(`[Admin Access] Promovendo o primeiro usuário ${userId} para administrador.`);
    const { error: promoError } = await supabase
      .from("user_roles")
      .upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });
      
    if (!promoError) return true;
  }

  return false;
};

/**
 * Server function to fetch global statistics for the admin dashboard.
 */
export const getAdminStatsFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Check admin permissions
    const isAdmin = await verifyAdminAccess(supabase, userId);
    if (!isAdmin) {
      throw new Error("Não autorizado: Acesso restrito a administradores.");
    }

    try {
      // 1. Fetch counts
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: totalPro } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("plan", "pro")
        .eq("status", "active");

      const { count: totalSermons } = await supabase
        .from("sermons")
        .select("*", { count: "exact", head: true });

      // 2. Fetch revenue (handling missing invoices table gracefully)
      let totalRevenue = 0;
      try {
        const { data: paidInvoices } = await supabase
          .from("invoices")
          .select("amount")
          .eq("status", "paid");

        if (paidInvoices) {
          totalRevenue = paidInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
        }
      } catch (err) {
        console.warn("[Admin Stats] Tabela invoices indisponível para cálculo de receita.");
      }

      // 3. Fetch historical logs for charts (Last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch user registrations
      const { data: usersHistory } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Fetch sermons generated
      const { data: sermonsHistory } = await supabase
        .from("sermons")
        .select("created_at")
        .gte("created_at", thirtyDaysAgo.toISOString());

      // Aggregate registrations & sermons by date on server
      const statsByDate: Record<string, { date: string; users: number; sermons: number }> = {};
      
      // Initialize past 7 days by default to ensure visual charts look nice even with empty data
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        statsByDate[key] = { date: key, users: 0, sermons: 0 };
      }

      usersHistory?.forEach((u) => {
        const dateStr = new Date(u.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (statsByDate[dateStr]) {
          statsByDate[dateStr].users++;
        } else {
          statsByDate[dateStr] = { date: dateStr, users: 1, sermons: 0 };
        }
      });

      sermonsHistory?.forEach((s) => {
        const dateStr = new Date(s.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        if (statsByDate[dateStr]) {
          statsByDate[dateStr].sermons++;
        } else {
          statsByDate[dateStr] = { date: dateStr, users: 0, sermons: 1 };
        }
      });

      // Sort stats by date
      const chartData = Object.values(statsByDate);

      return {
        stats: {
          totalUsers: totalUsers || 0,
          totalPro: totalPro || 0,
          totalSermons: totalSermons || 0,
          totalRevenue: totalRevenue / 100, // convert cents to BRL
        },
        chartData,
      };
    } catch (err: any) {
      console.error("[Admin Stats Error]:", err);
      throw new Error("Erro ao compilar estatísticas administrativas.");
    }
  });

/**
 * Server function to fetch the list of users with plans, roles, and sermon counts.
 */
export const getUsersListFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    // Check admin permissions
    const isAdmin = await verifyAdminAccess(supabase, userId);
    if (!isAdmin) {
      throw new Error("Não autorizado: Acesso restrito a administradores.");
    }

    try {
      // 1. Fetch profiles
      const { data: profiles, error: profError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profError) throw profError;

      // 2. Fetch roles
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      // 3. Fetch subscriptions
      const { data: subscriptions } = await supabase
        .from("subscriptions")
        .select("user_id, plan, status, current_period_end, cancel_at_period_end");

      // 4. Fetch sermon outline counts per user
      const { data: sermons } = await supabase
        .from("sermons")
        .select("user_id");

      // Compile count maps
      const roleMap: Record<string, string> = {};
      roles?.forEach(r => {
        roleMap[r.user_id] = r.role;
      });

      const subMap: Record<string, any> = {};
      subscriptions?.forEach(s => {
        subMap[s.user_id] = s;
      });

      const sermonCountMap: Record<string, number> = {};
      sermons?.forEach(s => {
        sermonCountMap[s.user_id] = (sermonCountMap[s.user_id] || 0) + 1;
      });

      // Merge data
      const usersList = profiles.map((profile) => ({
        id: profile.id,
        email: profile.email || "",
        fullName: profile.full_name || "",
        avatarUrl: profile.avatar_url || "",
        cpf: profile.cpf || "",
        createdAt: profile.created_at,
        role: roleMap[profile.id] || "user",
        subscription: subMap[profile.id] || { plan: "free", status: "active", current_period_end: null },
        sermonsCount: sermonCountMap[profile.id] || 0,
      }));

      return { users: usersList };
    } catch (err: any) {
      console.error("[Admin Users List Error]:", err);
      throw new Error("Erro ao carregar lista de usuários.");
    }
  });

/**
 * Server function to update a user's details, role, and subscription plan.
 */
export const updateUserFn = createServerFn({ method: "POST" })
  .inputValidator((data: any) => {
    if (!data.targetUserId) throw new Error("ID do usuário alvo obrigatório.");
    return data;
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }: { data: any; context: any }) => {
    const { supabase, userId } = context;
    const { targetUserId, fullName, cpf, role, subscription } = data;

    // Check admin permissions
    const isAdmin = await verifyAdminAccess(supabase, userId);
    if (!isAdmin) {
      throw new Error("Não autorizado: Acesso restrito a administradores.");
    }

    try {
      // 1. Update Profile (Name, CPF)
      if (fullName !== undefined || cpf !== undefined) {
        const updateData: any = {};
        if (fullName !== undefined) updateData.full_name = fullName;
        if (cpf !== undefined) {
          const cleanCPF = cpf.replace(/[^\d]/g, "");
          if (cleanCPF && !validateCPF(cleanCPF)) {
            throw new Error("CPF inválido. Por favor, confira os números digitados.");
          }
          updateData.cpf = cleanCPF || null;
        }

        const { error: profError } = await supabase
          .from("profiles")
          .update(updateData)
          .eq("id", targetUserId);
          
        if (profError) {
          if (profError.message?.includes("profiles_cpf_key") || profError.code === "23505") {
            throw new Error("Este CPF já está cadastrado em outra conta.");
          }
          throw profError;
        }
      }

      // 2. Update Role (in user_roles)
      if (role !== undefined) {
        // We delete first to avoid unique key conflicts, then insert new role
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", targetUserId);

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: targetUserId, role });

        if (roleError) throw roleError;
      }

      // 3. Update Subscription (plan, status, current_period_end)
      if (subscription !== undefined) {
        const { plan, status, currentPeriodEnd } = subscription;
        const { error: subError } = await supabase
          .from("subscriptions")
          .upsert({
            user_id: targetUserId,
            plan,
            status,
            current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd).toISOString() : null,
          }, { onConflict: "user_id" });

        if (subError) throw subError;
      }

      return { success: true };
    } catch (err: any) {
      console.error("[Admin Update User Error]:", err);
      throw new Error(err?.message || "Erro ao atualizar dados do usuário.");
    }
  });

/**
 * Server function to fetch all sermon outlines generated by a specific user.
 */
export const getUserSermonsFn = createServerFn({ method: "POST" })
  .inputValidator((targetUserId: unknown) => {
    if (typeof targetUserId !== "string" || !targetUserId.trim()) {
      throw new Error("ID de usuário inválido.");
    }
    return targetUserId.trim();
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data: targetUserId, context }: { data: string; context: any }) => {
    const { supabase, userId } = context;

    // Check admin permissions
    const isAdmin = await verifyAdminAccess(supabase, userId);
    if (!isAdmin) {
      throw new Error("Não autorizado: Acesso restrito a administradores.");
    }

    try {
      const { data: sermons, error: sermonsError } = await supabase
        .from("sermons")
        .select("id, video_title, preacher_name, theme, created_at")
        .eq("user_id", targetUserId)
        .order("created_at", { ascending: false });

      if (sermonsError) throw sermonsError;

      return { sermons: sermons || [] };
    } catch (err: any) {
      console.error("[Admin Get User Sermons Error]:", err);
      throw new Error("Erro ao carregar esboços do usuário.");
    }
  });
