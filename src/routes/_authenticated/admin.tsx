import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Shield,
  FileText,
  DollarSign,
  TrendingUp,
  Search,
  Filter,
  Edit3,
  Loader2,
  Calendar,
  Sparkles,
  ArrowRight,
  Download,
  AlertCircle,
  Clock,
  ArrowLeftRight,
  BookOpen,
  ArrowLeft,
  X
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell
} from "recharts";
import {
  getAdminStatsFn,
  getUsersListFn,
  updateUserFn,
  getUserSermonsFn
} from "@/lib/admin.server";
import { formatCPF } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Painel Admin — PregAI" }] }),
  component: AdminDashboard,
});

function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Screen layout states
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Filtering & searching states
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");

  // Edit user modal states
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editCpf, setEditCpf] = useState("");
  const [editRole, setEditRole] = useState("user");
  const [editPlan, setEditPlan] = useState("free");
  const [editStatus, setEditStatus] = useState("active");
  const [editPeriodEnd, setEditPeriodEnd] = useState("");
  const [savingUser, setSavingUser] = useState(false);

  // View outlines modal/drawer states
  const [inspectingUser, setInspectingUser] = useState<any>(null);
  const [inspectSermons, setInspectSermons] = useState<any[]>([]);
  const [loadingSermons, setLoadingSermons] = useState(false);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      // 1. Load Stats
      const statsRes = await getAdminStatsFn();
      setStats(statsRes.stats);
      setChartData(statsRes.chartData);
      setAuthorized(true);

      // 2. Load Users
      const usersRes = await getUsersListFn();
      setUsers(usersRes.users);
    } catch (err: any) {
      console.error("[Admin Load Error]:", err);
      setAuthorized(false);
      toast.error(err?.message || "Acesso negado: Você não possui cargo de administrador.");
      // Redirect back if unauthorized
      setTimeout(() => navigate({ to: "/dashboard" }), 3000);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAdminData();
    }
  }, [user]);

  // Handle user edit submit
  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);

    try {
      await updateUserFn({
        data: {
          targetUserId: editingUser.id,
          fullName: editName,
          cpf: editCpf,
          role: editRole,
          subscription: {
            plan: editPlan,
            status: editStatus,
            currentPeriodEnd: editPeriodEnd ? new Date(editPeriodEnd).toISOString() : null
          }
        }
      });

      toast.success("Dados do usuário atualizados com sucesso!");
      setEditingUser(null);
      await loadAdminData(); // Reload list
    } catch (err: any) {
      toast.error(err?.message || "Erro ao salvar alterações do usuário.");
    } finally {
      setSavingUser(false);
    }
  };

  // Open inspection drawer for user outlines
  const handleInspectUser = async (targetUser: any) => {
    setInspectingUser(targetUser);
    setLoadingSermons(true);
    try {
      const res = await getUserSermonsFn({ data: targetUser.id });
      setInspectSermons(res.sermons || []);
    } catch (err: any) {
      toast.error(err?.message || "Erro ao buscar pregações do usuário.");
    } finally {
      setLoadingSermons(false);
    }
  };

  // Open editing modal
  const startEditUser = (targetUser: any) => {
    setEditingUser(targetUser);
    setEditName(targetUser.fullName);
    setEditCpf(targetUser.cpf ? formatCPF(targetUser.cpf) : "");
    setEditRole(targetUser.role);
    setEditPlan(targetUser.subscription?.plan || "free");
    setEditStatus(targetUser.subscription?.status || "active");
    
    if (targetUser.subscription?.current_period_end) {
      const date = new Date(targetUser.subscription.current_period_end);
      setEditPeriodEnd(date.toISOString().split("T")[0]);
    } else {
      setEditPeriodEnd("");
    }
  };

  // Filters calculation
  const filteredUsers = users.filter((u) => {
    const nameMatch = u.fullName.toLowerCase().includes(searchQuery.toLowerCase());
    const emailMatch = u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const searchMatch = searchQuery === "" || nameMatch || emailMatch;

    const planMatch = planFilter === "all" || u.subscription?.plan === planFilter;
    const roleMatch = roleFilter === "all" || u.role === roleFilter;

    return searchMatch && planMatch && roleMatch;
  });

  // Calculate plans summary for donut chart
  const freeCount = users.filter(u => u.subscription?.plan === "free" || !u.subscription?.plan).length;
  const proCount = users.filter(u => u.subscription?.plan === "pro").length;
  const pieData = [
    { name: "Free", value: freeCount, color: "var(--color-muted-foreground)" },
    { name: "Pro", value: proCount, color: "var(--gold)" }
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
        <div className="relative flex items-center justify-center">
          <div className="h-12 w-12 rounded-full border-4 border-gold/20 border-t-gold animate-spin" />
          <Shield className="absolute h-5 w-5 text-gold animate-pulse" />
        </div>
        <p className="text-muted-foreground text-sm">Carregando painel de controle administrativo...</p>
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center mt-20 space-y-6 bg-card border border-border rounded-2xl shadow-xl">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 border border-destructive/20 text-destructive mb-2">
          <AlertCircle className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold tracking-tight">Acesso Não Autorizado</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Esta página é restrita apenas para administradores cadastrados do PregAI. Você está sendo redirecionado para a dashboard.
          </p>
        </div>
        <Button variant="outline" className="w-full" asChild>
          <a href="/dashboard" className="flex items-center justify-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Voltar para a Dashboard
          </a>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto space-y-8 animate-fade-in text-foreground">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-semibold text-gold border border-gold/20 mb-2">
            <Shield className="h-3.5 w-3.5 animate-pulse" />
            Consola de Administrador
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Painel Administrativo</h1>
          <p className="text-muted-foreground text-sm md:text-base">
            Visão geral da plataforma, controle de assinaturas, auditoria de esboços e gerenciamento de perfis de alunos.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        
        <Card className="border border-border bg-card/50 hover:border-gold/30 transition-all duration-300 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Users className="h-3.5 w-3.5 text-gold" /> Usuários Cadastrados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black">{stats?.totalUsers}</div>
            <div className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> Crescimento orgânico
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/50 hover:border-gold/30 transition-all duration-300 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-gold" /> Assinantes Pro
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-gold">{stats?.totalPro}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Taxa de conversão: {stats?.totalUsers > 0 ? ((stats.totalPro / stats.totalUsers) * 100).toFixed(1) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/50 hover:border-gold/30 transition-all duration-300 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <FileText className="h-3.5 w-3.5 text-gold" /> Esboços Gerados
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black">{stats?.totalSermons}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Média: {stats?.totalUsers > 0 ? (stats.totalSermons / stats.totalUsers).toFixed(1) : 0} por conta
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card/50 hover:border-gold/30 transition-all duration-300 relative overflow-hidden" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
              <DollarSign className="h-3.5 w-3.5 text-gold" /> Receita Mensal Est.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-black text-emerald-400">
              {stats?.totalRevenue?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Faturamento recorrente atual
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Charts Section */}
      <div className="grid md:grid-cols-3 gap-6">
        
        {/* Main Growth Area Chart */}
        <Card className="md:col-span-2 border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-gold" /> Atividade da Plataforma (Últimos Dias)
            </CardTitle>
            <CardDescription className="text-xs">
              Estatísticas diárias de novos registros de usuários e esboços teológicos gerados por inteligência artificial.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 pt-2">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorSermons" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                  <YAxis stroke="var(--color-muted-foreground)" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "var(--color-popover)", 
                      borderColor: "var(--color-border)",
                      borderRadius: "0.5rem",
                      fontSize: "11px"
                    }} 
                  />
                  <Area type="monotone" name="Novas Contas" dataKey="users" stroke="var(--gold)" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                  <Area type="monotone" name="Esboços Gerados" dataKey="sermons" stroke="var(--color-primary)" fillOpacity={1} fill="url(#colorSermons)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados suficientes para exibir gráficos.</div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Donut Chart */}
        <Card className="border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
          <CardHeader className="pb-4">
            <CardTitle className="text-base flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-gold" /> Distribuição de Planos
            </CardTitle>
            <CardDescription className="text-xs">
              Proporção de contas gratuitas em relação aos assinantes Pro da plataforma.
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64 flex flex-col items-center justify-center">
            {users.length > 0 ? (
              <>
                <div className="relative w-full h-44 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Central Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black">{users.length}</span>
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Total Contas</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex gap-6 text-xs mt-2 justify-center">
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-muted-foreground" />
                    <span>Free ({freeCount})</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="h-3 w-3 rounded-full bg-gold" />
                    <span>Pro ({proCount})</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">Sem dados disponíveis.</div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Users Manager Table */}
      <Card className="border border-border" style={{ boxShadow: "var(--shadow-card)" }}>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Gerenciamento de Alunos</CardTitle>
          <CardDescription className="text-xs">
            Lista completa de cadastros. Visualize dados cadastrais, altere cargos, ajuste planos e verifique pregações geradas.
          </CardDescription>
        </CardHeader>

        {/* Filter Toolbar */}
        <div className="p-6 pt-0 border-b border-border/40 flex flex-col sm:flex-row gap-3">
          
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome ou e-mail..."
              className="w-full bg-background border border-border rounded-lg pl-9 pr-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-gold/50"
            />
          </div>

          <div className="flex flex-wrap gap-2.5">
            <div className="flex items-center gap-2 bg-background border border-border rounded-lg px-3 py-1.5 text-xs text-muted-foreground">
              <Filter className="h-3.5 w-3.5 text-gold" />
              <span>Filtros:</span>
            </div>
            
            <select
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1 text-xs text-foreground outline-none focus:border-gold/50"
            >
              <option value="all">Planos: Todos</option>
              <option value="free">Plano Free</option>
              <option value="pro">Plano Pro</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-background border border-border rounded-lg px-3 py-1 text-xs text-foreground outline-none focus:border-gold/50"
            >
              <option value="all">Cargos: Todos</option>
              <option value="user">Usuário</option>
              <option value="admin">Administrador</option>
            </select>
          </div>

        </div>

        {/* Table */}
        <CardContent className="p-0 overflow-x-auto">
          {filteredUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6 py-4">Usuário</TableHead>
                  <TableHead className="py-4">Email</TableHead>
                  <TableHead className="py-4">Cargo</TableHead>
                  <TableHead className="py-4">Plano</TableHead>
                  <TableHead className="py-4 text-center">Esboços</TableHead>
                  <TableHead className="py-4">Cadastro</TableHead>
                  <TableHead className="pr-6 py-4 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((item) => (
                  <TableRow key={item.id} className="hover:bg-muted/10">
                    <TableCell className="pl-6 py-3 font-medium flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-accent/20 border border-border overflow-hidden flex items-center justify-center text-xs text-muted-foreground uppercase font-bold shrink-0">
                        {item.avatarUrl ? (
                          <img src={item.avatarUrl} alt={item.fullName} className="h-full w-full object-cover" />
                        ) : (
                          item.fullName.substring(0, 2) || "Al"
                        )}
                      </div>
                      <span className="truncate max-w-[150px]">{item.fullName}</span>
                    </TableCell>
                    
                    <TableCell className="py-3 text-muted-foreground font-mono text-xs">
                      <div>{item.email}</div>
                      {item.cpf && (
                        <div className="text-[10px] text-muted-foreground/60 mt-0.5 font-sans">
                          CPF: {formatCPF(item.cpf)}
                        </div>
                      )}
                    </TableCell>
                    
                    <TableCell className="py-3">
                      {item.role === "admin" ? (
                        <Badge className="bg-purple-500/10 text-purple-400 border-transparent text-[10px] px-2 py-0.5 font-bold flex items-center gap-1 w-max">
                          <Shield className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-[10px] text-muted-foreground px-2 py-0.5">
                          Usuário
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="py-3">
                      {item.subscription?.plan === "pro" ? (
                        <Badge className="bg-gold/15 text-gold border-transparent text-[10px] px-2 py-0.5 font-bold uppercase tracking-wider flex items-center gap-1 w-max">
                          Pro
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="border-border text-muted-foreground text-[10px] px-2 py-0.5 uppercase">
                          Free
                        </Badge>
                      )}
                    </TableCell>
                    
                    <TableCell className="py-3 text-center font-bold text-xs">
                      {item.sermonsCount}
                    </TableCell>
                    
                    <TableCell className="py-3 text-muted-foreground text-xs">
                      {new Date(item.createdAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                    
                    <TableCell className="pr-6 py-3 text-right space-x-2.5">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-border/80 hover:border-gold/30 hover:bg-gold/5"
                        onClick={() => handleInspectUser(item)}
                      >
                        <BookOpen className="h-3.5 w-3.5 mr-1 text-gold" /> Ver Esboços
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs bg-muted/20 border-border hover:bg-muted/40"
                        onClick={() => startEditUser(item)}
                      >
                        <Edit3 className="h-3.5 w-3.5 mr-1" /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/15 border border-border">
                <Users className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="space-y-1">
                <h4 className="font-semibold text-sm">Nenhum usuário encontrado</h4>
                <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                  Tente alterar os termos da busca ou os filtros selecionados acima.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="border-t border-border/40 p-4 text-xs text-muted-foreground justify-between">
          <span>Mostrando {filteredUsers.length} de {users.length} usuários</span>
          <span>Atualização dinâmica em tempo real</span>
        </CardFooter>
      </Card>

      {/* Edit User Modal Dialog */}
      {editingUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full border border-border shadow-2xl animate-in scale-in duration-200">
            <CardHeader className="bg-slate-950/60 border-b border-border/40 p-5 rounded-t-xl">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <Edit3 className="h-4 w-4 text-gold" />
                  Editar Cadastro do Aluno
                </CardTitle>
                <button 
                  onClick={() => setEditingUser(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription className="text-xs pt-1">
                Alteração imediata de dados cadastrais, cargo e plano de assinatura do usuário.
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSaveUser}>
              <CardContent className="p-6 space-y-4">
                
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="w-full bg-muted/30 border border-border rounded-lg px-3 py-2 text-xs font-mono text-muted-foreground cursor-not-allowed outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Nome Completo</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    placeholder="Nome Completo do Aluno"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">CPF</label>
                  <input
                    type="text"
                    value={editCpf}
                    onChange={(e) => setEditCpf(formatCPF(e.target.value))}
                    placeholder="000.000.000-00"
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold/50 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Cargo de Acesso</label>
                    <select
                      value={editRole}
                      onChange={(e) => setEditRole(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold/50"
                    >
                      <option value="user">Usuário Comum</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Plano de Assinatura</label>
                    <select
                      value={editPlan}
                      onChange={(e) => setEditPlan(e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold/50"
                    >
                      <option value="free">Plano Free</option>
                      <option value="pro">Plano Pro (R$27/mês)</option>
                    </select>
                  </div>
                </div>

                {editPlan === "pro" && (
                  <div className="grid grid-cols-2 gap-4 animate-fade-in border-t border-border/40 pt-3 mt-3">
                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Status Cobrança</label>
                      <select
                        value={editStatus}
                        onChange={(e) => setEditStatus(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold/50"
                      >
                        <option value="active">Ativo (Pago)</option>
                        <option value="canceled">Cancelado / Expirado</option>
                        <option value="past_due">Atrasado (Past Due)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Data Expiração</label>
                      <input
                        type="date"
                        value={editPeriodEnd}
                        onChange={(e) => setEditPeriodEnd(e.target.value)}
                        className="w-full bg-background border border-border rounded-lg px-3 py-2 text-xs outline-none focus:border-gold/50"
                      />
                    </div>
                  </div>
                )}

              </CardContent>
              
              <CardFooter className="border-t border-border/40 p-4 gap-3 justify-end bg-muted/5">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setEditingUser(null)}
                  className="h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  variant="gold" 
                  disabled={savingUser}
                  className="h-9 text-xs font-bold"
                >
                  {savingUser ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> Salvando...
                    </>
                  ) : (
                    "Confirmar Alterações"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}

      {/* Inspect User Outlines Drawer Dialog */}
      {inspectingUser && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full border border-border shadow-2xl animate-in scale-in duration-200 flex flex-col max-h-[85vh]">
            <CardHeader className="bg-slate-950/60 border-b border-border/40 p-5 rounded-t-xl shrink-0">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-gold" />
                  Esboços de {inspectingUser.fullName}
                </CardTitle>
                <button 
                  onClick={() => setInspectingUser(null)}
                  className="text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <CardDescription className="text-xs pt-1">
                Auditoria de esboços homiléticos gerados por {inspectingUser.email}.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="p-0 overflow-y-auto flex-1 divide-y divide-border/40">
              {loadingSermons ? (
                <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                  <Loader2 className="h-7 w-7 animate-spin text-gold" />
                  <p className="text-xs text-muted-foreground">Buscando esboços no banco de dados...</p>
                </div>
              ) : inspectSermons.length > 0 ? (
                inspectSermons.map((sermon) => (
                  <div key={sermon.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/10 transition-colors">
                    <div className="space-y-1">
                      <h4 className="font-bold text-sm text-foreground leading-tight line-clamp-1">{sermon.video_title}</h4>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {sermon.preacher_name}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" /> {sermon.theme}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {new Date(sermon.created_at).toLocaleDateString("pt-BR")}</span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs hover:border-gold/30 hover:bg-gold/5 text-gold self-start sm:self-center"
                      onClick={() => {
                        setInspectingUser(null);
                        navigate({
                          to: "/dashboard/sermon/$id",
                          params: { id: sermon.id }
                        });
                      }}
                    >
                      Acessar Esboço <ArrowRight className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-muted-foreground text-xs space-y-2">
                  <FileText className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                  <p>Este usuário ainda não gerou nenhum esboço homilético.</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="border-t border-border/40 p-4 justify-end bg-muted/5 shrink-0">
              <Button 
                variant="outline" 
                onClick={() => setInspectingUser(null)}
                className="h-9 text-xs"
              >
                Fechar Auditoria
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}

    </div>
  );
}
