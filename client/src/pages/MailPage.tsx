import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { PageWrapper } from "@/components/PageWrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Mail,
  LogOut,
  RefreshCw,
  Sparkles,
  Server,
  ChevronDown,
  Star,
  Paperclip,
  Archive,
  Trash2,
  Reply,
  Forward,
  MailPlus,
  CalendarPlus,
  Clock,
  ArrowLeft,
} from "lucide-react";
import {
  buildGoogleAuthUrl,
  buildMicrosoftAuthUrl,
  getMailRedirectUri,
  OAUTH_STATE_GOOGLE,
  OAUTH_STATE_OUTLOOK,
} from "@/lib/mailOAuth";
import {
  type MailMessage,
  type MailCategory,
  CATEGORY_LABELS,
  CATEGORY_DOT_CLASS,
  FILTER_CHIPS,
  categoryBadgeLabel,
  formatMailDateShort,
  formatMailTimeLong,
  normalizeGmailMessages,
  normalizeOutlookMessages,
  createDemoMailMessages,
} from "@/lib/mailTypes";

const STORAGE_GOOGLE = "aosrenov_mail_google_token";
const STORAGE_OUTLOOK = "aosrenov_mail_outlook_token";
const PROCESSED_CODE_PREFIX = "aosrenov_mail_oauth_done_";

type FilterKey = "all" | MailCategory;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (parts[0]?.slice(0, 2) || "?").toUpperCase();
}

function mailtoNew() {
  window.location.href = "mailto:";
}

function mailtoReply(m: MailMessage, toast?: (o: { title: string; description: string; variant?: "destructive" }) => void) {
  const to = m.senderEmail?.trim();
  if (!to) {
    toast?.({
      title: "Répondre",
      description: "Adresse e-mail de l’expéditeur introuvable.",
      variant: "destructive",
    });
    return;
  }
  const subject = encodeURIComponent(`Re: ${m.subject}`);
  window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}`;
}

function mailtoForward(m: MailMessage) {
  const subject = encodeURIComponent(`Fwd: ${m.subject}`);
  const body = encodeURIComponent(`\n\n---------- Message transféré ----------\n${m.body}`);
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

export default function MailPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [googleToken, setGoogleToken] = useState<string | null>(() =>
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(STORAGE_GOOGLE)
      : null,
  );
  const [outlookToken, setOutlookToken] = useState<string | null>(() =>
    typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(STORAGE_OUTLOOK)
      : null,
  );
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<
    "gmail" | "outlook" | "demo" | null
  >(null);
  const [imapOpen, setImapOpen] = useState(false);
  const [accountsOpen, setAccountsOpen] = useState(false);
  const [mobilePane, setMobilePane] = useState<"list" | "detail">("list");
  const oauthHandled = useRef(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_OAUTH_CLIENT_ID as
    | string
    | undefined;
  const microsoftClientId = import.meta.env.VITE_MICROSOFT_OAUTH_CLIENT_ID as
    | string
    | undefined;

  const persistGoogle = (t: string | null) => {
    setGoogleToken(t);
    if (typeof sessionStorage !== "undefined") {
      if (t) sessionStorage.setItem(STORAGE_GOOGLE, t);
      else sessionStorage.removeItem(STORAGE_GOOGLE);
    }
  };

  const persistOutlook = (t: string | null) => {
    setOutlookToken(t);
    if (typeof sessionStorage !== "undefined") {
      if (t) sessionStorage.setItem(STORAGE_OUTLOOK, t);
      else sessionStorage.removeItem(STORAGE_OUTLOOK);
    }
  };

  const inboxMessages = useMemo(
    () => messages.filter((m) => !m.archived),
    [messages],
  );

  const filteredMessages = useMemo(() => {
    if (filter === "all") return inboxMessages;
    return inboxMessages.filter((m) => m.category === filter);
  }, [inboxMessages, filter]);

  const counts = useMemo(() => {
    const byCat = (c: MailCategory) =>
      inboxMessages.filter((m) => m.category === c).length;
    return {
      all: inboxMessages.length,
      intervention: byCat("intervention"),
      devis: byCat("devis"),
      validation_devis: byCat("validation_devis"),
      relance_facture: byCat("relance_facture"),
      autre: byCat("autre"),
    };
  }, [inboxMessages]);

  const selected = useMemo(
    () => filteredMessages.find((m) => m.id === selectedId) ?? null,
    [filteredMessages, selectedId],
  );

  useEffect(() => {
    if (filteredMessages.length === 0) {
      if (selectedId !== null) setSelectedId(null);
      return;
    }
    if (!selectedId || !filteredMessages.some((m) => m.id === selectedId)) {
      setSelectedId(filteredMessages[0].id);
    }
  }, [filteredMessages, selectedId]);

  const loadGmail = useCallback(async () => {
    const t = sessionStorage.getItem(STORAGE_GOOGLE);
    if (!t) return;
    setLoading(true);
    try {
      const r = await fetch("/api/mail/gmail/messages", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message || data.error || "Erreur Gmail");
      const list = normalizeGmailMessages(data.messages || []);
      setMessages(list);
      setActiveProvider("gmail");
      setSelectedId(list[0]?.id ?? null);
    } catch (e: any) {
      toast({
        title: "Gmail",
        description: e?.message || "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadOutlook = useCallback(async () => {
    const t = sessionStorage.getItem(STORAGE_OUTLOOK);
    if (!t) return;
    setLoading(true);
    try {
      const r = await fetch("/api/mail/outlook/messages", {
        headers: { Authorization: `Bearer ${t}` },
      });
      const data = await r.json();
      if (!r.ok) {
        throw new Error(data.message || data.error?.message || "Erreur Outlook");
      }
      const list = normalizeOutlookMessages(data.messages || []);
      setMessages(list);
      setActiveProvider("outlook");
      setSelectedId(list[0]?.id ?? null);
    } catch (e: any) {
      toast({
        title: "Outlook / Microsoft 365",
        description: e?.message || "Impossible de charger les messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    const g = sessionStorage.getItem(STORAGE_GOOGLE);
    const o = sessionStorage.getItem(STORAGE_OUTLOOK);
    if (!g && !o) {
      const demo = createDemoMailMessages();
      setMessages(demo);
      setActiveProvider("demo");
      setSelectedId(demo[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    if (oauthHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const err = params.get("error");
    const errDesc = params.get("error_description");

    if (err) {
      oauthHandled.current = true;
      toast({
        title: "Connexion interrompue",
        description: errDesc || err,
        variant: "destructive",
      });
      window.history.replaceState({}, "", "/dashboard/mail");
      return;
    }

    if (!code || !state) return;
    const doneKey = PROCESSED_CODE_PREFIX + code;
    if (sessionStorage.getItem(doneKey)) {
      window.history.replaceState({}, "", "/dashboard/mail");
      return;
    }

    oauthHandled.current = true;
    sessionStorage.setItem(doneKey, "1");
    const redirectUri = getMailRedirectUri();

    (async () => {
      try {
        if (state === OAUTH_STATE_GOOGLE) {
          const res = await fetch("/api/mail/google/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(
              data.message ||
                (data.configured === false
                  ? "OAuth Google non configuré sur le serveur (variables d’environnement)."
                  : "Échange du code Google impossible"),
            );
          }
          persistGoogle(data.access_token as string);
          toast({ title: "Gmail connecté", description: "Chargement de la boîte…" });
          setTimeout(() => loadGmail(), 0);
        } else if (state === OAUTH_STATE_OUTLOOK) {
          const res = await fetch("/api/mail/microsoft/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code, redirect_uri: redirectUri }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(
              data.message ||
                (data.configured === false
                  ? "OAuth Microsoft non configuré sur le serveur."
                  : "Échange du code Microsoft impossible"),
            );
          }
          persistOutlook(data.access_token as string);
          toast({
            title: "Outlook connecté",
            description: "Chargement de la boîte…",
          });
          setTimeout(() => loadOutlook(), 0);
        }
      } catch (e: any) {
        toast({
          title: "Connexion e-mail",
          description: e?.message || "Erreur",
          variant: "destructive",
        });
      } finally {
        window.history.replaceState({}, "", "/dashboard/mail");
        setLocation("/dashboard/mail");
      }
    })();
  }, [toast, setLocation, loadGmail, loadOutlook]);

  useEffect(() => {
    const g = sessionStorage.getItem(STORAGE_GOOGLE);
    const o = sessionStorage.getItem(STORAGE_OUTLOOK);
    if (g) void loadGmail();
    else if (o) void loadOutlook();
  }, []);

  const disconnectGoogle = () => {
    persistGoogle(null);
    if (activeProvider === "gmail") {
      const demo = createDemoMailMessages();
      setMessages(demo);
      setActiveProvider("demo");
      setSelectedId(demo[0]?.id ?? null);
    }
    toast({ title: "Gmail déconnecté" });
  };

  const disconnectOutlook = () => {
    persistOutlook(null);
    if (activeProvider === "outlook") {
      const demo = createDemoMailMessages();
      setMessages(demo);
      setActiveProvider("demo");
      setSelectedId(demo[0]?.id ?? null);
    }
    toast({ title: "Outlook déconnecté" });
  };

  const showDemo = () => {
    const demo = createDemoMailMessages();
    setMessages(demo);
    setActiveProvider("demo");
    setSelectedId(demo[0]?.id ?? null);
    setMobilePane("list");
    setFilter("all");
    toast({
      title: "Mode démonstration",
      description: "Messages fictifs — sans connexion réelle.",
    });
  };

  const toggleStar = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, starred: !m.starred } : m)),
    );
  };

  const archiveMessage = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, archived: true } : m)),
    );
    toast({ title: "Archivé", description: "Message retiré de la boîte (local)." });
  };

  const deleteMessage = (id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
    toast({ title: "Supprimé", description: "Retiré de la liste (local, non synchronisé)." });
  };

  const markRead = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, read: true } : m)),
    );
  };

  const chipClass = (active: boolean) =>
    cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
      active
        ? "border-violet-500/60 bg-violet-600/40 text-white shadow-sm"
        : "border-white/15 bg-white/5 text-white/90 hover:bg-white/10",
    );

  return (
    <PageWrapper>
      <header className="bg-black/20 backdrop-blur-xl border-b border-white/10 px-4 md:px-6 py-4 rounded-tl-3xl ml-0 md:ml-20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="h-7 w-7 text-violet-400" />
              E-mails
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Gestion des e-mails triés par catégorie
            </p>
          </div>
          <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
            <Button
              className="w-full sm:w-auto bg-violet-600 hover:bg-violet-500 text-white border-0 shadow-lg shadow-violet-900/30"
              onClick={mailtoNew}
            >
              <MailPlus className="h-4 w-4 mr-2" />
              Nouveau message
            </Button>
            {(googleToken || outlookToken) && (
              <>
                {googleToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => void loadGmail()}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4 mr-1",
                        loading && activeProvider === "gmail" && "animate-spin",
                      )}
                    />
                    Actualiser Gmail
                  </Button>
                )}
                {outlookToken && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto border-white/20 bg-white/5 text-white hover:bg-white/10"
                    onClick={() => void loadOutlook()}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={cn(
                        "h-4 w-4 mr-1",
                        loading && activeProvider === "outlook" && "animate-spin",
                      )}
                    />
                    Actualiser Outlook
                  </Button>
                )}
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto border-violet-500/40 text-violet-200 hover:bg-violet-500/20"
              onClick={showDemo}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Exemple démo
            </Button>
            {activeProvider && (
              <Badge variant="outline" className="border-white/30 text-white/90">
                {activeProvider === "gmail" && "Source : Gmail"}
                {activeProvider === "outlook" && "Source : Outlook"}
                {activeProvider === "demo" && "Source : démo"}
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-4 overflow-x-auto pb-1">
          <div className="flex gap-2 min-w-max">
          <button
            type="button"
            className={chipClass(filter === "all")}
            onClick={() => setFilter("all")}
          >
            Tous ({counts.all})
          </button>
          {FILTER_CHIPS.map((cat) => (
            <button
              key={cat}
              type="button"
              className={chipClass(filter === cat)}
              onClick={() => setFilter(cat)}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  CATEGORY_DOT_CLASS[cat],
                )}
              />
              {CATEGORY_LABELS[cat]} ({counts[cat]})
            </button>
          ))}
          {counts.autre > 0 && (
            <button
              type="button"
              className={chipClass(filter === "autre")}
              onClick={() => setFilter("autre")}
            >
              <span
                className={cn(
                  "h-2 w-2 shrink-0 rounded-full",
                  CATEGORY_DOT_CLASS.autre,
                )}
              />
              {CATEGORY_LABELS.autre} ({counts.autre})
            </button>
          )}
          </div>
        </div>

        <div className="mt-4 lg:hidden">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl border border-white/10 bg-white/5">
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                mobilePane === "list"
                  ? "bg-violet-600/70 text-white"
                  : "text-white/80 hover:bg-white/10",
              )}
              onClick={() => setMobilePane("list")}
            >
              Liste
            </button>
            <button
              type="button"
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                mobilePane === "detail"
                  ? "bg-violet-600/70 text-white"
                  : "text-white/80 hover:bg-white/10",
              )}
              onClick={() => setMobilePane("detail")}
              disabled={!selected}
            >
              Détail
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 md:p-6 space-y-6 ml-0 md:ml-20">
        <div className="grid gap-4 lg:grid-cols-12 min-h-[min(70vh,560px)]">
          <Card className={cn(
            "lg:col-span-5 bg-black/20 backdrop-blur-xl border-white/10 text-white flex flex-col overflow-hidden",
            mobilePane !== "list" && "hidden lg:flex",
          )}>
            <CardHeader className="pb-2 shrink-0">
              <CardTitle className="text-base text-white/90">
                Messages ({filteredMessages.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 pt-0">
              {filteredMessages.length === 0 ? (
                <p className="text-white/50 text-sm py-8 text-center">
                  Aucun message dans ce filtre.
                </p>
              ) : (
                <ScrollArea className="h-[min(60vh,520px)] pr-2">
                  <ul className="space-y-1">
                    {filteredMessages.map((m) => {
                      const isSel = m.id === selectedId;
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedId(m.id);
                              markRead(m.id);
                              setMobilePane("detail");
                            }}
                            className={cn(
                              "w-full text-left rounded-xl border border-white/10 pl-1 pr-3 py-2.5 transition-colors relative",
                              isSel
                                ? "bg-white/10 border-white/20"
                                : "bg-white/5 hover:bg-white/10",
                              m.read === false && !isSel && "bg-violet-500/10",
                            )}
                          >
                            {isSel && (
                              <span className="absolute left-0 top-2 bottom-2 w-1 rounded-full bg-violet-500" />
                            )}
                            <div className="pl-2 flex gap-2">
                              <button
                                type="button"
                                className="shrink-0 p-0.5 mt-0.5 text-amber-400 hover:opacity-80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleStar(m.id);
                                }}
                                aria-label={m.starred ? "Retirer des favoris" : "Favori"}
                              >
                                <Star
                                  className={cn(
                                    "h-4 w-4",
                                    m.starred && "fill-amber-400",
                                  )}
                                />
                              </button>
                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between gap-2 items-start">
                                  <span className="font-semibold text-white text-sm truncate">
                                    {m.senderName}
                                  </span>
                                  <span className="text-xs text-white/45 shrink-0 tabular-nums">
                                    {formatMailDateShort(m.receivedAt)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                                  <span
                                    className={cn(
                                      "h-2 w-2 shrink-0 rounded-full",
                                      CATEGORY_DOT_CLASS[m.category],
                                    )}
                                  />
                                  <span className="text-sm text-white/90 truncate font-medium">
                                    {m.subject}
                                  </span>
                                  {m.hasAttachment && (
                                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-white/40" />
                                  )}
                                </div>
                                <p className="text-xs text-white/55 mt-1 line-clamp-2">
                                  {m.preview}
                                </p>
                              </div>
                            </div>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          <Card className={cn(
            "lg:col-span-7 bg-black/20 backdrop-blur-xl border-white/10 text-white flex flex-col min-h-[320px]",
            mobilePane !== "detail" && "hidden lg:flex",
          )}>
            {!selected ? (
              <CardContent className="flex-1 flex items-center justify-center py-16">
                <p className="text-white/50 text-sm text-center px-4">
                  Sélectionnez un message dans la liste.
                </p>
              </CardContent>
            ) : (
              <>
                <CardHeader className="pb-2 border-b border-white/10 shrink-0 space-y-3">
                  <div className="lg:hidden">
                    <Button
                      variant="ghost"
                      className="text-white/80 hover:bg-white/10 px-2"
                      onClick={() => setMobilePane("list")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-1" />
                      Retour à la liste
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/80 hover:bg-white/10"
                        onClick={() => {
                          archiveMessage(selected.id);
                        }}
                        aria-label="Archiver"
                      >
                        <Archive className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/80 hover:bg-white/10"
                        onClick={() => deleteMessage(selected.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-white/80 hover:bg-white/10"
                        onClick={() => toggleStar(selected.id)}
                        aria-label="Favori"
                      >
                        <Star
                          className={cn(
                            "h-5 w-5",
                            selected.starred && "fill-amber-400 text-amber-400",
                          )}
                        />
                      </Button>
                    </div>
                    <Button
                      asChild
                      className="bg-violet-600 hover:bg-violet-500 text-white border-0"
                    >
                      <Link href="/dashboard/planning">
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Créer événement
                      </Link>
                    </Button>
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-bold text-white">
                        {selected.subject}
                      </h2>
                      {selected.urgent && (
                        <Badge className="bg-red-600/90 text-white border-0 gap-1">
                          <Clock className="h-3 w-3" />
                          Urgent
                        </Badge>
                      )}
                      <Badge
                        className={cn(
                          "text-white border-0 text-[10px] uppercase tracking-wide",
                          selected.category === "intervention" &&
                            "bg-sky-600/80",
                          selected.category === "devis" && "bg-fuchsia-700/80",
                          selected.category === "validation_devis" &&
                            "bg-emerald-700/80",
                          selected.category === "relance_facture" &&
                            "bg-amber-700/80",
                          selected.category === "autre" && "bg-white/20",
                        )}
                      >
                        {categoryBadgeLabel(selected.category)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-4">
                      <div className="h-10 w-10 rounded-full bg-violet-600/50 flex items-center justify-center text-sm font-bold text-white">
                        {initials(selected.senderName)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-white truncate">
                          {selected.senderName}
                        </p>
                        {selected.senderEmail ? (
                          <p className="text-sm text-white/55 truncate">
                            {selected.senderEmail}
                          </p>
                        ) : null}
                      </div>
                      <span className="text-sm text-white/45 shrink-0 tabular-nums">
                        {formatMailTimeLong(selected.receivedAt)}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col min-h-0 pt-4">
                  <ScrollArea className="flex-1 max-h-[260px] md:max-h-[360px] lg:max-h-none pr-3">
                    <div className="text-sm text-white/90 whitespace-pre-wrap leading-relaxed">
                      {selected.body}
                    </div>
                  </ScrollArea>

                  {selected.attachments.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10">
                      <p className="text-sm font-medium text-white/80 mb-2">
                        Pièces jointes ({selected.attachments.length})
                      </p>
                      <ul className="space-y-2">
                        {selected.attachments.map((a) => (
                          <li
                            key={a.id}
                            className="flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                          >
                            <span className="flex items-center gap-2 min-w-0 text-sm text-white/90">
                              <Paperclip className="h-4 w-4 shrink-0 text-white/50" />
                              <span className="truncate">{a.name}</span>
                            </span>
                            <Button
                              variant="ghost"
                              className="text-violet-300 shrink-0 p-0 h-auto hover:bg-transparent hover:text-violet-200"
                              onClick={() =>
                                toast({
                                  title: "Téléchargement",
                                  description:
                                    "Les pièces jointes réelles seront disponibles via l’API messagerie (hors périmètre v1).",
                                })
                              }
                            >
                              Télécharger
                            </Button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 mt-6 pt-4 border-t border-white/10">
                    <Button
                      className="flex-1 bg-violet-600 hover:bg-violet-500 text-white"
                      onClick={() => mailtoReply(selected, toast)}
                    >
                      <Reply className="h-4 w-4 mr-2" />
                      Répondre
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 bg-white/5 text-white hover:bg-white/10"
                      onClick={() => mailtoForward(selected)}
                    >
                      <Forward className="h-4 w-4 mr-2" />
                      Transférer
                    </Button>
                  </div>
                </CardContent>
              </>
            )}
          </Card>
        </div>

        <Collapsible open={accountsOpen} onOpenChange={setAccountsOpen}>
          <Card className="bg-black/20 backdrop-blur-xl border-white/10 text-white">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 p-4 text-left hover:bg-white/5 rounded-xl transition-colors"
              >
                <span className="font-medium text-white">
                  Comptes de messagerie (Gmail, Outlook, IMAP…)
                </span>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 text-white/60 shrink-0 transition-transform",
                    accountsOpen && "rotate-180",
                  )}
                />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 grid gap-4 md:grid-cols-3">
                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      Gmail
                      {googleToken && (
                        <Badge className="bg-emerald-500/80 text-white">
                          Connecté
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {googleClientId ? (
                      !googleToken ? (
                        <Button
                          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
                          onClick={() => {
                            window.location.href =
                              buildGoogleAuthUrl(googleClientId);
                          }}
                        >
                          Se connecter avec Google
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                          onClick={disconnectGoogle}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Déconnecter
                        </Button>
                      )
                    ) : (
                      <p className="text-xs text-white/60">
                        <code className="text-violet-300">VITE_GOOGLE_OAUTH_CLIENT_ID</code>{" "}
                        + serveur{" "}
                        <code className="text-violet-300">GOOGLE_OAUTH_CLIENT_*</code>. URI :{" "}
                        <code className="break-all text-white/70">
                          {typeof window !== "undefined"
                            ? getMailRedirectUri()
                            : ""}
                        </code>
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      Outlook / Microsoft 365
                      {outlookToken && (
                        <Badge className="bg-emerald-500/80 text-white">
                          Connecté
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {microsoftClientId ? (
                      !outlookToken ? (
                        <Button
                          className="w-full bg-white/10 hover:bg-white/20 text-white border border-white/10"
                          onClick={() => {
                            window.location.href = buildMicrosoftAuthUrl(
                              microsoftClientId,
                            );
                          }}
                        >
                          Se connecter avec Microsoft
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full border-white/20 text-white hover:bg-white/10"
                          onClick={disconnectOutlook}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Déconnecter
                        </Button>
                      )
                    ) : (
                      <p className="text-xs text-white/60">
                        <code className="text-violet-300">
                          VITE_MICROSOFT_OAUTH_CLIENT_ID
                        </code>{" "}
                        +{" "}
                        <code className="text-violet-300">
                          MICROSOFT_OAUTH_CLIENT_SECRET
                        </code>{" "}
                        sur le serveur.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card className="bg-white/5 border-white/10 text-white">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Server className="h-4 w-4" />
                      Autre (IMAP)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-xs text-white/60">
                      Connexion IMAP via un relais serveur sécurisé.
                    </p>
                    <Button
                      variant="secondary"
                      className="w-full bg-white/10 text-white hover:bg-white/20"
                      onClick={() => setImapOpen(true)}
                    >
                      En savoir plus
                    </Button>
                  </CardContent>
                </Card>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <Dialog open={imapOpen} onOpenChange={setImapOpen}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>IMAP et autres fournisseurs</DialogTitle>
            <DialogDescription className="text-white/70">
              Pour Orange, Free, OVH ou tout serveur IMAP, les identifiants ne doivent pas
              transiter directement dans le navigateur. Prévoyez une API serveur qui se connecte
              au serveur de messagerie (TLS), stocke les jetons de façon sécurisée et expose des
              endpoints REST à cette application.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}
