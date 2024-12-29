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
              <Link href="/" className="font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform hover:text-primary/90">
                Snippet feed
              </Link>
              <Link href="/leaderboard" className="font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary after:scale-x-0 hover:after:scale-x-100 after:transition-transform hover:text-primary/90">
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
        <Route path="/profile/:name" component={Profile} />
      </Switch>
    </div>
  );
}

export default App;