import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { loginTeamWithCode } from "@/lib/teamApi";
import { useTeamMemberAuth } from "@/context/TeamMemberContext";

function extractOwnerSlug(pathname: string): string {
  const m = pathname.match(/^\/team-login\/([^/?#]+)/);
  return m ? decodeURIComponent(m[1]) : "";
}

export default function TeamLoginPage() {
  const [location, setLocation] = useLocation();
  const ownerSlug = extractOwnerSlug(location);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { login } = useTeamMemberAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(code)) {
      toast({
        title: "Code invalide",
        description: "Le code doit contenir exactement 4 chiffres.",
        variant: "destructive",
      });
      return;
    }
    if (!ownerSlug) {
      toast({
        title: "Lien invalide",
        description: "Le lien de connexion membre est incomplet.",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);
    const out = await loginTeamWithCode({ ownerSlug, code });
    setSubmitting(false);
    if (!out.ok) {
      toast({
        title: "Connexion refusée",
        description: out.error,
        variant: "destructive",
      });
      return;
    }
    login(out.session);
    setLocation("/team-dashboard");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <Card className="w-full max-w-md bg-black/20 backdrop-blur-xl border border-white/10 text-white">
        <CardHeader>
          <CardTitle>Connexion membre d&apos;équipe</CardTitle>
          <p className="text-sm text-white/70">
            Entrez votre code 4 chiffres pour accéder à votre espace.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="team-code">Code</Label>
              <Input
                id="team-code"
                type="password"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
                placeholder="0000"
                className="bg-black/30 border-white/15 text-white text-center tracking-[0.4em] text-xl"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-violet-600 hover:bg-violet-500 text-white"
              disabled={submitting}
            >
              {submitting ? "Connexion..." : "Se connecter"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
