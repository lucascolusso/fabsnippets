import { Switch, Route, Link, useLocation } from "wouter";
import { Home } from "./pages/Home";
import { Leaderboard } from "./pages/Leaderboard";
import { Profile } from "./pages/Profile";
import { SnippetPage } from "./pages/SnippetPage";
import { BackupManagement } from "./pages/BackupManagement";
import { NewSnippetModal } from "./components/NewSnippetModal";
import { AuthPage } from "./pages/AuthPage";
import { useUser } from "./hooks/use-user";
import { Loader2 } from "lucide-react";
import { Button } from "./components/ui/button";

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
    <div className="min-h-screen pt-14">
      <nav className="border-b fixed top-0 left-0 right-0 z-50 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="text-base font-bold text-white">FabSnippets</Link>
            <div className="flex-1 flex items-center justify-center gap-8">
              <Link 
                href="/" 
                className={`text-sm font-medium transition-colors relative ${location === "/" ? "font-bold bg-black text-white after:scale-x-100 after:bg-teal-500 after:h-[2px]" : "hover:after:scale-x-100 hover:text-primary/90"} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform px-4 py-2 rounded-t-md`}
              >
                Feed
              </Link>
              <Link 
                href="/leaderboard" 
                className={`text-sm font-medium transition-colors relative ${location === "/leaderboard" ? "font-bold bg-black text-white after:scale-x-100 after:bg-teal-500 after:h-[2px]" : "hover:after:scale-x-100 hover:text-primary/90"} after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 after:transition-transform px-4 py-2 rounded-t-md`}
              >
                Leaderboard
              </Link>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <>
                  <Link href={`/profile/${user.username}`}>
                    <Button variant="ghost" className="text-white hover:text-primary/90">
                      Profile
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    className="text-white hover:text-primary/90"
                    onClick={() => logout()}
                  >
                    Logout
                  </Button>
                  <NewSnippetModal />
                </>
              ) : (
                <Link href="/auth">
                  <Button variant="ghost" className="text-white hover:text-primary/90">
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
        <Route path="/leaderboard" component={Leaderboard} />
        <Route path="/profile/:name" component={Profile} />
        <Route path="/snippet/:id" component={SnippetPage} />
        {user?.isAdmin && <Route path="/backups" component={BackupManagement} />}
      </Switch>
    </div>
  );
}

export default App;