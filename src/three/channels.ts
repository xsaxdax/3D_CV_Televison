export interface ChannelDef {
  id: number;
  name: string;
  label: string;
}

export const CHANNELS: ChannelDef[] = [
  { id: 1, name: "WHITE NOISE", label: "SNOW" },
  { id: 2, name: "COLOR BARS", label: "SMPTE" },
  { id: 3, name: "EVENING NEWS", label: "LIVE" },
  { id: 4, name: "ZENI-POP", label: "IDLE" },
  { id: 5, name: "MONOSCOPE", label: "TEST" },
];

export const SCREEN_W = 512;
export const SCREEN_H = 384;

const HEADLINES = [
  "SIGNAL LOCKED — 512 LINES OF PURE PHOSPHOR",
  "PICTURE TUBE OUTLASTS THIRD COFFEE BREAK",
  "ANTENNA ANGLE VERIFIED AT 23.5 DEGREES",
  "COLOR SWEEP CIRCUIT PASSES MIDNIGHT CHECK",
  "ROOM 40 REPORTS: ALL TUBES NOMINAL",
];

const TICKER =
  "+++ ZENITRON 63-C PASSES FCC COLOR CERTIFICATION +++ RABBIT-EAR ALIGNMENT ADVISORY IN EFFECT +++ VERTICAL HOLD DRIFT WITHIN TOLERANCE +++ STATION ID EVERY 40 SECONDS +++ ";

export class ChannelRenderer {
  private snowCanvas: HTMLCanvasElement;
  private snowCtx: CanvasRenderingContext2D;
  private snowData: ImageData;
  private bounce = { x: 150, y: 140, vx: 96, vy: 74, hue: 12 };
  private headlineStart = 0;
  private headlineIdx = 0;

  constructor() {
    this.snowCanvas = document.createElement("canvas");
    this.snowCanvas.width = 128;
    this.snowCanvas.height = 96;
    this.snowCtx = this.snowCanvas.getContext("2d")!;
    this.snowData = this.snowCtx.createImageData(128, 96);
  }

  draw(
    ctx: CanvasRenderingContext2D,
    channel: number,
    t: number,
    dt: number
  ): void {
    switch (channel) {
      case 0:
        this.drawStatic(ctx, t);
        break;
      case 1:
        this.drawBars(ctx, t);
        break;
      case 2:
        this.drawNews(ctx, t);
        break;
      case 3:
        this.drawBounce(ctx, t, dt);
        break;
      default:
        this.drawTestCard(ctx, t);
        break;
    }
  }

  // ---- CH 1 · WHITE NOISE -------------------------------------------------
  private drawStatic(ctx: CanvasRenderingContext2D, t: number): void {
    const d = this.snowData.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = (Math.random() * 255) | 0;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
    this.snowCtx.putImageData(this.snowData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(this.snowCanvas, 0, 0, SCREEN_W, SCREEN_H);
    ctx.imageSmoothingEnabled = true;

    // rolling luminance band
    const by = ((t * 52) % (SCREEN_H + 140)) - 70;
    const g = ctx.createLinearGradient(0, by, 0, by + 70);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.10)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, by, SCREEN_W, 70);

    // occasional horizontal tear
    if (Math.random() < 0.05) {
      const ty = (Math.random() * SCREEN_H) | 0;
      const th = 4 + ((Math.random() * 14) | 0);
      const shift = ((Math.random() - 0.5) * 46) | 0;
      const slice = ctx.getImageData(0, ty, SCREEN_W, th);
      ctx.putImageData(slice, shift, ty);
    }
  }

  // ---- CH 2 · COLOR BARS ---------------------------------------------------
  private drawBars(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    const top = ["#c8c8c8", "#c8c800", "#00c8c8", "#00c800", "#c800c8", "#c80000", "#0000c8"];
    const h1 = SCREEN_H * 0.66;
    const w = SCREEN_W / 7;
    top.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * w, 0, w + 1, h1);
    });

    // reverse strip
    const rev = ["#0000c8", "#0d0d0d", "#c800c8", "#0d0d0d", "#00c8c8", "#0d0d0d", "#c8c8c8"];
    const h2 = SCREEN_H * 0.1;
    rev.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * w, h1, w + 1, h2);
    });

    // pluge strip
    const y3 = h1 + h2;
    const pluge = ["#00214c", "#f2f2f2", "#32006a", "#0d0d0d", "#050505", "#0d0d0d", "#161616"];
    pluge.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(i * w, y3, w + 1, SCREEN_H - y3);
    });

    // drifting brightness band (vertical-hold drift)
    const by = ((t * 26) % (SCREEN_H + 160)) - 80;
    const g = ctx.createLinearGradient(0, by, 0, by + 80);
    g.addColorStop(0, "rgba(255,255,255,0)");
    g.addColorStop(0.5, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, by, SCREEN_W, 80);

    ctx.font = "16px 'IBM Plex Mono', monospace";
    ctx.textAlign = "right";
    ctx.fillStyle = "#e8e8e8";
    ctx.fillText("ZENITRON · CH 02 · 512×384", SCREEN_W - 14, SCREEN_H - 14);
    ctx.textAlign = "left";
  }

  // ---- CH 3 · EVENING NEWS ---------------------------------------------------
  private drawNews(ctx: CanvasRenderingContext2D, t: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    g.addColorStop(0, "#0c2347");
    g.addColorStop(1, "#050d1c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // rotating wire globe
    const cx = 256;
    const cy = 150;
    const r = 74;
    ctx.strokeStyle = "rgba(120,170,235,0.85)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(Math.cos(t * 0.7 + i * 0.6)) * r * 0.92 + 4, r, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(120,170,235,0.35)";
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.32, 0, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(120,170,235,0.5)";
    ctx.stroke();

    // LIVE pip
    const liveA = 0.55 + 0.45 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(255,64,54,${liveA.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(34, 34, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "22px 'VT323', monospace";
    ctx.fillStyle = "#ff8a80";
    ctx.fillText("LIVE", 48, 42);

    // clock
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    ctx.textAlign = "right";
    ctx.font = "34px 'VT323', monospace";
    ctx.fillStyle = "#bcd6ff";
    ctx.fillText(`${hh}:${mm}:${ss}`, SCREEN_W - 20, 42);
    ctx.textAlign = "left";

    // masthead
    ctx.fillStyle = "#b3202a";
    ctx.fillRect(0, 240, SCREEN_W, 46);
    ctx.font = "44px 'Bebas Neue', sans-serif";
    ctx.fillStyle = "#f4ead8";
    ctx.fillText("THE EVENING REPORT", 16, 275);
    ctx.font = "20px 'VT323', monospace";
    ctx.fillStyle = "#ffd9a0";
    ctx.textAlign = "right";
    ctx.fillText("CHANNEL 3 · 19:63 EDITION", SCREEN_W - 16, 272);
    ctx.textAlign = "left";

    // headline typewriter
    if (t - this.headlineStart > 6) {
      this.headlineStart = t;
      this.headlineIdx = (this.headlineIdx + 1) % HEADLINES.length;
    }
    const full = HEADLINES[this.headlineIdx];
    const chars = Math.min(full.length, Math.floor((t - this.headlineStart) * 16));
    ctx.fillStyle = "#071327";
    ctx.fillRect(0, 286, SCREEN_W, 52);
    ctx.font = "26px 'VT323', monospace";
    ctx.fillStyle = "#7dffb0";
    ctx.fillText("» " + full.slice(0, chars) + (chars < full.length && Math.sin(t * 8) > 0 ? "█" : ""), 16, 320);

    // ticker
    ctx.fillStyle = "#02060d";
    ctx.fillRect(0, 338, SCREEN_W, 46);
    ctx.font = "26px 'VT323', monospace";
    const tw = ctx.measureText(TICKER).width;
    const off = (t * 70) % tw;
    ctx.fillStyle = "#e8e4d8";
    ctx.fillText(TICKER, -off, 368);
    ctx.fillText(TICKER, -off + tw, 368);
  }

  // ---- CH 4 · ZENI-POP (bouncing ident) ---------------------------------------
  private drawBounce(ctx: CanvasRenderingContext2D, _t: number, dt: number): void {
    ctx.fillStyle = "rgba(4,4,6,0.32)";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    ctx.strokeStyle = "rgba(80,90,120,0.10)";
    ctx.lineWidth = 1;
    for (let x = 0; x < SCREEN_W; x += 32) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SCREEN_H);
      ctx.stroke();
    }
    for (let y = 0; y < SCREEN_H; y += 32) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SCREEN_W, y);
      ctx.stroke();
    }

    const b = this.bounce;
    const bw = 168;
    const bh = 64;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    let hit = false;
    if (b.x < 12) { b.x = 12; b.vx *= -1; hit = true; }
    if (b.x > SCREEN_W - bw - 12) { b.x = SCREEN_W - bw - 12; b.vx *= -1; hit = true; }
    if (b.y < 12) { b.y = 12; b.vy *= -1; hit = true; }
    if (b.y > SCREEN_H - bh - 12) { b.y = SCREEN_H - bh - 12; b.vy *= -1; hit = true; }
    if (hit) b.hue = (b.hue + 47) % 360;

    const col = `hsl(${b.hue}, 85%, 62%)`;
    ctx.strokeStyle = col;
    ctx.lineWidth = 3;
    ctx.strokeRect(b.x, b.y, bw, bh);
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(b.x + 3, b.y + 3, bw - 6, bh - 6);
    ctx.font = "38px 'Bebas Neue', sans-serif";
    ctx.fillStyle = col;
    ctx.textAlign = "center";
    ctx.fillText("ZENITRON", b.x + bw / 2, b.y + 40);
    ctx.font = "16px 'VT323', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.fillText("CH 04", b.x + bw / 2, b.y + 57);
    ctx.textAlign = "left";
  }

  // ---- CH 5 · MONOSCOPE --------------------------------------------------------
  private drawTestCard(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.fillStyle = "#101010";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // fine grating top
    for (let y = 6; y < 44; y += 4) {
      ctx.fillStyle = y % 8 === 0 ? "#cfcfcf" : "#161616";
      ctx.fillRect(20, y, SCREEN_W - 40, 2);
    }

    const cx = SCREEN_W / 2;
    const cy = 196;
    const r = 128;

    // rotating sweep wedge
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(t * 0.9);
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, r, 0, 0.7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // gray wedges
    for (let i = 0; i < 12; i++) {
      const a0 = (i / 12) * Math.PI * 2;
      const a1 = ((i + 1) / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1);
      ctx.closePath();
      const v = i % 2 === 0 ? 190 : 90;
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fill();
    }

    ctx.lineWidth = 3;
    ctx.strokeStyle = "#f0f0f0";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
    ctx.stroke();

    // crosshair
    ctx.beginPath();
    ctx.moveTo(cx - r - 18, cy);
    ctx.lineTo(cx + r + 18, cy);
    ctx.moveTo(cx, cy - r - 18);
    ctx.lineTo(cx, cy + r + 18);
    ctx.stroke();

    // center badge
    ctx.beginPath();
    ctx.arc(cx, cy, 52, 0, Math.PI * 2);
    ctx.fillStyle = "#ececec";
    ctx.fill();
    ctx.font = "30px 'Bebas Neue', sans-serif";
    ctx.fillStyle = "#141414";
    ctx.textAlign = "center";
    ctx.fillText("ZENITRON", cx, cy + 2);
    ctx.font = "15px 'VT323', monospace";
    ctx.fillText("MONOSCOPE 5", cx, cy + 22);

    // grayscale steps
    for (let i = 0; i < 8; i++) {
      const v = Math.round((i / 7) * 235);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(60 + i * 49, 344, 47, 26);
    }

    ctx.font = "17px 'VT323', monospace";
    ctx.fillStyle = "#9a9a9a";
    ctx.fillText("CH 05 · 512 LINES · 4:3 · DO NOT ADJUST YOUR SET", cx, 30);
    ctx.textAlign = "left";
  }

  // ---- phosphor OSD ---------------------------------------------------------------
  drawOSD(ctx: CanvasRenderingContext2D, channel: number, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
    ctx.font = "64px 'VT323', monospace";
    ctx.fillStyle = "#52ff7a";
    ctx.shadowColor = "#52ff7a";
    ctx.shadowBlur = 22;
    ctx.fillText(`CH 0${channel + 1}`, 30, 86);
    ctx.font = "24px 'VT323', monospace";
    ctx.shadowBlur = 10;
    ctx.fillText(CHANNELS[channel].name, 32, 114);
    ctx.restore();
  }
}
