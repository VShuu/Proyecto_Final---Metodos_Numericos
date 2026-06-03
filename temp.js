/**
 * ═══════════════════════════════════════════════════════════
 *  LA PAZ EN CRISIS · Métodos Numéricos
 *  script.js — Todos los escenarios implementados
 * ═══════════════════════════════════════════════════════════
 */

'use strict';

/* ─── Chart.js global defaults ─── */
function setChartDefaults() {
  Chart.defaults.color = '#9a9280';
  Chart.defaults.borderColor = '#3d3828';
  Chart.defaults.font.family = "'DM Mono', monospace";
  Chart.defaults.font.size = 11;
}
setChartDefaults();

/* ─── Utilidades ─── */
const $ = id => document.getElementById(id);
const fmt = (n, d = 6) => (typeof n === 'number' ? n.toFixed(d) : String(n));
const fmtE = (n, d = 4) => (typeof n === 'number' ? n.toExponential(d) : String(n));

/** Destruye un chart anterior si existe y crea uno nuevo */
const chartInstances = {};
function makeChart(id, config) {
  if (chartInstances[id]) chartInstances[id].destroy();
  const ctx = $(id);
  if (!ctx) return;
  chartInstances[id] = new Chart(ctx, config);
  return chartInstances[id];
}

/** Construye tabla HTML genérica */
function buildTable(headers, rows, highlightLast = false) {
  const th = headers.map(h => `<th>${h}</th>`).join('');
  const trs = rows.map((r, i) => {
    const cls = (highlightLast && i === rows.length - 1) ? ' class="highlight"' : '';
    const tds = r.map(c => `<td>${c}</td>`).join('');
    return `<tr${cls}>${tds}</tr>`;
  });
  return `<div class="iter-table-wrap">
    <table class="iter-table">
      <thead><tr>${th}</tr></thead>
      <tbody>${trs.join('')}</tbody>
    </table>
  </div>`;
}

/** Muestra mensaje de error */
function showError(containerId, msg) {
  $(containerId).innerHTML = `<div class="error-msg">⚠ ${msg}</div>`;
}

/* ══════════════════════════════════════════════════════════
   NAV TOGGLE
   ══════════════════════════════════════════════════════════ */
$('navToggle').addEventListener('click', () => {
  $('mainNav').classList.toggle('open');
});

/* ══════════════════════════════════════════════════════════
   TABS
   ══════════════════════════════════════════════════════════ */
function showTab(scenarioId, tabKey) {
  // Desactivar todos los tabs del escenario
  const area = $(`escenario-${scenarioId}`);
  area.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  area.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  // Activar el seleccionado
  $(`${scenarioId}-tab-${tabKey}`).classList.add('active');
  // Marcar botón activo
  const btns = area.querySelectorAll('.tab-btn');
  btns.forEach(b => {
    if (b.getAttribute('onclick').includes(`'${tabKey}'`)) b.classList.add('active');
  });
}

/* ══════════════════════════════════════════════════════════
   ÁLGEBRA LINEAL — utilidades comunes
   ══════════════════════════════════════════════════════════ */

/** Copia profunda de matriz */
function matCopy(A) { return A.map(r => [...r]); }

/** Multiplica matriz × vector */
function matVec(A, x) {
  return A.map(row => row.reduce((s, a, j) => s + a * x[j], 0));
}

/** Norma euclidiana */
function norm(v) { return Math.sqrt(v.reduce((s, vi) => s + vi * vi, 0)); }

/** Diferencia entre vectores */
function vecDiff(a, b) { return a.map((ai, i) => ai - b[i]); }

/**
 * Descomposición LU sin pivoteo
 * Devuelve { L, U } o null si es singular
 */
function luDecomp(A) {
  const n = A.length;
  const L = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)));
  const U = matCopy(A);

  for (let k = 0; k < n; k++) {
    if (Math.abs(U[k][k]) < 1e-14) return null;
    for (let i = k + 1; i < n; i++) {
      const factor = U[i][k] / U[k][k];
      L[i][k] = factor;
      for (let j = k; j < n; j++) {
        U[i][j] -= factor * U[k][j];
      }
    }
  }
  return { L, U };
}

/** Sustitución hacia adelante Ly = b */
function forwardSub(L, b) {
  const n = b.length;
  const y = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = b[i];
    for (let j = 0; j < i; j++) s -= L[i][j] * y[j];
    y[i] = s / L[i][i];
  }
  return y;
}

/** Sustitución hacia atrás Ux = y */
function backSub(U, y) {
  const n = y.length;
  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = y[i];
    for (let j = i + 1; j < n; j++) s -= U[i][j] * x[j];
    x[i] = s / U[i][i];
  }
  return x;
}

/** Resolver Ax = b con LU */
function luSolve(A, b) {
  const lu = luDecomp(A);
  if (!lu) return null;
  const y = forwardSub(lu.L, b);
  return backSub(lu.U, y);
}

/* ══════════════════════════════════════════════════════════
   ESCENARIO A — Sistema lineal de distribución
   ══════════════════════════════════════════════════════════ */

let matrixA_data = null; // { n, A, b }

/** Construye la interfaz de entrada de la matriz */
function buildMatrixA() {
  const n = parseInt($('a-size').value);
  if (n < 2 || n > 5) { alert('n debe estar entre 2 y 5'); return; }

  let html = '';

  // Matriz A
  html += `<div class="matrix-section"><h4>Matriz A (coeficientes de red)</h4>
    <div class="matrix-grid" style="grid-template-columns:repeat(${n},80px)">`;
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      html += `<input type="number" id="a-m-${i}-${j}" value="${i===j?10:-(1/(n-1)).toFixed(2)}" step="0.01"/>`;
  html += '</div></div>';

  // Vector b
  html += `<div class="matrix-section"><h4>Vector b (demandas por zona)</h4>
    <div class="matrix-grid" style="grid-template-columns:repeat(${n},80px)">`;
  for (let i = 0; i < n; i++)
    html += `<input type="number" id="a-b-${i}" value="${(50 + i * 10)}" step="0.01"/>`;
  html += '</div></div>';

  // Zonass
  html += `<div class="matrix-section"><h4>Nombres de zonas (opcional)</h4>
    <div class="matrix-grid" style="grid-template-columns:repeat(${n},140px)">`;
  const defaultZones = ['El Alto','Miraflores','Sopocachi','San Pedro','Zona Sur'];
  for (let i = 0; i < n; i++)
    html += `<input type="text" id="a-zone-${i}" value="${defaultZones[i] || 'Zona '+(i+1)}" />`;
  html += '</div></div>';

  $('a-matrix-builder').innerHTML = html;
  matrixA_data = null;
}

/** Carga el ejemplo de La Paz */
function loadExampleA() {
  $('a-size').value = 3;
  buildMatrixA();
  // Sistema diagonal dominante: red de 3 zonas
  const A = [[8, -1, -1], [-1, 9, -2], [-1, -2, 10]];
  const b = [60, 80, 100];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) $(`a-m-${i}-${j}`).value = A[i][j];
    $(`a-b-${i}`).value = b[i];
  }
  $('a-omega').value = 1.2;
}

/** Lee la matriz del formulario */
function readMatrixA() {
  const n = parseInt($('a-size').value);
  const A = [], b = [], zones = [];
  for (let i = 0; i < n; i++) {
    A.push([]);
    for (let j = 0; j < n; j++) {
      const el = $(`a-m-${i}-${j}`);
      if (!el) throw new Error('Genera la matriz primero.');
      A[i].push(parseFloat(el.value) || 0);
    }
    b.push(parseFloat($(`a-b-${i}`).value) || 0);
    zones.push($(`a-zone-${i}`)?.value || `Zona ${i + 1}`);
  }
  return { n, A, b, zones };
}

/* ── Jacobi ── */
function jacobiMethod(A, b, tol, maxIter) {
  const n = b.length;
  let x = new Array(n).fill(0);
  const rows = [];
  let converged = false;

  for (let k = 0; k < maxIter; k++) {
    const xNew = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) if (j !== i) s -= A[i][j] * x[j];
      xNew[i] = s / A[i][i];
    }
    const err = norm(vecDiff(xNew, x));
    rows.push({ k: k + 1, x: [...xNew], err });
    x = xNew;
    if (err < tol) { converged = true; break; }
  }
  return { x, rows, converged };
}

/* ── Gauss-Seidel ── */
function gaussSeidelMethod(A, b, tol, maxIter) {
  const n = b.length;
  let x = new Array(n).fill(0);
  const rows = [];
  let converged = false;

  for (let k = 0; k < maxIter; k++) {
    const xOld = [...x];
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) if (j !== i) s -= A[i][j] * x[j];
      x[i] = s / A[i][i];
    }
    const err = norm(vecDiff(x, xOld));
    rows.push({ k: k + 1, x: [...x], err });
    if (err < tol) { converged = true; break; }
  }
  return { x, rows, converged };
}

/* ── SOR ── */
function sorMethod(A, b, omega, tol, maxIter) {
  const n = b.length;
  let x = new Array(n).fill(0);
  const rows = [];
  let converged = false;

  for (let k = 0; k < maxIter; k++) {
    const xOld = [...x];
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let j = 0; j < n; j++) if (j !== i) s -= A[i][j] * x[j];
      const xGS = s / A[i][i];
      x[i] = omega * xGS + (1 - omega) * xOld[i];
    }
    const err = norm(vecDiff(x, xOld));
    rows.push({ k: k + 1, x: [...x], err });
    if (err < tol) { converged = true; break; }
  }
  return { x, rows, converged };
}

/* ── Gradiente Conjugado ── */
function conjugateGradient(A, b, tol, maxIter) {
  const n = b.length;
  let x = new Array(n).fill(0);
  let r = vecDiff(b, matVec(A, x));
  let p = [...r];
  let rsOld = r.reduce((s, ri) => s + ri * ri, 0);
  const rows = [];
  let converged = false;

  for (let k = 0; k < maxIter; k++) {
    const Ap = matVec(A, p);
    const pAp = p.reduce((s, pi, i) => s + pi * Ap[i], 0);
    if (Math.abs(pAp) < 1e-15) break;
    const alpha = rsOld / pAp;
    x = x.map((xi, i) => xi + alpha * p[i]);
    r = r.map((ri, i) => ri - alpha * Ap[i]);
    const rsNew = r.reduce((s, ri) => s + ri * ri, 0);
    const err = Math.sqrt(rsNew);
    rows.push({ k: k + 1, x: [...x], err });
    if (err < tol) { converged = true; break; }
    const beta = rsNew / rsOld;
    p = r.map((ri, i) => ri + beta * p[i]);
    rsOld = rsNew;
  }
  return { x, rows, converged };
}

/** Renderiza resultado de un método iterativo */
function renderIterResult(containerId, label, result, zones) {
  const { x, rows, converged } = result;
  const badge = converged
    ? `<span class="converged">✓ Convergió en ${rows.length} iter.</span>`
    : `<span class="diverged">✗ No convergió en ${rows.length} iter.</span>`;

  let html = `<h4 style="font-family:var(--sans);color:var(--ocre-light);margin-bottom:.75rem">${label} ${badge}</h4>`;

  // Solución
  html += `<div class="result-summary">`;
  x.forEach((xi, i) => {
    html += `<div class="result-item"><label>Flujo → ${zones[i]}</label>
      <div class="val">${xi.toFixed(4)} ton/día</div></div>`;
  });
  html += '</div>';

  // Tabla de iteraciones (máx 30 filas)
  const displayed = rows.slice(0, 30);
  const headers = ['Iter.', ...zones.map(z => `x(${z.split(' ')[0]})`), 'Error ‖Δx‖'];
  const tableRows = displayed.map(r => [
    r.k,
    ...r.x.map(v => v.toFixed(5)),
    fmtE(r.err)
  ]);
  html += buildTable(headers, tableRows, true);
  if (rows.length > 30) html += `<p style="font-family:var(--mono);font-size:.72rem;color:var(--text-muted)">... mostrando 30 de ${rows.length} iteraciones.</p>`;

  $(containerId).innerHTML = html;
}

/** Renderiza LU */
function renderLUResult(containerId, A, b, zones) {
  const lu = luDecomp(A);
  if (!lu) { showError(containerId, 'Matriz singular — no se puede descomponer.'); return; }
  const x = luSolve(A, b);

  let html = `<h4 style="font-family:var(--sans);color:var(--ocre-light);margin-bottom:.75rem">
    Descomposición LU <span class="converged">✓ Solución exacta</span></h4>`;

  html += `<div class="result-summary">`;
  x.forEach((xi, i) => {
    html += `<div class="result-item"><label>Flujo → ${zones[i]}</label>
      <div class="val">${xi.toFixed(4)} ton/día</div></div>`;
  });
  html += '</div>';

  // Matriz L
  const n = A.length;
  html += `<p style="font-family:var(--mono);font-size:.78rem;color:var(--text-dim);margin-top:1rem">Matriz L:</p>`;
  html += buildTable(
    ['', ...zones],
    lu.L.map((row, i) => [zones[i], ...row.map(v => v.toFixed(4))])
  );
  html += `<p style="font-family:var(--mono);font-size:.78rem;color:var(--text-dim);margin-top:.75rem">Matriz U:</p>`;
  html += buildTable(
    ['', ...zones],
    lu.U.map((row, i) => [zones[i], ...row.map(v => v.toFixed(4))])
  );

  $(containerId).innerHTML = html;
}

function runScenarioA() {
  let data;
  try { data = readMatrixA(); } catch (e) { alert(e.message); return; }

  const { n, A, b, zones } = data;
  const tol = parseFloat($('a-tol').value) || 1e-4;
  const maxIter = parseInt($('a-maxiter').value) || 100;
  const omega = parseFloat($('a-omega').value) || 1.25;

  // Resolver con todos los métodos
  renderLUResult('a-lu-result', A, b, zones);

  const jac = jacobiMethod(A, b, tol, maxIter);
  renderIterResult('a-jacobi-result', 'Jacobi', jac, zones);

  const gs = gaussSeidelMethod(A, b, tol, maxIter);
  renderIterResult('a-gs-result', 'Gauss-Seidel', gs, zones);

  const sor = sorMethod(A, b, omega, tol, maxIter);
  renderIterResult('a-sor-result', `SOR (ω=${omega})`, sor, zones);

  const cg = conjugateGradient(A, b, tol, maxIter);
  renderIterResult('a-cg-result', 'Gradiente Conjugado', cg, zones);

  // Gráfico de convergencia
  const maxLen = Math.max(jac.rows.length, gs.rows.length, sor.rows.length, cg.rows.length);
  const labels = Array.from({ length: maxLen }, (_, i) => i + 1);
  const errOf = rows => labels.map(l => {
    const r = rows.find(r => r.k === l);
    return r ? r.err : null;
  });

  makeChart('chartA', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Jacobi',           data: errOf(jac.rows), borderColor: '#c8922a', fill: false, tension: 0.3, pointRadius: 2 },
        { label: 'Gauss-Seidel',     data: errOf(gs.rows),  borderColor: '#4caf82', fill: false, tension: 0.3, pointRadius: 2 },
        { label: `SOR ω=${omega}`,   data: errOf(sor.rows), borderColor: '#5b9bd5', fill: false, tension: 0.3, pointRadius: 2 },
        { label: 'Grad. Conjugado',  data: errOf(cg.rows),  borderColor: '#d94f3b', fill: false, tension: 0.3, pointRadius: 2 },
      ]
    },
    options: {
      scales: {
        x: { title: { display: true, text: 'Iteración' } },
        y: { type: 'logarithmic', title: { display: true, text: '‖Δx‖ (escala log)' } }
      },
      plugins: { legend: { position: 'top' }, title: { display: true, text: 'Convergencia de Métodos Iterativos — Red de Distribución' } },
      responsive: true, maintainAspectRatio: true
    }
  });

  // Interpretación automática
  const luX = luSolve(A, b);
  const zonaCritica = luX ? zones[luX.indexOf(Math.max(...luX))] : zones[0];
  const jacIter = jac.converged ? jac.rows.length : '—';
  const gsIter  = gs.converged  ? gs.rows.length  : '—';
  const sorIter = sor.converged ? sor.rows.length  : '—';
  const cgIter  = cg.converged  ? cg.rows.length   : '—';

  $('a-interpretation').innerHTML = `
    <h4>📊 Interpretación Automática — Red de Abastecimiento</h4>
    <ul>
      <li><strong>Cuánto enviar a cada zona:</strong> ${luX ? zones.map((z,i)=>`${z}: <strong>${luX[i].toFixed(2)} ton/día</strong>`).join(', ') : 'Ver resultados LU.'}</li>
      <li><strong>Zona más afectada:</strong> <strong>${zonaCritica}</strong> requiere el mayor flujo; si una ruta a esta zona se bloquea, el déficit será mayor.</li>
      <li><strong>Qué ocurre con bloqueo:</strong> Al anular una columna de A (ruta cortada), el sistema puede volverse inconsistente o requerir redistribuir hacia rutas alternativas.</li>
      <li><strong>Estabilidad:</strong> Un sistema diagonal dominante (como éste) garantiza convergencia de Jacobi y Gauss-Seidel. El radio espectral ρ < 1 es la condición clave.</li>
      <li><strong>Sensibilidad a demanda:</strong> Un aumento del 10% en b_i requiere resolver el mismo sistema con b modificado — la solución cambia proporcionalmente al inverso de A.</li>
      <li><strong>Velocidad de convergencia (iteraciones hasta tolerancia ${tol}):</strong>
        Jacobi: ${jacIter} · Gauss-Seidel: ${gsIter} · SOR: ${sorIter} · Grad.Conj.: ${cgIter}</li>
      <li><strong>Conclusión:</strong> SOR con ω óptimo suele superar a Gauss-Seidel, especialmente en redes grandes. LU provee la solución exacta de referencia.</li>
    </ul>`;

  $('a-results').style.display = 'block';
  $('a-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════════════════════
   ESCENARIO B — ODE de reservas de combustible
   ══════════════════════════════════════════════════════════ */

function loadExampleB() {
  $('b-r0').value      = 50000;
  $('b-entrada').value = 3000;
  $('b-consumo').value = 5500;
  $('b-dias').value    = 30;
  $('b-critico').value = 10000;
  $('b-h').value       = 1;
}

function runScenarioB() {
  const R0     = parseFloat($('b-r0').value);
  const E      = parseFloat($('b-entrada').value);
  const C      = parseFloat($('b-consumo').value);
  const dias   = parseInt($('b-dias').value);
  const Rc     = parseFloat($('b-critico').value);
  const h      = parseFloat($('b-h').value);

  if (isNaN(R0) || isNaN(E) || isNaN(C) || isNaN(dias)) {
    alert('Por favor completa todos los campos.'); return;
  }

  // f(t, R) = E - C (sistema estacionario; se puede extender a f(t))
  const f = (t, R) => E - C;

  // Euler
  const euler = [{ t: 0, R: R0 }];
  for (let i = 0; i < dias; i++) {
    const { t, R } = euler[euler.length - 1];
    const Rn = R + h * f(t, R);
    euler.push({ t: +(t + h).toFixed(6), R: Rn });
  }

  // Heun (Euler mejorado — predictor-corrector)
  const heun = [{ t: 0, R: R0 }];
  for (let i = 0; i < dias; i++) {
    const { t, R } = heun[heun.length - 1];
    const k1 = f(t, R);
    const Rpred = R + h * k1;
    const k2 = f(t + h, Rpred);
    const Rn = R + (h / 2) * (k1 + k2);
    heun.push({ t: +(t + h).toFixed(6), R: Rn });
  }

  // RK4
  const rk4 = [{ t: 0, R: R0 }];
  for (let i = 0; i < dias; i++) {
    const { t, R } = rk4[rk4.length - 1];
    const k1 = f(t, R);
    const k2 = f(t + h/2, R + h/2*k1);
    const k3 = f(t + h/2, R + h/2*k2);
    const k4 = f(t + h,   R + h*k3);
    const Rn = R + (h/6)*(k1 + 2*k2 + 2*k3 + k4);
    rk4.push({ t: +(t + h).toFixed(6), R: Rn });
  }

  // Encontrar cuándo llega al nivel crítico
  const findCritical = series => {
    for (let i = 1; i < series.length; i++) {
      if (series[i].R <= Rc) return series[i].t;
    }
    return null;
  };

  const tcEuler = findCritical(euler);
  const tcHeun  = findCritical(heun);
  const tcRK4   = findCritical(rk4);
  const critStr = t => t !== null ? `Día ${t.toFixed(1)}` : 'No alcanza nivel crítico';

  // Gráfico
  const labels = euler.map(p => p.t.toFixed(1));
  makeChart('chartB', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Euler',      data: euler.map(p=>p.R), borderColor:'#c8922a', fill:false, tension:.3, pointRadius:0, borderWidth:2 },
        { label: 'Heun',       data: heun.map(p=>p.R),  borderColor:'#4caf82', fill:false, tension:.3, pointRadius:0, borderWidth:2 },
        { label: 'RK4',        data: rk4.map(p=>p.R),   borderColor:'#5b9bd5', fill:false, tension:.3, pointRadius:0, borderWidth:2.5 },
        { label: `Nivel crítico (${Rc.toLocaleString()} L)`,
          data: labels.map(()=>Rc), borderColor:'#d94f3b', borderDash:[6,3], fill:false, pointRadius:0, borderWidth:1.5 },
      ]
    },
    options: {
      scales: {
        x: { title:{ display:true, text:'Días' } },
        y: { title:{ display:true, text:'Reserva (litros)' } }
      },
      plugins: { legend:{position:'top'}, title:{display:true, text:'Evolución de Reservas de Combustible — La Paz'} },
      responsive:true, maintainAspectRatio:true
    }
  });

  // Tabla comparativa
  const headers = ['Día', 'Euler (L)', 'Heun (L)', 'RK4 (L)', 'Dif. Euler−RK4', 'Dif. Heun−RK4'];
  const tableRows = euler.map((e, i) => {
    const Hrk = rk4[i].R;
    const Heu = heun[i].R;
    const Heu_e = euler[i].R;
    return [
      e.t.toFixed(1),
      Heu_e.toFixed(2),
      Heu.toFixed(2),
      Hrk.toFixed(2),
      (Heu_e - Hrk).toFixed(4),
      (Heu   - Hrk).toFixed(4)
    ];
  });
  $('b-table').innerHTML = buildTable(headers, tableRows);

  // Interpretación
  const deficit = C - E;
  const diasAgotamiento = deficit > 0 ? (R0 - Rc) / deficit : Infinity;

  $('b-interpretation').innerHTML = `
    <h4>⛽ Interpretación — Crisis de Combustible en La Paz</h4>
    <ul>
      <li><strong>Balance diario:</strong> Entrada ${E.toLocaleString()} L/día − Consumo ${C.toLocaleString()} L/día = 
        <strong>${deficit >= 0 ? '+' : ''}${(-deficit).toLocaleString()} L/día ${deficit > 0 ? 'de déficit' : 'de superávit'}</strong>.</li>
      <li><strong>Cuándo llega al nivel crítico (${Rc.toLocaleString()} L):</strong>
        Euler: ${critStr(tcEuler)} · Heun: ${critStr(tcHeun)} · RK4: ${critStr(tcRK4)}.</li>
      <li><strong>Efecto de aumentar consumo:</strong> Cada 1 000 L/día adicionales de consumo reduce el tiempo al nivel crítico en ≈ ${(1000 / deficit || 1).toFixed(1)} días.</li>
      <li><strong>Efecto de disminuir abastecimiento:</strong> Reducir la entrada a la mitad duplica el ritmo de vaciado.</li>
      <li><strong>Euler vs Heun vs RK4:</strong> Para este sistema lineal, los tres métodos dan prácticamente el mismo resultado (la ecuación es f = cte). En sistemas no lineales, RK4 es el más preciso (error O(h⁵)), Heun intermedio (O(h³)), Euler el menos preciso (O(h²)).</li>
      <li><strong>Conclusión social:</strong> ${deficit > 0 ? `Con el ritmo actual, La Paz alcanzará el nivel de alarma aproximadamente en el día ${diasAgotamiento.toFixed(0)}, generando colas, especulación y alza de precios en toda la cadena productiva.` : 'El abastecimiento actual supera al consumo; la reserva es estable.'}</li>
    </ul>`;

  $('b-results').style.display = 'block';
  $('b-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════════════════════
   ESCENARIO C — Interpolación de precios
   ══════════════════════════════════════════════════════════ */

function addPoint() {
  const container = $('c-points-container');
  if (container.children.length >= 10) { alert('Máximo 10 puntos.'); return; }
  const row = document.createElement('div');
  row.className = 'point-row';
  row.innerHTML = `<input type="number" placeholder="Día" class="c-day" value="0"/>
    <input type="number" placeholder="Precio Bs." class="c-price" value="0" step="0.01"/>
    <button class="btn-remove" onclick="removePoint(this)">✕</button>`;
  container.appendChild(row);
}

function removePoint(btn) {
  const container = $('c-points-container');
  if (container.children.length <= 3) { alert('Mínimo 3 puntos.'); return; }
  btn.parentElement.remove();
}

function loadExampleC() {
  $('c-points-container').innerHTML = '';
  const datos = [[0,8.5],[3,8.8],[7,10.2],[10,12.5],[14,13.8],[18,12.1],[22,11.5]];
  datos.forEach(([d,p]) => {
    const row = document.createElement('div');
    row.className = 'point-row';
    row.innerHTML = `<input type="number" class="c-day" value="${d}"/>
      <input type="number" class="c-price" value="${p}" step="0.01"/>
      <button class="btn-remove" onclick="removePoint(this)">✕</button>`;
    $('c-points-container').appendChild(row);
  });
  $('c-eval').value = 12;
}

function readPointsC() {
  const days = [...document.querySelectorAll('.c-day')].map(i => parseFloat(i.value));
  const prices = [...document.querySelectorAll('.c-price')].map(i => parseFloat(i.value));
  if (days.some(isNaN) || prices.some(isNaN)) throw new Error('Todos los campos deben ser números.');
  if (new Set(days).size !== days.length) throw new Error('Los días deben ser distintos.');
  // Ordenar por día
  const pts = days.map((d, i) => ({ d, p: prices[i] })).sort((a, b) => a.d - b.d);
  return { xs: pts.map(p => p.d), ys: pts.map(p => p.p) };
}

/* ── Lagrange ── */
function lagrange(xs, ys, x) {
  const n = xs.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let term = ys[i];
    for (let j = 0; j < n; j++) {
      if (j !== i) term *= (x - xs[j]) / (xs[i] - xs[j]);
    }
    result += term;
  }
  return result;
}

/* ── Diferencias divididas (Newton) ── */
function dividedDiff(xs, ys) {
  const n = xs.length;
  const table = ys.map(y => [y]);
  for (let j = 1; j < n; j++) {
    for (let i = 0; i < n - j; i++) {
      table[i].push((table[i+1][j-1] - table[i][j-1]) / (xs[i+j] - xs[i]));
    }
  }
  return table[0]; // coeficientes de Newton
}

function newtonInterp(xs, coefs, x) {
  const n = coefs.length;
  let result = coefs[n - 1];
  for (let i = n - 2; i >= 0; i--) {
    result = result * (x - xs[i]) + coefs[i];
  }
  return result;
}

/* ── Splines Cúbicos (naturales) ── */
function cubicSpline(xs, ys) {
  const n = xs.length;
  const h = xs.map((x, i) => i < n-1 ? xs[i+1] - x : 0);

  // Sistema tridiagonal para los c_i
  const A = Array.from({length:n}, () => new Array(n).fill(0));
  const rhs = new Array(n).fill(0);
  A[0][0] = 1;
  A[n-1][n-1] = 1;
  for (let i = 1; i < n - 1; i++) {
    A[i][i-1] = h[i-1];
    A[i][i]   = 2*(h[i-1]+h[i]);
    A[i][i+1] = h[i];
    rhs[i] = 3*((ys[i+1]-ys[i])/h[i] - (ys[i]-ys[i-1])/h[i-1]);
  }
  const c = luSolve(A, rhs) || new Array(n).fill(0);

  // Calcular b y d
  const b = [], d = [];
  for (let i = 0; i < n - 1; i++) {
    b.push((ys[i+1]-ys[i])/h[i] - h[i]*(2*c[i]+c[i+1])/3);
    d.push((c[i+1]-c[i])/(3*h[i]));
  }
  return { a:ys, b, c, d, xs };
}

function evalSpline(spline, x) {
  const { a, b, c, d, xs } = spline;
  const n = xs.length;
  let seg = n - 2;
  for (let i = 0; i < n - 1; i++) {
    if (x >= xs[i] && x <= xs[i+1]) { seg = i; break; }
  }
  const dx = x - xs[seg];
  return a[seg] + b[seg]*dx + c[seg]*dx*dx + d[seg]*dx*dx*dx;
}

function runScenarioC() {
  let pts;
  try { pts = readPointsC(); } catch(e) { alert(e.message); return; }
  const { xs, ys } = pts;
  const xEval = parseFloat($('c-eval').value);

  const coefs = dividedDiff([...xs], [...ys]);
  const spline = cubicSpline([...xs], [...ys]);

  const lagEval    = lagrange(xs, ys, xEval);
  const newtonEval = newtonInterp(xs, coefs, xEval);
  const splineEval = evalSpline(spline, xEval);

  // Generar curva densa
  const xMin = xs[0], xMax = xs[xs.length-1];
  const steps = 200;
  const denseX = Array.from({length:steps+1}, (_,i) => xMin + (xMax-xMin)*i/steps);
  const lagCurve    = denseX.map(x => lagrange(xs, ys, x));
  const newtonCurve = denseX.map(x => newtonInterp(xs, coefs, x));
  const splineCurve = denseX.map(x => evalSpline(spline, x));

  // Gráfico
  makeChart('chartC', {
    type: 'line',
    data: {
      labels: denseX.map(x => x.toFixed(1)),
      datasets: [
        { label: 'Lagrange',  data: lagCurve,    borderColor:'#c8922a', fill:false, tension:0, pointRadius:0, borderWidth:2 },
        { label: 'Newton',    data: newtonCurve, borderColor:'#5b9bd5', fill:false, tension:0, pointRadius:0, borderWidth:2, borderDash:[4,3] },
        { label: 'Spline',    data: splineCurve, borderColor:'#4caf82', fill:false, tension:0, pointRadius:0, borderWidth:2.5 },
        { label: 'Datos reales', data: null,
          borderColor:'#e8b355', pointBackgroundColor:'#e8b355',
          showLine: false, pointRadius: 6,
          type:'scatter', data: xs.map((x,i)=>({x, y:ys[i]}))
        }
      ]
    },
    options: {
      scales: {
        x: { title:{display:true,text:'Días'} },
        y: { title:{display:true,text:'Precio (Bs.)'} }
      },
      plugins: { legend:{position:'top'}, title:{display:true,text:'Interpolación de Precios de Canasta Básica — La Paz'} },
      responsive:true, maintainAspectRatio:true
    }
  });

  // Tabla de coeficientes de diferencias divididas
  const ddHeaders = ['x_i', 'f[·]', 'f[·,·]', 'f[·,·,·]', '...'];
  const ddRows = xs.map((x, i) => {
    const row = [x.toFixed(2)];
    const table2 = dividedDiffTable(xs, ys);
    for (let j = 0; j < Math.min(4, xs.length - i); j++) {
      row.push(table2[i] && table2[i][j] !== undefined ? table2[i][j].toFixed(5) : '—');
    }
    return row;
  });
  $('c-table').innerHTML = `
    <div class="result-summary">
      <div class="result-item"><label>Lagrange en día ${xEval}</label><div class="val">${lagEval.toFixed(4)} Bs.</div></div>
      <div class="result-item"><label>Newton en día ${xEval}</label><div class="val">${newtonEval.toFixed(4)} Bs.</div></div>
      <div class="result-item"><label>Spline en día ${xEval}</label><div class="val">${splineEval.toFixed(4)} Bs.</div></div>
      <div class="result-item"><label>Diferencia Lagrange−Spline</label><div class="val">${Math.abs(lagEval - splineEval).toFixed(6)} Bs.</div></div>
    </div>
    ${buildTable(['Día x_i','Precio y_i','Lagrange(x_i)','Spline(x_i)','Error L−S'],
      xs.map((x,i)=>[
        x, ys[i].toFixed(2),
        lagrange(xs,ys,x).toFixed(4),
        evalSpline(spline,x).toFixed(4),
        Math.abs(lagrange(xs,ys,x)-evalSpline(spline,x)).toExponential(3)
      ])
    )}`;

  // Interpretación
  const trend = ys[ys.length-1] > ys[0] ? 'alcista (inflación)' : 'bajista (deflación post-crisis)';
  $('c-interpretation').innerHTML = `
    <h4>🛒 Interpretación — Curva de Precios Alimentos La Paz</h4>
    <ul>
      <li><strong>Precio estimado en día ${xEval}:</strong> Lagrange: <strong>${lagEval.toFixed(2)} Bs.</strong> · Newton: <strong>${newtonEval.toFixed(2)} Bs.</strong> · Spline: <strong>${splineEval.toFixed(2)} Bs.</strong></li>
      <li><strong>Comportamiento de la curva:</strong> Tendencia general ${trend}. La variación mayor ocurre alrededor del día ${xs[ys.indexOf(Math.max(...ys))]}.</li>
      <li><strong>Confiabilidad:</strong> Los Splines Cúbicos son los más confiables para datos reales (suaves, sin oscilaciones de Runge). Lagrange y Newton son equivalentes en exactitud pero pueden oscilar en los extremos con muchos puntos.</li>
      <li><strong>Efecto de datos dispersos:</strong> Con pocos puntos bien distribuidos, Lagrange oscila menos. Con puntos muy cercanos o muy lejanos, los Splines mantienen mayor suavidad.</li>
      <li><strong>Conclusión económica:</strong> El pico de precios refleja el momento más agudo del desabastecimiento. Los Splines permiten identificar la pendiente (tasa de cambio de precio por día) con mayor precisión que los polinomios globales.</li>
    </ul>`;

  $('c-results').style.display = 'block';
  $('c-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Tabla completa de diferencias divididas */
function dividedDiffTable(xs, ys) {
  const n = xs.length;
  const table = ys.map(y => [y]);
  for (let j = 1; j < n; j++)
    for (let i = 0; i < n - j; i++)
      table[i].push((table[i+1][j-1] - table[i][j-1]) / (xs[i+j] - xs[i]));
  return table;
}

/* ══════════════════════════════════════════════════════════
   ESCENARIO D — Integración numérica (poder adquisitivo)
   ══════════════════════════════════════════════════════════ */

function buildDTable() {
  const n = parseInt($('d-ndays').value);
  if (n < 4) { alert('Mínimo 4 días.'); return; }
  const container = $('d-points-container');

  // Conservar header
  container.innerHTML = `<div class="d-header-row"><span>Día</span><span>Precio (Bs./kg)</span><span>Consumo (kg/día)</span><span></span></div>`;

  const priceSample = [8.5,9.0,9.5,10.2,11.0,11.5,12.0,12.5,13.0,13.5,13.0,12.5,12.0,11.8,11.5,11.2,11.0,10.8,10.5,10.2,10.0,9.8,9.5,9.2,9.0,8.8,8.6,8.5,8.4,8.3];
  const consumoSample = [1.5,1.5,1.4,1.4,1.3,1.3,1.2,1.2,1.2,1.1,1.2,1.3,1.4,1.4,1.5,1.5,1.5,1.5,1.6,1.6,1.6,1.7,1.7,1.8,1.8,1.8,1.9,1.9,2.0,2.0];

  for (let i = 0; i < n; i++) {
    const row = document.createElement('div');
    row.className = 'd-data-row';
    row.innerHTML = `
      <span class="day-label">${i}</span>
      <input type="number" class="d-price" step="0.01" value="${(priceSample[i] || 10).toFixed(2)}"/>
      <input type="number" class="d-consumo" step="0.01" value="${(consumoSample[i] || 1.5).toFixed(2)}"/>
      <span></span>`;
    container.appendChild(row);
  }
}

function loadExampleD() {
  $('d-ndays').value = 12;
  $('d-p0').value = 8.50;
  buildDTable();
}

function runScenarioD() {
  const prices  = [...document.querySelectorAll('.d-price')].map(i => parseFloat(i.value));
  const consumo = [...document.querySelectorAll('.d-consumo')].map(i => parseFloat(i.value));
  const P0      = parseFloat($('d-p0').value);

  if (!prices.length || prices.some(isNaN) || consumo.some(isNaN)) {
    alert('Genera la tabla y completa todos los valores.'); return;
  }

  const n = prices.length;
  const h = 1; // paso = 1 día

  // f_i = precio_i × consumo_i (gasto diario)
  const f = prices.map((p, i) => p * consumo[i]);
  // f ideal
  const fIdeal = consumo.map(c => P0 * c);

  /* ── Trapecio ── */
  function trapecio(f, h) {
    const n = f.length;
    let s = f[0] + f[n-1];
    for (let i = 1; i < n-1; i++) s += 2*f[i];
    return (h/2)*s;
  }

  /* ── Simpson 1/3 (n−1 debe ser par → n impar) ── */
  function simpson13(f, h) {
    const n = f.length;
    if ((n-1) % 2 !== 0) {
      // Aplicar hasta el penúltimo tramo (par) + trapecio en el último
      const f2 = f.slice(0, n-1);
      const s = simpson13(f2, h);
      return s + trapecio([f[n-2], f[n-1]], h);
    }
    let s = f[0] + f[n-1];
    for (let i = 1; i < n-1; i++) s += (i%2===1) ? 4*f[i] : 2*f[i];
    return (h/3)*s;
  }

  /* ── Simpson 3/8 (n−1 debe ser múltiplo de 3) ── */
  function simpson38(f, h) {
    const n = f.length;
    const m = n - 1;
    if (m % 3 !== 0) {
      // Combinar: aplicar 3/8 en el mayor múltiplo de 3 y trapecio en el resto
      const rem = m % 3;
      const f1 = f.slice(0, m - rem + 1);
      const f2 = f.slice(m - rem);
      return simpson38(f1, h) + trapecio(f2, h);
    }
    let s = f[0] + f[n-1];
    for (let i = 1; i < n-1; i++) {
      s += (i%3===0) ? 2*f[i] : 3*f[i];
    }
    return (3*h/8)*s;
  }

  const gTrap   = trapecio(f, h);
  const gS13    = simpson13(f, h);
  const gS38    = simpson38(f, h);
  const gIdeal  = trapecio(fIdeal, h);
  const perdida = gTrap - gIdeal;

  // Gasto acumulado diario (para gráfico)
  const cumReal  = f.reduce((acc, fi, i) => { acc.push((acc[acc.length-1]||0)+fi); return acc; }, []);
  const cumIdeal = fIdeal.reduce((acc, fi) => { acc.push((acc[acc.length-1]||0)+fi); return acc; }, []);

  const labels = prices.map((_, i) => `Día ${i}`);

  makeChart('chartD', {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Gasto acumulado real (Bs.)',   data: cumReal,  borderColor:'#d94f3b', backgroundColor:'rgba(217,79,59,.1)', fill:true, tension:.3, pointRadius:3 },
        { label: 'Gasto acumulado ideal (Bs.)',  data: cumIdeal, borderColor:'#4caf82', backgroundColor:'rgba(76,175,130,.08)', fill:true, tension:.3, pointRadius:3 },
      ]
    },
    options: {
      scales: {
        x: { title:{display:true,text:'Día'} },
        y: { title:{display:true,text:'Gasto acumulado (Bs.)'} }
      },
      plugins: { legend:{position:'top'}, title:{display:true,text:'Gasto Acumulado vs. Sin Inflación — Familia Paceña'} },
      responsive:true, maintainAspectRatio:true
    }
  });

  // Tabla detallada
  $('d-table').innerHTML = `
    <div class="result-summary">
      <div class="result-item"><label>Gasto real (Trapecio)</label><div class="val warn">${gTrap.toFixed(2)} Bs.</div></div>
      <div class="result-item"><label>Gasto real (Simpson 1/3)</label><div class="val warn">${gS13.toFixed(2)} Bs.</div></div>
      <div class="result-item"><label>Gasto real (Simpson 3/8)</label><div class="val warn">${gS38.toFixed(2)} Bs.</div></div>
      <div class="result-item"><label>Gasto ideal (sin inflación)</label><div class="val ok">${gIdeal.toFixed(2)} Bs.</div></div>
      <div class="result-item"><label>Pérdida poder adquisitivo</label><div class="val warn">${perdida.toFixed(2)} Bs. (${((perdida/gIdeal)*100).toFixed(1)}%)</div></div>
    </div>
    ${buildTable(
      ['Día','Precio','Consumo','Gasto diario','Gasto ideal','Diferencia','Gasto acum.','Ideal acum.'],
      prices.map((p,i)=>[i, p.toFixed(2), consumo[i].toFixed(2), f[i].toFixed(2), fIdeal[i].toFixed(2),
        (f[i]-fIdeal[i]).toFixed(2), cumReal[i].toFixed(2), cumIdeal[i].toFixed(2)])
    )}`;

  // Producto más influyente (mayor diferencia acumulada)
  const diffs = f.map((fi, i) => fi - fIdeal[i]);
  const maxDiffIdx = diffs.indexOf(Math.max(...diffs));

  $('d-interpretation').innerHTML = `
    <h4>💸 Interpretación — Pérdida de Poder Adquisitivo en La Paz</h4>
    <ul>
      <li><strong>Cuánto gastó la familia:</strong> <strong>${gTrap.toFixed(2)} Bs.</strong> (${n} días). Simpson 1/3: ${gS13.toFixed(2)} Bs. · Simpson 3/8: ${gS38.toFixed(2)} Bs. Las diferencias entre métodos son pequeñas, indicando que la función es relativamente suave.</li>
      <li><strong>Cuánto habría gastado sin inflación (precio base ${P0} Bs./kg):</strong> <strong>${gIdeal.toFixed(2)} Bs.</strong></li>
      <li><strong>Pérdida aproximada:</strong> <strong>${perdida.toFixed(2)} Bs.</strong> equivalente al <strong>${((perdida/gIdeal)*100).toFixed(1)}%</strong> del gasto ideal.</li>
      <li><strong>Día de mayor impacto:</strong> Día ${maxDiffIdx}, con diferencia de ${diffs[maxDiffIdx].toFixed(2)} Bs. (pico de precios).</li>
      <li><strong>Comparación de métodos:</strong> Simpson 1/3 y 3/8 son más precisos que Trapecio para funciones suaves (error O(h⁴) vs O(h²)). La diferencia entre ellos indica la suavidad de la curva de gasto.</li>
      <li><strong>Conclusión social:</strong> Una familia que gasta ${P0} Bs./kg en canasta básica pierde el ${((perdida/gIdeal)*100).toFixed(1)}% de su poder adquisitivo en ${n} días de crisis. Esto impacta especialmente a hogares con ingresos fijos.</li>
    </ul>`;

  $('d-results').style.display = 'block';
  $('d-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════════════════════
   ESCENARIO E — Búsqueda de raíces (umbral crítico)
   ══════════════════════════════════════════════════════════ */

function loadExampleE() {
  $('e-ingreso').value  = 3500;
  $('e-g0').value       = 80;
  $('e-alpha').value    = 0.018;
  $('e-tol').value      = 0.0001;
  $('e-maxiter').value  = 100;
  $('e-a').value        = 1;
  $('e-b').value        = 60;
  $('e-x0').value       = 30;
  $('e-x1').value       = 35;
}

function runScenarioE() {
  const I      = parseFloat($('e-ingreso').value);
  const G0     = parseFloat($('e-g0').value);
  const alpha  = parseFloat($('e-alpha').value);
  const tol    = parseFloat($('e-tol').value);
  const maxIter= parseInt($('e-maxiter').value);
  const a0     = parseFloat($('e-a').value);
  const b0     = parseFloat($('e-b').value);
  const x0NR   = parseFloat($('e-x0').value);
  const x0Sec  = parseFloat($('e-x0').value);
  const x1Sec  = parseFloat($('e-x1').value);

  // f(t) = G0 * (e^(α*t) - 1) / α  - I  (gasto acumulado exponencial − ingreso)
  // Gasto acumulado = G0 * integral_0^t e^(α*s) ds = G0*(e^(α*t)-1)/α
  const f  = t => G0 * (Math.exp(alpha * t) - 1) / alpha - I;
  const df = t => G0 * Math.exp(alpha * t); // derivada respecto a t

  /* ── Bisección ── */
  function biseccion(a, b, f, tol, maxIter) {
    const rows = [];
    let converged = false, root = null;

    if (f(a) * f(b) >= 0) return { rows: [], converged: false, root: null, error: 'f(a) y f(b) deben tener signos opuestos.' };

    let fa = f(a);
    for (let k = 1; k <= maxIter; k++) {
      const c = (a + b) / 2;
      const fc = f(c);
      const err = Math.abs(b - a) / 2;
      rows.push({ k, a: a.toFixed(6), b: b.toFixed(6), c: c.toFixed(6), fc: fc.toFixed(6), err: err.toExponential(4) });
      if (err < tol || Math.abs(fc) < tol) { root = c; converged = true; break; }
      if (fa * fc < 0) { b = c; } else { a = c; fa = fc; }
    }
    if (!root) root = (a + b) / 2;
    return { rows, converged, root };
  }

  /* ── Newton-Raphson ── */
  function newtonRaphson(x0, f, df, tol, maxIter) {
    const rows = [];
    let x = x0, converged = false;
    for (let k = 1; k <= maxIter; k++) {
      const fx = f(x), dfx = df(x);
      if (Math.abs(dfx) < 1e-15) break;
      const xNew = x - fx / dfx;
      const err = Math.abs(xNew - x);
      rows.push({ k, x: x.toFixed(6), fx: fx.toFixed(6), dfx: dfx.toFixed(6), xNew: xNew.toFixed(6), err: err.toExponential(4) });
      x = xNew;
      if (err < tol) { converged = true; break; }
    }
    return { rows, converged, root: x };
  }

  /* ── Secante ── */
  function secante(x0, x1, f, tol, maxIter) {
    const rows = [];
    let converged = false;
    for (let k = 1; k <= maxIter; k++) {
      const f0 = f(x0), f1 = f(x1);
      if (Math.abs(f1 - f0) < 1e-15) break;
      const x2 = x1 - f1 * (x1 - x0) / (f1 - f0);
      const err = Math.abs(x2 - x1);
      rows.push({ k, x0: x0.toFixed(6), x1: x1.toFixed(6), x2: x2.toFixed(6), f2: f(x2).toFixed(6), err: err.toExponential(4) });
      x0 = x1; x1 = x2;
      if (err < tol) { converged = true; break; }
    }
    return { rows, converged, root: x1 };
  }

  // Ejecutar
  const resBisec = biseccion(a0, b0, f, tol, maxIter);
  const resNR    = newtonRaphson(x0NR, f, df, tol, maxIter);
  const resSec   = secante(x0Sec, x1Sec, f, tol, maxIter);

  // Renderizar bisección
  if (resBisec.error) {
    $('e-bisec-result').innerHTML = `<div class="error-msg">${resBisec.error}</div>`;
  } else {
    const badge = resBisec.converged
      ? `<span class="converged">✓ Convergió en ${resBisec.rows.length} iter.</span>`
      : `<span class="diverged">✗ No convergió</span>`;
    $('e-bisec-result').innerHTML = `<h4 style="font-family:var(--sans);color:var(--ocre-light);margin-bottom:.75rem">Bisección ${badge}</h4>
      <div class="result-summary">
        <div class="result-item"><label>Raíz t*</label><div class="val">${resBisec.root.toFixed(5)} días</div></div>
        <div class="result-item"><label>f(t*)</label><div class="val">${f(resBisec.root).toFixed(6)}</div></div>
      </div>
      ${buildTable(['k','a','b','c','f(c)','Error'],
        resBisec.rows.map(r=>[r.k,r.a,r.b,r.c,r.fc,r.err]))}`;
  }

  // Renderizar Newton-Raphson
  {
    const badge = resNR.converged
      ? `<span class="converged">✓ Convergió en ${resNR.rows.length} iter.</span>`
      : `<span class="diverged">✗ No convergió en ${resNR.rows.length} iter.</span>`;
    $('e-nr-result').innerHTML = `<h4 style="font-family:var(--sans);color:var(--ocre-light);margin-bottom:.75rem">Newton-Raphson ${badge}</h4>
      <div class="result-summary">
        <div class="result-item"><label>Raíz t*</label><div class="val">${resNR.root.toFixed(5)} días</div></div>
        <div class="result-item"><label>f(t*)</label><div class="val">${f(resNR.root).toFixed(6)}</div></div>
      </div>
      ${buildTable(['k','x_k','f(x_k)','f\'(x_k)','x_{k+1}','Error'],
        resNR.rows.map(r=>[r.k,r.x,r.fx,r.dfx,r.xNew,r.err]))}`;
  }

  // Renderizar Secante
  {
    const badge = resSec.converged
      ? `<span class="converged">✓ Convergió en ${resSec.rows.length} iter.</span>`
      : `<span class="diverged">✗ No convergió en ${resSec.rows.length} iter.</span>`;
    $('e-sec-result').innerHTML = `<h4 style="font-family:var(--sans);color:var(--ocre-light);margin-bottom:.75rem">Secante ${badge}</h4>
      <div class="result-summary">
        <div class="result-item"><label>Raíz t*</label><div class="val">${resSec.root.toFixed(5)} días</div></div>
        <div class="result-item"><label>f(t*)</label><div class="val">${f(resSec.root).toFixed(6)}</div></div>
      </div>
      ${buildTable(['k','x_{k-1}','x_k','x_{k+1}','f(x_{k+1})','Error'],
        resSec.rows.map(r=>[r.k,r.x0,r.x1,r.x2,r.f2,r.err]))}`;
  }

  // Gráfico de la función y raíces
  const tPlot = Array.from({length:200}, (_,i) => (b0 * i) / 199);
  const fPlot = tPlot.map(t => f(t));

  // Convergencia de errores
  const errBisec = resBisec.rows.map(r => parseFloat(r.err));
  const errNR    = resNR.rows.map(r => parseFloat(r.err.replace('e','E')));
  const errSec   = resSec.rows.map(r => parseFloat(r.err.replace('e','E')));
  const maxIters = Math.max(errBisec.length, errNR.length, errSec.length);
  const iterLabels = Array.from({length: maxIters}, (_,i) => i+1);

  makeChart('chartE', {
    type: 'line',
    data: {
      labels: tPlot.map(t=>t.toFixed(1)),
      datasets: [
        { label: 'f(t) = Gasto(t) − Ingreso', data: fPlot, borderColor:'#c8922a', fill:false, tension:.3, pointRadius:0, borderWidth:2, yAxisID:'y' },
        { label: 'f = 0', data: tPlot.map(()=>0), borderColor:'#5a5448', borderDash:[4,3], pointRadius:0, yAxisID:'y' },
        ...(resBisec.root ? [{ label:`t* Bisección (${resBisec.root.toFixed(2)})`, data:[{x:resBisec.root.toFixed(2),y:0}], type:'scatter', borderColor:'#4caf82', backgroundColor:'#4caf82', pointRadius:8, yAxisID:'y' }] : []),
        ...(resNR.root    ? [{ label:`t* N-R (${resNR.root.toFixed(2)})`,         data:[{x:resNR.root.toFixed(2),y:0}],   type:'scatter', borderColor:'#5b9bd5', backgroundColor:'#5b9bd5', pointRadius:7, yAxisID:'y' }] : []),
      ]
    },
    options: {
      scales: {
        x: { title:{display:true, text:'Días (t)'} },
        y: { title:{display:true, text:'f(t) = Gasto acumulado − Ingreso (Bs.)'} }
      },
      plugins: { legend:{position:'top'}, title:{display:true,text:'Función de Umbral Crítico — f(t) = G(t) − I'} },
      responsive:true, maintainAspectRatio:true
    }
  });

  // Interpretación
  const tStar = resBisec.root || resNR.root || resSec.root;
  const tStarInt = tStar ? Math.ceil(tStar) : '—';
  $('e-interpretation').innerHTML = `
    <h4>🔴 Interpretación — Umbral Crítico del Gasto Familiar</h4>
    <ul>
      <li><strong>Valor crítico encontrado:</strong> t* ≈ <strong>${tStar ? tStar.toFixed(2) : '—'} días</strong> (Bisección: ${resBisec.root?.toFixed(3)||'—'}, N-R: ${resNR.root?.toFixed(3)||'—'}, Secante: ${resSec.root?.toFixed(3)||'—'}).</li>
      <li><strong>Significado social:</strong> A partir del día ~${tStarInt}, el gasto acumulado de la familia (<strong>Bs. ${I}</strong>/mes de ingreso) supera sus ingresos, entrando en déficit.</li>
      <li><strong>Comparación de velocidad:</strong> Newton-Raphson converge en ${resNR.rows.length} iteraciones (convergencia cuadrática), la Secante en ${resSec.rows.length} (supralineal), y la Bisección en ${resBisec.rows.length} (lineal). N-R es el más rápido cuando la derivada es bien condicionada.</li>
      <li><strong>Robustez:</strong> La Bisección es el método más robusto (siempre converge si f(a)·f(b)<0). N-R puede divergir con valores iniciales malos. La Secante es intermedia.</li>
      <li><strong>Sensibilidad a valores iniciales:</strong> Con α = ${alpha} (inflación diaria del ${(alpha*100).toFixed(1)}%) y G₀ = ${G0} Bs./día, el umbral es muy sensible a cambios en α: aumentarlo en 0.005 reduce t* en varios días.</li>
      <li><strong>Conclusión:</strong> Con inflación diaria del ${(alpha*100).toFixed(1)}% y un gasto base de ${G0} Bs./día, una familia paceña con ingreso de ${I} Bs. entra en déficit alrededor del día ${tStarInt}. Reducir el consumo o aumentar ingresos desplaza t* hacia la derecha.</li>
    </ul>`;

  $('e-results').style.display = 'block';
  $('e-results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ══════════════════════════════════════════════════════════
   INICIALIZACIÓN
   ══════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Activar primer tab en cada escenario al cargar
  // (ya están activos por defecto en HTML)
  console.log('✅ La Paz en Crisis — Métodos Numéricos cargado correctamente.');
});