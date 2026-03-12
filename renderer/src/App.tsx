import { useSessionStore } from "./stores/sessionStore";
import LiveSession from "./components/LiveSession";
import Dashboard from "./components/Dashboard";
import History from "./components/History";

type ViewType = "live" | "dashboard" | "history";

const TABS: { id: ViewType; label: string; icon: string }[] = [
  { id: "live", label: "Session", icon: "◈" },
  { id: "history", label: "History", icon: "≡" },
];

function App() {
  const { activeView, setActiveView, status } = useSessionStore();

  const isInSession = status === "running" || status === "paused";

  return (
    <>
      {!isInSession && (
        <nav className="nav">
          <div className="nav-brand">
            <span className="nav-brand-icon">≋</span>
            <span className="nav-brand-text">CyberRow</span>
          </div>
          <div className="nav-tabs">
            {TABS.map((tab) => {
              const isActive =
                activeView === tab.id ||
                (tab.id === "history" && activeView === "dashboard");
              return (
                <button
                  key={tab.id}
                  className={`nav-tab ${isActive ? "active" : ""}`}
                  onClick={() => setActiveView(tab.id)}
                >
                  <span className="nav-tab-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}

      <div className={`view view--live ${activeView === "live" ? "active" : ""}`}>
        <LiveSession />
      </div>

      <div className={`view ${activeView === "dashboard" ? "active" : ""}`}>
        <Dashboard />
      </div>

      <div className={`view ${activeView === "history" ? "active" : ""}`}>
        <History />
      </div>
    </>
  );
}

export default App;
