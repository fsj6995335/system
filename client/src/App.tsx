import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import LoanLayout from "./components/LoanLayout";
import HomePage from "./pages/HomePage";
import DataScreen from "./pages/DataScreen";
import CreditReports from "./pages/CreditReports";
import Customers from "./pages/Customers";
import BankProducts from "./pages/BankProducts";
import Disbursements from "./pages/Disbursements";
import Rankings from "./pages/Rankings";
import AiAnalysis from "./pages/AiAnalysis";
import AiAssistant from "./pages/AiAssistant";
import AiVideo from "./pages/AiVideo";
import Branches from "./pages/Branches";
import Employees from "./pages/Employees";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";

function Router() {
  return (
    <Switch>
      <Route path="/">
        <LoanLayout><HomePage /></LoanLayout>
      </Route>
      <Route path="/data-screen">
        <LoanLayout><DataScreen /></LoanLayout>
      </Route>
      <Route path="/credit-reports">
        <LoanLayout><CreditReports /></LoanLayout>
      </Route>
      <Route path="/customers">
        <LoanLayout><Customers /></LoanLayout>
      </Route>
      <Route path="/bank-products">
        <LoanLayout><BankProducts /></LoanLayout>
      </Route>
      <Route path="/disbursements">
        <LoanLayout><Disbursements /></LoanLayout>
      </Route>
      <Route path="/rankings">
        <LoanLayout><Rankings /></LoanLayout>
      </Route>
      <Route path="/ai-analysis">
        <LoanLayout><AiAnalysis /></LoanLayout>
      </Route>
      <Route path="/ai-assistant">
        <LoanLayout><AiAssistant /></LoanLayout>
      </Route>
      <Route path="/ai-video">
        <LoanLayout><AiVideo /></LoanLayout>
      </Route>
      <Route path="/branches">
        <LoanLayout><Branches /></LoanLayout>
      </Route>
      <Route path="/employees">
        <LoanLayout><Employees /></LoanLayout>
      </Route>
      <Route path="/settings">
        <LoanLayout><Settings /></LoanLayout>
      </Route>
      <Route path="/audit-logs">
        <LoanLayout><AuditLogs /></LoanLayout>
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
