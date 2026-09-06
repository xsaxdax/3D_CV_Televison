import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CHANNELS, ChannelRenderer, SCREEN_W, SCREEN_H } from "./channels";

export interface TvState {
  power: boolean;
  channel: number;
  volume: number;
  muted: boolean;
  auto: boolean;
}

export interface SceneCallbacks {
  onReady: () => void;
  onState: (s: TvState) => void;
}

type InteractiveType = "channel" | "volume" | "power";

// ---------------------------------------------------------------------------
// Tiny synthesized TV audio: white-noise hiss, mains hum, test tone, knob clicks
// ---------------------------------------------------------------------------
class TvAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private toneGain: GainNode | null = null;
  enabled = false;
  private volume = 0.7;

  private ensure(): void {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // looped white noise -> bandpass = static hiss
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 3600;
    bp.Q.value = 0.55;
    this.noiseGain = ctx.createGain();
    this.noiseGain.gain.value = 0;
    src.connect(bp).connect(this.noiseGain).connect(this.master);
    src.start();

    // 120 Hz mains hum
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = 120;
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    osc.connect(this.humGain).connect(this.master);
    osc.start();

    // 997 Hz test tone
    const tone = ctx.createOscillator();
    tone.type = "sine";
    tone.frequency.value = 997;
    this.toneGain = ctx.createGain();
    this.toneGain.gain.value = 0;
    tone.connect(this.toneGain).connect(this.master);
    tone.start();
  }

  setEnabled(on: boolean): void {
    this.enabled = on;
    if (on) {
      this.ensure();
      this.master!.gain.setTargetAtTime(this.volume * 0.85, this.ctx!.currentTime, 0.1);
    } else if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
    }
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.ctx && this.master && this.enabled) {
      this.master.gain.setTargetAtTime(v * 0.85, this.ctx.currentTime, 0.05);
    }
  }

  setChannel(channel: number, power: boolean): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const set = (g: GainNode | null, v: number) =>
      g && g.gain.setTargetAtTime(power ? v : 0, t, 0.08);
    const mix = [
      [0.5, 0.015, 0],
      [0.012, 0.03, 0.03],
      [0.02, 0.025, 0],
      [0.006, 0.02, 0],
      [0.01, 0.03, 0],
    ][channel];
    set(this.noiseGain, mix[0]);
    set(this.humGain, mix[1]);
    set(this.toneGain, mix[2]);
  }

  click(): void {
    if (!this.ctx || !this.enabled || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = "square";
    osc.frequency.setValueAtTime(1500, t);
    osc.frequency.exponentialRampToValueAtTime(220, t + 0.045);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.14, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + 0.07);
  }

  dispose(): void {
    if (this.ctx) void this.ctx.close();
    this.ctx = null;
  }
}

// ---------------------------------------------------------------------------
// The scene
// ---------------------------------------------------------------------------
export class TelevisionScene {
  private container: HTMLElement;
  private cb: SceneCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private clock = new THREE.Clock();
  private raf = 0;
  private disposed = false;
  private frame = 0;

  private state: TvState = { power: false, channel: 0, volume: 0.7, muted: true, auto: false };
  private audio = new TvAudio();

  // screen
  private screenCanvas: HTMLCanvasElement;
  private screenCtx: CanvasRenderingContext2D;
  private screenTex: THREE.CanvasTexture;
  private screenMat: THREE.ShaderMaterial;
  private channels = new ChannelRenderer();
  private osdTimer = 0;
  private glitch = 0;
  private power = 0; // eased 0..1

  // room light that reacts to picture content
  private tvGlow: THREE.PointLight;
  private lampLight: THREE.SpotLight;
  private avgCanvas: HTMLCanvasElement;
  private avgCtx: CanvasRenderingContext2D;
  private glowTarget = new THREE.Color(0x9fb4c8);

  // knobs
  private knobCh!: THREE.Group;
  private knobVol!: THREE.Group;
  private knobPwr!: THREE.Group;
  private knobChMat!: THREE.MeshStandardMaterial;
  private knobVolMat!: THREE.MeshStandardMaterial;
  private knobPwrMat!: THREE.MeshStandardMaterial;
  private knobTargets = { ch: 0, vol: 0, pwr: 0 };
  private interactives: { group: THREE.Group; type: InteractiveType }[] = [];

  // pointer / raycast
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downPos = { x: 0, y: 0 };
  private hovered: InteractiveType | null = null;

  // ambience
  private dust!: THREE.Points;
  private dustBase!: Float32Array;
  private antenna!: THREE.Group;
  private lastAuto = 0;
  private powerOnTimeout = 0;
  private fontRefresh: (() => void)[] = [];

  constructor(container: HTMLElement, cb: SceneCallbacks) {
    this.container = container;
    this.cb = cb;

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    container.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      42,
      container.clientWidth / container.clientHeight,
      0.1,
      60
    );
    this.camera.position.set(1.15, 1.8, 3.55);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.35, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.enablePan = false;
    this.controls.minDistance = 1.5;
    this.controls.maxDistance = 6.5;
    this.controls.minPolarAngle = 0.3;
    this.controls.maxPolarAngle = 1.52;

    this.scene.background = new THREE.Color(0x0b0908);
    this.scene.fog = new THREE.FogExp2(0x0b0908, 0.085);

    // screen canvas
    this.screenCanvas = document.createElement("canvas");
    this.screenCanvas.width = SCREEN_W;
    this.screenCanvas.height = SCREEN_H;
    this.screenCtx = this.screenCanvas.getContext("2d")!;
    this.screenCtx.fillStyle = "#000";
    this.screenCtx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.minFilter = THREE.LinearFilter;
    this.screenTex.magFilter = THREE.LinearFilter;

    this.screenMat = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: this.screenTex },
        time: { value: 0 },
        uPower: { value: 0 },
        uGlitch: { value: 0 },
      },
      vertexShader: CRT_VERT,
      fragmentShader: CRT_FRAG,
    });

    // average-color sampler canvas
    this.avgCanvas = document.createElement("canvas");
    this.avgCanvas.width = 20;
    this.avgCanvas.height = 15;
    this.avgCtx = this.avgCanvas.getContext("2d")!;

    this.buildRoom();
    this.tvGlow = this.buildTv();
    this.lampLight = this.buildLamp();
    this.buildDust();
    this.buildLights();

    // bindings
    window.addEventListener("resize", this.onResize);
    window.addEventListener("keydown", this.onKey);
    const el = this.renderer.domElement;
    el.addEventListener("pointerdown", this.onPointerDown);
    el.addEventListener("pointerup", this.onPointerUp);
    el.addEventListener("pointermove", this.onPointerMove);

    this.knobTargets.vol = this.volumeAngle(this.state.volume);

    // re-paint canvas textures once webfonts have loaded
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        if (!this.disposed) this.fontRefresh.forEach((f) => f());
      });
    }

    cb.onReady();
    // tubes warm up shortly after load
    this.powerOnTimeout = window.setTimeout(() => this.setPower(true), 650);

    this.animate();
  }

  // ---- environment ----------------------------------------------------------
  private buildRoom(): void {
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 16),
      new THREE.MeshStandardMaterial({ color: 0x17120e, roughness: 0.94 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1c1510, roughness: 0.96 });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat);
    backWall.position.set(0, 3, -2.6);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), wallMat.clone());
    (leftWall.material as THREE.MeshStandardMaterial).color.set(0x171210);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-3.6, 3, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    const base = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.14, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0e0b09, roughness: 0.8 })
    );
    base.position.set(0, 0.07, -2.58);
    this.scene.add(base);

    // rug
    const rugOuter = new THREE.Mesh(
      new THREE.CircleGeometry(1.75, 40),
      new THREE.MeshStandardMaterial({ color: 0x35201f, roughness: 1 })
    );
    rugOuter.rotation.x = -Math.PI / 2;
    rugOuter.position.set(0.1, 0.006, 0.55);
    rugOuter.receiveShadow = true;
    this.scene.add(rugOuter);
    const rugInner = new THREE.Mesh(
      new THREE.CircleGeometry(1.42, 40),
      new THREE.MeshStandardMaterial({ color: 0x4a2b28, roughness: 1 })
    );
    rugInner.rotation.x = -Math.PI / 2;
    rugInner.position.set(0.1, 0.012, 0.55);
    rugInner.receiveShadow = true;
    this.scene.add(rugInner);

    // poster on the back wall
    const posterCanvas = makeCanvas(256, 368);
    paintPoster(posterCanvas);
    const posterTex = new THREE.CanvasTexture(posterCanvas);
    posterTex.minFilter = THREE.LinearFilter;
    this.fontRefresh.push(() => {
      paintPoster(posterCanvas);
      posterTex.needsUpdate = true;
    });
    const poster = new THREE.Mesh(
      new THREE.PlaneGeometry(0.92, 1.32),
      new THREE.MeshStandardMaterial({ map: posterTex, roughness: 0.85 })
    );
    poster.position.set(1.7, 2.05, -2.585);
    this.scene.add(poster);
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 1.4, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.6 })
    );
    frame.position.set(1.7, 2.05, -2.595);
    this.scene.add(frame);

    // ---- desk ---------------------------------------------------------------
    const deskTop = new THREE.Mesh(
      new THREE.BoxGeometry(2.6, 0.07, 1.15),
      new THREE.MeshStandardMaterial({ color: 0x2e2118, roughness: 0.55, metalness: 0.05 })
    );
    deskTop.position.set(0, 0.685, 0);
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    this.scene.add(deskTop);

    const legMat = new THREE.MeshStandardMaterial({ color: 0x241a12, roughness: 0.6 });
    const legGeo = new THREE.CylinderGeometry(0.022, 0.035, 0.66, 10);
    [
      [-1.16, -0.46, 0.07, 0.05],
      [1.16, -0.46, -0.07, 0.05],
      [-1.16, 0.46, 0.07, -0.05],
      [1.16, 0.46, -0.07, -0.05],
    ].forEach(([x, z, rz, rx]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.33, z);
      leg.rotation.z = rz;
      leg.rotation.x = rx;
      leg.castShadow = true;
      this.scene.add(leg);
    });

    // mug
    const mug = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.045, 0.11, 18),
      new THREE.MeshStandardMaterial({ color: 0xb9ae9c, roughness: 0.4 })
    );
    mug.position.set(1.0, 0.775, 0.28);
    mug.castShadow = true;
    this.scene.add(mug);
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.032, 0.009, 8, 16, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xb9ae9c, roughness: 0.4 })
    );
    handle.position.set(1.05, 0.775, 0.28);
    handle.rotation.y = Math.PI / 2;
    this.scene.add(handle);

    // books
    const book1 = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.05, 0.26),
      new THREE.MeshStandardMaterial({ color: 0x5a3b2a, roughness: 0.8 })
    );
    book1.position.set(-1.0, 0.745, 0.18);
    book1.rotation.y = 0.12;
    book1.castShadow = true;
    this.scene.add(book1);
    const book2 = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.04, 0.23),
      new THREE.MeshStandardMaterial({ color: 0x2f4a3f, roughness: 0.8 })
    );
    book2.position.set(-0.99, 0.79, 0.18);
    book2.rotation.y = -0.09;
    book2.castShadow = true;
    this.scene.add(book2);
  }

  // ---- the television ----------------------------------------------------------
  private buildTv(): THREE.PointLight {
    const tv = new THREE.Group();
    tv.position.set(0, 1.72, 0);

    // rounded walnut cabinet (extruded)
    const W = 0.9;
    const H = 0.7;
    const R = 0.1;
    const shape = new THREE.Shape();
    shape.moveTo(-W + R, -H);
    shape.lineTo(W - R, -H);
    shape.quadraticCurveTo(W, -H, W, -H + R);
    shape.lineTo(W, H - R);
    shape.quadraticCurveTo(W, H, W - R, H);
    shape.lineTo(-W + R, H);
    shape.quadraticCurveTo(-W, H, -W, H - R);
    shape.lineTo(-W, -H + R);
    shape.quadraticCurveTo(-W, -H, -W + R, -H);
    const cabinetGeo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.8,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelSegments: 3,
    });
    cabinetGeo.translate(0, 0, -0.4);
    const cabinet = new THREE.Mesh(
      cabinetGeo,
      new THREE.MeshStandardMaterial({ color: 0x3d2b1f, roughness: 0.65, metalness: 0.08 })
    );
    cabinet.castShadow = true;
    tv.add(cabinet);

    // bezel
    const bezel = new THREE.Mesh(
      new THREE.BoxGeometry(1.3, 1.04, 0.06),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.3, metalness: 0.25 })
    );
    bezel.position.set(-0.19, 0.02, 0.415);
    tv.add(bezel);

    // CRT screen (shader)
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.18, 0.885), this.screenMat);
    screen.position.set(-0.19, 0.02, 0.447);
    tv.add(screen);

    // speaker grille
    const grille = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.62, 0.02),
      new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.6 })
    );
    grille.position.set(0.66, 0.2, 0.435);
    tv.add(grille);
    const holeGeo = new THREE.CircleGeometry(0.011, 8);
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    for (let i = 0; i < 16; i++) {
      for (let j = 0; j < 6; j++) {
        const hole = new THREE.Mesh(holeGeo, holeMat);
        hole.position.set(0.66 - 0.1 + j * 0.04, 0.2 - 0.27 + i * 0.036, 0.447);
        tv.add(hole);
      }
    }

    // knobs (interactive)
    this.knobCh = this.makeKnob(0x1e1e20, "VHF TUNER");
    this.knobCh.position.set(0.66, -0.2, 0.44);
    this.knobChMat = this.knobCh.userData.mat as THREE.MeshStandardMaterial;
    tv.add(this.knobCh);

    this.knobVol = this.makeKnob(0x1e1e20, "VOLUME");
    this.knobVol.position.set(0.66, -0.42, 0.44);
    this.knobVolMat = this.knobVol.userData.mat as THREE.MeshStandardMaterial;
    tv.add(this.knobVol);

    this.knobPwr = this.makeKnob(0x3a1512, "", 0.04);
    this.knobPwr.position.set(0.66, -0.61, 0.44);
    this.knobPwrMat = this.knobPwr.userData.mat as THREE.MeshStandardMaterial;
    tv.add(this.knobPwr);

    this.interactives = [
      { group: this.knobCh, type: "channel" },
      { group: this.knobVol, type: "volume" },
      { group: this.knobPwr, type: "power" },
    ];

    // brand plate
    const brandCanvas = makeCanvas(320, 64);
    paintBrand(brandCanvas);
    const brandTex = new THREE.CanvasTexture(brandCanvas);
    brandTex.minFilter = THREE.LinearFilter;
    this.fontRefresh.push(() => {
      paintBrand(brandCanvas);
      brandTex.needsUpdate = true;
    });
    const brand = new THREE.Mesh(
      new THREE.PlaneGeometry(0.55, 0.1),
      new THREE.MeshStandardMaterial({ map: brandTex, roughness: 0.35, metalness: 0.55 })
    );
    brand.position.set(-0.19, -0.61, 0.447);
    tv.add(brand);

    // rabbit ears
    this.antenna = new THREE.Group();
    const baseBall = new THREE.Mesh(
      new THREE.SphereGeometry(0.07, 16, 12),
      new THREE.MeshStandardMaterial({ color: 0x2b2b2e, metalness: 0.7, roughness: 0.35 })
    );
    this.antenna.add(baseBall);
    const rodMat = new THREE.MeshStandardMaterial({ color: 0x9a9a9e, metalness: 0.9, roughness: 0.25 });
    const rodGeo = new THREE.CylinderGeometry(0.011, 0.014, 0.78, 8);
    const tipGeo = new THREE.SphereGeometry(0.02, 10, 8);
    [-1, 1].forEach((s) => {
      const pivot = new THREE.Group();
      pivot.rotation.z = s * 0.42;
      const rod = new THREE.Mesh(rodGeo, rodMat);
      rod.position.y = 0.39;
      rod.castShadow = true;
      const tip = new THREE.Mesh(tipGeo, rodMat);
      tip.position.y = 0.79;
      pivot.add(rod, tip);
      this.antenna.add(pivot);
    });
    this.antenna.position.set(0, 0.73, -0.05);
    tv.add(this.antenna);

    // legs
    const tvLegGeo = new THREE.CylinderGeometry(0.018, 0.026, 0.32, 10);
    const tvLegMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1e, metalness: 0.6, roughness: 0.4 });
    [
      [-0.72, -0.3, 0.14, 0.1],
      [0.72, -0.3, -0.14, 0.1],
      [-0.72, 0.3, 0.14, -0.1],
      [0.72, 0.3, -0.14, -0.1],
    ].forEach(([x, z, rz, rx]) => {
      const leg = new THREE.Mesh(tvLegGeo, tvLegMat);
      leg.position.set(x, -0.84, z);
      leg.rotation.z = rz;
      leg.rotation.x = rx;
      leg.castShadow = true;
      tv.add(leg);
    });

    this.scene.add(tv);

    // picture-reactive glow light
    const glow = new THREE.PointLight(0xcfe6ff, 0, 8, 2);
    glow.position.set(0, 1.76, 1.4);
    this.scene.add(glow);
    return glow;
  }

  private makeKnob(color: number, label: string, radius = 0.054): THREE.Group {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color, metalness: 0.85, roughness: 0.35 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.05, 24), mat);
    body.rotation.x = Math.PI / 2;
    body.castShadow = true;
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(radius, 0.006, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0x0c0c0c, metalness: 0.8, roughness: 0.4 })
    );
    rim.position.z = 0.02;
    const indicator = new THREE.Mesh(
      new THREE.BoxGeometry(0.012, radius * 0.78, 0.01),
      new THREE.MeshStandardMaterial({ color: 0xe9ddc6, roughness: 0.4 })
    );
    indicator.position.set(0, radius * 0.55, 0.028);
    g.add(body, rim, indicator);
    g.userData.mat = mat;

    if (label) {
      const labelCanvas = makeCanvas(192, 44);
      paintLabel(labelCanvas, label);
      const tex = new THREE.CanvasTexture(labelCanvas);
      tex.minFilter = THREE.LinearFilter;
      this.fontRefresh.push(() => {
        paintLabel(labelCanvas, label);
        tex.needsUpdate = true;
      });
      const lbl = new THREE.Mesh(
        new THREE.PlaneGeometry(0.24, 0.055),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true })
      );
      lbl.position.set(0, -(radius + 0.055), 0.01);
      g.add(lbl);
    }
    return g;
  }

  private buildLamp(): THREE.SpotLight {
    const lamp = new THREE.Group();
    const metal = new THREE.MeshStandardMaterial({ color: 0x2c2c30, metalness: 0.8, roughness: 0.35 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.04, 20), metal);
    base.position.y = 0.02;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 10), metal);
    pole.position.y = 0.77;
    const shade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.26, 0.32, 20, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x8a5a2e,
        roughness: 0.7,
        side: THREE.DoubleSide,
        emissive: 0x40240c,
        emissiveIntensity: 0.5,
      })
    );
    shade.position.y = 1.56;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.045, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff2d8, emissive: 0xffcf9a, emissiveIntensity: 2.2 })
    );
    bulb.position.y = 1.5;
    lamp.add(base, pole, shade, bulb);
    lamp.position.set(-2.1, 0, -1.5);
    this.scene.add(lamp);

    const spot = new THREE.SpotLight(0xffb066, 55, 10, 0.62, 0.55, 2);
    spot.position.set(-2.1, 1.52, -1.5);
    spot.target.position.set(0.2, 0.7, 0.2);
    spot.castShadow = true;
    spot.shadow.mapSize.set(1024, 1024);
    spot.shadow.bias = -0.002;
    this.scene.add(spot);
    this.scene.add(spot.target);
    return spot;
  }

  private buildDust(): void {
    const count = 170;
    this.dustBase = new Float32Array(count * 3);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 4.6;
      const y = 0.15 + Math.random() * 2.6;
      const z = -1.2 + Math.random() * 3;
      this.dustBase[i * 3] = x;
      this.dustBase[i * 3 + 1] = y;
      this.dustBase[i * 3 + 2] = z;
      pos[i * 3] = x;
      pos[i * 3 + 1] = y;
      pos[i * 3 + 2] = z;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(
      geo,
      new THREE.PointsMaterial({
        color: 0xffe3b8,
        size: 0.011,
        transparent: true,
        opacity: 0.4,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    this.scene.add(this.dust);
  }

  private buildLights(): void {
    this.scene.add(new THREE.HemisphereLight(0x322a22, 0x0a0806, 0.55));
    const fill = new THREE.DirectionalLight(0x8899bb, 0.4);
    fill.position.set(2.6, 3.2, 2.6);
    this.scene.add(fill);
  }

  // ---- CRT shader ----------------------------------------------------------------
  // (declared as module-level strings below)

  // ---- input ------------------------------------------------------------------------
  private onResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private onKey = (e: KeyboardEvent): void => {
    switch (e.code) {
      case "ArrowRight":
      case "ArrowUp":
        this.setChannel((this.state.channel + 1) % CHANNELS.length);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        this.setChannel((this.state.channel + CHANNELS.length - 1) % CHANNELS.length);
        break;
      case "KeyP":
        this.setPower(!this.state.power);
        break;
      case "KeyM":
        this.setMuted(!this.state.muted);
        break;
      case "KeyA":
        this.setAuto(!this.state.auto);
        break;
      default:
        if (e.code.startsWith("Digit")) {
          const n = parseInt(e.code.slice(5), 10) - 1;
          if (n >= 0 && n < CHANNELS.length) this.setChannel(n);
        }
    }
  };

  private ndcFromEvent(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pick(): InteractiveType | null {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    for (const it of this.interactives) {
      if (this.raycaster.intersectObject(it.group, true).length > 0) return it.type;
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent): void => {
    this.downPos = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent): void => {
    const dx = e.clientX - this.downPos.x;
    const dy = e.clientY - this.downPos.y;
    if (dx * dx + dy * dy > 36) return; // was a drag
    this.ndcFromEvent(e);
    const hit = this.pick();
    if (hit === "channel") this.setChannel((this.state.channel + 1) % CHANNELS.length);
    else if (hit === "volume") this.setVolume(this.state.volume >= 0.98 ? 0 : Math.min(1, this.state.volume + 0.125));
    else if (hit === "power") this.setPower(!this.state.power);
  };

  private onPointerMove = (e: PointerEvent): void => {
    this.ndcFromEvent(e);
    const hit = this.pick();
    if (hit !== this.hovered) {
      this.hovered = hit;
      this.renderer.domElement.style.cursor = hit ? "pointer" : "grab";
      this.knobChMat.emissive.setHex(hit === "channel" ? 0x2a2a2a : 0x000000);
      this.knobVolMat.emissive.setHex(hit === "volume" ? 0x2a2a2a : 0x000000);
      this.knobPwrMat.emissive.setHex(hit === "power" ? 0x3a1a12 : 0x000000);
    }
  };

  // ---- public API ----------------------------------------------------------------------
  setPower(p: boolean): void {
    if (this.state.power === p) return;
    this.state = { ...this.state, power: p };
    this.audio.click();
    this.audio.setChannel(this.state.channel, p);
    if (p) this.osdTimer = 2.4;
    this.emit();
  }

  setChannel(i: number): void {
    if (this.state.channel === i) return;
    this.state = { ...this.state, channel: i };
    this.audio.click();
    if (this.state.power) {
      this.glitch = 0.95;
      this.osdTimer = 2.2;
    }
    this.knobTargets.ch = i * (Math.PI / 3);
    this.audio.setChannel(i, this.state.power);
    this.lastAuto = this.clock.elapsedTime;
    this.emit();
  }

  setVolume(v: number): void {
    this.state = { ...this.state, volume: Math.max(0, Math.min(1, v)) };
    this.audio.setVolume(this.state.volume);
    this.knobTargets.vol = this.volumeAngle(this.state.volume);
    this.emit();
  }

  setMuted(m: boolean): void {
    this.state = { ...this.state, muted: m };
    this.audio.setEnabled(!m);
    this.audio.setVolume(this.state.volume);
    this.audio.setChannel(this.state.channel, this.state.power);
    this.emit();
  }

  setAuto(a: boolean): void {
    this.state = { ...this.state, auto: a };
    this.lastAuto = this.clock.elapsedTime;
    this.emit();
  }

  private volumeAngle(v: number): number {
    return -2.3 + v * 3.1;
  }

  private emit(): void {
    this.cb.onState(this.state);
  }

  // ---- loop ---------------------------------------------------------------------------
  private animate = (): void => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.animate);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    this.frame++;

    this.controls.update();

    // power easing
    const target = this.state.power ? 1 : 0;
    const lambda = this.state.power ? 5 : 9;
    this.power = THREE.MathUtils.damp(this.power, target, lambda, dt);
    if (Math.abs(this.power - target) < 0.002) this.power = target;

    this.glitch = Math.max(0, this.glitch - dt * 2.1);
    if (this.osdTimer > 0) this.osdTimer -= dt;

    // knobs ease to targets
    this.knobCh.rotation.z = THREE.MathUtils.damp(this.knobCh.rotation.z, this.knobTargets.ch, 12, dt);
    this.knobVol.rotation.z = THREE.MathUtils.damp(this.knobVol.rotation.z, this.knobTargets.vol, 12, dt);
    this.knobPwr.rotation.z = THREE.MathUtils.damp(
      this.knobPwr.rotation.z,
      this.state.power ? 0 : Math.PI / 2,
      10,
      dt
    );

    // autopilot
    if (this.state.auto && this.state.power && t - this.lastAuto > 7) {
      this.setChannel((this.state.channel + 1) % CHANNELS.length);
    }

    // draw picture
    this.channels.draw(this.screenCtx, this.state.channel, t, dt);
    if (this.osdTimer > 0 && this.state.power) {
      this.channels.drawOSD(this.screenCtx, this.state.channel, Math.min(1, this.osdTimer / 0.4));
    }
    this.screenTex.needsUpdate = true;

    this.screenMat.uniforms.time.value = t;
    this.screenMat.uniforms.uPower.value = this.power;
    this.screenMat.uniforms.uGlitch.value = this.glitch * (this.power > 0.4 ? 1 : 0);

    // room glow follows picture content
    if (this.frame % 6 === 0) {
      this.avgCtx.drawImage(this.screenCanvas, 0, 0, 20, 15);
      const d = this.avgCtx.getImageData(0, 0, 20, 15).data;
      let r = 0;
      let g = 0;
      let b = 0;
      for (let i = 0; i < d.length; i += 4) {
        r += d[i];
        g += d[i + 1];
        b += d[i + 2];
      }
      const n = d.length / 4;
      this.glowTarget.setRGB(
        Math.min(1, (r / n / 255) * 1.65),
        Math.min(1, (g / n / 255) * 1.65),
        Math.min(1, (b / n / 255) * 1.65)
      );
    }
    this.tvGlow.color.lerp(this.glowTarget, 0.12);
    const flick = Math.sin(t * 17) * 0.5 + Math.sin(t * 41) * 0.3 + Math.random() * 0.4;
    this.tvGlow.intensity = this.power * this.power * (8.5 + flick);

    // lamp breathing
    this.lampLight.intensity = 55 + Math.sin(t * 9.3) * 2.2 + Math.sin(t * 23.7) * 1.4;

    // antenna micro-sway
    this.antenna.rotation.z = Math.sin(t * 0.6) * 0.012;
    this.antenna.rotation.x = Math.sin(t * 0.83) * 0.008;

    // dust drift
    const pos = this.dust.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = this.dustBase[i * 3 + 1] + ((t * 0.03 + i * 0.37) % 2.6);
      if (y > 2.75) y -= 2.6;
      pos.setY(i, y);
      pos.setX(i, this.dustBase[i * 3] + Math.sin(t * 0.4 + i) * 0.05);
    }
    pos.needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    window.clearTimeout(this.powerOnTimeout);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKey);
    const el = this.renderer.domElement;
    el.removeEventListener("pointerdown", this.onPointerDown);
    el.removeEventListener("pointerup", this.onPointerUp);
    el.removeEventListener("pointermove", this.onPointerMove);
    this.controls.dispose();
    this.audio.dispose();
    this.screenTex.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      const mat = (mesh as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
      else if (mat) mat.dispose();
    });
    this.renderer.dispose();
    if (el.parentElement === this.container) this.container.removeChild(el);
  }
}

// ---------------------------------------------------------------------------
// CRT shader
// ---------------------------------------------------------------------------
const CRT_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CRT_FRAG = /* glsl */ `
  uniform sampler2D tDiffuse;
  uniform float time;
  uniform float uPower;
  uniform float uGlitch;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec2 uv = vUv;

    // barrel curvature
    vec2 cc = uv - 0.5;
    float dist = dot(cc, cc);
    uv = uv + cc * dist * 0.30;

    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }

    float p = clamp(uPower, 0.0, 1.0);

    // CRT power collapse: squash vertically, then horizontally, then fade
    float sy = mix(0.0022, 1.0, smoothstep(0.42, 0.94, p));
    float sx = mix(0.0022, 1.0, smoothstep(0.08, 0.42, p));
    float brightness = smoothstep(0.02, 0.16, p);

    vec2 suv = vec2(0.5 + (uv.x - 0.5) / sx, 0.5 + (uv.y - 0.5) / sy);

    // horizontal tear during glitches
    suv.x += uGlitch * 0.06 * sin(suv.y * 80.0 + time * 55.0);

    // chromatic aberration
    float aberr = 0.0035 + uGlitch * 0.004;
    vec2 dir = (suv - 0.5) * aberr * (1.0 + dist * 3.0);
    float r = texture2D(tDiffuse, suv + dir).r;
    float g = texture2D(tDiffuse, suv).g;
    float b = texture2D(tDiffuse, suv - dir).b;
    vec3 color = vec3(r, g, b);

    // static burst on channel change
    float n = hash(floor(suv * vec2(320.0, 240.0)) + floor(time * 42.0));
    color = mix(color, vec3(n) * 0.9, clamp(uGlitch, 0.0, 1.0));

    // scanlines + aperture grille
    color *= 0.93 + 0.07 * sin(suv.y * 720.0);
    color *= 0.965 + 0.035 * sin(suv.x * 1024.0);

    // rolling luminance band
    float band = fract(suv.y - time * 0.055);
    color += 0.028 * smoothstep(0.06, 0.0, abs(band - 0.5));

    // vignette
    color *= 1.0 - dist * 1.6;

    // phosphor flicker
    color *= 0.96 + 0.04 * sin(time * 16.0) + 0.015 * sin(time * 47.0);
    color.g *= 1.06;

    color *= brightness;

    // collapse glow line + dot
    float lineGlow = exp(-abs(uv.y - 0.5) * 260.0) * (1.0 - smoothstep(0.35, 0.6, p));
    float dotGlow = exp(-length(cc) * 60.0) * (1.0 - smoothstep(0.06, 0.2, p)) * 1.4;
    color += vec3(0.85, 1.0, 0.9) * (lineGlow + dotGlow);

    // standby glass: dark reflective panel
    vec3 glass = vec3(0.012, 0.015, 0.02);
    glass += vec3(0.028, 0.034, 0.04) * smoothstep(0.45, 0.05, length(cc - vec2(-0.16, 0.2)));
    glass *= 1.0 - dist * 1.4;

    gl_FragColor = vec4(mix(glass, color, clamp(brightness + lineGlow + dotGlow, 0.0, 1.0)), 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Canvas textures for labels / brand / poster
// ---------------------------------------------------------------------------
function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function paintLabel(c: HTMLCanvasElement, text: string): void {
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.font = "26px 'VT323', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#cfc4ae";
  ctx.fillText(text, 96, 24);
}

function paintBrand(c: HTMLCanvasElement): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#101012";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.strokeStyle = "#6a6a70";
  ctx.lineWidth = 2;
  ctx.strokeRect(3, 3, c.width - 6, c.height - 6);
  ctx.font = "38px 'Bebas Neue', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#d8cbb2";
  ctx.fillText("ZENITRON", 160, 30);
  ctx.font = "16px 'VT323', monospace";
  ctx.fillStyle = "#8f887a";
  ctx.fillText("DELUXE · MODEL 63-C", 160, 52);
}

function paintPoster(c: HTMLCanvasElement): void {
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#123f44";
  ctx.fillRect(0, 0, 256, 368);

  // retro sunburst
  ctx.save();
  ctx.translate(128, 128);
  for (let i = 0; i < 12; i++) {
    ctx.rotate(Math.PI / 6);
    ctx.fillStyle = i % 2 === 0 ? "#17555c" : "#0f3237";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, 118, 0, Math.PI / 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // tv silhouette
  ctx.fillStyle = "#0a1f22";
  ctx.fillRect(78, 96, 100, 72);
  ctx.fillStyle = "#e8a33d";
  ctx.fillRect(86, 104, 62, 50);
  ctx.fillStyle = "#0a1f22";
  ctx.fillRect(90, 108, 54, 42);
  ctx.fillStyle = "#e9ddc6";
  ctx.beginPath();
  ctx.arc(160, 116, 5, 0, Math.PI * 2);
  ctx.arc(160, 132, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e9ddc6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(120, 96);
  ctx.lineTo(104, 74);
  ctx.moveTo(136, 96);
  ctx.lineTo(152, 74);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.font = "44px 'Bebas Neue', sans-serif";
  ctx.fillStyle = "#e9ddc6";
  ctx.fillText("SEE THE WORLD", 128, 228);
  ctx.fillText("IN COLOR", 128, 270);
  ctx.font = "22px 'VT323', monospace";
  ctx.fillStyle = "#e8a33d";
  ctx.fillText("ZENITRON · 1963", 128, 306);
  ctx.strokeStyle = "#e8a33d";
  ctx.lineWidth = 3;
  ctx.strokeRect(12, 12, 232, 344);
}
