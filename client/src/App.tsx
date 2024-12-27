import { Switch, Route, Link } from "wouter";
import { Home } from "./pages/Home";
import { Leaderboard } from "./pages/Leaderboard";
import { NewSnippetModal } from "./components/NewSnippetModal";

function App() {
  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-14 items-center justify-between">
            <span className="text-lg font-bold">FabSnippets</span>
            <div className="flex-1 flex items-center justify-center gap-8">
              <Link href="/" className="font-medium hover:text-primary">
                Snippet feed
              </Link>
              <Link href="/leaderboard" className="font-medium hover:text-primary">
                Leaderboard
              </Link>
            </div>
            <NewSnippetModal />
          </div>
        </div>
      </nav>

      <Switch>
        <Route path="/" component={Home} />
        <Route path="/leaderboard" component={Leaderboard} />
      </Switch>
    </div>
  );
}

export default App;