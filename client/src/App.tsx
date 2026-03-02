import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LoanLayout from "./components/LoanLayout";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import LoanList from "./pages/LoanList";
import LoanForm from "./pages/LoanForm";
import LoanDetail from "./pages/LoanDetail";
import Approvals from "./pages/Approvals";
import Stats from "./pages/Stats";
import AiVideo from "./pages/AiVideo";
import AiAnalysis from "./pages/AiAnalysis";
import Notifications from "./pages/Notifications";
import Users from "./pages/Users";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/dashboard">
        <LoanLayout><Dashboard /></LoanLayout>
      </Route>
      <Route path="/loans/new">
        <LoanLayout><LoanForm /></LoanLayout>
      </Route>
      <Route path="/loans/:id">
        <LoanLayout><LoanDetail /></LoanLayout>
      </Route>
      <Route path="/loans">
        <LoanLayout><LoanList /></LoanLayout>
      </Route>
      <Route path="/approvals">
        <LoanLayout><Approvals /></LoanLayout>
      </Route>
      <Route path="/stats">
        <LoanLayout><Stats /></LoanLayout>
      </Route>
      <Route path="/ai-video">
        <LoanLayout><AiVideo /></LoanLayout>
      </Route>
      <Route path="/ai-analysis">
        <LoanLayout><AiAnalysis /></LoanLayout>
      </Route>
      <Route path="/notifications">
        <LoanLayout><Notifications /></LoanLayout>
      </Route>
      <Route path="/users">
        <LoanLayout><Users /></LoanLayout>
      </Route>
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
