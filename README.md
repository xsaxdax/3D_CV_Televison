# Mark Morgulis - Interactive CV Television

## Overview
This project transforms your professional experience into an interactive 3D television with 5 unique broadcast channels, each representing one of your workplaces.

## Channels

### CH 01 - LIBELLE AG (Data Masking Consultant)
**Period:** 11.2024 - Present  
**Visual:** SAP-style interface with masked data tables
- Blue SAP theme with data masking visualization
- Shows masked HANA/Oracle/SAP data (e.g., `HANA_DB: ****-****-****-1234`)
- Scanning animation line moving through data
- Green status indicator showing "ACTIVE"

### CH 02 - AILO-IT (Salesforce Developer)
**Period:** 12.2022 - 10.2023  
**Visual:** Salesforce Developer Console
- Salesforce blue theme with cloud logo
- Code editor showing Apex/LWC code
- Syntax highlighting for SOQL queries, triggers, and flows
- Deployment success indicator

### CH 03 - IRS SOFTWARE (Vue.js Developer)
**Period:** 12.2021 - 07.2022  
**Visual:** Vue.js code editor
- Dark theme with Vue green accents
- Shows Vue component code with template, data, and methods
- Syntax highlighting for HTML, JavaScript, and strings
- Blinking cursor and Vue logo

### CH 04 - EFFICOM (Windows Server Administration)
**Period:** 03.2019 - 06.2019  
**Visual:** Windows PowerShell console
- Windows blue theme with taskbar
- PowerShell window with command output
- Shows server administration commands and logs
- Blinking command prompt cursor

### CH 05 - ESCIRES (IBM Watson AI)
**Period:** 02.2018 - 03.2018  
**Visual:** IBM Watson AI Console
- IBM blue gradient theme
- Animated neural network visualization
- Shows AI processing metrics (intent recognition, NLP, confidence scores)
- Pulsing nodes representing active processing

## Features

### Interactive Controls
- **Channel Navigation:** Use arrow keys (↑/↓) or click channel guide
- **Power:** Press P or click power button
- **Volume:** Adjust with slider or M to mute
- **Autopilot:** Press A to auto-cycle through channels
- **Quick Tune:** Press 1-5 to jump to specific channels
- **Orbit Camera:** Drag to rotate view around the TV

### Audio
Each channel has unique synthesized audio:
- Different hum frequencies per channel
- Ambient noise levels
- Tone frequencies that match the channel theme

### Visual Effects
- CRT shader with curvature, scanlines, and chromatic aberration
- Phosphor glow that reacts to screen content
- Room lighting that changes based on what's playing
- Smooth power-on/off animations
- Channel change glitch effects

## Technical Stack
- **React + TypeScript** - UI framework
- **Three.js** - 3D rendering
- **Web Audio API** - Synthesized sound
- **Canvas 2D** - Dynamic channel content
- **GLSL Shaders** - CRT effects

## File Structure
```
src/
├── App.tsx                    # Main React component with HUD
├── three/
│   ├── channels.ts           # Channel content renderers
│   └── TelevisionScene.ts    # 3D scene, TV model, interactions
├── index.css                  # Styles and animations
└── main.tsx                   # Entry point
```

## How to Run
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
```

## Credits
Created as an interactive CV showcase for Mark Morgulis, featuring real work experience from:
- Libelle AG (Data Masking)
- Ailo-IT (Salesforce)
- IRS Software GmbH (Vue.js)
- efficom GmbH (Windows Server)
- esciris GmbH (IBM Watson AI)
