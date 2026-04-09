import { useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GlobalBackground } from "@/components/GlobalBackground";
import { ChantiersProvider } from "@/context/ChantiersContext";
import { AuthProvider } from "@/context/AuthContext";
import { TeamMemberProvider } from "@/context/TeamMemberContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AnimatePresence, motion } from "framer-motion";
import Home from "@/pages/Home";
import AuthPage from "@/pages/AuthPage";
import LoginPage from "@/pages/LoginPage";
import LoadingRedirectPage from "@/pages/LoadingRedirectPage";
import InvitePage from "@/pages/InvitePage";
import TeamLoginPage from "@/pages/TeamLoginPage";
import TeamDashboard from "@/pages/TeamDashboard";
import Dashboard from "@/pages/Dashboard";
import QuotesPage from "@/pages/QuotesPage";
import ProspectsPage from "@/pages/ProspectsPage";
import ProjectsPage from "@/pages/ProjectsPage";
import PlanningPage from "@/pages/PlanningPage";
import ClientsPage from "@/pages/ClientsPage";
import CRMPipelinePage from "@/pages/CRMPipelinePage";
import TeamPage from "@/pages/TeamPage";
import SettingsPage from "@/pages/SettingsPage";
import InvoicesPage from "@/pages/InvoicesPage";
import NotFound from "@/pages/not-found";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.22, 1, 0.36, 1]
    }
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.98,
    transition: {
      duration: 0.3,
      ease: [0.22, 1, 0.36, 1]
    }
  }
};

function Router() {
  const [location] = useLocation();

  const getComponent = () => {
    // Vérifier si c'est une route d'invitation
    if (location.startsWith('/invite/')) {
      return <InvitePage />;
    }
    if (location.startsWith('/team-login/')) {
      return <TeamLoginPage />;
    }

    switch (location) {
      case "/":
        return <Home />;
      case "/auth":
        return <AuthPage />;
      case "/login":
        return <LoginPage />;
      case "/loading":
        return <LoadingRedirectPage />;
      case "/team-dashboard":
      case "/team-dashboard/projects":
      case "/team-dashboard/planning":
        return <TeamDashboard />;
      case "/dashboard":
        return <ProtectedRoute><Dashboard /></ProtectedRoute>;
      case "/dashboard/quotes":
      case "/dashboard/quotes/nouveau":
        return <ProtectedRoute><QuotesPage /></ProtectedRoute>;
      case "/dashboard/invoices":
      case "/dashboard/invoices/nouveau":
        return <ProtectedRoute><InvoicesPage /></ProtectedRoute>;
      case "/dashboard/prospects":
        return <ProtectedRoute><ProspectsPage /></ProtectedRoute>;
      case "/dashboard/projects":
        return <ProtectedRoute><ProjectsPage /></ProtectedRoute>;
      case "/dashboard/clients":
        return <ProtectedRoute><ClientsPage /></ProtectedRoute>;
      case "/dashboard/planning":
        return <ProtectedRoute><PlanningPage /></ProtectedRoute>;
      case "/dashboard/crm":
        return <ProtectedRoute><CRMPipelinePage /></ProtectedRoute>;
      case "/dashboard/team":
        return <ProtectedRoute><TeamPage /></ProtectedRoute>;
      case "/dashboard/settings":
        return <ProtectedRoute><SettingsPage /></ProtectedRoute>;
      default:
        return <NotFound />;
    }
  };

  // Pages without sidebar (Home, Auth, Login, Loading, Invite) get full page animation
  const isFullPage =
    location === "/" ||
    location === "/auth" ||
    location === "/login" ||
    location === "/loading" ||
    location.startsWith("/invite/") ||
    location.startsWith("/team-login/");

  if (isFullPage) {
    return (
      <div className="relative z-10 min-h-screen w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial="initial"
            animate="animate"
            exit="exit"
            variants={pageVariants}
            className="w-full min-h-screen"
          >
            {getComponent()}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // Pages with sidebar - conteneur explicite au-dessus du fond (z-0)
  return (
    <div className="relative z-10 min-h-screen w-full">
      {getComponent()}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TeamMemberProvider>
          <ChantiersProvider>
            <TooltipProvider>
              <GlobalBackground />
              <Toaster />
              <Router />
            </TooltipProvider>
          </ChantiersProvider>
        </TeamMemberProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
