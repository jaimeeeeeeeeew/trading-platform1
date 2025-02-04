import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Trading from "@/pages/trading";
import AuthPage from "@/pages/auth-page";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import { TradingProvider } from "@/lib/trading-context";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Trading} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TradingProvider>
          <Router />
          <Toaster />
        </TradingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;