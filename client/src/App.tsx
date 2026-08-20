/* Design philosophy: 三体 / Scientific Instrument Aesthetic. Loading is presented as a measured observatory boot sequence, not a generic spinner. */
import { lazy, Suspense, useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

const Home = lazy(() => import("./pages/Home"));
const Travel = lazy(() => import("./pages/Travel"));
const SolarSystem = lazy(() => import("./pages/SolarSystem"));
const SolarTriad = lazy(() => import("./pages/SolarTriad"));
const NotFound = lazy(() => import("@/pages/NotFound"));

function RouteFallback() {
  const stages = [
    { at: 8, text: "建立三体观测链路" },
    { at: 31, text: "校准天球坐标" },
    { at: 56, text: "同步星点目录" },
    { at: 79, text: "准备观测舱" },
    { at: 96, text: "等待观测窗口" },
  ];
  const [progress, setProgress] = useState(8);
  useEffect(() => {
    const timer = window.setInterval(() => setProgress((value) => Math.min(96, value + (value < 56 ? 4 : 2))), 180);
    return () => window.clearInterval(timer);
  }, []);
  const stage = [...stages].reverse().find((item) => progress >= item.at) ?? stages[0];
  return (
    <main className="three-body-loading" role="status" aria-live="polite" aria-label={`三体观测启动进度 ${progress}%`}>
      <div className="three-body-loading__instrument">
        <div className="three-body-loading__eyebrow">THREE-BODY OBSERVATORY · BOOT SEQUENCE</div>
        <div className="three-body-loading__title">三体观测链路启动中</div>
        <div className="three-body-loading__stage">{stage.text}</div>
        <div className="three-body-loading__track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        <div className="three-body-loading__meta"><span>观测窗口</span><strong>{progress}%</strong><span>三体坐标系</span></div>
      </div>
    </main>
  );
}

function Router() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Switch>
        <Route path={"/"} component={Home} />
        <Route path={"/travel/:planetId"} component={Travel} />
        <Route path={"/solar-system"} component={SolarSystem} />
        <Route path={"/solar-triad"} component={SolarTriad} />
        <Route path={"/404"} component={NotFound} />
        {/* Final fallback route */}
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
