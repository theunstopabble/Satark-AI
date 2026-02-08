import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  RedirectToSignIn,
  UserButton,
  SignIn,
  SignUp,
} from "@clerk/clerk-react";
import { dark } from "@clerk/themes";
import {
  BrowserRouter,
  Route,
  Routes,
  useNavigate,
  Link,
} from "react-router-dom";
import { AudioUpload } from "@/components/AudioUpload";
import { ScanHistory } from "@/components/ScanHistory";
import { Landing } from "./pages/Landing";

// TODO: Move to env
const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!PUBLISHABLE_KEY) {
  console.error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const queryClient = new QueryClient();

function Dashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="text-2xl font-bold hover:opacity-80 transition-opacity"
          >
            Satark AI
          </Link>
          <span className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full border border-primary/20">
            Beta
          </span>
        </div>
        <UserButton />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <AudioUpload />
        <ScanHistory />
      </div>
    </div>
  );
}

function ClerkProviderWithRoutes() {
  const navigate = useNavigate();

  if (!PUBLISHABLE_KEY) {
    return (
      <div className="flex bg-destructive/10 h-screen items-center justify-center flex-col gap-4 p-4 text-center">
        <h1 className="text-4xl font-bold text-destructive">
          Configuration Error
        </h1>
        <p className="text-lg">
          Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code> in{" "}
          <code>apps/web/.env</code>
        </p>
        <p>Please add your Clerk Publishable Key to continue.</p>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      navigate={(to) => navigate(to)}
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#7c3aed",
        },
      }}
    >
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route
          path="/sign-in/*"
          element={
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
              <SignIn routing="path" path="/sign-in" />
            </div>
          }
        />
        <Route
          path="/sign-up/*"
          element={
            <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
              <SignUp routing="path" path="/sign-up" />
            </div>
          }
        />
        <Route
          path="/dashboard"
          element={
            <>
              <SignedIn>
                <Dashboard />
              </SignedIn>
              <SignedOut>
                <RedirectToSignIn />
              </SignedOut>
            </>
          }
        />
      </Routes>
    </ClerkProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ClerkProviderWithRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
