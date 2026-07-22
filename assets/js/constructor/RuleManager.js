// ============================================================
// RuleManager.js - Gestión de reglas: grupos aleatorios y ruleta
// ============================================================

class RuleManager {
    constructor(app) {
        this.app = app;
        this.STORAGE_KEY = 'app_reglas';
    }

    // ------------------------------------------------------------
    // Carga y guardado en localStorage (por sección)
    // ------------------------------------------------------------
    cargarReglas() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            return data ? JSON.parse(data) : {};
        } catch {
            return {};
        }
    }

    guardarReglas(seccionId, grupos) {
        const todas = this.cargarReglas();
        todas[seccionId] = grupos;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todas));
    }

    obtenerGrupos(seccionId) {
        const todas = this.cargarReglas();
        return todas[seccionId] || null;
    }

    // ------------------------------------------------------------
    // Render principal de la categoría "Reglas"
    // ------------------------------------------------------------
    async renderRule(container) {
        const estudiantes = this.app.students.list || [];
        const total = estudiantes.length;

        let html = `
            <div class="works-header">
                <h2><i class="fas fa-dice" style="color:#cba6f7;"></i> Reglas <span class="count">(${total} estudiantes)</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-primary" onclick="window.app?.crearGrupos()">
                        <i class="fas fa-users"></i> Crear Grupos
                    </button>
                    <button class="btn-action btn-info" onclick="window.app?.ruleta()">
                        <i class="fas fa-random"></i> Ruleta
                    </button>
                </div>
            </div>
            <div style="margin-top:16px; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); padding:16px;">
                <p style="color:var(--text-secondary); font-size:14px;">
                    <i class="fas fa-info-circle" style="color:#cba6f7;"></i>
                    <strong>Crear Grupos:</strong> Divide a los estudiantes en equipos y asigna un líder al azar.
                    <br>
                    <i class="fas fa-info-circle" style="color:#cba6f7;"></i>
                    <strong>Ruleta:</strong> Selecciona un estudiante al azar con un efecto de ruleta (se detiene automáticamente a los 10 segundos).
                </p>
                ${total === 0 ? `<div class="empty-state" style="margin-top:12px;"><p>No hay estudiantes registrados. Agrega estudiantes primero.</p></div>` : ''}
            </div>
            <div id="resultadoReglas" style="margin-top:16px;">
                ${this.mostrarGruposGuardados()}
            </div>
        `;

        container.innerHTML = html;
    }

    // ------------------------------------------------------------
    // Mostrar grupos guardados en el panel
    // ------------------------------------------------------------
    mostrarGruposGuardados() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) return '';

        const grupos = this.obtenerGrupos(seccionId);
        if (!grupos || grupos.length === 0) {
            return `<div style="color:var(--text-muted); font-size:13px; padding:12px;">No hay grupos guardados. Crea uno usando el botón.</div>`;
        }

        let html = `<div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:16px;">`;
        for (const grupo of grupos) {
            const liderNombre = grupo.lider ? this.app.students.getFullName(grupo.lider) : '—';
            const miembrosHtml = grupo.miembros.map(est => 
                `<span style="display:inline-block; background:var(--bg-hover); padding:2px 10px; border-radius:12px; margin:2px;">${escapeHtml(this.app.students.getFullName(est))}</span>`
            ).join(' ');

            html += `
                <div style="background:var(--bg-card); border-radius:8px; border:2px solid #cba6f7; padding:12px;">
                    <h3 style="margin:0 0 8px 0; color:#cba6f7;">Grupo ${grupo.numero}</h3>
                    <div style="font-size:13px;">
                        <strong>👑 Líder:</strong> <span style="color:#f9e2af; font-weight:bold;">${escapeHtml(liderNombre)}</span>
                    </div>
                    <div style="margin-top:8px; font-size:12px; color:var(--text-secondary);">
                        <strong>👥 Miembros (${grupo.miembros.length}):</strong><br>
                        ${miembrosHtml || '—'}
                    </div>
                </div>
            `;
        }
        html += `</div>`;
        return html;
    }

    // ------------------------------------------------------------
    // Crear grupos (división equitativa con líder aleatorio) y guardar
    // ------------------------------------------------------------
    async crearGrupos() {
        const estudiantes = this.app.students.list || [];
        const total = estudiantes.length;

        if (total === 0) {
            this.app.ui.showError('No hay estudiantes para agrupar');
            return;
        }

        // Pedir número de grupos
        const result = await Swal.fire({
            title: 'Crear Grupos',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">
                        Número de grupos (máximo ${total}):
                    </label>
                    <input id="swal-num-grupos" class="swal2-input" type="number" min="1" max="${total}" value="${Math.min(4, total)}">
                    <div style="font-size:12px; color:var(--text-muted);">
                        ${total} estudiantes · ${Math.ceil(total / Math.min(4, total))} aprox. por grupo
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '✅ Crear',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const num = parseInt(document.getElementById('swal-num-grupos').value);
                if (isNaN(num) || num < 1 || num > total) {
                    Swal.showValidationMessage(`Ingresa un número entre 1 y ${total}`);
                    return;
                }
                return num;
            }
        });

        if (!result.isConfirmed) return;

        const numGrupos = result.value;
        const copiaEstudiantes = [...estudiantes];
        // Mezclar aleatoriamente (Fisher-Yates)
        for (let i = copiaEstudiantes.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [copiaEstudiantes[i], copiaEstudiantes[j]] = [copiaEstudiantes[j], copiaEstudiantes[i]];
        }

        // Dividir en grupos
        const grupos = [];
        const tamañoBase = Math.floor(total / numGrupos);
        const extra = total % numGrupos;
        let index = 0;
        for (let g = 0; g < numGrupos; g++) {
            const tamaño = tamañoBase + (g < extra ? 1 : 0);
            const miembros = copiaEstudiantes.slice(index, index + tamaño);
            index += tamaño;
            // Elegir líder al azar entre los miembros
            const lider = miembros.length > 0 ? miembros[Math.floor(Math.random() * miembros.length)] : null;
            grupos.push({
                numero: g + 1,
                miembros: miembros,
                lider: lider
            });
        }

        // Guardar en localStorage
        const seccionId = this.app.currentSectionId;
        if (seccionId) {
            this.guardarReglas(seccionId, grupos);
        }

        // Mostrar resultado
        this.mostrarGrupos(grupos);
        // Actualizar el panel
        await this.app.render();
    }

    // ------------------------------------------------------------
    // Mostrar grupos en un diálogo / panel
    // ------------------------------------------------------------
    mostrarGrupos(grupos) {
        let html = `
            <div style="max-height:500px; overflow-y:auto;">
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap:16px;">
        `;

        for (const grupo of grupos) {
            const liderNombre = grupo.lider ? this.app.students.getFullName(grupo.lider) : '—';
            const miembrosHtml = grupo.miembros.map(est => 
                `<span style="display:inline-block; background:var(--bg-hover); padding:2px 10px; border-radius:12px; margin:2px;">${escapeHtml(this.app.students.getFullName(est))}</span>`
            ).join(' ');

            html += `
                <div style="background:var(--bg-card); border-radius:8px; border:2px solid #cba6f7; padding:12px;">
                    <h3 style="margin:0 0 8px 0; color:#cba6f7;">Grupo ${grupo.numero}</h3>
                    <div style="font-size:13px;">
                        <strong>👑 Líder:</strong> <span style="color:#f9e2af; font-weight:bold;">${escapeHtml(liderNombre)}</span>
                    </div>
                    <div style="margin-top:8px; font-size:12px; color:var(--text-secondary);">
                        <strong>👥 Miembros (${grupo.miembros.length}):</strong><br>
                        ${miembrosHtml || '—'}
                    </div>
                </div>
            `;
        }

        html += `
                </div>
            </div>
        `;

        Swal.fire({
            title: '🎲 Grupos creados',
            html: html,
            confirmButtonText: 'Cerrar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '90%',
            maxWidth: '900px'
        });
    }



// ------------------------------------------------------------
// Ruleta - selección aleatoria con efecto visual (3 segundos)
// ------------------------------------------------------------
async ruleta() {
    const estudiantes = this.app.students.list || [];
    const total = estudiantes.length;

    // Validación: necesitamos al menos 2 estudiantes para la ruleta
    if (total === 0) {
        this.app.ui.showError('No hay estudiantes registrados.');
        return;
    }

    if (total === 1) {
        // Si solo hay uno, lo mostramos directamente sin animación
        const unicoNombre = this.app.students.getFullName(estudiantes[0]);
        await Swal.fire({
            title: '🎰 Ruleta',
            html: `
                <div style="font-size:48px; font-weight:bold; color:#a6e3a1; padding:20px; background:var(--bg-hover); border-radius:12px; margin:12px 0;">
                    🎉 ${escapeHtml(unicoNombre)} 🎉
                </div>
                <p style="color:var(--text-muted); font-size:13px;">Solo hay un estudiante registrado.</p>
            `,
            confirmButtonText: 'Cerrar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
        return;
    }

    // Si hay 2 o más, procedemos con la ruleta
    const nombres = estudiantes.map(est => this.app.students.getFullName(est));
    let interval = null;
    let detenido = false;
    let timeoutId = null;

    // Elegir ganador con crypto (para mayor aleatoriedad)
    const ganadorIndex = Math.floor(Math.random() * total);
    const ganadorNombre = nombres[ganadorIndex];

    await Swal.fire({
        title: '🎰 Ruleta',
        html: `
            <div style="font-size:48px; font-weight:bold; color:#f9e2af; padding:20px; background:var(--bg-hover); border-radius:12px; margin:12px 0;" id="ruleta-nombre">
                ${escapeHtml(nombres[0])}
            </div>
            <p style="color:var(--text-muted); font-size:13px;">La ruleta se detendrá automáticamente en <strong>3 segundos</strong>.</p>
            <div style="margin-top:8px; width:100%; background:var(--bg-hover); border-radius:6px; height:6px; overflow:hidden;">
                <div id="ruleta-progress" style="width:0%; height:100%; background:linear-gradient(90deg, #f9e2af, #cba6f7); transition:width 0.1s linear;"></div>
            </div>
        `,
        showCancelButton: false,
        showConfirmButton: false,
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        didOpen: () => {
            const nombreElement = document.getElementById('ruleta-nombre');
            const progressBar = document.getElementById('ruleta-progress');
            const tiempoInicio = Date.now();
            const duracion = 3000; // 3 segundos

            let currentIndex = 0;
            const getRandomIndex = () => {
                let idx;
                do {
                    idx = Math.floor(Math.random() * total);
                } while (total > 1 && idx === currentIndex);
                currentIndex = idx;
                return idx;
            };

            // Cambiar nombre cada 80ms
            interval = setInterval(() => {
                if (detenido) return;
                const idx = getRandomIndex();
                nombreElement.textContent = escapeHtml(nombres[idx]);
            }, 80);

            // Barra de progreso
            const progressInterval = setInterval(() => {
                if (detenido) return;
                const elapsed = Date.now() - tiempoInicio;
                const progress = Math.min(100, (elapsed / duracion) * 100);
                progressBar.style.width = progress + '%';
                if (progress >= 100) {
                    clearInterval(progressInterval);
                }
            }, 50);

            // Detener a los 3 segundos
            timeoutId = setTimeout(() => {
                if (detenido) return;
                detenido = true;
                clearInterval(interval);
                clearInterval(progressInterval);

                nombreElement.style.color = '#a6e3a1';
                nombreElement.textContent = `🎉 ${escapeHtml(ganadorNombre)} 🎉`;
                progressBar.style.width = '100%';

                Swal.update({
                    showConfirmButton: true,
                    confirmButtonText: '✅ Cerrar'
                });
            }, duracion);
        },
        willClose: () => {
            if (interval) clearInterval(interval);
            if (timeoutId) clearTimeout(timeoutId);
        }
    });
}
}