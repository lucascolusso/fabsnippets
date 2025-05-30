import { Switch, Route, Link, useLocation } from "wouter";
import { Home } from "./pages/Home";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { SnippetPage } from "./pages/SnippetPage";
import { BackupManagement } from "./pages/BackupManagement";
import { SitemapPage } from "./pages/SitemapPage";
import { NewSnippetModal } from "./components/NewSnippetModal";
import { AuthPage } from "./pages/AuthPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { useUser } from "./hooks/use-user";
import { Loader2 } from "lucide-react";
import { Button } from "./components/ui/button";
import "./styles/topbar.css";

function App() {
  const [location] = useLocation();
  const { user, isLoading, logout } = useUser();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-10">
      <nav className="border-b fixed top-0 left-0 right-0 z-50 bg-gray-900">
        <div className="container mx-auto px-2">
          <div className="flex h-10 items-center justify-between">
            <Link href="/" className="text-sm font-bold text-white">FabSnippets</Link>
            <div className="flex-1 flex items-center justify-center gap-2">
              <Link 
                href="/" 
                className={`text-xs transition-colors relative ${location === "/" ? "font-semibold bg-black text-white rounded-full" : "hover:text-primary/90"} px-4 py-1.5`}
              >
                Feed
              </Link>
              <Link 
                href="/leaderboard" 
                className={`text-xs transition-colors relative ${location === "/leaderboard" ? "font-semibold bg-black text-white rounded-full" : "hover:text-primary/90"} px-4 py-1.5`}
              >
                Leaderboard
              </Link>
              {user && (
                <Link 
                  href={`/profile/${user.username}`}
                  className={`text-xs transition-colors relative ${location.includes("/profile/") ? "font-semibold bg-black text-white rounded-full" : "hover:text-primary/90"} px-4 py-1.5`}
                >
                  My Profile
                </Link>
              )}
            </div>
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-white hover:text-primary/90"
                    onClick={() => logout()}
                  >
                    Logout
                  </Button>
                  <NewSnippetModal />
                </>
              ) : (
                <Link href="/auth">
                  <Button variant="ghost" size="sm" className="text-xs text-white hover:text-primary/90">
                    Login / Sign Up
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={AuthPage} />
        <Route path="/reset-password" component={ResetPasswordPage} />
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/profile/:name" component={Profile} />
        <Route path="/snippet/:id" component={SnippetPage} />
        <Route path="/sitemap" component={SitemapPage} />
        {user?.isAdmin && <Route path="/backups" component={BackupManagement} />}
      </Switch>
      
      <footer className="border-t mt-12 py-4 text-sm text-center text-muted-foreground">
        <div className="container mx-auto flex flex-col items-center">
          <div className="space-x-4">
            <Link to="/" className="hover:text-primary">Home</Link>
            <Link to="/leaderboard" className="hover:text-primary">Leaderboard</Link>
          </div>
          <p className="mt-2">© {new Date().getFullYear()} FabSnippets. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;