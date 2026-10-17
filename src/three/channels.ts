export interface ChannelDef {
  id: number;
  name: string;
  label: string;
}

export const CHANNELS: ChannelDef[] = [
  { id: 1, name: "MY CV", label: "RESUME" },
  { id: 2, name: "LIBELLE AG", label: "DATA MASKING" },
  { id: 3, name: "AILO-IT", label: "SALESFORCE" },
  { id: 4, name: "IRS SOFTWARE", label: "VUE.JS" },
  { id: 5, name: "EFFICOM", label: "WINDOWS" },
  { id: 6, name: "ESCIRES", label: "IBM WATSON" },
];

export const SCREEN_W = 512;
export const SCREEN_H = 384;

const LIBELLE_DATA = [
  "HANA_DB: ****-****-****-1234",
  "ORACLE_SID: PROD_***_MASKED",
  "SAP_BASIS: CLIENT *** REDACTED",
  "TABLE: KNA1 NAME: J*** D***",
  "FIELD: EMAIL: m***@***.com",
  "MASK: LIBELLE_DM v4.2 ACTIVE",
];

const AILO_DATA = [
  "APEX: public with sharing class",
  "FLOW: Approval_Process_v2",
  "LWC: @api recordId; connectedCallback",
  "SOQL: SELECT Id FROM Account",
  "TRIGGER: before insert on Lead",
  "DEPLOY: Status = SUCCESS",
];

const IRS_DATA = [
  "<template><div class='app'>",
  "export default { data() { return",
  "methods: { fetchData() {",
  "axios.get('/api/data').then",
  "v-for='item in items' :key='item.id'",
  "mounted() { this.init(); }",
];

const EFFICOM_DATA = [
  "PS C:\\> Get-Service | Where Status",
  "SERVER01: Windows Server 2019",
  "ADMIN> net user /domain /add",
  "EVENT: Security Log - ID 4624",
  "RDP: 192.168.1.100:3389 ACTIVE",
  "BACKUP: Daily @ 02:00 COMPLETE",
];

const ESCIRES_DATA = [
  "WATSON: Intent Recognition 98.7%",
  "NLP: Entity Extraction ACTIVE",
  "TRAIN: Dataset v3.2 LOADING",
  "API: POST /v1/natural-language",
  "MODEL: Confidence 0.94 HIGH",
  "RESPONSE: Processing complete",
];

export class ChannelRenderer {
  private lastChannel = -1;

  draw(
    ctx: CanvasRenderingContext2D,
    channel: number,
    t: number,
    dt: number
  ): void {
    const fresh = channel !== this.lastChannel;
    this.lastChannel = channel;
    
    if (fresh) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);
    }

    switch (channel) {
      case 0:
        this.drawCV(ctx, t);
        break;
      case 1:
        this.drawLibelle(ctx, t);
        break;
      case 2:
        this.drawAilo(ctx, t);
        break;
      case 3:
        this.drawIRS(ctx, t);
        break;
      case 4:
        this.drawEfficom(ctx, t);
        break;
      case 5:
        this.drawEsciris(ctx, t);
        break;
    }
  }

  // ---- CH 0 · MY CV - Static Resume Display ----------------------------------
  private drawCV(ctx: CanvasRenderingContext2D, t: number): void {
    // Dark background
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Header
    ctx.fillStyle = "#e8a33d";
    ctx.fillRect(0, 0, SCREEN_W, 50);
    ctx.font = "bold 32px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#1a1a1a";
    ctx.fillText("MARK MORGULIS", 20, 35);

    // Subtitle
    ctx.font = "16px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#8f887a";
    ctx.fillText("Software Developer · IT Specialist", 20, 70);

    // Divider
    ctx.strokeStyle = "#e8a33d";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.lineTo(SCREEN_W - 20, 80);
    ctx.stroke();

    // Work Experience Section
    ctx.font = "bold 20px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#e8a33d";
    ctx.fillText("WORK EXPERIENCE", 20, 105);

    ctx.font = "14px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#e9ddc6";
    
    const experience = [
      { period: "11.2024 - Present", role: "Junior Consultant DataMasking", company: "Libelle AG" },
      { period: "12.2022 - 10.2023", role: "Salesforce Developer", company: "Ailo-IT" },
      { period: "12.2021 - 07.2022", role: "Vue.js Developer", company: "IRS Software GmbH" },
      { period: "03.2019 - 06.2019", role: "Windows Server Admin", company: "efficom GmbH" },
      { period: "02.2018 - 03.2018", role: "AI: IBM Watson", company: "esciris GmbH" },
    ];

    let yPos = 125;
    for (const exp of experience) {
      ctx.fillStyle = "#8f887a";
      ctx.fillText(exp.period, 20, yPos);
      ctx.fillStyle = "#e9ddc6";
      ctx.fillText(exp.role, 20, yPos + 16);
      ctx.fillStyle = "#e8a33d";
      ctx.fillText(exp.company, 20, yPos + 32);
      yPos += 48;
    }

    // Skills Section
    ctx.font = "bold 20px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#e8a33d";
    ctx.fillText("SKILLS", 20, yPos + 10);

    ctx.font = "13px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#e9ddc6";
    
    const skills = [
      "Kundenbetreuung und Projektplanung",
      "HANA & Oracle - Produktberatung (Libelle AG)",
      "SAP Basis - Produktberatung (Libelle AG)",
      "HTML, CSS, JS, React, Node, Vue, MySQL",
      "Salesforce: Admin, Flows, Apex, LWC (Ailo-IT)",
      "Bash, Bash Skripte & PowerShell",
      "Python, Java",
      "SQL-Abfragen & Datenbanken-Modellierung",
      "Netzwerkadministration Windows (Efficom)"
    ];

    yPos += 30;
    for (const skill of skills) {
      ctx.fillText("• " + skill, 20, yPos);
      yPos += 18;
    }
  }

  // ---- CH 1 · LIBELLE AG (Data Masking) - Static Job Display ----------------
  private drawLibelle(ctx: CanvasRenderingContext2D, t: number): void {
    // SAP blue background
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    g.addColorStop(0, "#003d6b");
    g.addColorStop(1, "#001a2e");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Header
    ctx.fillStyle = "#00a1e0";
    ctx.fillRect(0, 0, SCREEN_W, 50);
    ctx.font = "bold 28px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("LIBELLE AG - Junior Consultant", 20, 35);

    // Status indicator
    ctx.fillStyle = "#4ade80";
    ctx.beginPath();
    ctx.arc(SCREEN_W - 30, 25, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "14px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.textAlign = "right";
    ctx.fillText("CURRENT", SCREEN_W - 45, 30);
    ctx.textAlign = "left";

    // Job details panel
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.fillRect(20, 70, SCREEN_W - 40, SCREEN_H - 90);

    ctx.font = "18px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    
    // Static job information
    const jobs = [
      "Period: 11.2024 - Present",
      "Location: Echterdingen-Leinfelden",
      "",
      "Responsibilities:",
      "• HANA & Oracle product consulting",
      "• SAP Basis data masking solutions",
      "• Customer support & project planning",
      "• Database security implementation",
      "",
      "Technologies:",
      "• SAP HANA Database",
      "• Oracle Database",
      "• SAP Basis Administration",
      "• Data Masking & Security",
    ];

    let yPos = 95;
    for (const line of jobs) {
      if (line === "") {
        yPos += 10;
        continue;
      }
      
      // Highlight headers
      if (line.includes(":") && !line.includes("•")) {
        ctx.fillStyle = "#00a1e0";
        ctx.font = "bold 18px 'IBM Plex Mono', monospace";
      } else {
        ctx.fillStyle = "#4ade80";
        ctx.font = "16px 'IBM Plex Mono', monospace";
      }
      
      ctx.fillText(line, 30, yPos);
      yPos += 22;
    }
  }

  // ---- CH 2 · AILO-IT (Salesforce) -----------------------------------------
  private drawAilo(ctx: CanvasRenderingContext2D, t: number): void {
    // Salesforce blue background
    ctx.fillStyle = "#032e61";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Header with Salesforce cloud logo
    ctx.fillStyle = "#0176d3";
    ctx.fillRect(0, 0, SCREEN_W, 60);
    ctx.font = "bold 32px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Salesforce Developer Console", 20, 42);

    // Cloud icon
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(SCREEN_W - 50, 30, 15, 0, Math.PI * 2);
    ctx.arc(SCREEN_W - 35, 30, 12, 0, Math.PI * 2);
    ctx.arc(SCREEN_W - 65, 30, 12, 0, Math.PI * 2);
    ctx.fill();

    // Code editor area
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(20, 80, SCREEN_W - 40, SCREEN_H - 100);

    // Line numbers
    ctx.fillStyle = "#666";
    ctx.fillRect(20, 80, 30, SCREEN_H - 100);
    for (let i = 0; i < 15; i++) {
      ctx.fillStyle = "#888";
      ctx.font = "14px 'IBM Plex Mono', monospace";
      ctx.fillText(String(i + 1), 28, 100 + i * 20);
    }

    // Apex/LWC code
    const lineIdx = Math.floor(t * 0.6) % AILO_DATA.length;
    ctx.font = "15px 'IBM Plex Mono', monospace";
    
    for (let i = 0; i < 14; i++) {
      const y = 100 + i * 20;
      const dataIdx = (lineIdx + i) % AILO_DATA.length;
      const line = AILO_DATA[dataIdx];
      
      // Syntax highlighting
      if (line.includes("class") || line.includes("public") || line.includes("with")) {
        ctx.fillStyle = "#569cd6";
      } else if (line.includes("'") || line.includes('"')) {
        ctx.fillStyle = "#ce9178";
      } else if (line.includes("SELECT") || line.includes("FROM")) {
        ctx.fillStyle = "#c586c0";
      } else {
        ctx.fillStyle = "#d4d4d4";
      }
      
      ctx.fillText(line, 60, y);
    }

    // Deployment status
    ctx.fillStyle = "#4ade80";
    ctx.font = "bold 16px 'IBM Plex Mono', monospace";
    ctx.fillText("✓ Deployed successfully", 60, SCREEN_H - 30);
  }

  // ---- CH 3 · IRS SOFTWARE (Vue.js) -------------------------------------------
  private drawIRS(ctx: CanvasRenderingContext2D, t: number): void {
    // Dark code editor background
    ctx.fillStyle = "#1e1e1e";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Editor tabs
    ctx.fillStyle = "#2d2d2d";
    ctx.fillRect(0, 0, SCREEN_W, 30);
    ctx.fillStyle = "#42b883"; // Vue green
    ctx.fillRect(10, 5, 120, 25);
    ctx.font = "14px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("App.vue", 20, 22);

    // Line numbers
    ctx.fillStyle = "#858585";
    ctx.fillRect(0, 30, 40, SCREEN_H - 30);
    for (let i = 0; i < 20; i++) {
      ctx.fillText(String(i + 1), 15, 50 + i * 18);
    }

    // Code lines with syntax highlighting
    const lineIdx = Math.floor(t * 0.5) % IRS_DATA.length;
    ctx.font = "16px 'IBM Plex Mono', monospace";
    
    for (let i = 0; i < 15; i++) {
      const y = 50 + i * 18;
      const dataIdx = (lineIdx + i) % IRS_DATA.length;
      const line = IRS_DATA[dataIdx];
      
      // Syntax highlighting
      if (line.includes("<") || line.includes(">")) {
        ctx.fillStyle = "#569cd6"; // HTML tags
      } else if (line.includes("export") || line.includes("data") || line.includes("methods")) {
        ctx.fillStyle = "#c586c0"; // Keywords
      } else if (line.includes("'") || line.includes('"')) {
        ctx.fillStyle = "#ce9178"; // Strings
      } else {
        ctx.fillStyle = "#d4d4d4"; // Default
      }
      
      ctx.fillText(line, 50, y);
    }

    // Cursor blink
    if (Math.sin(t * 4) > 0) {
      ctx.fillStyle = "#aeafad";
      ctx.fillRect(50 + ctx.measureText(IRS_DATA[lineIdx]).width + 5, 38, 2, 16);
    }

    // Vue logo
    ctx.fillStyle = "#42b883";
    ctx.beginPath();
    ctx.moveTo(SCREEN_W - 60, SCREEN_H - 60);
    ctx.lineTo(SCREEN_W - 40, SCREEN_H - 30);
    ctx.lineTo(SCREEN_W - 20, SCREEN_H - 60);
    ctx.closePath();
    ctx.fill();
  }

  // ---- CH 4 · EFFICOM (Windows Server) --------------------------------------
  private drawEfficom(ctx: CanvasRenderingContext2D, t: number): void {
    // Windows blue background
    ctx.fillStyle = "#0078d4";
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Taskbar
    ctx.fillStyle = "#1f1f1f";
    ctx.fillRect(0, SCREEN_H - 40, SCREEN_W, 40);
    
    // Start button
    ctx.fillStyle = "#0078d4";
    ctx.fillRect(5, SCREEN_H - 35, 30, 30);
    ctx.font = "bold 20px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("⊞", 12, SCREEN_H - 13);

    // PowerShell window
    ctx.fillStyle = "#012456";
    ctx.fillRect(20, 20, SCREEN_W - 40, SCREEN_H - 80);
    
    // Title bar
    ctx.fillStyle = "#1f1f1f";
    ctx.fillRect(20, 20, SCREEN_W - 40, 30);
    ctx.font = "14px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("Windows PowerShell", 30, 40);

    // Close/minimize/maximize buttons
    ctx.fillStyle = "#e81123";
    ctx.fillRect(SCREEN_W - 50, 25, 20, 20);
    ctx.fillStyle = "#fff";
    ctx.fillText("×", SCREEN_W - 45, 40);

    // Command output
    ctx.fillStyle = "#fff";
    ctx.font = "15px 'IBM Plex Mono', monospace";
    const lineIdx = Math.floor(t * 0.7) % EFFICOM_DATA.length;
    
    for (let i = 0; i < 12; i++) {
      const y = 70 + i * 22;
      const dataIdx = (lineIdx + i) % EFFICOM_DATA.length;
      ctx.fillText(EFFICOM_DATA[dataIdx], 30, y);
    }

    // Blinking cursor
    if (Math.sin(t * 3) > 0) {
      ctx.fillRect(30, 70 + 12 * 22 - 15, 8, 15);
    }
  }

  // ---- CH 5 · ESCIRES (IBM Watson AI) ---------------------------------------
  private drawEsciris(ctx: CanvasRenderingContext2D, t: number): void {
    // IBM blue background
    const g = ctx.createLinearGradient(0, 0, 0, SCREEN_H);
    g.addColorStop(0, "#0f62fe");
    g.addColorStop(1, "#002d9c");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Header
    ctx.fillStyle = "#001d6c";
    ctx.fillRect(0, 0, SCREEN_W, 60);
    ctx.font = "bold 30px 'IBM Plex Mono', monospace";
    ctx.fillStyle = "#fff";
    ctx.fillText("IBM Watson AI Console", 20, 40);

    // Neural network visualization
    const nodes = 8;
    const layers = 4;
    const nodeRadius = 8;
    
    for (let layer = 0; layer < layers; layer++) {
      const x = 80 + layer * ((SCREEN_W - 160) / (layers - 1));
      
      for (let node = 0; node < nodes; node++) {
        const y = 100 + node * ((SCREEN_H - 200) / (nodes - 1));
        
        // Draw connections
        if (layer < layers - 1) {
          const nextX = 80 + (layer + 1) * ((SCREEN_W - 160) / (layers - 1));
          for (let nextNode = 0; nextNode < nodes; nextNode++) {
            const nextY = 100 + nextNode * ((SCREEN_H - 200) / (nodes - 1));
            const activation = Math.sin(t * 2 + layer + node + nextNode) > 0.5;
            ctx.strokeStyle = activation ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.1)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(nextX, nextY);
            ctx.stroke();
          }
        }
        
        // Draw node
        const active = Math.sin(t * 3 + layer + node) > 0;
        ctx.fillStyle = active ? "#fff" : "rgba(255,255,255,0.3)";
        ctx.beginPath();
        ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Status panel
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(20, SCREEN_H - 120, SCREEN_W - 40, 100);
    
    ctx.font = "16px 'IBM Plex Mono', monospace";
    const lineIdx = Math.floor(t * 0.9) % ESCIRES_DATA.length;
    
    for (let i = 0; i < 4; i++) {
      const y = SCREEN_H - 95 + i * 22;
      const dataIdx = (lineIdx + i) % ESCIRES_DATA.length;
      ctx.fillStyle = "#4ade80";
      ctx.fillText(ESCIRES_DATA[dataIdx], 30, y);
    }
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
