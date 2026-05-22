import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CreditCard,
  Calendar,
  Sparkles,
  Loader2,
  Download,
  AlertCircle,
  CheckCircle2,
  Play,
  XCircle,
  HelpCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  FileText,
  Activity,
  RefreshCw,
  TrendingUp
} from "lucide-react";
import {
  createCheckoutSessionFn,
  verifySubscriptionFn,
  createPortalSessionFn,
  simulateNextMonthInvoiceFn,
  simulateCancelSubscriptionFn,
} from "@/lib/billing.server";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({ meta: [{ title: "Financeiro — PregAI" }] }),
  component: BillingDashboard,
});

function BillingDashboard() {
  const { user } = useAuth();
  
  // Data states
  const [subscription, setSubscription] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  
  // Action states
  const [checkingOut, setCheckingOut] = useState(false);
  const [redirectingPortal, setRedirectingPortal] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // Simulation states
  const [simulatingInvoice, setSimulatingInvoice] = useState(false);
  const [simulatingCancel, setSimulatingCancel] = useState(false);
  const [showMockPortalModal, setShowMockPortalModal] = useState(false);

  const fetchBillingData = async () => {
    if (!user) return;
    setLoadingData(true);
    try {
      // 1. Fetch Subscription details
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData);

      // 2. Fetch Invoices (handling missing table gracefully)
      const { data: invData, error: invError } = await supabase
        .from("invoices" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (invError) {
        console.warn("A tabela 'invoices' não pôde ser lida (provavelmente a migração não foi rodada):", invError);
        setTableMissing(true);
        
        // Fallback local memory invoices for visual simulation
        if (subData?.plan === "pro") {
          const nextMonth = new Date();
          nextMonth.setMonth(nextMonth.getMonth() + 1);
          setInvoices([
            {
              stripe_invoice_id: "in_mock_fallback_1",
              amount: 2700,
              currency: "brl",
              status: "paid",
              period_start: new Date().toISOString(),
              period_end: nextMonth.toISOString(),
              created_at: new Date().toISOString(),
              invoice_pdf: "#",
            }
          ]);
        } else {
          setInvoices([]);
        }
      } else {
        setInvoices(invData || []);
        setTableMissing(false);
      }
    } catch (err: any) {
      console.error("Erro ao buscar dados financeiros:", err);
      toast.error("Não foi possível carregar as informações financeiras.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchBillingData();
  }, [user]);

  // Handle URL redirect query parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const sessionId = params.get("session_id");
    const canceled = params.get("canceled");
    const mockPortal = params.get("mock_portal");

    if (success === "true") {
      if (sessionId) {
        const verify = async () => {
          setVerifying(true);
          try {
            const res = await verifySubscriptionFn({ data: sessionId });
            if (res?.success) {
              toast.success("Assinatura Pro ativada com sucesso! Obrigado pelo apoio.");
              fetchBillingData();
            } else {
              toast.error(res?.message || "Não foi possível confirmar seu pagamento.");
            }
          } catch (err: any) {
            console.error("Erro na verificação de pagamento:", err);
            toast.error("Ocorreu um erro ao verificar sua transação.");
          } finally {
            setVerifying(false);
            window.history.replaceState({}, document.title, window.location.pathname);
          }
        };
        verify();
      } else {
        // Mock Sandbox Checkout upgrade completed
        toast.success("Upgrade Simulado: Plano Pro Ativado!");
        fetchBillingData();
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } else if (canceled === "true") {
      toast.info("Processo de assinatura cancelado pelo usuário.");
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (mockPortal === "true") {
      setShowMockPortalModal(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      const res = await createCheckoutSessionFn({ data: window.location.origin });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error("Checkout URL não retornada.");
      }
    } catch (err: any) {
      console.error("Erro no checkout:", err);
      toast.error(err?.message || "Falha ao iniciar checkout.");
    } finally {
      setCheckingOut(false);
    }
  };

  const handlePortalRedirect = async () => {
    setRedirectingPortal(true);
    try {
      const res = await createPortalSessionFn({ data: window.location.origin });
      if (res?.url) {
        window.location.href = res.url;
      } else {
        throw new Error("Portal URL não retornada.");
      }
    } catch (err: any) {
      console.error("Erro no portal:", err);
      toast.error(err?.message || "Falha ao redirecionar para gerenciamento do plano.");
    } finally {
      setRedirectingPortal(false);
    }
  };

  // Sandbox simulation actions
  const handleSimulateNextMonthInvoice = async () => {
    setSimulatingInvoice(true);
    try {
      await simulateNextMonthInvoiceFn();
      toast.success("Simulação: Fatura de mensalidade gerada para o próximo mês!");
      await fetchBillingData();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao simular fatura.");
    } finally {
      setSimulatingInvoice(false);
    }
  };

  const handleSimulateCancel = async () => {
    setSimulatingCancel(true);
    try {
      await simulateCancelSubscriptionFn();
      toast.success("Simulação: Assinatura cancelada e conta retornada ao Plano Free.");
      setShowMockPortalModal(false);
      await fetchBillingData();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao simular cancelamento.");
    } finally {
      setSimulatingCancel(false);
    }
  };

  // Safe Mock PDF Downloader
  const handleDownloadInvoice = (invoice: any) => {
    if (invoice.invoice_pdf && invoice.invoice_pdf !== "#") {
      window.open(invoice.invoice_pdf, "_blank");
      return;
    }
    
    // Generate text invoice simulating a PDF document download
    const content = `========================================================================
                       PREGAI - FATURA DE SERVIÇOS
========================================================================
ID da Fatura:     ${invoice.stripe_invoice_id}
Status:           ${invoice.status === "paid" ? "PAGO / CONCLUÍDO" : invoice.status.toUpperCase()}
Valor Total:      R$ 27,00
Moeda de Cobrança: BRL (Real Brasileiro)
------------------------------------------------------------------------
Período de Uso:   ${new Date(invoice.period_start).toLocaleDateString("pt-BR")} até ${new Date(invoice.period_end).toLocaleDateString("pt-BR")}
Data do Pagamento: ${new Date(invoice.created_at).toLocaleDateString("pt-BR")}
------------------------------------------------------------------------
Obrigado por apoiar a PregAI!
Esta é uma fatura simulada gerada em modo Sandbox para testes offline.
========================================================================`;
    
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `PregAI-Fatura-${invoice.stripe_invoice_id}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Fatura simulada baixada com sucesso!");
  };

  const isPro = subscription?.plan === "pro" && subscription?.status === "active";

  return (
    <div className="p-6 md:p-10 max-w-5xl mx-auto space-y-8 animate-fade-in text-foreground">
      
      {/* Verifying Checkout State Screen Overlay */}
      {verifying && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center z-50">
          <div className="relative flex items-center justify-center mb-4">
            <div className="h-16 w-16 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
            <Sparkles className="absolute h-6 w-6 text-gold animate-pulse" />
          </div>
          <p className="text-lg font-semibold animate-pulse text-foreground">Confirmando seu pagamento...</p>
          <p className="text-sm text-muted-foreground mt-1">Isso levará apenas alguns instantes.</p>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold border border-gold/20 mb-2">
            <CreditCard className="h-3.5 w-3.5" />
            Painel Financeiro
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Assinatura & Faturamento</h1>
          <p className="text-muted-foreground max-w-2xl text-sm md:text-base">
            Gerencie o plano da sua conta, consulte seu histórico de mensalidades e faturas, ou altere dados de pagamento do Stripe.
          </p>
        </div>
      </div>

      {tableMissing && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex gap-3 text-amber-500 text-sm">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">Ambiente local sem tabela de faturas</p>
            <p className="text-xs opacity-90 leading-relaxed">
              A tabela de faturas <code>invoices</code> não foi detectada no Supabase. Para que faturas reais sejam salvas, aplique a migração <code>supabase/migrations/20260522152855_add_invoices.sql</code> no seu editor SQL do Supabase. Mostrando dados fictícios simulados.
            </p>
          </div>
        </div>
      )}

      {loadingData ? (
        <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gold" />
          <p className="text-muted-foreground text-sm">Buscando dados de faturamento...</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-3 gap-8">
          
          {/* Left/Main Column - Plan Description & Call to Actions */}
          <div className="md:col-span-2 space-y-6">
            
            {/* Active Plan summary card */}
            <Card className="relative overflow-hidden border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
              {isPro && (
                <div 
                  className="absolute top-0 right-0 h-40 w-40 opacity-15 rounded-full pointer-events-none filter blur-2xl"
                  style={{ background: "var(--gradient-gold)" }}
                />
              )}
              
              <CardHeader className="border-b border-border/40 pb-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl">Seu Plano Atual</CardTitle>
                  {isPro ? (
                    <Badge className="bg-[image:var(--gradient-gold)] text-accent-foreground border-gold/30 hover:brightness-105 px-3 py-1 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5" /> Pro Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground px-3 py-1 text-xs uppercase tracking-wider">
                      Gratuito (Free)
                    </Badge>
                  )}
                </div>
                <CardDescription className="pt-1.5">
                  {isPro 
                    ? `Sua assinatura renova mensalmente no valor de R$ 27,00/mês.`
                    : "Você está no plano de testes com limites de análises."}
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                
                {/* Plan details list */}
                <div className="space-y-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Inclusos no seu plano:</div>
                  <ul className="grid gap-3 sm:grid-cols-2 text-sm">
                    {isPro ? (
                      <>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Análises de vídeos <strong>ILIMITADAS</strong></span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Esboços homiléticos premium</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Roteiro de pregação completo</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Slides de projeção customizados</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Posts sociais & frases de impacto</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Suporte prioritário 24/7</span>
                        </li>
                      </>
                    ) : (
                      <>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Limite de 3 análises de vídeo por mês</span>
                        </li>
                        <li className="flex items-start gap-2.5">
                          <CheckCircle2 className="h-5 w-5 shrink-0 text-gold mt-0.5" />
                          <span>Esboços homiléticos básicos</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-muted-foreground/60">
                          <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/40 mt-0.5" />
                          <span>Roteiro escrito desabilitado</span>
                        </li>
                        <li className="flex items-start gap-2.5 text-muted-foreground/60">
                          <XCircle className="h-5 w-5 shrink-0 text-muted-foreground/40 mt-0.5" />
                          <span>Slides de projeção bloqueados</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>

                {isPro && subscription?.current_period_end && (
                  <div className="bg-accent/5 border border-border/40 rounded-xl p-4 flex items-center justify-between text-xs sm:text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4 text-gold" />
                      Próxima renovação automática:
                    </span>
                    <span className="font-semibold text-foreground">
                      {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                )}
              </CardContent>

              <CardFooter className="border-t border-border/40 pt-5 flex flex-col sm:flex-row gap-3 sm:justify-between items-stretch sm:items-center">
                {!isPro ? (
                  <>
                    <div className="text-center sm:text-left">
                      <div className="text-lg font-bold text-foreground">R$ 27,00<span className="text-xs text-muted-foreground font-normal">/mês</span></div>
                      <div className="text-xs text-gold font-semibold">Cancele quando quiser no painel</div>
                    </div>
                    <Button 
                      variant="gold" 
                      onClick={handleCheckout} 
                      disabled={checkingOut}
                      className="px-6 relative group overflow-hidden transition-all duration-300"
                    >
                      {checkingOut ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Redirecionando...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-1.5" /> Fazer Upgrade Pro
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      Assinatura gerenciada com segurança pelo Stripe.
                    </span>
                    <Button 
                      variant="outline" 
                      onClick={handlePortalRedirect} 
                      disabled={redirectingPortal}
                      className="h-10 hover:border-gold/30 hover:bg-gold/5"
                    >
                      {redirectingPortal ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> Carregando Portal...
                        </>
                      ) : (
                        <>
                          Gerenciar Assinatura <ArrowRight className="h-4 w-4 ml-1.5 text-gold" />
                        </>
                      )}
                    </Button>
                  </>
                )}
              </CardFooter>
            </Card>

            {/* Premium feature explanation section if they are Free */}
            {!isPro && (
              <div 
                className="rounded-2xl border border-gold/20 bg-gradient-to-r from-gold/5 to-purple-deep/5 p-6 space-y-4"
                style={{ boxShadow: "var(--shadow-card)" }}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gold animate-pulse" />
                  <h3 className="font-bold text-foreground text-base">Por que migrar para o PregAI Pro?</h3>
                </div>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                  Pregadores vocacionados necessitam de foco no estudo bíblico e na oração. Com a PregAI Pro, você economiza dezenas de horas transformando pregações em vídeo em material de apoio completo de projeção e divulgação das mensagens nas redes de forma ilimitada e instantânea.
                </p>
                <div className="flex flex-wrap gap-2 pt-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border">Acesso Ilimitado</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border">Slides Homiléticos</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-muted border border-border">Roteiro Textual Completo</span>
                </div>
              </div>
            )}
            
          </div>

          {/* Right Column - Historical Invoices */}
          <div className="space-y-6">
            
            <Card className="border border-border flex flex-col justify-between h-full" style={{ boxShadow: "var(--shadow-card)" }}>
              <div>
                <CardHeader className="border-b border-border/40 pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gold" />
                    Histórico de Faturas
                  </CardTitle>
                  <CardDescription className="text-xs pt-0.5">
                    Histórico de cobranças e faturas mensais do seu plano.
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="p-0">
                  {invoices.length > 0 ? (
                    <div className="divide-y divide-border/40">
                      {invoices.map((inv) => (
                        <div 
                          key={inv.stripe_invoice_id} 
                          className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-foreground">
                                {(inv.amount / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                              <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-transparent text-[9px] px-1.5 py-0">
                                Paga
                              </Badge>
                            </div>
                            
                            <div className="text-[10px] text-muted-foreground leading-none">
                              Ref: {new Date(inv.period_start).toLocaleDateString("pt-BR")}
                            </div>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-gold"
                            onClick={() => handleDownloadInvoice(inv)}
                            title="Baixar Fatura"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 px-4 space-y-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 border border-border">
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-semibold text-xs text-foreground">Nenhuma fatura gerada</h4>
                        <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                          Faturas mensais aparecerão aqui assim que realizar seu primeiro ciclo de assinatura.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </div>

              {invoices.length > 0 && (
                <div className="border-t border-border/40 p-3 text-[10px] text-muted-foreground bg-muted/5 rounded-b-xl flex items-center justify-between">
                  <span>Atualizado recentemente</span>
                  <Activity className="h-3 w-3 text-emerald-400" />
                </div>
              )}
            </Card>

          </div>
        </div>
      )}

      {/* Sandbox Test Center panel */}
      {(!process.env.STRIPE_SECRET_KEY || tableMissing || subscription?.stripe_customer_id?.startsWith("cus_mock") || invoices.some(i => i.stripe_invoice_id?.startsWith("in_mock"))) && (
        <Card className="border border-gold/30 bg-gold/5 mt-10 rounded-2xl relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gold" />
          
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-gold animate-pulse" />
              Painel de Testes Sandbox (Modo de Demonstração)
            </CardTitle>
            <CardDescription className="text-xs">
              Stripe está operando em modo Sandbox. Use as ações abaixo para simular facilmente todos os fluxos da aba Financeiro.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="flex flex-wrap gap-3 pb-6">
            
            {!isPro ? (
              <Button
                variant="gold"
                size="sm"
                onClick={handleCheckout}
                disabled={checkingOut}
                className="text-xs font-semibold"
              >
                {checkingOut ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Play className="h-3.5 w-3.5 mr-1.5" />
                )}
                Simular Assinar Plano Pro
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSimulateNextMonthInvoice}
                  disabled={simulatingInvoice}
                  className="text-xs border-gold/30 hover:bg-gold/10 hover:text-gold"
                >
                  {simulatingInvoice ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Simular Fatura Próximo Mês (Acumular Faturas)
                </Button>
                
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleSimulateCancel}
                  disabled={simulatingCancel}
                  className="text-xs font-semibold"
                >
                  {simulatingCancel ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                  ) : (
                    <XCircle className="h-3.5 w-3.5 mr-1.5" />
                  )}
                  Simular Cancelamento de Assinatura
                </Button>
              </>
            )}

          </CardContent>
        </Card>
      )}

      {/* Simulated Customer Portal Modal dialog */}
      {showMockPortalModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border border-border shadow-2xl animate-in scale-in duration-200">
            <CardHeader className="bg-slate-950/60 border-b border-border/40 p-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-md flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-gold" />
                  Portal Financeiro do Stripe (Simulado)
                </CardTitle>
                <Badge variant="outline" className="text-gold border-gold/30">Sandbox</Badge>
              </div>
              <CardDescription className="text-xs pt-1.5">
                Simulador offline do Customer Portal oficial do Stripe.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6">
              
              <div className="space-y-4">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Status da Assinatura</div>
                <div className="bg-accent/5 p-4 rounded-xl border border-border/40 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm">Plano PregAI Pro</h4>
                    <p className="text-xs text-muted-foreground mt-0.5">R$ 27,00 por mês</p>
                  </div>
                  <Badge className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/10 border-transparent text-[10px] font-bold px-2 py-0.5">
                    Ativo
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Ações do Portal</div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  No portal real do Stripe, o aluno pode alterar cartões de crédito, baixar recibos históricos oficiais ou cancelar a assinatura recorrente.
                </p>
                <div className="pt-2 flex flex-col gap-2.5">
                  <Button 
                    variant="destructive" 
                    className="w-full justify-center h-10 font-semibold"
                    onClick={handleSimulateCancel}
                    disabled={simulatingCancel}
                  >
                    {simulatingCancel ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <XCircle className="h-4 w-4 mr-1.5" />
                    )}
                    Cancelar Plano Recorrente
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-center h-10"
                    onClick={() => setShowMockPortalModal(false)}
                  >
                    Fechar Portal de Simulação
                  </Button>
                </div>
              </div>

            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}