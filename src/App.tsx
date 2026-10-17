import { useEffect, useRef, useState, type CSSProperties } from "react";
import { TelevisionScene, type TvState } from "./three/TelevisionScene";
import { CHANNELS } from "./three/channels";

const INITIAL: TvState = { power: false, channel: 0, volume: 0.7, muted: true, auto: false };

export default function App() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<TelevisionScene | null>(null);
  const [state, setState] = useState<TvState>(INITIAL);
  const [ready, setReady] = useState(false);
  const [booted, setBooted] = useState(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const scene = new TelevisionScene(el, {
      onReady: () => setReady(true),
      onState: (s) => setState(s),
    });
    sceneRef.current = scene;
    const t = window.setTimeout(() => setBooted(true), 1400);
    return () => {
      window.clearTimeout(t);
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  const s = sceneRef.current;
  const ch = CHANNELS[state.channel];

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#0b0908] text-[#e9ddc6] font-body">
      {/* 3D viewport */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* film grain / vignette over everything */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />

      {/* ------------------------------- HUD ------------------------------- */}
      <div
        className={`pointer-events-none absolute inset-0 transition-opacity duration-700 ${
          ready ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* top-left · brand */}
        <header className="absolute left-4 top-4 max-w-[220px] sm:left-8 sm:top-7 sm:max-w-[280px] xl:left-10 xl:top-8 2xl:left-14 2xl:max-w-[340px]">
          <p className="text-[9px] font-semibold uppercase tracking-[0.34em] text-[#e8a33d] sm:text-[10px] 2xl:text-xs">
            Room 40 · Broadcast Lab
          </p>
          <h1 className="font-display mt-1 text-4xl leading-none tracking-wide text-[#e9ddc6] text-glow-amber sm:text-5xl xl:text-6xl 2xl:text-7xl">
            ZENITRON
          </h1>
          <p className="mt-2 hidden text-[10px] uppercase tracking-[0.22em] text-[#8f887a] sm:block 2xl:text-xs">
            Deluxe 19″ color television
            <br />
            Model 63-C · solid state
          </p>
          <div className="mt-3 h-[3px] w-16 bg-[#e8a33d]" />
        </header>

        {/* top-right · live status */}
        <aside className="absolute right-4 top-4 sm:right-8 sm:top-7 xl:right-10 xl:top-8 2xl:right-14">
          <div className="notch border border-[#2c2620] bg-[#12100c]/90 px-4 py-2.5 text-right shadow-[0_0_30px_rgba(0,0,0,0.6)] sm:px-5 sm:py-3 2xl:px-7 2xl:py-4">
            <p className="text-[8px] uppercase tracking-[0.3em] text-[#8f887a] sm:text-[9px] 2xl:text-[11px]">Now receiving</p>
            <p
              className={`font-crt text-4xl leading-none sm:text-5xl 2xl:text-6xl ${
                state.power ? "text-[#52ff7a] text-glow-green" : "text-[#5c554a]"
              }`}
            >
              {state.power ? `CH 0${ch.id}` : "STBY"}
            </p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.24em] text-[#cfc4ae] sm:text-[10px] 2xl:text-xs">
              {state.power ? ch.name : "Tubes cooling"}
            </p>
            <div className="mt-2 flex items-center justify-end gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  state.power ? "led-blink bg-[#ff4036] shadow-[0_0_8px_#ff4036]" : "bg-[#3a352e]"
                }`}
              />
              <span className="text-[8px] uppercase tracking-[0.28em] text-[#8f887a] sm:text-[9px] 2xl:text-[11px]">
                {state.power ? "On air" : "Standby"}
              </span>
            </div>
          </div>
        </aside>

        {/* bottom-left · channel guide */}
        <nav className="pointer-events-auto absolute bottom-4 left-4 sm:bottom-8 sm:left-8 xl:left-10 2xl:bottom-10 2xl:left-14">
          <div className="notch border border-[#2c2620] bg-[#12100c]/90 shadow-[0_0_30px_rgba(0,0,0,0.6)]">
            <p className="border-b border-[#2c2620] px-3 py-1.5 text-[8px] font-semibold uppercase tracking-[0.32em] text-[#e8a33d] sm:px-4 sm:py-2 sm:text-[9px] 2xl:px-5 2xl:text-[11px]">
              Channel guide
            </p>
            <ul className="py-1">
              {CHANNELS.map((c, i) => {
                const active = i === state.channel;
                return (
                  <li key={c.id}>
                    <button
                      onClick={() => s?.setChannel(i)}
                      className={`group flex w-44 items-baseline gap-2 px-3 py-1 text-left transition-all duration-150 sm:w-56 sm:gap-3 sm:px-4 sm:py-1.5 2xl:w-72 2xl:px-5 2xl:py-2 ${
                        active
                          ? "bg-[#52ff7a]/10 text-[#52ff7a]"
                          : "text-[#8f887a] hover:bg-[#e8a33d]/5 hover:text-[#e9ddc6]"
                      }`}
                    >
                      <span
                        className={`font-crt text-lg leading-none sm:text-xl 2xl:text-2xl ${
                          active ? "text-[#52ff7a] text-glow-green" : "text-[#5c554a] group-hover:text-[#e8a33d]"
                        }`}
                      >
                        0{c.id}
                      </span>
                      <span className="flex-1 text-[10px] uppercase tracking-[0.18em] sm:text-[11px] 2xl:text-xs">{c.name}</span>
                      <span
                        className={`hidden text-[9px] uppercase tracking-[0.2em] sm:inline 2xl:text-[11px] ${
                          active ? "text-[#52ff7a]" : "text-[#4a443b]"
                        }`}
                      >
                        {c.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* bottom-right · control desk */}
        <div className="pointer-events-auto absolute bottom-4 right-4 sm:bottom-8 sm:right-8 xl:right-10 2xl:bottom-10 2xl:right-14">
          <div className="notch flex flex-col gap-2.5 border border-[#2c2620] bg-[#12100c]/90 px-3 py-3 shadow-[0_0_30px_rgba(0,0,0,0.6)] sm:gap-3 sm:px-4 sm:py-4 2xl:px-6 2xl:py-5">
            <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-start sm:gap-3">
              {/* power */}
              <button
                onClick={() => s?.setPower(!state.power)}
                className={`group flex items-center gap-2 border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.26em] transition-all duration-150 active:scale-[0.96] sm:gap-2.5 sm:px-4 sm:py-2 sm:text-[10px] 2xl:px-5 2xl:text-xs ${
                  state.power
                    ? "border-[#52ff7a]/60 bg-[#52ff7a]/10 text-[#52ff7a] shadow-[0_0_18px_rgba(82,255,122,0.25)]"
                    : "border-[#4a443b] text-[#8f887a] hover:border-[#e8a33d] hover:text-[#e8a33d]"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" className="shrink-0">
                  <circle cx="6" cy="6.6" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="21 7" strokeDashoffset="17.5" />
                  <line x1="6" y1="0.6" x2="6" y2="6" stroke="currentColor" strokeWidth="1.6" />
                </svg>
                Power
              </button>

              {/* sound */}
              <button
                onClick={() => s?.setMuted(!state.muted)}
                className={`flex items-center gap-2 border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.26em] transition-all duration-150 active:scale-[0.96] sm:gap-2.5 sm:px-4 sm:py-2 sm:text-[10px] 2xl:px-5 2xl:text-xs ${
                  !state.muted
                    ? "border-[#e8a33d]/70 bg-[#e8a33d]/10 text-[#e8a33d]"
                    : "border-[#4a443b] text-[#8f887a] hover:border-[#e8a33d] hover:text-[#e8a33d]"
                }`}
              >
                <svg width="14" height="12" viewBox="0 0 14 12" className="shrink-0">
                  <path d="M1 4h3l4-3v10L4 8H1z" fill="currentColor" />
                  {state.muted ? (
                    <line x1="9.5" y1="3.5" x2="13" y2="8.5" stroke="currentColor" strokeWidth="1.5" />
                  ) : (
                    <path d="M10 3.5a3.6 3.6 0 0 1 0 5" fill="none" stroke="currentColor" strokeWidth="1.4" />
                  )}
                </svg>
                {state.muted ? "Sound off" : "Sound on"}
              </button>

              {/* autopilot */}
              <button
                onClick={() => s?.setAuto(!state.auto)}
                className={`flex items-center gap-2 border px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.26em] transition-all duration-150 active:scale-[0.96] sm:gap-2.5 sm:px-4 sm:py-2 sm:text-[10px] 2xl:px-5 2xl:text-xs ${
                  state.auto
                    ? "border-[#7ad7ff]/70 bg-[#7ad7ff]/10 text-[#7ad7ff]"
                    : "border-[#4a443b] text-[#8f887a] hover:border-[#7ad7ff] hover:text-[#7ad7ff]"
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" className={`shrink-0 ${state.auto ? "animate-spin [animation-duration:3s]" : ""}`}>
                  <path d="M6 0.8a5.2 5.2 0 1 1-5.1 4.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M0.4 1.6 L0.9 5.2 L3.6 2.6 Z" fill="currentColor" />
                </svg>
                Autopilot
              </button>
            </div>

            {/* volume */}
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="text-[8px] uppercase tracking-[0.3em] text-[#8f887a] sm:text-[9px] 2xl:text-[11px]">Vol</span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(state.volume * 100)}
                onChange={(e) => s?.setVolume(parseInt(e.target.value, 10) / 100)}
                className="vol w-28 sm:w-44 2xl:w-56"
                style={{ "--fill": `${Math.round(state.volume * 100)}%` } as CSSProperties}
                aria-label="Volume"
              />
              <span className="font-crt w-9 text-right text-lg leading-none text-[#e8a33d] sm:w-10 sm:text-xl 2xl:w-12 2xl:text-2xl">
                {Math.round(state.volume * 100)}
              </span>
            </div>
          </div>
        </div>

        {/* bottom-center · key hints */}
        <footer className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 lg:block 2xl:bottom-8">
          <p className="border border-[#2c2620] bg-[#12100c]/80 px-5 py-2 text-[9px] uppercase tracking-[0.26em] text-[#5c554a] 2xl:px-7 2xl:py-3 2xl:text-xs">
            <span className="text-[#8f887a]">Drag</span> orbit ·{" "}
            <span className="text-[#8f887a]">←/→</span> tune ·{" "}
            <span className="text-[#8f887a]">1–5</span> preset ·{" "}
            <span className="text-[#8f887a]">P</span> power ·{" "}
            <span className="text-[#8f887a]">M</span> mute ·{" "}
            <span className="text-[#8f887a]">Click knobs</span> on the set
          </p>
        </footer>
      </div>

      {/* ------------------------------ boot screen ------------------------------ */}
      <div
        className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0b0908] transition-opacity duration-700 ${
          booted ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <p className="px-4 text-center text-[9px] uppercase tracking-[0.4em] text-[#e8a33d] sm:text-[10px] 2xl:text-sm">Room 40 · Broadcast Lab</p>
        <p className="font-display mt-2 px-4 text-center text-2xl tracking-wide text-[#e9ddc6] sm:text-4xl 2xl:text-5xl">WARMING UP THE TUBES</p>
        <div className="mt-6 flex h-8 items-end gap-1.5">
          {[0, 1, 2, 3, 4, 5, 6].map((i) => (
            <span
              key={i}
              className="warm-bar w-2 bg-[#52ff7a]/80"
              style={{ height: `${12 + (i % 4) * 7}px`, animationDelay: `${i * 0.09}s` }}
            />
          ))}
        </div>
        <p className="font-crt mt-5 px-4 text-center text-lg text-[#5c554a] sm:text-xl 2xl:text-2xl">
          {ready ? "SIGNAL ACQUIRED" : "CALIBRATING VERTICAL HOLD…"}
        </p>
      </div>
    </div>
  );
}
