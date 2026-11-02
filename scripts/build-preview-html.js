const fs = require('fs');

const satB64 = fs.readFileSync('/Users/mrhardcore/.gemini/antigravity/brain/f23618e2-02d8-46fa-84f8-d20990797bb4/satellite_map_real.jpg').toString('base64');
const roadsB64 = fs.readFileSync('/Users/mrhardcore/.gemini/antigravity/brain/f23618e2-02d8-46fa-84f8-d20990797bb4/roads_overlay_real.png').toString('base64');

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CamperSites Pro - Mapa Real & Cockpit Automotriz</title>
  
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@700;800;900&display=swap');
    
    * { font-family: 'Plus Jakarta Sans', sans-serif; box-sizing: border-box; }
    .font-mono-speed { font-family: 'JetBrains Mono', monospace; }
    
    .hidden { display: none !important; }
    .hide-scrollbar::-webkit-scrollbar { display: none; }
    .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    .screen-container { 
      height: 790px; 
      width: 390px; 
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .screen-container-fullscreen { 
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      max-width: none !important;
      border-radius: 0 !important;
      border: none !important;
      z-index: 9999 !important;
      box-shadow: none !important;
      transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
    }
    
    /* Luxury Dark Automotive Glassmorphism */
    .glass-dark-lux {
      background: rgba(10, 15, 29, 0.94);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.12);
      box-shadow: 0 16px 36px -6px rgba(0, 0, 0, 0.75);
    }
    
    .glass-pill {
      background: rgba(15, 23, 42, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1.5px solid rgba(255, 255, 255, 0.16);
    }

    /* Señal Oficial R-301 DGT (Metalizada / Reflectante) */
    .dgt-speed-sign {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: #FFFFFF;
      border: 4.5px solid #DC2626;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6), inset 0 0 5px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Estilo del Mapa Satelital Real y Capas */
    #view-map {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #020617;
    }

    #map-draggable-viewport {
      position: absolute;
      top: -60px;
      left: -60px;
      right: -60px;
      bottom: -60px;
      width: calc(100% + 120px);
      height: calc(100% + 120px);
      user-select: none;
    }

    .sat-real-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      pointer-events: none;
    }

    .roads-real-img {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.85;
      display: block;
      pointer-events: none;
    }

    .sat-real-day {
      filter: brightness(1.0) contrast(1.05);
      transition: filter 0.4s ease;
    }

    .sat-real-night {
      filter: brightness(0.4) contrast(1.4) hue-rotate(190deg);
      transition: filter 0.4s ease;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 select-none">

  <!-- MARCO DE TELÉFONO DE CABINA -->
  <main id="phone-screen-container" class="relative screen-container rounded-[44px] border-[6px] border-slate-700 bg-slate-950 shadow-[0_25px_80px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col">

    <!-- BARRA DE ESTADO DE CABINA -->
    <header class="relative z-50 h-10 px-6 flex justify-between items-center text-xs font-bold text-slate-300 bg-gradient-to-b from-black/90 to-transparent">
      <div class="flex items-center gap-1.5 font-mono">
        <span class="text-emerald-400">● 5G RTK</span>
        <span id="cockpit-time">13:00</span>
      </div>
      <div class="w-24 h-4 bg-black rounded-full border border-slate-800 flex items-center justify-center">
        <div class="w-2.5 h-2.5 rounded-full bg-slate-900 border border-emerald-500/50"></div>
      </div>
      <div class="flex items-center gap-2 text-[10px]">
        <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-extrabold font-mono">SATÉLITE REAL</span>
        <span>100%</span>
      </div>
    </header>

    <!-- ÁREA DE CONTENIDO DE LAS PESTAÑAS -->
    <div class="relative flex-1 w-full overflow-hidden">

      <!-- ===================================================================== -->
      <!-- PESTAÑA 1: MAPA REAL SATELITAL CON NAVEGACIÓN Y RADARES DGT -->
      <!-- ===================================================================== -->
      <div id="view-map" class="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing">

        <!-- MAPA SATELITAL REAL FOTOGRÁFICO DE ALTA DEFINICIÓN (ESRI WORLD IMAGERY) -->
        <div id="map-draggable-viewport" class="absolute inset-[-60px] select-none transition-transform duration-100">
          <!-- Imagen Satélite Real -->
          <img id="satellite-real-img" src="data:image/jpeg;base64,${satB64}" onerror="this.src='./satellite_map_real.jpg'" class="sat-real-img sat-real-day" alt="Satélite Real de Guadarrama A-6" />
          
          <!-- Capa Oficial de Carreteras y Trazado Real -->
          <img id="roads-real-img" src="data:image/png;base64,${roadsB64}" onerror="this.src='./roads_overlay_real.png'" class="roads-real-img" alt="Carreteras Oficiales" />

          <!-- Trazado Vectorial de la Ruta de Navegación sobre la A-6 Real -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 500 900" preserveAspectRatio="none">
            <!-- Halo cian de navegación -->
            <path d="M220,890 L235,700 L250,520 L270,360 L290,210 L310,120 L275,80" fill="none" stroke="#0284c7" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" opacity="0.8" />
            <!-- Línea central de navegación -->
            <path d="M220,890 L235,700 L250,520 L270,360 L290,210 L310,120 L275,80" fill="none" stroke="#38bdf8" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
            <!-- Flechas de rumbo en la ruta -->
            <polygon points="248,510 252,530 250,525 248,530" fill="#FFFFFF" />
            <polygon points="268,350 272,370 270,365 268,370" fill="#FFFFFF" />
          </svg>

          <!-- MARCADOR REAL: Radar DGT Fijo en el km 42.1 -->
          <div class="absolute left-[262px] top-[355px] z-20 pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-full">
            <div class="relative flex flex-col items-center">
              <div class="w-9 h-9 rounded-full bg-red-600 border-2 border-white shadow-[0_0_15px_rgba(220,38,38,0.9)] flex items-center justify-center">
                <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              </div>
              <span class="bg-slate-900 border border-red-500 text-white font-mono font-black text-[9px] px-1.5 py-0.5 rounded shadow mt-0.5">120 KM/H</span>
            </div>
          </div>

          <!-- MARCADOR REAL: Área Autocaravanas Sierra Guadarrama -->
          <div onclick="openCockpitDetailSheet()" class="absolute left-[268px] top-[75px] z-20 pointer-events-auto cursor-pointer transform -translate-x-1/2 -translate-y-full active:scale-95 transition-all">
            <div class="glass-dark-lux p-2 rounded-2xl border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.9)] flex items-center gap-2">
              <div class="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 21h18M12 3l9 18H3l9-18z"></path></svg>
              </div>
              <div class="text-left pr-1">
                <p class="text-[10px] font-black text-white leading-tight">Área Camper Sierra</p>
                <p class="text-[9px] font-bold text-emerald-400">● 8 plazas libres</p>
              </div>
            </div>
          </div>

          <!-- CHEVRON GPS DE NAVEGACIÓN 3D REAL (POSICIÓN DEL VEHÍCULO SOBRE EL ASFALTO) -->
          <div id="real-vehicle-chevron" class="absolute left-[235px] top-[700px] z-30 pointer-events-none transform -translate-x-1/2 -translate-y-1/2">
            <div class="relative flex flex-col items-center">
              <div class="w-12 h-12 rounded-full bg-slate-950/90 border-2 border-sky-400 shadow-[0_0_25px_rgba(56,189,248,1)] flex items-center justify-center transform -rotate-15">
                <svg class="w-7 h-7 text-sky-400" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z"></path>
                </svg>
              </div>
              <div class="bg-slate-950/90 border border-emerald-400 text-emerald-400 text-[8px] font-mono font-black px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap">
                GÁLIBO 3.20m OK
              </div>
            </div>
          </div>

        </div>

        <!-- HUD SUPERIOR 1: PÓRTICO DE CARRILES (LANE GUIDANCE REAL) -->
        <div id="lane-guidance-hud" class="absolute top-11 left-3 right-3 z-40 glass-dark-lux p-2.5 rounded-2xl border border-sky-500/30 flex items-center justify-between shadow-2xl">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-blue-600 text-white font-extrabold text-[10px] tracking-wider">A-6</span>
            <span class="text-[11px] font-bold text-slate-200">Bifurcación en 450 m</span>
          </div>
          <div class="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded-xl border border-slate-700">
            <div class="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </div>
            <div class="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-black">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>
            </div>
            <div class="w-6 h-6 rounded-lg bg-emerald-500 text-slate-950 flex items-center justify-center font-black ring-2 ring-emerald-400 animate-pulse">
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            </div>
          </div>
        </div>

        <!-- HUD SUPERIOR 2: PRÓXIMA MANIOBRA -->
        <div id="turn-hud" class="absolute top-24 left-3 right-3 z-40 glass-dark-lux p-3 rounded-2xl border border-white/15 flex items-center gap-3 shadow-2xl">
          <div class="w-12 h-12 rounded-xl bg-sky-600 flex flex-col items-center justify-center shadow-lg text-white">
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><line x1="7" y1="17" x2="17" y2="7"></line><polyline points="7 7 17 7 17 17"></polyline></svg>
            <span class="text-[9px] font-extrabold text-sky-100 mt-0.5 font-mono">450m</span>
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-1.5">
              <span class="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold text-[9px]">SALIDA 44</span>
              <h2 class="text-xs font-black text-white truncate">Guadarrama / Los Molinos</h2>
            </div>
            <p class="text-[10px] text-sky-300 font-semibold truncate mt-0.5">Hacia M-614 • Acceso Área Autocaravanas</p>
          </div>
          <button onclick="toggleNightMode()" id="btn-night-toggle" class="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 hover:border-sky-400 flex items-center justify-center text-xs font-black text-amber-400 shadow" title="Alternar Satélite Real / Modo Noche">
            ☀️
          </button>
        </div>

        <!-- DOCK FLOTANTE DE CONTROL DEL MAPA (MAXIMIZAR / MINIMIZAR PANTALLA & ZOOM SATÉLITE) -->
        <div class="absolute right-3 top-44 z-40 flex flex-col items-center gap-2 pointer-events-auto">
          
          <!-- BOTÓN PRINCIPAL: MAXIMIZAR / MINIMIZAR MAPA EN PANTALLA COMPLETA -->
          <button onclick="toggleMapFullscreen()" id="btn-fullscreen-toggle" class="w-10 h-10 rounded-2xl glass-dark-lux border-2 border-sky-400 hover:border-sky-300 flex items-center justify-center text-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.5)] active:scale-90 transition-all" title="Maximizar / Minimizar Pantalla Completa del Mapa">
            <svg id="fullscreen-icon" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>
          </button>

          <!-- GRUPO ZOOM: MAXIMIZAR (+) / MINIMIZAR (-) ESCALA SATELITAL -->
          <div class="glass-dark-lux rounded-2xl border border-white/20 p-1 flex flex-col items-center gap-1 shadow-xl">
            <button onclick="zoomInMap()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-90 transition-all" title="Acercar / Maximizar Zoom (+)">
              +
            </button>
            <span id="zoom-level-badge" class="text-[9px] font-mono font-black text-sky-300 px-1 py-0.5">100%</span>
            <button onclick="zoomOutMap()" class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg flex items-center justify-center active:scale-90 transition-all" title="Alejar / Minimizar Zoom (-)">
              −
            </button>
          </div>

          <!-- BOTÓN RECENTRAR VEHÍCULO -->
          <button onclick="recenterMap()" class="w-9 h-9 rounded-2xl glass-dark-lux border border-white/20 hover:border-emerald-400 flex items-center justify-center text-emerald-400 shadow-lg active:scale-90 transition-all" title="Recentrar sobre vehículo">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="22" y1="12" x2="18" y2="12"></line><line x1="6" y1="12" x2="2" y2="12"></line><line x1="12" y1="6" x2="12" y2="2"></line><line x1="12" y1="22" x2="12" y2="18"></line></svg>
          </button>

        </div>

        <!-- HUD INFERIOR: VELOCÍMETRO DIGITAL & RADAR DGT REAL -->
        <div class="absolute bottom-24 left-3 right-3 z-30 flex justify-between items-end pointer-events-none">
          <div class="pointer-events-auto glass-dark-lux p-2.5 rounded-2xl flex items-center gap-3 border border-white/20 shadow-2xl">
            <div class="text-center">
              <span id="cockpit-speed-num" class="text-3xl font-black font-mono-speed text-white leading-none block">94</span>
              <span class="text-[8px] font-extrabold text-slate-400 tracking-wider">KM/H</span>
            </div>
            <div class="dgt-speed-sign">
              <span class="text-xs font-black text-slate-900 leading-none font-mono">120</span>
            </div>
          </div>

          <div class="pointer-events-auto glass-dark-lux p-2 rounded-2xl border border-amber-500/40 flex flex-col items-end shadow-2xl">
            <div class="flex items-center gap-1.5 text-[9px] font-black text-amber-400 mb-0.5">
              <svg class="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
              <span>RADAR DE TRAMO DGT</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[9px] text-slate-300">V. Media:</span>
              <span class="text-xs font-mono font-black text-emerald-400">92.4 km/h</span>
              <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[8px] font-extrabold font-mono">OK</span>
            </div>
          </div>
        </div>

        <!-- FICHA DESLIZABLE DE CABINA: ÁREA CAMPER SIERRA GUADARRAMA -->
        <div id="cockpit-detail-sheet" class="absolute left-3 right-3 bottom-20 z-40 glass-dark-lux p-3.5 rounded-3xl border border-white/25 shadow-2xl transition-all duration-300">
          
          <div onclick="closeCockpitDetailSheet()" class="flex justify-center mb-1.5 cursor-pointer py-1" title="Cerrar">
            <div class="w-12 h-1.5 rounded-full bg-slate-500 hover:bg-slate-300 transition-all"></div>
          </div>

          <div class="flex justify-between items-center mb-2">
            <span class="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-black uppercase">
              Área Autocaravanas Pro
            </span>
            <div class="flex items-center gap-2">
              <span class="text-[9px] font-extrabold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md">
                Verificado Comunidad
              </span>
              <button onclick="toggleMinimizeDetailSheet()" id="btn-minimize-sheet" class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black text-xs active:scale-90 transition-all" title="Minimizar / Maximizar Ficha">
                −
              </button>
              <button onclick="closeCockpitDetailSheet()" class="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center font-black text-sm active:scale-90 transition-all" title="Cerrar">
                ✕
              </button>
            </div>
          </div>

          <div id="detail-sheet-body">
            <div class="flex justify-between items-start">
              <div>
                <h3 class="text-sm font-extrabold text-white leading-tight">Área Camper Sierra Guadarrama</h3>
                <p class="text-[10px] text-slate-400 mt-0.5">A-6 km 44.5 • Altura de paso libre sin puentes bajos</p>
              </div>
              <div class="text-right">
                <span class="inline-flex items-center gap-1 text-[10px] font-black text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full">
                  ● 8 Plazas Libres
                </span>
                <p class="text-[8px] text-slate-400 mt-0.5">Confirmado hace 12 min</p>
              </div>
            </div>

            <div class="flex gap-1.5 overflow-x-auto hide-scrollbar my-2.5 text-[9px] font-bold text-slate-300">
              <span class="px-2 py-1 rounded-lg bg-white/10 flex items-center gap-1">Agua Potable</span>
              <span class="px-2 py-1 rounded-lg bg-white/10 flex items-center gap-1">220V Electricidad</span>
              <span class="px-2 py-1 rounded-lg bg-white/10 flex items-center gap-1">Vaciado Aguas</span>
              <span class="px-2 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">100% Gratuito</span>
            </div>

            <div class="flex items-center gap-2">
              <button onclick="startCockpitRoute()" class="flex-1 py-2.5 px-3 rounded-2xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-xs flex items-center justify-between shadow-xl shadow-sky-600/30">
                <div class="text-left">
                  <p class="leading-none text-[11px] font-extrabold">INICIAR RUTA SEGURA</p>
                  <span class="text-[8px] text-sky-200">Gálibo 3.20m verificado OK</span>
                </div>
                <span class="text-sm">➔</span>
              </button>
              <button onclick="confirmLiveSpotCheckin()" class="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-extrabold text-xs flex items-center gap-1 border border-emerald-500/30">
                <span>Confirmar Plaza</span>
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- ===================================================================== -->
      <!-- PESTAÑA 2: EXPLORAR 517.000 PUNTOS (PARK4NIGHT PRO) -->
      <!-- ===================================================================== -->
      <div id="view-explore" class="hidden p-3.5 space-y-3 pb-24 h-full overflow-y-auto hide-scrollbar bg-slate-950 text-white">
        
        <!-- CABECERA DE EXPLORACIÓN DE PROXIMIDAD -->
        <div class="flex justify-between items-start">
          <div>
            <h2 class="text-sm font-black text-white flex items-center gap-1.5">
              <span>Radar de Servicios Cercanos</span>
              <span class="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono font-black">EN VIVO</span>
            </h2>
            <p class="text-[10px] text-slate-400 mt-0.5">Ubicación actual: A-6 km 44 • Guadarrama</p>
          </div>
          <div class="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <button onclick="setExploreRadius(3)" id="radius-3" class="px-2 py-0.5 rounded-lg bg-sky-600 text-white text-[9px] font-black">3 km</button>
            <button onclick="setExploreRadius(5)" id="radius-5" class="px-2 py-0.5 rounded-lg text-slate-400 text-[9px] font-bold">5 km</button>
            <button onclick="setExploreRadius(10)" id="radius-10" class="px-2 py-0.5 rounded-lg text-slate-400 text-[9px] font-bold">10 km</button>
          </div>
        </div>

        <!-- ================================================================= -->
        <!-- MAPA INTERACTIVO DE SERVICIOS CERCANOS A LA UBICACIÓN DEL USUARIO -->
        <!-- ================================================================= -->
        <div class="relative w-full h-56 rounded-3xl border border-sky-500/40 overflow-hidden shadow-2xl bg-slate-900">
          
          <!-- Fondo Satelital Real Centrado en la Ubicación del Usuario -->
          <img src="data:image/jpeg;base64,${satB64}" onerror="this.src='./satellite_map_real.jpg'" class="absolute inset-0 w-full h-full object-cover sat-real-day opacity-80 pointer-events-none" alt="Mapa de Servicios Cercanos" />
          <img src="data:image/png;base64,${roadsB64}" onerror="this.src='./roads_overlay_real.png'" class="absolute inset-0 w-full h-full object-cover opacity-60 pointer-events-none" alt="Red Viaria" />

          <!-- Círculos concéntricos de radio de cobertura (Radar de proximidad) -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 350 220">
            <circle cx="175" cy="110" r="45" fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="3,3" opacity="0.4" />
            <circle cx="175" cy="110" r="90" fill="none" stroke="#38bdf8" stroke-width="1" stroke-dasharray="4,4" opacity="0.3" />
            <text x="180" y="70" fill="#38bdf8" font-size="8" font-weight="bold" opacity="0.6">1 KM</text>
            <text x="180" y="26" fill="#38bdf8" font-size="8" font-weight="bold" opacity="0.5">3 KM</text>
          </svg>

          <!-- UBICACIÓN ACTUAL DEL USUARIO (BALIZA PULSANTE CENTRAL) -->
          <div class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none flex flex-col items-center">
            <div class="relative flex items-center justify-center">
              <div class="w-8 h-8 rounded-full bg-sky-500/30 radar-pulse absolute"></div>
              <div class="w-4 h-4 rounded-full bg-sky-400 border-2 border-white shadow-[0_0_12px_rgba(56,189,248,1)]"></div>
            </div>
            <span class="bg-slate-950/90 border border-sky-400 text-sky-300 text-[8px] font-black px-1.5 py-0.5 rounded shadow mt-1 whitespace-nowrap">
              TÚ ESTÁS AQUÍ
            </span>
          </div>

          <!-- MARCADOR 1: BORNE DE AGUA POTABLE Y VACIADO (ÁREA SIERRA GUADARRAMA) -->
          <div onclick="selectNearbyService('water')" id="marker-water" class="service-marker absolute left-[65%] top-[25%] z-20 pointer-events-auto" title="Agua Potable y Vaciado • 450 m">
            <div class="flex flex-col items-center group">
              <div class="w-8 h-8 rounded-full bg-sky-600 border-2 border-white shadow-[0_0_12px_rgba(2,132,199,0.9)] flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-all">
                💧
              </div>
              <span class="bg-slate-900 border border-sky-400 text-sky-200 text-[7.5px] font-black px-1 rounded shadow mt-0.5">450m</span>
            </div>
          </div>

          <!-- MARCADOR 2: GASOLINERA GLP REPSOL + ADBLUE (A-6 km 43) -->
          <div onclick="selectNearbyService('glp')" id="marker-glp" class="service-marker absolute left-[28%] top-[68%] z-20 pointer-events-auto" title="GLP Autogás y AdBlue • 1.2 km">
            <div class="flex flex-col items-center group">
              <div class="w-8 h-8 rounded-full bg-rose-600 border-2 border-white shadow-[0_0_12px_rgba(225,29,72,0.9)] flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-all">
                ⛽
              </div>
              <span class="bg-slate-900 border border-rose-400 text-rose-200 text-[7.5px] font-black px-1 rounded shadow mt-0.5">1.2km</span>
            </div>
          </div>

          <!-- MARCADOR 3: POSTE ELÉCTRICO 220V 16A CEE (LOS MOLINOS) -->
          <div onclick="selectNearbyService('elec')" id="marker-elec" class="service-marker absolute left-[78%] top-[72%] z-20 pointer-events-auto" title="Poste 220V 16A • 2.1 km">
            <div class="flex flex-col items-center group">
              <div class="w-8 h-8 rounded-full bg-amber-500 border-2 border-white shadow-[0_0_12px_rgba(245,158,11,0.9)] flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-all">
                ⚡
              </div>
              <span class="bg-slate-900 border border-amber-400 text-amber-200 text-[7.5px] font-black px-1 rounded shadow mt-0.5">2.1km</span>
            </div>
          </div>

          <!-- MARCADOR 4: LAVADERO ESPECIAL TECHO CAMPER >3.5M (VILLALBA) -->
          <div onclick="selectNearbyService('wash')" id="marker-wash" class="service-marker absolute left-[18%] top-[30%] z-20 pointer-events-auto" title="Lavadero con Pasarela de Techo • 3.4 km">
            <div class="flex flex-col items-center group">
              <div class="w-8 h-8 rounded-full bg-teal-500 border-2 border-white shadow-[0_0_12px_rgba(20,184,166,0.9)] flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-all">
                🧽
              </div>
              <span class="bg-slate-900 border border-teal-400 text-teal-200 text-[7.5px] font-black px-1 rounded shadow mt-0.5">3.4km</span>
            </div>
          </div>

          <!-- MARCADOR 5: SUPERMERCADO GÁLIBO LIBRE (MERCADONA GUADARRAMA) -->
          <div onclick="selectNearbyService('market')" id="marker-market" class="service-marker absolute left-[48%] top-[18%] z-20 pointer-events-auto" title="Supermercado sin barrera de altura • 1.8 km">
            <div class="flex flex-col items-center group">
              <div class="w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-[0_0_12px_rgba(16,185,129,0.9)] flex items-center justify-center text-white text-xs font-black group-hover:scale-110 transition-all">
                🛒
              </div>
              <span class="bg-slate-900 border border-emerald-400 text-emerald-200 text-[7.5px] font-black px-1 rounded shadow mt-0.5">1.8km</span>
            </div>
          </div>

          <!-- POP-UP FLOTANTE INFERIOR DEL MAPA AL SELECCIONAR UN SERVICIO -->
          <div id="service-map-popup" class="absolute bottom-2 left-2 right-2 z-30 glass-dark-lux p-2.5 rounded-2xl border border-sky-400/60 shadow-2xl flex items-center justify-between">
            <div class="flex items-center gap-2">
              <div id="popup-service-icon" class="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-lg">💧</div>
              <div>
                <h4 id="popup-service-name" class="text-xs font-black text-white leading-tight">Borne Agua & Vaciado</h4>
                <p id="popup-service-desc" class="text-[9px] text-sky-300 font-semibold mt-0.5">A 450 m • Gratuito • Presión alta</p>
              </div>
            </div>
            <button onclick="navigateSelectedService()" class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 active:scale-95 text-white font-black text-[10px] flex items-center gap-1 shadow-lg">
              <span>Ruta</span>
              <span>➔</span>
            </button>
          </div>

        </div>

        <!-- FILTROS RÁPIDOS DE SERVICIO (CHIPS CONMUTABLES) -->
        <div class="flex gap-1.5 overflow-x-auto hide-scrollbar text-[10px] font-black">
          <button onclick="filterServiceType('all')" id="svc-filter-all" class="px-2.5 py-1.5 rounded-xl bg-sky-600 text-white whitespace-nowrap shadow">Todos (5)</button>
          <button onclick="filterServiceType('water')" id="svc-filter-water" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap">💧 Agua/Vaciado (1)</button>
          <button onclick="filterServiceType('glp')" id="svc-filter-glp" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap">⛽ GLP/Autogas (1)</button>
          <button onclick="filterServiceType('elec')" id="svc-filter-elec" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap">⚡ Electricidad 220V (1)</button>
          <button onclick="filterServiceType('wash')" id="svc-filter-wash" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap">🧽 Lavadero >3.5m (1)</button>
          <button onclick="filterServiceType('market')" id="svc-filter-market" class="px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap">🛒 Supermercados (1)</button>
        </div>

        <!-- LISTADO DE SERVICIOS CERCANOS ORDENADOS POR PROXIMIDAD -->
        <div id="services-cards-list" class="space-y-2">
          
          <!-- Card 1: Agua y Vaciado -->
          <div onclick="selectNearbyService('water')" class="svc-card svc-type-water glass-dark-lux p-3 rounded-2xl flex justify-between items-center cursor-pointer border-l-4 border-sky-500 hover:border-sky-400">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-base">💧</div>
              <div>
                <h4 class="text-xs font-black text-white">Borne Agua Potable y Vaciado de Negras</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Área Sierra Guadarrama • A 450 metros de ti</p>
                <div class="flex items-center gap-2 mt-1 text-[9px]">
                  <span class="text-emerald-400 font-extrabold">● 100% Operativo</span>
                  <span class="text-sky-300">Presión: 3.5 bar</span>
                  <span class="text-emerald-300 bg-emerald-500/20 px-1.5 rounded">GRATIS</span>
                </div>
              </div>
            </div>
            <button onclick="event.stopPropagation(); navigateSelectedService()" class="px-2.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black whitespace-nowrap">Navegar</button>
          </div>

          <!-- Card 2: GLP y AdBlue -->
          <div onclick="selectNearbyService('glp')" class="svc-card svc-type-glp glass-dark-lux p-3 rounded-2xl flex justify-between items-center cursor-pointer border-l-4 border-rose-500 hover:border-rose-400">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-base">⛽</div>
              <div>
                <h4 class="text-xs font-black text-white">Repsol GLP Autocaravanas & AdBlue</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Autovía A-6 km 43 • A 1.2 km de ti</p>
                <div class="flex items-center gap-2 mt-1 text-[9px]">
                  <span class="text-rose-400 font-black">0.939 €/L GLP</span>
                  <span class="text-slate-300">Adaptador Dish/Bayoneta</span>
                  <span class="text-amber-400">Abierto 24h</span>
                </div>
              </div>
            </div>
            <button onclick="event.stopPropagation(); navigateSelectedService()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black whitespace-nowrap">Navegar</button>
          </div>

          <!-- Card 3: Supermercado Gálibo Libre -->
          <div onclick="selectNearbyService('market')" class="svc-card svc-type-market glass-dark-lux p-3 rounded-2xl flex justify-between items-center cursor-pointer border-l-4 border-emerald-500 hover:border-emerald-400">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-base">🛒</div>
              <div>
                <h4 class="text-xs font-black text-white">Mercadona Guadarrama (Parking Libre Gálibo)</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Calle Alfonso Senra • A 1.8 km de ti</p>
                <div class="flex items-center gap-2 mt-1 text-[9px]">
                  <span class="text-emerald-400 font-extrabold">● Sin Barrera 2.0m</span>
                  <span class="text-sky-300">Plazas Grandes 7.5m</span>
                  <span class="text-slate-400">Hasta 21:30h</span>
                </div>
              </div>
            </div>
            <button onclick="event.stopPropagation(); navigateSelectedService()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black whitespace-nowrap">Navegar</button>
          </div>

          <!-- Card 4: Poste 220V 16A -->
          <div onclick="selectNearbyService('elec')" class="svc-card svc-type-elec glass-dark-lux p-3 rounded-2xl flex justify-between items-center cursor-pointer border-l-4 border-amber-500 hover:border-amber-400">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-amber-600/30 border border-amber-500/40 flex items-center justify-center text-base">⚡</div>
              <div>
                <h4 class="text-xs font-black text-white">Puntos de Carga 220V CEE 16A</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Parking Estación Los Molinos • A 2.1 km</p>
                <div class="flex items-center gap-2 mt-1 text-[9px]">
                  <span class="text-amber-400 font-extrabold">● 6 Tomas CEE</span>
                  <span class="text-sky-300">16 Amperios</span>
                  <span class="text-slate-300">1.50 € / 4 horas</span>
                </div>
              </div>
            </div>
            <button onclick="event.stopPropagation(); navigateSelectedService()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black whitespace-nowrap">Navegar</button>
          </div>

          <!-- Card 5: Lavadero Camper Pasarela -->
          <div onclick="selectNearbyService('wash')" class="svc-card svc-type-wash glass-dark-lux p-3 rounded-2xl flex justify-between items-center cursor-pointer border-l-4 border-teal-500 hover:border-teal-400">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-base">🧽</div>
              <div>
                <h4 class="text-xs font-black text-white">Lavadero con Pasarela de Techo Especial Camper</h4>
                <p class="text-[10px] text-slate-400 mt-0.5">Polígono P-29 Villalba • A 3.4 km</p>
                <div class="flex items-center gap-2 mt-1 text-[9px]">
                  <span class="text-teal-400 font-extrabold">● Gálibo 4.20m</span>
                  <span class="text-sky-300">Agua Osmotizada</span>
                  <span class="text-slate-300">Lanza de espuma</span>
                </div>
              </div>
            </div>
            <button onclick="event.stopPropagation(); navigateSelectedService()" class="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-black whitespace-nowrap">Navegar</button>
          </div>

        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- PESTAÑA 3: FAVORITOS GUARDADOS -->
      <!-- ===================================================================== -->
      <div id="view-favorites" class="hidden p-4 space-y-3.5 pb-24 h-full overflow-y-auto hide-scrollbar bg-slate-950 text-white">
        <div>
          <h2 class="text-base font-black text-white">Ubicaciones Guardadas</h2>
          <p class="text-xs text-slate-400">Disponibles offline sin cobertura</p>
        </div>

        <div class="space-y-2.5">
          <div class="glass-dark-lux p-3 rounded-2xl flex justify-between items-center border-l-4 border-emerald-500">
            <div>
              <h4 class="text-xs font-black text-white">Área Sierra Guadarrama</h4>
              <p class="text-[10px] text-slate-400">Madrid • Salida 44 A-6</p>
              <span class="text-[9px] text-emerald-400 font-bold">Bóveda Offline Sincronizada</span>
            </div>
            <button onclick="switchTab('map'); openCockpitDetailSheet();" class="px-3 py-1.5 rounded-xl bg-sky-600 text-white text-[10px] font-black">Navegar</button>
          </div>

          <div class="glass-dark-lux p-3 rounded-2xl flex justify-between items-center border-l-4 border-sky-500">
            <div>
              <h4 class="text-xs font-black text-white">Cala Cortina Parking Camper</h4>
              <p class="text-[10px] text-slate-400">Cartagena, Murcia • Primera línea</p>
              <span class="text-[9px] text-sky-400 font-bold">Bóveda Offline Sincronizada</span>
            </div>
            <button class="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-200 text-[10px] font-bold">Navegar</button>
          </div>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- PESTAÑA 4: CONFIGURACIÓN AUTOMOTRIZ DE CABINA (CONFIG TAB) -->
      <!-- ===================================================================== -->
      <div id="view-config" class="hidden p-4 space-y-4 pb-28 h-full overflow-y-auto hide-scrollbar bg-slate-950 text-white">
        <div class="border-b border-slate-800 pb-2">
          <h2 class="text-base font-black text-white">Ajustes de Cabina Cockpit</h2>
          <p class="text-xs text-slate-400">Parámetros de sonido, visión y límites DGT</p>
        </div>

        <!-- Visión de Pantalla -->
        <div class="glass-dark-lux p-3.5 rounded-2xl space-y-2.5 border border-white/10">
          <span class="text-xs font-black text-white uppercase tracking-wider block">Visión de Pantalla</span>
          <div class="grid grid-cols-2 gap-2 text-[11px] font-bold">
            <button onclick="setMapVisualMode('day')" id="btn-vis-day" class="p-2.5 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow">☀️ Satélite Real</button>
            <button onclick="setMapVisualMode('night')" id="btn-vis-night" class="p-2.5 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700">🌙 Noche OLED</button>
          </div>
        </div>

        <!-- MODO DE NOTIFICACIONES DE VOZ Y AVISOS DE SEÑALES -->
        <div class="glass-dark-lux p-3.5 rounded-2xl space-y-3 border border-sky-500/30">
          <div>
            <div class="flex justify-between items-center">
              <span class="text-xs font-black text-white uppercase tracking-wider">Notificaciones de Voz</span>
              <span id="voice-mode-badge" class="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-black text-[9px]">SOLO ALERTAS</span>
            </div>
            <p class="text-[10px] text-slate-400 mt-0.5">Elige cuándo habla el asistente para evitar interrupciones innecesarias</p>
          </div>

          <!-- Selector de Modo de Voz (4 Modos de Cabina) -->
          <div class="grid grid-cols-2 gap-1.5 text-[10px] font-bold">
            <button onclick="setVoiceMode('safety')" id="btn-vmode-safety" class="p-2 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow flex flex-col items-center">
              <span>🛡️ Solo Alertas (Recom.)</span>
              <span class="text-[8px] opacity-80 font-normal">Radares, gálibo y límites</span>
            </button>
            <button onclick="setVoiceMode('radars')" id="btn-vmode-radars" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700 flex flex-col items-center">
              <span>🚨 Solo Radares DGT</span>
              <span class="text-[8px] opacity-80 font-normal">Solo radares y velocidad</span>
            </button>
            <button onclick="setVoiceMode('all')" id="btn-vmode-all" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700 flex flex-col items-center">
              <span>🧭 Completo + Maniobras</span>
              <span class="text-[8px] opacity-80 font-normal">Alertas y navegación</span>
            </button>
            <button onclick="setVoiceMode('mute')" id="btn-vmode-mute" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700 flex flex-col items-center">
              <span>🔇 Silencio Total</span>
              <span class="text-[8px] opacity-80 font-normal">Solo avisos visuales HUD</span>
            </button>
          </div>

          <!-- Interruptores Granulares On/Off -->
          <div class="space-y-2 pt-1 border-t border-slate-800 text-xs">
            
            <div onclick="toggleVoicePref('announceRadars')" class="flex justify-between items-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer">
              <div>
                <p class="text-[11px] font-extrabold text-white">Radares DGT (Fijo, Tramo, Túnel)</p>
                <span class="text-[9px] text-slate-400">Aviso vocal escalonado a 500m y 200m</span>
              </div>
              <span id="toggle-announceRadars" class="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px]">ACTIVO</span>
            </div>

            <div onclick="toggleVoicePref('announceSpeedLimit')" class="flex justify-between items-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer">
              <div>
                <p class="text-[11px] font-extrabold text-white">Exceso de Límite de Velocidad (R-301)</p>
                <span class="text-[9px] text-slate-400">Aviso al rebasar la velocidad de la vía</span>
              </div>
              <span id="toggle-announceSpeedLimit" class="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px]">ACTIVO</span>
            </div>

            <div onclick="toggleVoicePref('announceClearance')" class="flex justify-between items-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer">
              <div>
                <p class="text-[11px] font-extrabold text-white">Peligro Crítico de Gálibo / Puentes Bajos</p>
                <span class="text-[9px] text-slate-400">Alerta máxima ante alturas inferiores a tu vehículo</span>
              </div>
              <span id="toggle-announceClearance" class="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px]">ACTIVO</span>
            </div>

            <div onclick="toggleVoicePref('announceNav')" class="flex justify-between items-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer">
              <div>
                <p class="text-[11px] font-extrabold text-white">Instrucciones de Giro a Giro</p>
                <span class="text-[9px] text-slate-400">Bifurcaciones, salidas y rotondas</span>
              </div>
              <span id="toggle-announceNav" class="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px]">ACTIVO</span>
            </div>

            <div onclick="toggleVoicePref('announceUiFeedback')" class="flex justify-between items-center p-2 rounded-xl bg-slate-900/90 border border-slate-800 cursor-pointer">
              <div>
                <p class="text-[11px] font-extrabold text-white">Voz al pulsar botones (Feedback de Interfaz)</p>
                <span class="text-[9px] text-amber-400/90 font-medium">⚠️ Silenciado por defecto para no hablar en cada toque</span>
              </div>
              <span id="toggle-announceUiFeedback" class="px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 font-mono font-black text-[10px]">SILENCIADO</span>
            </div>

          </div>

          <!-- Canal de Audio & Test -->
          <div class="pt-2 border-t border-slate-800">
            <span class="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1.5">Canal de Salida</span>
            <div class="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
              <button onclick="setAudioChannel('speaker')" id="btn-audio-speaker" class="p-2 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow">Altavoz</button>
              <button onclick="setAudioChannel('bluetooth')" id="btn-audio-bluetooth" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700">Bluetooth HFP</button>
              <button onclick="setAudioChannel('silent')" id="btn-audio-silent" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700">Silencioso</button>
            </div>

            <button onclick="testCockpitVoice()" class="w-full mt-2.5 py-2.5 px-3 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-300 text-xs font-extrabold flex items-center justify-center gap-2 active:scale-95 transition-all">
              <svg class="w-4 h-4 text-sky-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
              <span>🔊 Probar Locución de Alerta de Seguridad</span>
            </button>
          </div>
        </div>

        <!-- Preaviso de Radares DGT -->
        <div class="glass-dark-lux p-3.5 rounded-2xl space-y-2.5 border border-white/10">
          <span class="text-xs font-black text-white uppercase tracking-wider block">Preaviso de Radares DGT</span>
          <div class="grid grid-cols-3 gap-1.5 text-[10px] font-bold">
            <button onclick="setRadarDistance(500)" id="radar-dist-500" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700">500 m</button>
            <button onclick="setRadarDistance(1000)" id="radar-dist-1000" class="p-2 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow">1.000 m (Recom.)</button>
            <button onclick="setRadarDistance(2000)" id="radar-dist-2000" class="p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700">2.000 m</button>
          </div>
        </div>

        <!-- Bóveda Offline -->
        <div class="glass-dark-lux p-3.5 rounded-2xl space-y-2 border border-white/10">
          <div class="flex justify-between items-center">
            <span class="text-xs font-black text-white uppercase tracking-wider">Bóveda Offline</span>
            <span class="text-[9px] font-extrabold text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-md font-mono">2.257 RADARES</span>
          </div>
          <div class="space-y-1.5 pt-1 text-[11px]">
            <div class="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <p class="font-extrabold text-white">Zona Centro & Madrid</p>
                <span class="text-[9px] text-emerald-400">42.100 spots • 62 MB</span>
              </div>
              <span class="text-[10px] font-black text-emerald-400">✓ DESCARGADO</span>
            </div>
            <div class="flex justify-between items-center p-2 rounded-xl bg-slate-900 border border-slate-800">
              <div>
                <p class="font-extrabold text-white">Norte & Pirineos</p>
                <span class="text-[9px] text-slate-400">78.400 spots • 115 MB</span>
              </div>
              <button onclick="simulateOfflineDownload(this)" class="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-[10px] font-bold">Descargar</button>
            </div>
          </div>
        </div>
      </div>

      <!-- ===================================================================== -->
      <!-- PESTAÑA 5: PERFIL REAL, FICHA TÉCNICA DEL VEHÍCULO & CUENTA -->
      <!-- ===================================================================== -->
      <div id="view-profile" class="hidden p-4 space-y-4 pb-28 h-full overflow-y-auto hide-scrollbar bg-slate-950 text-white">
        
        <div class="glass-dark-lux p-4 rounded-3xl space-y-3 border border-purple-500/30">
          <div class="flex items-center gap-3">
            <div class="w-13 h-13 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-0.5 shadow-xl">
              <div class="w-full h-full rounded-2xl bg-slate-900 flex items-center justify-center text-xl font-black text-purple-300">
                CR
              </div>
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-black text-white truncate">Carlos R. (Conductor Verificado)</h3>
              <p class="text-[11px] text-purple-300 truncate">carlos.vanlife@campersites.pro</p>
              <div class="flex items-center gap-2 mt-1">
                <span class="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black">
                  PRO COCKPIT ANUAL
                </span>
                <span class="text-[9px] text-slate-400 font-mono">#CS-8924</span>
              </div>
            </div>
          </div>

          <div class="pt-2 border-t border-slate-800">
            <div class="flex justify-between items-center text-[10px] font-bold mb-1">
              <span class="text-slate-300">Reputación: <b class="text-emerald-400">Guardián Nivel 4</b></span>
              <span class="text-slate-400">450 / 500 pts</span>
            </div>
            <div class="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
              <div class="h-full bg-gradient-to-r from-emerald-500 to-sky-400 w-[90%]"></div>
            </div>
          </div>
        </div>

        <!-- FICHA TÉCNICA DEL VEHÍCULO -->
        <div class="glass-dark-lux p-4 rounded-3xl space-y-3 border border-white/10">
          <div class="flex justify-between items-center">
            <div>
              <h3 class="text-xs font-black text-white uppercase tracking-wider">Ficha Técnica & Gálibo</h3>
              <p class="text-[10px] text-slate-400">Evita pasos inferiores y túneles bajos</p>
            </div>
            <button onclick="openVehicleEditModal()" class="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-black flex items-center gap-1 shadow-lg active:scale-95 transition-all">
              <span>Modificar</span>
            </button>
          </div>

          <div class="p-2.5 rounded-2xl bg-slate-900 border border-slate-800">
            <h4 id="profile-vehicle-name" class="text-xs font-extrabold text-white">Fiat Ducato Maxi Camper 2022</h4>
            <p id="profile-vehicle-type-label" class="text-[10px] text-sky-400">Gran Volumen L3H2 • Modo Overlanding</p>
          </div>

          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-[8px] text-slate-400 font-extrabold block">ALTURA</span>
              <span id="badge-height" class="text-xs font-black text-white font-mono">3.20 m</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-[8px] text-slate-400 font-extrabold block">ANCHURA</span>
              <span id="badge-width" class="text-xs font-black text-white font-mono">2.35 m</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-[8px] text-slate-400 font-extrabold block">LONGITUD</span>
              <span id="badge-length" class="text-xs font-black text-white font-mono">7.45 m</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-[8px] text-slate-400 font-extrabold block">PESO MMA</span>
              <span id="badge-weight" class="text-xs font-black text-white font-mono">3.500 kg</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-[8px] text-slate-400 font-extrabold block">COMBUSTIBLE</span>
              <span id="badge-fuel" class="text-xs font-black text-white">Diésel+GLP</span>
            </div>
            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800">
              <span class="text-[8px] text-slate-400 font-extrabold block">ZBE</span>
              <span id="badge-zbe" class="text-xs font-black text-emerald-400">ECO</span>
            </div>
          </div>
        </div>

        <!-- MODO OPERATIVO (PROFESIONAL, SIN EMOJIS) -->
        <div class="glass-dark-lux p-4 rounded-3xl space-y-2.5 border border-white/10">
          <span class="text-xs font-black text-white uppercase tracking-wider block">Modo Operativo de Navegación</span>
          <div class="space-y-2">
            
            <button onclick="selectOperationalMode('camper')" id="opmode-camper" class="w-full p-2.5 rounded-2xl bg-slate-900 border-2 border-emerald-500 text-left flex items-center justify-between">
              <div>
                <p class="font-extrabold text-white text-xs">Autocaravana / Camper</p>
                <span class="text-[9px] text-emerald-400">Rutas seguras para caravaning y pernocta</span>
              </div>
              <span class="text-emerald-400 font-black text-xs">ACTIVO</span>
            </button>

            <button onclick="selectOperationalMode('truck')" id="opmode-truck" class="w-full p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-left flex items-center justify-between hover:border-amber-500/50">
              <div>
                <p class="font-extrabold text-white text-xs">Camión Pesado / Tráiler HGV</p>
                <span class="text-[9px] text-amber-400">Tacógrafo UE 4h30m y puentes altos</span>
              </div>
              <span class="text-slate-500 text-xs">Elegir</span>
            </button>

            <button onclick="selectOperationalMode('delivery')" id="opmode-delivery" class="w-full p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-left flex items-center justify-between hover:border-cyan-500/50">
              <div>
                <p class="font-extrabold text-white text-xs">Courier / Furgón Profesional Última Milla</p>
                <span class="text-[9px] text-cyan-400">Optimización TSP de reparto multi-parada</span>
              </div>
              <span class="text-slate-500 text-xs">Elegir</span>
            </button>

          </div>
        </div>

      </div>

    </div>

    <!-- DOCK INFERIOR DE PESTAÑAS (5 TABS NATIVAS) -->
    <div id="cockpit-bottom-nav" class="absolute bottom-3 left-3 right-3 z-50 transition-all duration-300">
      <nav class="glass-pill px-2 py-1.5 rounded-2xl flex justify-around items-center shadow-2xl">
        
        <button onclick="switchTab('map')" id="tab-nav-map" class="flex flex-col items-center text-emerald-400 font-black scale-105 transition-all">
          <svg class="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>
          <span class="text-[9px]">Mapa</span>
        </button>

        <button onclick="switchTab('explore')" id="tab-nav-explore" class="flex flex-col items-center text-slate-400 hover:text-slate-200 font-semibold transition-all">
          <svg class="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>
          <span class="text-[9px]">Explorar</span>
        </button>

        <button onclick="switchTab('favorites')" id="tab-nav-favorites" class="flex flex-col items-center text-slate-400 hover:text-slate-200 font-semibold transition-all">
          <svg class="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          <span class="text-[9px]">Favoritos</span>
        </button>

        <button onclick="switchTab('config')" id="tab-nav-config" class="flex flex-col items-center text-slate-400 hover:text-slate-200 font-semibold transition-all">
          <svg class="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          <span class="text-[9px] font-bold">Config</span>
        </button>

        <button onclick="switchTab('profile')" id="tab-nav-profile" class="flex flex-col items-center text-slate-400 hover:text-slate-200 font-semibold transition-all">
          <svg class="w-4 h-4 mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          <span class="text-[9px]">Perfil</span>
        </button>

      </nav>
    </div>

    <!-- MODAL DE EDICIÓN DE FICHA TÉCNICA -->
    <div id="modal-vehicle-edit" class="hidden absolute inset-0 z-50 bg-black/80 backdrop-blur-md p-4 flex flex-col justify-end animate-in fade-in">
      <div class="glass-dark-lux p-5 rounded-3xl border border-sky-500/40 space-y-4">
        
        <div class="flex justify-between items-center border-b border-slate-800 pb-2">
          <div>
            <h3 class="text-sm font-black text-white">Editar Ficha Técnica y Gálibo</h3>
            <p class="text-[10px] text-slate-400">Modifica las dimensiones reales de tu vehículo</p>
          </div>
          <button onclick="closeVehicleEditModal()" class="w-8 h-8 rounded-full bg-slate-800 text-slate-300 font-black hover:text-white flex items-center justify-center">✕</button>
        </div>

        <div class="space-y-3 text-xs">
          <div>
            <label class="text-[10px] font-extrabold text-slate-400 uppercase">Nombre del Vehículo</label>
            <input type="text" id="input-veh-name" value="Fiat Ducato Maxi Camper 2022" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-sky-500">
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[10px] font-extrabold text-slate-400 uppercase">Altura de Gálibo (m)</label>
              <input type="number" step="0.05" id="input-veh-height" value="3.20" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-sky-500 font-mono">
            </div>
            <div>
              <label class="text-[10px] font-extrabold text-slate-400 uppercase">Anchura (m)</label>
              <input type="number" step="0.05" id="input-veh-width" value="2.35" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-sky-500 font-mono">
            </div>
            <div>
              <label class="text-[10px] font-extrabold text-slate-400 uppercase">Longitud (m)</label>
              <input type="number" step="0.1" id="input-veh-length" value="7.45" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-sky-500 font-mono">
            </div>
            <div>
              <label class="text-[10px] font-extrabold text-slate-400 uppercase">Peso MMA (kg)</label>
              <input type="number" step="100" id="input-veh-weight" value="3500" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none focus:border-sky-500 font-mono">
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2.5">
            <div>
              <label class="text-[10px] font-extrabold text-slate-400 uppercase">Combustible</label>
              <select id="input-veh-fuel" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none">
                <option value="Diésel+GLP">Diésel + GLP</option>
                <option value="Diésel">Diésel Estándar</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Eléctrico">100% Eléctrico</option>
              </select>
            </div>
            <div>
              <label class="text-[10px] font-extrabold text-slate-400 uppercase">Distintivo ZBE</label>
              <select id="input-veh-zbe" class="w-full mt-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold outline-none">
                <option value="ECO">ECO</option>
                <option value="0">CERO Emisiones</option>
                <option value="C">Etiqueta C Verde</option>
                <option value="B">Etiqueta B Amarilla</option>
              </select>
            </div>
          </div>
        </div>

        <div class="flex gap-2 pt-2">
          <button onclick="closeVehicleEditModal()" class="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold hover:bg-slate-700">Cancelar</button>
          <button onclick="saveVehicleDimensions()" class="flex-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold shadow-lg">Guardar Ficha</button>
        </div>

      </div>
    </div>

  </main>

  <footer class="mt-3 bg-slate-900 border border-slate-800 rounded-2xl p-3 max-w-sm w-full text-center text-xs text-slate-400 space-y-1">
    <p class="font-extrabold text-white">CamperSites Pro • Satélite Real Esri Earth</p>
    <p class="text-[10px]">Autovía A-6 Guadarrama • 100% Inmune a bloqueos de red</p>
  </footer>

  <script>
    let isNightMode = false;
    let audioChannel = 'speaker';
    let isMapFullscreen = false;
    let currentZoom = 1.0;
    let isDragging = false, startX = 0, startY = 0, currentX = 0, currentY = 0;
    let isDetailSheetMinimized = false;

    // Actualización de la posición y escala del mapa satelital HD
    function updateMapTransform() {
      const mapViewport = document.getElementById('map-draggable-viewport');
      const badge = document.getElementById('zoom-level-badge');
      if (mapViewport) {
        mapViewport.style.transform = 'translate(' + currentX + 'px, ' + currentY + 'px) scale(' + currentZoom + ')';
      }
      if (badge) {
        badge.textContent = Math.round(currentZoom * 100) + '%';
      }
    }

    // MAXIMIZAR / MINIMIZAR EL MAPA A PANTALLA COMPLETA
    function toggleMapFullscreen() {
      const container = document.getElementById('phone-screen-container');
      const btn = document.getElementById('btn-fullscreen-toggle');
      isMapFullscreen = !isMapFullscreen;

      if (isMapFullscreen) {
        container.classList.remove('screen-container');
        container.classList.add('screen-container-fullscreen');
        btn.innerHTML = '<svg class="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"></path></svg>';
        btn.title = "Minimizar Mapa a Vista Móvil";
        btn.classList.add('border-amber-400');
        btn.classList.remove('border-sky-400');
        speakAudio('Mapa maximizado a pantalla completa de cabina.');
        try {
          if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } catch(e) {}
      } else {
        container.classList.remove('screen-container-fullscreen');
        container.classList.add('screen-container');
        btn.innerHTML = '<svg class="w-5 h-5 text-sky-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"></path></svg>';
        btn.title = "Maximizar Mapa a Pantalla Completa";
        btn.classList.add('border-sky-400');
        btn.classList.remove('border-amber-400');
        speakAudio('Mapa minimizado.');
        try {
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        } catch(e) {}
      }
    }

    // ZOOM IN: MAXIMIZAR ESCALA SATELITAL (HASTA 280%)
    function zoomInMap() {
      if (currentZoom < 2.8) {
        currentZoom = Math.min(2.8, parseFloat((currentZoom + 0.25).toFixed(2)));
        updateMapTransform();
        speakAudio('Zoom ' + Math.round(currentZoom * 100) + ' por ciento');
      }
    }

    // ZOOM OUT: MINIMIZAR ESCALA SATELITAL (HASTA 60%)
    function zoomOutMap() {
      if (currentZoom > 0.6) {
        currentZoom = Math.max(0.6, parseFloat((currentZoom - 0.25).toFixed(2)));
        updateMapTransform();
        speakAudio('Zoom ' + Math.round(currentZoom * 100) + ' por ciento');
      }
    }

    // RECENTRAR GPS Y RESTABLECER ESCALA
    function recenterMap() {
      currentX = 0;
      currentY = 0;
      currentZoom = 1.0;
      updateMapTransform();
      speakAudio('Posición GPS recentrada.');
    }

    // MINIMIZAR / MAXIMIZAR FICHA DE DETALLES DEL ÁREA
    function toggleMinimizeDetailSheet() {
      const body = document.getElementById('detail-sheet-body');
      const btn = document.getElementById('btn-minimize-sheet');
      const sheet = document.getElementById('cockpit-detail-sheet');
      isDetailSheetMinimized = !isDetailSheetMinimized;
      if (isDetailSheetMinimized) {
        body.classList.add('hidden');
        sheet.classList.add('pb-2');
        btn.textContent = '▲';
        btn.title = 'Maximizar Ficha';
        speakAudio('Ficha minimizada. Mapa despejado.');
      } else {
        body.classList.remove('hidden');
        sheet.classList.remove('pb-2');
        btn.textContent = '−';
        btn.title = 'Minimizar Ficha';
        speakAudio('Ficha maximizada.');
      }
    }

    // Arrastre interactivo del mapa satelital real con ratón o táctil
    const mapViewport = document.getElementById('map-draggable-viewport');
    const mapContainer = document.getElementById('view-map');

    mapContainer.addEventListener('mousedown', (e) => {
      if (e.target.closest('button') || e.target.closest('#cockpit-detail-sheet') || e.target.closest('#lane-guidance-hud') || e.target.closest('#turn-hud')) return;
      isDragging = true;
      startX = e.clientX - currentX;
      startY = e.clientY - currentY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      currentX = e.clientX - startX;
      currentY = e.clientY - startY;
      const limit = 220 * currentZoom;
      currentX = Math.max(-limit, Math.min(limit, currentX));
      currentY = Math.max(-limit, Math.min(limit, currentY));
      updateMapTransform();
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // Zoom interactivo con la rueda del ratón
    mapContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        zoomInMap();
      } else {
        zoomOutMap();
      }
    }, { passive: false });

    // Reloj dinámico de cabina
    setInterval(() => {
      const now = new Date();
      document.getElementById('cockpit-time').textContent = 
        String(now.getHours()).padStart(2, '0') + ':' + String(now.getMinutes()).padStart(2, '0');
    }, 1000);

    // Conmutación Día / Noche
    function toggleNightMode() {
      setMapVisualMode(isNightMode ? 'day' : 'night');
    }

    function setMapVisualMode(mode) {
      const satImg = document.getElementById('satellite-real-img');
      const btnToggle = document.getElementById('btn-night-toggle');

      if (mode === 'night') {
        isNightMode = true;
        satImg.className = 'absolute inset-0 w-full h-full object-cover sat-real-night pointer-events-none';
        if (btnToggle) btnToggle.textContent = '🌙';
        speakAudio('Visión nocturna antirreflejos activada.');
      } else {
        isNightMode = false;
        satImg.className = 'absolute inset-0 w-full h-full object-cover sat-real-day pointer-events-none';
        if (btnToggle) btnToggle.textContent = '☀️';
        speakAudio('Cartografía satelital diurna activada.');
      }
    }

    // Configuración Granular de Notificaciones de Voz
    const voiceConfig = {
      mode: 'safety', // 'safety' | 'radars' | 'all' | 'mute'
      announceRadars: true,
      announceSpeedLimit: true,
      announceClearance: true,
      announceNav: true,
      announceUiFeedback: false, // DESACTIVADO POR DEFECTO PARA NO HABLAR EN CADA TOQUE
    };

    function setVoiceMode(mode) {
      voiceConfig.mode = mode;
      
      const badge = document.getElementById('voice-mode-badge');
      const modes = ['safety', 'radars', 'all', 'mute'];
      modes.forEach(m => {
        const btn = document.getElementById('btn-vmode-' + m);
        if (btn) {
          if (m === mode) {
            btn.className = 'p-2 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow flex flex-col items-center';
          } else {
            btn.className = 'p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700 flex flex-col items-center';
          }
        }
      });

      if (badge) {
        if (mode === 'safety') {
          badge.textContent = 'SOLO ALERTAS';
          badge.className = 'px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-black text-[9px]';
        } else if (mode === 'radars') {
          badge.textContent = 'SOLO RADARES';
          badge.className = 'px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-black text-[9px]';
        } else if (mode === 'all') {
          badge.textContent = 'COMPLETO';
          badge.className = 'px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono font-black text-[9px]';
        } else {
          badge.textContent = 'SILENCIO';
          badge.className = 'px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 font-mono font-black text-[9px]';
        }
      }

      if (mode !== 'mute') {
        speakAudio(
          mode === 'safety' ? 'Modo de voz: solo alertas de seguridad activado.' :
          mode === 'radars' ? 'Modo de voz: solo radares activado.' :
          'Modo de voz completo con maniobras activado.',
          'safety'
        );
      }
    }

    function toggleVoicePref(key) {
      voiceConfig[key] = !voiceConfig[key];
      const el = document.getElementById('toggle-' + key);
      if (el) {
        if (voiceConfig[key]) {
          el.textContent = 'ACTIVO';
          el.className = 'px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono font-black text-[10px]';
        } else {
          el.textContent = 'SILENCIADO';
          el.className = 'px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 font-mono font-black text-[10px]';
        }
      }
    }

    // Audio TTS Síntesis con Filtrado Granular
    function speakAudio(text, category = 'ui') {
      if (audioChannel === 'silent' || voiceConfig.mode === 'mute') return;

      // Si es un simple toque o clic en la interfaz, NO HABLA a menos que esté activado explícitamente
      if (category === 'ui' && !voiceConfig.announceUiFeedback) return;
      if (category === 'radar' && !voiceConfig.announceRadars) return;
      if (category === 'speed' && !voiceConfig.announceSpeedLimit) return;
      if (category === 'clearance' && !voiceConfig.announceClearance) return;
      if (category === 'nav' && !voiceConfig.announceNav) return;
      if (voiceConfig.mode === 'radars' && category !== 'radar' && category !== 'speed') return;

      try {
        if ('speechSynthesis' in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'es-ES';
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }
      } catch (e) {}
    }

    // Navegación entre pestañas
    function switchTab(tabId) {
      const tabs = ['map', 'explore', 'favorites', 'config', 'profile'];
      tabs.forEach(t => {
        const view = document.getElementById('view-' + t);
        const navBtn = document.getElementById('tab-nav-' + t);
        if (view && navBtn) {
          if (t === tabId) {
            view.classList.remove('hidden');
            navBtn.className = 'flex flex-col items-center text-emerald-400 font-black scale-105 transition-all';
          } else {
            view.classList.add('hidden');
            navBtn.className = 'flex flex-col items-center text-slate-400 hover:text-slate-200 font-semibold transition-all';
          }
        }
      });
    }

    function openCockpitDetailSheet() {
      const sheet = document.getElementById('cockpit-detail-sheet');
      if (sheet) sheet.classList.remove('hidden');
    }

    function closeCockpitDetailSheet() {
      const sheet = document.getElementById('cockpit-detail-sheet');
      if (sheet) sheet.classList.add('hidden');
    }

    function startCockpitRoute() {
      closeCockpitDetailSheet();
      speakAudio('Iniciando navegación con gálibo seguro hacia Área Sierra Guadarrama. Continúe por autovía A-6 durante doce kilómetros.', 'nav');
      const chevron = document.getElementById('real-vehicle-chevron');
      if (chevron) {
        chevron.style.transition = 'all 4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        chevron.style.transform = 'translate(-50%, -50%) translate(15px, -180px)';
      }
    }

    function confirmLiveSpotCheckin() {
      speakAudio('Confirmación registrada. Ocho plazas libres reportadas a la comunidad.');
      alert('Confirmación de plaza registrada con éxito. Gracias por colaborar con la comunidad CamperSites.');
    }

    // Funciones del Radar y Mapa de Servicios de Proximidad en Explorar
    let currentSelectedService = 'water';
    const NEARBY_SERVICES = {
      water: {
        name: 'Borne Agua Potable & Vaciado',
        desc: 'A 450 m • Gratuito • Presión alta 3.5 bar',
        icon: '💧',
        voice: 'Borne de agua potable y vaciado a cuatrocientos cincuenta metros. Sin restricción de gálibo.'
      },
      glp: {
        name: 'Repsol GLP Autocaravanas & AdBlue',
        desc: 'A 1.2 km • 0.939 €/L • Abierto 24h',
        icon: '⛽',
        voice: 'Estación de servicio Repsol con surtidor GLP y AdBlue a un kilómetro punto dos. Pista ancha para camiones.'
      },
      elec: {
        name: 'Puntos de Carga 220V 16A CEE',
        desc: 'A 2.1 km • 6 Tomas europeas • 1.50€/4h',
        icon: '⚡',
        voice: 'Postes de electricidad de dieciséis amperios a dos kilómetros punto uno en Los Molinos.'
      },
      wash: {
        name: 'Lavadero Techo Alto Especial Camper',
        desc: 'A 3.4 km • Gálibo 4.20m • Pasarela de techo',
        icon: '🧽',
        voice: 'Lavadero con pasarela para limpieza de techo y placas solares a tres kilómetros punto cuatro.'
      },
      market: {
        name: 'Mercadona (Parking Gálibo Libre)',
        desc: 'A 1.8 km • Sin barrera 2.0m • Plazas grandes',
        icon: '🛒',
        voice: 'Supermercado con aparcamiento exterior sin barreras de altura a un kilómetro punto ocho.'
      }
    };

    function selectNearbyService(key) {
      currentSelectedService = key;
      const svc = NEARBY_SERVICES[key];
      if (!svc) return;

      const popup = document.getElementById('service-map-popup');
      const icon = document.getElementById('popup-service-icon');
      const name = document.getElementById('popup-service-name');
      const desc = document.getElementById('popup-service-desc');

      if (popup && icon && name && desc) {
        icon.textContent = svc.icon;
        name.textContent = svc.name;
        desc.textContent = svc.desc;
        popup.classList.remove('hidden');
      }

      ['water', 'glp', 'elec', 'wash', 'market'].forEach(k => {
        const marker = document.getElementById('marker-' + k);
        if (marker) {
          if (k === key) {
            marker.classList.add('service-marker-active');
          } else {
            marker.classList.remove('service-marker-active');
          }
        }
      });

      speakAudio(svc.voice);
    }

    function navigateSelectedService() {
      const svc = NEARBY_SERVICES[currentSelectedService] || NEARBY_SERVICES.water;
      switchTab('map');
      speakAudio('Calculando ruta segura con gálibo verificado hacia ' + svc.name);
      openCockpitDetailSheet();
    }

    function filterServiceType(type) {
      const types = ['all', 'water', 'glp', 'elec', 'wash', 'market'];
      types.forEach(t => {
        const btn = document.getElementById('svc-filter-' + t);
        if (btn) {
          if (t === type) {
            btn.className = 'px-2.5 py-1.5 rounded-xl bg-sky-600 text-white whitespace-nowrap shadow';
          } else {
            btn.className = 'px-2.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white whitespace-nowrap';
          }
        }
      });

      const cards = document.querySelectorAll('.svc-card');
      cards.forEach(card => {
        if (type === 'all' || card.classList.contains('svc-type-' + type)) {
          card.classList.remove('hidden');
        } else {
          card.classList.add('hidden');
        }
      });

      ['water', 'glp', 'elec', 'wash', 'market'].forEach(k => {
        const marker = document.getElementById('marker-' + k);
        if (marker) {
          if (type === 'all' || type === k) {
            marker.style.display = 'block';
          } else {
            marker.style.display = 'none';
          }
        }
      });
    }

    function setExploreRadius(km) {
      [3, 5, 10].forEach(r => {
        const btn = document.getElementById('radius-' + r);
        if (btn) {
          btn.className = r === km
            ? 'px-2 py-0.5 rounded-lg bg-sky-600 text-white text-[9px] font-black'
            : 'px-2 py-0.5 rounded-lg text-slate-400 text-[9px] font-bold';
        }
      });
      speakAudio('Radio de búsqueda ajustado a ' + km + ' kilómetros.');
    }

    function setAudioChannel(channel) {
      audioChannel = channel;
      ['speaker', 'bluetooth', 'silent'].forEach(c => {
        const btn = document.getElementById('btn-audio-' + c);
        if (btn) {
          btn.className = c === channel
            ? 'p-2 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow'
            : 'p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700';
        }
      });
    }

    function testCockpitVoice() {
      speakAudio('Sistema de voz Cockpit CamperSites Pro verificado. Radar fijo a quinientos metros, límite ciento veinte. Conducción asistida activa.', 'radar');
    }

    function setRadarDistance(dist) {
      [500, 1000, 2000].forEach(d => {
        const btn = document.getElementById('radar-dist-' + d);
        if (btn) {
          btn.className = d === dist
            ? 'p-2 rounded-xl bg-sky-600 text-white text-center font-extrabold shadow'
            : 'p-2 rounded-xl bg-slate-800 text-slate-300 text-center hover:bg-slate-700';
        }
      });
      speakAudio('Distancia de preaviso de radar fijada en ' + dist + ' metros.');
    }

    function simulateOfflineDownload(btn) {
      btn.textContent = 'Descargando...';
      btn.disabled = true;
      setTimeout(() => {
        btn.parentElement.innerHTML = '<span class="text-[10px] font-black text-emerald-400">DESCARGADO</span>';
        speakAudio('Paquete territorial offline descargado con éxito.');
      }, 1500);
    }

    function openVehicleEditModal() {
      document.getElementById('modal-vehicle-edit').classList.remove('hidden');
    }

    function closeVehicleEditModal() {
      document.getElementById('modal-vehicle-edit').classList.add('hidden');
    }

    function saveVehicleDimensions() {
      const name = document.getElementById('input-veh-name').value;
      const height = document.getElementById('input-veh-height').value;
      const width = document.getElementById('input-veh-width').value;
      const length = document.getElementById('input-veh-length').value;
      const weight = document.getElementById('input-veh-weight').value;
      const fuel = document.getElementById('input-veh-fuel').value;
      const zbe = document.getElementById('input-veh-zbe').value;

      document.getElementById('profile-vehicle-name').textContent = name;
      document.getElementById('badge-height').textContent = height + ' m';
      document.getElementById('badge-width').textContent = width + ' m';
      document.getElementById('badge-length').textContent = length + ' m';
      document.getElementById('badge-weight').textContent = Number(weight).toLocaleString() + ' kg';
      document.getElementById('badge-fuel').textContent = fuel;
      document.getElementById('badge-zbe').textContent = zbe;

      closeVehicleEditModal();
      speakAudio('Ficha técnica actualizada. Nuevo gálibo fijado en ' + height + ' metros.');
    }

    function selectOperationalMode(mode) {
      const modes = ['camper', 'truck', 'delivery'];
      modes.forEach(m => {
        const btn = document.getElementById('opmode-' + m);
        if (btn) {
          if (m === mode) {
            btn.className = 'w-full p-2.5 rounded-2xl bg-slate-900 border-2 border-emerald-500 text-left flex items-center justify-between';
            btn.querySelector('span:last-child').className = 'text-emerald-400 font-black text-xs';
            btn.querySelector('span:last-child').textContent = 'ACTIVO';
          } else {
            btn.className = 'w-full p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-left flex items-center justify-between hover:border-slate-700';
            btn.querySelector('span:last-child').className = 'text-slate-500 text-xs';
            btn.querySelector('span:last-child').textContent = 'Elegir';
          }
        }
      });

      const profileLabel = document.getElementById('profile-vehicle-type-label');
      if (mode === 'truck') {
        profileLabel.textContent = 'Pesados HGV • Tacógrafo UE 4h30m Activo';
        speakAudio('Modo camión pesado activado.');
      } else if (mode === 'delivery') {
        profileLabel.textContent = 'Courier Profesional • Ruta TSP Multi-parada';
        speakAudio('Modo courier profesional activado.');
      } else {
        profileLabel.textContent = 'Gran Volumen L3H2 • Modo Overlanding';
        speakAudio('Modo autocaravana y camper activado.');
      }
    }

    function selectSpotFromList() {
      switchTab('map');
      openCockpitDetailSheet();
    }
  </script>
</body>
</html>`;

fs.writeFileSync('/Users/mrhardcore/.gemini/antigravity/brain/f23618e2-02d8-46fa-84f8-d20990797bb4/camper_sites_preview.html', html);
fs.writeFileSync('/Users/mrhardcore/Desktop/campersites-pro/CamperSites-Pro/preview.html', html);
console.log('Preview HTML written to artifact and workspace root! Length:', html.length);
