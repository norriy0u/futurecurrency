// ─── STATE & UTILS ───────────────────────────────────────────────────────────
const slider = document.getElementById('year-slider');
const yearText = document.getElementById('year-text');
const eraText = document.getElementById('era-text');
const btnMint = document.getElementById('btn-mint');
const canvas = document.getElementById('banknote-canvas');
const ctx = canvas.getContext('2d');

let currentEra = "Digital Age";
let currentNoteData = null;

function updateEra() {
  const y = parseInt(slider.value);
  yearText.textContent = y;
  if(y < 2100) currentEra = "Digital Age 🌐";
  else if(y < 2500) currentEra = "Post-Nation Era 🌍";
  else if(y < 5000) currentEra = "Stellar Commonwealth 🌌";
  else currentEra = "The Remembering 🔮";
  eraText.textContent = currentEra;
}
slider.addEventListener('input', updateEra);
updateEra();

// ─── AUDIO ───────────────────────────────────────────────────────────────────
let aCtx, masterGain, ambientFilter;
let muted = false;

function initAudio() {
  if(aCtx) return;
  aCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = aCtx.createGain(); masterGain.gain.value = 0.2;
  masterGain.connect(aCtx.destination);
  
  // Ambient Pad
  const f1 = 261.63, f2 = 392.00, f3 = 523.25;
  ambientFilter = aCtx.createBiquadFilter(); ambientFilter.type = 'lowpass'; ambientFilter.frequency.value = 200;
  ambientFilter.connect(masterGain);
  
  [f1, f2, f3].forEach(f => {
    const o = aCtx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f;
    o.connect(ambientFilter); o.start();
  });
  
  setInterval(() => {
    if(aCtx.state === 'running' && !muted) {
      // Frequency shifts slightly based on era
      let target = 200;
      if(currentEra.includes("Digital")) target = 400 + Math.random()*200;
      else if(currentEra.includes("Post")) target = 300 + Math.random()*150;
      else if(currentEra.includes("Stellar")) target = 600 + Math.random()*400;
      else target = 100 + Math.random()*100;
      ambientFilter.frequency.setTargetAtTime(target, aCtx.currentTime, 2);
    }
  }, 3000);
}

function playMintSound() {
  if(!aCtx || muted) return;
  // Clunk
  const buff = aCtx.createBuffer(1, aCtx.sampleRate*0.2, aCtx.sampleRate);
  const data = buff.getChannelData(0);
  for(let i=0; i<data.length; i++) data[i] = Math.random()*2-1;
  const n = aCtx.createBufferSource(); n.buffer = buff;
  const f = aCtx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(200, aCtx.currentTime); f.frequency.exponentialRampToValueAtTime(20, aCtx.currentTime+0.2);
  const g = aCtx.createGain(); g.gain.setValueAtTime(1, aCtx.currentTime); g.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime+0.2);
  n.connect(f); f.connect(g); g.connect(masterGain); n.start();
  
  // Bell
  const o = aCtx.createOscillator(); o.type = 'sine'; o.frequency.value = 880;
  const og = aCtx.createGain(); og.gain.setValueAtTime(0.5, aCtx.currentTime); og.gain.exponentialRampToValueAtTime(0.01, aCtx.currentTime+1);
  o.connect(og); og.connect(masterGain); o.start(); o.stop(aCtx.currentTime+1);
}

document.getElementById('btn-mute').addEventListener('click', (e) => {
  initAudio();
  muted = !muted;
  masterGain.gain.setTargetAtTime(muted ? 0 : 0.2, aCtx.currentTime, 0.1);
  e.target.style.opacity = muted ? "0.2" : "1";
});
document.body.addEventListener('click', () => { if(aCtx && aCtx.state==='suspended') aCtx.resume(); }, {once:true});

// ─── API FETCHING ────────────────────────────────────────────────────────────
const fallbackJSON = {
  currencyName: "Aethel", denomination: "10,000 Aethel",
  ruler: { name: "Archon Sol-9", title: "Prime Synthesizer", era: "Unknown" },
  borderStyle: "geometric", dominantColor: "#1a2a3a", secondaryColor: "#d4af37",
  securityFeature: "Quantum entanglement thread that glows when exposed to temporal shifts.",
  serialNumber: "AET-∞-882-Δ", lore: "Replaced the fragile fiat systems. It buys entire atmospheric shifts on Mars.",
  exchangeRate: "1 Aethel = 42,000,000 INR", funFact: "It dissolves if handled by someone with malicious intent.",
  motto: "IN TEMPORE SPERAMUS", backDesign: "A hyper-cube expanding into the void."
};

btnMint.addEventListener('click', async () => {
  initAudio();
  document.getElementById('loader-overlay').classList.add('active');
  btnMint.disabled = true;
  
  const y = slider.value;
  const prompt = `You are the Future Currency Design Bureau. For the year ${y} (${currentEra}), design a banknote. Reply ONLY in JSON: {"currencyName": "name", "denomination": "number + unit", "ruler": {"name": "leader name", "title": "their cosmic title", "era": "${y}"}, "borderStyle": "geometric or organic or fractal or crystalline or neural", "dominantColor": "#hex", "secondaryColor": "#hex", "securityFeature": "anti-counterfeiting feature (15 words)", "serialNumber": "serial format", "lore": "story of what this buys (40 words)", "exchangeRate": "absurd exchange rate to today's rupee", "funFact": "absurd fact (20 words)", "motto": "motto printed on note (max 5 words)", "backDesign": "what is depicted on back (20 words)"}`;
  
  let data;
  try {
    const fetchP = fetch('https://text.pollinations.ai/', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], model: 'openai', jsonMode: true })
    });
    const timeout = new Promise((_, r) => setTimeout(()=>r(new Error("Timeout")), 15000));
    const res = await Promise.race([fetchP, timeout]);
    let text = await res.text();
    text = text.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
    
    let parsed = JSON.parse(text);
    if(parsed.choices && parsed.choices[0]?.message?.content) {
      let t = parsed.choices[0].message.content.replace(/```[a-z]*\n/gi, '').replace(/```/g, '').trim();
      data = JSON.parse(t);
    } else { data = parsed; }
    
    if(!data.currencyName || !data.borderStyle) throw new Error("Invalid format");
  } catch(e) {
    console.warn(e); data = fallbackJSON;
  }
  
  currentNoteData = data;
  animateMinting(data);
});

// ─── CANVAS RENDERING ────────────────────────────────────────────────────────
function animateMinting(data) {
  playMintSound();
  document.getElementById('loader-overlay').classList.remove('active');
  
  const w = canvas.width; const h = canvas.height;
  let progress = 0;
  
  // Pre-render to an offscreen canvas to allow wipe effect
  const offCanvas = document.createElement('canvas');
  offCanvas.width = w; offCanvas.height = h;
  drawBanknote(offCanvas.getContext('2d'), w, h, data);
  
  function step() {
    progress += 0.03;
    if(progress > 1) progress = 1;
    
    ctx.clearRect(0,0,w,h);
    
    // Wipe
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w * progress, h);
    ctx.clip();
    ctx.drawImage(offCanvas, 0, 0);
    
    // Scanline / Laser effect
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.fillRect(w * progress - 5, 0, 10, h);
    ctx.shadowColor = '#0ff'; ctx.shadowBlur = 20;
    ctx.fillRect(w * progress - 2, 0, 4, h);
    
    ctx.restore();
    
    if(progress < 1) requestAnimationFrame(step);
    else showResults(data);
  }
  requestAnimationFrame(step);
}

function drawBanknote(c, w, h, data) {
  // Bg
  c.fillStyle = data.dominantColor || '#222';
  c.fillRect(0, 0, w, h);
  
  // Noise
  const imgD = c.getImageData(0,0,w,h);
  for(let i=0; i<imgD.data.length; i+=4) {
    if(Math.random() < 0.3) {
      let v = Math.random()*20 - 10;
      imgD.data[i] = Math.max(0, Math.min(255, imgD.data[i]+v));
      imgD.data[i+1] = Math.max(0, Math.min(255, imgD.data[i+1]+v));
      imgD.data[i+2] = Math.max(0, Math.min(255, imgD.data[i+2]+v));
    }
  }
  c.putImageData(imgD, 0, 0);
  
  const sec = data.secondaryColor || '#d4af37';
  c.strokeStyle = sec; c.fillStyle = sec;
  
  // Guilloche Background Patterns
  c.save();
  c.translate(w/2, h/2);
  c.beginPath();
  for(let a=0; a<Math.PI*20; a+=0.05) {
    let r = 200 + 50*Math.sin(a*5) + 20*Math.cos(a*13);
    let x = r*Math.cos(a); let y = r*Math.sin(a);
    if(a===0) c.moveTo(x,y); else c.lineTo(x,y);
  }
  c.globalAlpha = 0.2; c.lineWidth = 1; c.stroke();
  c.restore();
  
  // Border based on style
  c.globalAlpha = 1;
  c.lineWidth = 3;
  c.strokeRect(20, 20, w-40, h-40);
  c.strokeRect(30, 30, w-60, h-60);
  
  if(data.borderStyle.includes('organic')) {
    c.beginPath();
    for(let x=30; x<w-30; x+=20) { c.lineTo(x, 30 + Math.sin(x/10)*10); }
    c.stroke();
  } else if(data.borderStyle.includes('fractal')) {
    for(let x=30; x<w-30; x+=40) { c.strokeRect(x, 30, 20, 20); c.strokeRect(x+5, 35, 10, 10); }
  } else {
    for(let x=30; x<w-30; x+=20) { c.beginPath(); c.arc(x, 40, 5, 0, Math.PI*2); c.stroke(); }
  }

  // Holographic strip
  let grad = c.createLinearGradient(w-100, 0, w-70, 0);
  grad.addColorStop(0, "rgba(255,0,0,0.5)");
  grad.addColorStop(0.33, "rgba(0,255,0,0.5)");
  grad.addColorStop(0.66, "rgba(0,0,255,0.5)");
  grad.addColorStop(1, "rgba(255,0,0,0.5)");
  c.fillStyle = grad;
  c.fillRect(w-100, 30, 30, h-60);
  
  // Portrait area
  c.fillStyle = sec;
  c.beginPath(); c.arc(200, h/2, 120, 0, Math.PI*2); c.fill();
  c.fillStyle = data.dominantColor;
  c.beginPath(); c.arc(200, h/2, 115, 0, Math.PI*2); c.fill();
  
  // Abstract face
  c.strokeStyle = sec; c.lineWidth = 2;
  c.beginPath(); c.ellipse(200, h/2 + 20, 50, 70, 0, 0, Math.PI*2); c.stroke(); // Head
  c.beginPath(); c.arc(180, h/2, 10, 0, Math.PI*2); c.stroke(); // Eye L
  c.beginPath(); c.arc(220, h/2, 10, 0, Math.PI*2); c.stroke(); // Eye R
  // Crown
  c.beginPath(); c.moveTo(150, h/2-30); c.lineTo(200, h/2-80); c.lineTo(250, h/2-30); c.stroke();
  
  c.fillStyle = sec;
  c.font = 'bold 20px "Space Mono"';
  c.textAlign = 'center';
  if(data.ruler) {
    c.fillText(data.ruler.name.toUpperCase(), 200, h/2 + 150);
  }

  // Texts
  c.textAlign = 'right';
  c.font = 'bold 80px "Cinzel Decorative"';
  c.fillText(data.denomination, w-130, 150);
  c.font = '30px "Space Mono"';
  c.fillText(data.currencyName.toUpperCase(), w-130, 200);
  
  c.textAlign = 'left';
  c.font = '20px "Space Mono"';
  c.fillText(data.serialNumber, 50, 80);
  c.textAlign = 'right';
  c.fillText(data.serialNumber, w-130, h-60);
  
  // Watermark
  c.save();
  c.translate(w/2, h/2);
  c.rotate(-Math.PI/6);
  c.fillStyle = 'rgba(255,255,255,0.05)';
  c.font = 'bold 100px "Cinzel Decorative"';
  c.textAlign = 'center';
  c.fillText("OFFICIAL TENDER", 0, 0);
  c.restore();
}

// ─── UI UPDATES ──────────────────────────────────────────────────────────────
function showResults(data) {
  const panel = document.getElementById('results-panel');
  panel.style.display = 'grid';
  
  document.getElementById('res-lore').textContent = data.lore;
  document.getElementById('res-exchange').textContent = data.exchangeRate;
  document.getElementById('res-security').textContent = data.securityFeature;
  document.getElementById('res-fact').textContent = data.funFact;
  document.getElementById('res-motto').textContent = data.motto;
  
  btnMint.disabled = false;
  btnMint.textContent = "MINT ANOTHER NOTE";
  
  saveToVault(canvas.toDataURL('image/png', 0.5));
}

// Actions
document.getElementById('btn-uv').addEventListener('click', () => {
  document.querySelector('.canvas-wrapper').classList.toggle('uv-active');
});

document.getElementById('btn-dl').addEventListener('click', () => {
  const a = document.createElement('a');
  a.download = `Banknote_${slider.value}_${currentNoteData?.currencyName || 'Unknown'}.png`;
  a.href = canvas.toDataURL('image/png');
  a.click();
});

// Vault
let vaultNotes = JSON.parse(localStorage.getItem('fc_vault') || '[]');
document.getElementById('stats-minted').textContent = `Notes authenticated: ${vaultNotes.length}`;

function saveToVault(dataUrl) {
  vaultNotes.unshift(dataUrl);
  if(vaultNotes.length > 10) vaultNotes.pop();
  localStorage.setItem('fc_vault', JSON.stringify(vaultNotes));
  document.getElementById('stats-minted').textContent = `Notes authenticated: ${vaultNotes.length}`;
  renderVault();
}

function renderVault() {
  if(vaultNotes.length === 0) return;
  document.getElementById('vault-section').style.display = 'block';
  const scroll = document.getElementById('vault-scroll');
  scroll.innerHTML = '';
  vaultNotes.forEach(url => {
    const d = document.createElement('div');
    d.className = 'vault-item';
    d.style.backgroundImage = `url(${url})`;
    scroll.appendChild(d);
  });
}
renderVault();
