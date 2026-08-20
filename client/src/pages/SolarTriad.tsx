import { useState } from "react";
import { ArrowLeft, Gauge, Pause, Play, RotateCcw } from "lucide-react";
import { useLocation } from "wouter";
import TriadSunThreeScene from "@/components/TriadSunThreeScene";

export default function SolarTriad() {
  const [, navigate] = useLocation();
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);

  const returnToObservatory = () => {
    const wasAlreadyComplete = window.localStorage.getItem("stargazer.task.threeSuns") === "complete";
    window.localStorage.setItem("stargazer.task.threeSuns", "complete");
    if (!wasAlreadyComplete) window.sessionStorage.setItem("stargazer.triad.returned", "1");
    navigate("/");
  };


  return (
    <main className="solar-system-page solar-triad-page">
      <header className="solar-system-topbar">
        <button type="button" className="solar-system-back" onClick={returnToObservatory}><ArrowLeft size={15} /> 返回观测站</button>
        <div className="solar-system-title"><span>THREE.JS · ANOMALOUS ORBIT</span><h1>三太阳运行</h1></div>
        <div className="solar-system-status"><span className={`status-dot ${running ? "" : "paused"}`} />{running ? "无规律运行" : "已暂停"}</div>
      </header>
      <div className="solar-triad-banner"><span className="signal-pulse" />三个异常光源已锁定 · 轨道无法预测</div>
      <div className="solar-system-stage"><TriadSunThreeScene running={running} speed={speed} /></div>
      <aside className="solar-system-console">
        <div className="solar-console-kicker"><Gauge size={14} /> 三太阳 · 异常观测</div>
        <div className="solar-console-readout"><small>SIMULATION STATE</small><strong>{running ? "无规律运行" : "暂停"}</strong><span>三颗光源以不同频率进行扰动式轨道运动</span></div>
        <button type="button" className="solar-console-action" onClick={() => setRunning((value) => !value)}>{running ? <Pause size={15} /> : <Play size={15} />}{running ? "暂停运行" : "继续运行"}</button>
        <div className="solar-speed"><div><span>运行速度</span><b>{speed}×</b></div><input type="range" min=".25" max="8" step=".25" value={speed} onChange={(event) => setSpeed(Number(event.target.value))} /></div>
        <button type="button" className="solar-reset" onClick={() => setSpeed(1)}><RotateCcw size={14} />恢复标准速度</button>
        <button type="button" className="solar-return-mission" onClick={returnToObservatory}>完成观测并返回</button>
      </aside>
    </main>
  );
}
