// ============================================================
// AsistenciaManager.js - Gestión de asistencia con guardado automático
// ============================================================

class AsistenciaManager {
    constructor(app) {
        this.app = app;
        this.filtro = '';
        this.fechaSeleccionada = null;
        this.estadosActuales = {};
        this.registrosActuales = {};
        this.porcentajeAsignado = 10;
        this.leccionesPorDefecto = 1;
        this.estudiantesCache = [];
        this.maxAusencias = 3;
        this.tardiasPorAusencia = 2;
    }

    // ------------------------------------------------------------
    // Carga y guardado de porcentaje
    // ------------------------------------------------------------
    async cargarPorcentaje() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) return;
        const data = await this.app.db.get(STORES.PORCENTAJES, seccionId);
        if (data?.porcentajes?.asistencia) {
            const conf = data.porcentajes.asistencia;
            this.porcentajeAsignado = conf.porcentaje || 10;
            this.maxAusencias = conf.maxAusencias ?? 3;
            this.tardiasPorAusencia = conf.tardiasPorAusencia ?? 2;
        } else {
            this.porcentajeAsignado = 10;
            this.maxAusencias = 3;
            this.tardiasPorAusencia = 2;
        }
    }

    async guardarPorcentaje(nuevoPorcentaje, maxAusencias, tardiasPorAusencia) {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) return;
        let data = await this.app.db.get(STORES.PORCENTAJES, seccionId);
        if (!data) {
            data = { seccionId, porcentajes: { ...PORCENTAJES_DEFAULT } };
        }
        data.porcentajes.asistencia = {
            porcentaje: nuevoPorcentaje,
            activo: true,
            maxAusencias: maxAusencias,
            tardiasPorAusencia: tardiasPorAusencia
        };
        await this.app.db.put(STORES.PORCENTAJES, data);
        this.porcentajeAsignado = nuevoPorcentaje;
        this.maxAusencias = maxAusencias;
        this.tardiasPorAusencia = tardiasPorAusencia;
        await this.app.grades.loadPercentages(seccionId);
        this.renderAsistencia(document.getElementById('mainContent'));
        this.app.ui.showSuccess(`Configuración actualizada (máx. ausencias ${maxAusencias}, ${tardiasPorAusencia} tardías = 1 ausencia)`);
    }

    // ------------------------------------------------------------
    // Acceso a datos
    // ------------------------------------------------------------
    async getRegistros() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) return [];
        try {
            return await this.app.db.getByIndex(STORES.ASISTENCIA, 'seccionId', seccionId);
        } catch (e) {
            console.warn('Error al obtener registros:', e);
            return [];
        }
    }

    async getRegistrosPorFecha(timestamp) {
        const todos = await this.getRegistros();
        return todos.filter(r => r.timestamp === timestamp);
    }

    async getFechasHistorial() {
        const todos = await this.getRegistros();
        const fechas = new Set();
        for (const item of todos) {
            fechas.add(item.timestamp);
        }
        return Array.from(fechas).sort((a, b) => b.localeCompare(a));
    }

    getEstudiantes() {
        return this.app.students.list || [];
    }

    // ------------------------------------------------------------
    // Render principal
    // ------------------------------------------------------------
    async renderAsistencia(container) {
        await this.cargarPorcentaje();
        const estudiantes = this.getEstudiantes();
        this.estudiantesCache = estudiantes;

        const fechas = await this.getFechasHistorial();
        let fechaSeleccionada = this.fechaSeleccionada;
        if (!fechaSeleccionada && fechas.length > 0) {
            fechaSeleccionada = fechas[0];
        } else if (!fechaSeleccionada) {
            fechaSeleccionada = 'hoy';
        }
        this.fechaSeleccionada = fechaSeleccionada;

        let html = `
            <div class="works-header">
                <h2><i class="fas fa-calendar-check" style="color:#cba6f7;"></i> Asistencia</h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <button class="btn-action btn-info" onclick="window.app.asistenciaManager.mostrarConfiguracionPorcentaje()">
                        <i class="fas fa-cog"></i> Propiedades (${this.porcentajeAsignado}%)
                    </button>
                    <button class="btn-action btn-primary" onclick="window.app.asistenciaManager.mostrarInformeEstudiante()">
                        <i class="fas fa-file-alt"></i> Informe por estudiante
                    </button>
                    <button class="btn-action btn-danger" onclick="window.app.asistenciaManager.descargarPDFAsistencia()">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                    <label style="font-size:12px; color:var(--text-secondary); display:flex; align-items:center; gap:4px;">
                        Lecciones:
                        <input type="number" id="leccionesPorDefecto" min="1" max="10" value="${this.leccionesPorDefecto}" 
                            style="width:50px; padding:4px; border-radius:4px; background:var(--bg-input); color:var(--text-primary); border:1px solid var(--border-color); text-align:center;"
                            onchange="window.app.asistenciaManager.leccionesPorDefecto = parseInt(this.value) || 1;">
                    </label>
                    <button class="btn-action btn-success" onclick="window.app.asistenciaManager.nuevoPaseLista()">
                        <i class="fas fa-plus-circle"></i> Nuevo pase de lista
                    </button>
                </div>
            </div>
            <div style="margin-bottom:12px; display:flex; gap:8px; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
                <i class="fas fa-search" style="color:var(--text-muted);"></i>
                <input type="text" id="filtroAsistencia" placeholder="Buscar estudiante por nombre..." 
                    style="flex:1; padding:6px 10px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input); color:var(--text-primary); font-size:13px; outline:none;"
                    value="${escapeHtml(this.filtro)}"
                    oninput="window.app.asistenciaManager.filtrar(this.value)">
                <span style="font-size:12px; color:var(--text-muted);">
                    <i class="fas fa-users"></i> ${estudiantes.length} estudiantes
                </span>
            </div>
            <div style="margin-bottom:12px; display:flex; flex-wrap:wrap; gap:8px; background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
                <span style="font-weight:600; font-size:13px; color:var(--text-secondary);"><i class="fas fa-history"></i> Historial:</span>
                ${fechas.length === 0 ? '<span style="font-size:13px; color:var(--text-muted);">Sin registros</span>' : ''}
        `;
        for (const ts of fechas) {
            const fechaMostrar = this.formatearTimestamp(ts);
            const activa = (this.fechaSeleccionada === ts) ? 'btn-primary' : 'btn-secondary';
            html += `
                <button class="btn-action ${activa} historial-btn" data-timestamp="${ts}" 
                    onclick="window.app.asistenciaManager.mostrarFecha('${ts}')" 
                    style="padding:4px 12px; font-size:12px; ${this.fechaSeleccionada === ts ? '' : 'background:var(--bg-hover);'}">
                    ${fechaMostrar}
                </button>
            `;
        }
        html += `</div>`;

        html += `<div id="detalleAsistencia">`;
        if (this.fechaSeleccionada === 'hoy') {
            html += await this.renderTablaHoy();
        } else {
            html += await this.renderTablaFecha(this.fechaSeleccionada);
        }
        html += `</div>`;

        container.innerHTML = html;
        this.aplicarFiltro();
    }

    // ------------------------------------------------------------
    // Render de tablas (hoy y fechas del historial)
    // ------------------------------------------------------------
    async renderTablaHoy() {
        const estudiantes = this.getEstudiantes();
        const registrosHoy = await this.getRegistrosPorFechaHoy();

        const mapaUltimo = new Map();
        for (const reg of registrosHoy) {
            const estId = reg.estudianteId;
            if (!mapaUltimo.has(estId) || reg.timestamp > mapaUltimo.get(estId).timestamp) {
                mapaUltimo.set(estId, reg);
            }
        }

        this.registrosActuales = {};
        this.estadosActuales = {};

        for (const est of estudiantes) {
            const reg = mapaUltimo.get(est.id);
            if (reg) {
                this.estadosActuales[est.id] = reg.estado;
                this.registrosActuales[est.id] = reg.id;
            } else {
                this.estadosActuales[est.id] = 'presente';
                this.registrosActuales[est.id] = null;
            }
        }
        return this.construirTabla(estudiantes, 'hoy');
    }

    async renderTablaFecha(timestamp) {
        const estudiantes = this.getEstudiantes();
        const registros = await this.getRegistrosPorFecha(timestamp);

        this.registrosActuales = {};
        this.estadosActuales = {};

        const mapa = {};
        for (const r of registros) {
            mapa[r.estudianteId] = { estado: r.estado, id: r.id };
        }

        for (const est of estudiantes) {
            const data = mapa[est.id];
            if (data) {
                this.estadosActuales[est.id] = data.estado;
                this.registrosActuales[est.id] = data.id;
            } else {
                this.estadosActuales[est.id] = 'presente';
                this.registrosActuales[est.id] = null;
            }
        }
        return this.construirTabla(estudiantes, timestamp);
    }

    construirTabla(estudiantes, identificador) {
        const esHoy = (identificador === 'hoy');
        const fechaMostrar = esHoy ? getDayMonth() : this.formatearTimestamp(identificador);
        const titulo = esHoy 
            ? `📅 Hoy - Último pase de lista (Lecciones: ${this.leccionesPorDefecto})`
            : `📅 ${fechaMostrar} - Pase de lista (Lecciones: ${this.leccionesPorDefecto}) — Guardado automático`;

        let html = `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <div style="padding:8px 16px; background:var(--bg-hover); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-weight:600; color:var(--text-primary);">${titulo}</span>
                    ${!esHoy ? `<span style="font-size:11px; color:var(--text-muted);"><i class="fas fa-sync-alt"></i> Los cambios se guardan automáticamente</span>` : ''}
                </div>
                <table class="data-table" id="tablaAsistenciaDetalle">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Estudiante</th>
                            <th>Estado</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyAsistencia">
        `;

        if (estudiantes.length === 0) {
            html += `<tr><td colspan="3" style="text-align:center; padding:30px; color:var(--text-muted);">No hay estudiantes registrados</td></tr>`;
        } else {
            for (let i = 0; i < estudiantes.length; i++) {
                const est = estudiantes[i];
                const nombreCompleto = this.app.students.getFullName(est);
                const estado = this.estadosActuales[est.id] || 'presente';
                html += `
                    <tr data-estudiante-id="${est.id}" data-nombre="${nombreCompleto.toLowerCase()}">
                        <td>${i+1}</td>
                        <td style="font-weight:500; color:var(--text-primary);">${escapeHtml(nombreCompleto)}</td>
                        <td>
                            <select class="estado-select" data-estudiante="${est.id}" 
                                style="padding:4px 8px; border-radius:4px; background:var(--bg-input); color:var(--text-primary); border:1px solid var(--border-color);"
                                onchange="window.app.asistenciaManager.cambiarEstadoYGuardar(${est.id}, this.value)">
                                <option value="presente" ${estado === 'presente' ? 'selected' : ''}>✅ Presente</option>
                                <option value="ausente" ${estado === 'ausente' ? 'selected' : ''}>❌ Ausente</option>
                                <option value="tardia" ${estado === 'tardia' ? 'selected' : ''}>⏰ Tardía</option>
                                <option value="justificada" ${estado === 'justificada' ? 'selected' : ''}>📝 Justificada</option>
                            </select>
                        </td>
                    </tr>
                `;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;
        return html;
    }

    // ------------------------------------------------------------
    // Guardado automático al cambiar estado (sin duplicados)
    // ------------------------------------------------------------
    async cambiarEstadoYGuardar(estudianteId, nuevoEstado) {
        this.estadosActuales[estudianteId] = nuevoEstado;

        const seccionId = this.app.currentSectionId;
        if (!seccionId) {
            this.app.ui.showError('No hay sección seleccionada');
            return;
        }

        const fecha = this.fechaSeleccionada === 'hoy' 
            ? getDayMonth() 
            : this.fechaSeleccionada.split('T')[0].split('-').reverse().join('/');

        const timestamp = this.fechaSeleccionada === 'hoy' 
            ? new Date().toISOString()
            : this.fechaSeleccionada;

        const registroId = this.registrosActuales[estudianteId];

        try {
            if (registroId) {
                const registro = await this.app.db.get(STORES.ASISTENCIA, registroId);
                if (registro) {
                    registro.estado = nuevoEstado;
                    await this.app.db.put(STORES.ASISTENCIA, registro);
                } else {
                    await this.crearRegistro(estudianteId, seccionId, fecha, timestamp, nuevoEstado);
                }
            } else {
                await this.crearRegistro(estudianteId, seccionId, fecha, timestamp, nuevoEstado);
            }

            const nombreEstudiante = this.app.students.getFullName(
                this.app.students.getById(estudianteId)
            );
            const estadoTexto = {
                presente: 'Presente ✅',
                ausente: 'Ausente ❌',
                tardia: 'Tardía ⏰',
                justificada: 'Justificada 📝'
            }[nuevoEstado] || nuevoEstado;

            this.app.ui.showToast(`${nombreEstudiante} → ${estadoTexto}`, 'success', 800);

        } catch (error) {
            console.error('Error guardando estado:', error);
            this.app.ui.showError('Error al guardar el cambio');
        }
    }

    async crearRegistro(estudianteId, seccionId, fecha, timestamp, estado) {
        const nuevoRegistro = {
            seccionId,
            fecha: fecha || getDayMonth(),
            timestamp: timestamp || new Date().toISOString(),
            estudianteId,
            estado,
            lecciones: this.leccionesPorDefecto
        };
        const id = await this.app.db.add(STORES.ASISTENCIA, nuevoRegistro);
        this.registrosActuales[estudianteId] = id;
        return id;
    }

    // ------------------------------------------------------------
    // Nuevo pase de lista (SIEMPRE CREA NUEVOS REGISTROS)
    // ------------------------------------------------------------
    async nuevoPaseLista() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) {
            this.app.ui.showError('No hay sección seleccionada');
            return;
        }
        const estudiantes = this.getEstudiantes();
        if (estudiantes.length === 0) {
            this.app.ui.showError('No hay estudiantes para registrar asistencia');
            return;
        }
        const hoy = getDayMonth();
        const timestamp = new Date().toISOString();

        try {
            for (const est of estudiantes) {
                const nuevoReg = {
                    seccionId,
                    fecha: hoy,
                    timestamp,
                    estudianteId: est.id,
                    estado: 'presente',
                    lecciones: this.leccionesPorDefecto
                };
                const id = await this.app.db.add(STORES.ASISTENCIA, nuevoReg);
                this.registrosActuales[est.id] = id;
            }

            this.app.ui.showSuccess(`✅ Nuevo pase de lista del ${hoy} guardado (todos presentes)`);
            this.fechaSeleccionada = timestamp;
            await this.renderAsistencia(document.getElementById('mainContent'));
            this.app.updateStats();
        } catch (error) {
            console.error('Error guardando nuevo pase de lista:', error);
            this.app.ui.showError('Error al guardar: ' + error.message);
        }
    }

    // ------------------------------------------------------------
    // Navegación por historial y filtros
    // ------------------------------------------------------------
    async mostrarFecha(timestamp) {
        this.fechaSeleccionada = timestamp;
        const container = document.getElementById('detalleAsistencia');
        if (timestamp === 'hoy') {
            container.innerHTML = await this.renderTablaHoy();
        } else {
            container.innerHTML = await this.renderTablaFecha(timestamp);
        }
        this.aplicarFiltro();
        document.querySelectorAll('.historial-btn').forEach(btn => {
            btn.classList.toggle('btn-primary', btn.dataset.timestamp === timestamp);
            btn.classList.toggle('btn-secondary', btn.dataset.timestamp !== timestamp);
        });
    }

    filtrar(termino) {
        this.filtro = termino;
        this.aplicarFiltro();
    }

    aplicarFiltro() {
        const term = this.filtro.toLowerCase().trim();
        document.querySelectorAll('#tbodyAsistencia tr').forEach(fila => {
            const nombre = fila.dataset.nombre || '';
            fila.style.display = (term === '' || nombre.includes(term)) ? '' : 'none';
        });
    }

    filtrarPorEstudiante(nombre) {
        Swal.close();
        this.filtro = nombre;
        const input = document.getElementById('filtroAsistencia');
        if (input) {
            input.value = nombre;
            input.dispatchEvent(new Event('input'));
        } else {
            this.renderAsistencia(document.getElementById('mainContent'));
        }
    }

    // ------------------------------------------------------------
    // Utilidades
    // ------------------------------------------------------------
    async getRegistrosPorFechaHoy() {
        const hoy = getDayMonth();
        const todos = await this.getRegistros();
        return todos.filter(r => r.fecha === hoy);
    }

    formatearTimestamp(timestamp) {
        const date = new Date(timestamp);
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const anio = date.getFullYear();
        const hora = String(date.getHours()).padStart(2, '0');
        const min = String(date.getMinutes()).padStart(2, '0');
        return `${dia}/${mes}/${anio} ${hora}:${min}`;
    }

    // ------------------------------------------------------------
    // INFORME POR ESTUDIANTE (aplica reglas de propiedades en lecciones)
    // ------------------------------------------------------------
    async mostrarInformeEstudiante() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) {
            this.app.ui.showError('No hay sección seleccionada');
            return;
        }

        const estudiantes = this.getEstudiantes();
        if (estudiantes.length === 0) {
            this.app.ui.showError('No hay estudiantes');
            return;
        }

        await this.cargarPorcentaje();
        const pesoAsistencia = this.porcentajeAsignado;
        const maxAusencias = this.maxAusencias;
        const tardiasPorAusencia = this.tardiasPorAusencia;

        const todos = await this.getRegistros();

        const informe = [];
        for (const est of estudiantes) {
            const estudianteId = Number(est.id);
            const registrosEst = todos.filter(r => Number(r.estudianteId) === estudianteId);

            let leccionesPresente = 0;
            let leccionesAusente = 0;
            let leccionesTardia = 0;
            let leccionesJustificada = 0;
            let totalLeccionesEst = 0;

            for (const reg of registrosEst) {
                const lec = reg.lecciones || this.leccionesPorDefecto;
                totalLeccionesEst += lec;
                switch (reg.estado) {
                    case 'presente': leccionesPresente += lec; break;
                    case 'ausente': leccionesAusente += lec; break;
                    case 'tardia': leccionesTardia += lec; break;
                    case 'justificada': leccionesJustificada += lec; break;
                }
            }

            if (registrosEst.length === 0) {
                informe.push({
                    nombre: this.app.students.getFullName(est),
                    leccionesPresente: 0,
                    leccionesAusente: 0,
                    leccionesTardia: 0,
                    leccionesJustificada: 0,
                    totalLecciones: 0,
                    porcentajeAsistencia: 100,
                    notaPonderada: (100 * pesoAsistencia) / 100
                });
                continue;
            }

            const leccionesPerdidas = leccionesAusente + (leccionesTardia / tardiasPorAusencia);
            const maxLeccionesPermitidas = maxAusencias * this.leccionesPorDefecto;

            let porcentajeAsistencia = 100;
            if (totalLeccionesEst > 0) {
                if (leccionesPerdidas >= maxLeccionesPermitidas) {
                    porcentajeAsistencia = 0;
                } else {
                    porcentajeAsistencia = 100 * (1 - leccionesPerdidas / maxLeccionesPermitidas);
                }
            }
            porcentajeAsistencia = Math.round(porcentajeAsistencia * 10) / 10;

            const notaPonderada = (porcentajeAsistencia * pesoAsistencia) / 100;
            const notaMostrar = Math.round(notaPonderada * 10) / 10;

            informe.push({
                nombre: this.app.students.getFullName(est),
                leccionesPresente: Math.round(leccionesPresente * 10) / 10,
                leccionesAusente: Math.round(leccionesAusente * 10) / 10,
                leccionesTardia: Math.round(leccionesTardia * 10) / 10,
                leccionesJustificada: Math.round(leccionesJustificada * 10) / 10,
                totalLecciones: totalLeccionesEst,
                porcentajeAsistencia: porcentajeAsistencia,
                notaPonderada: notaMostrar
            });
        }

        this.mostrarTablaInforme(informe, pesoAsistencia);
    }

    // ------------------------------------------------------------
    // Mostrar tabla del informe (plana, sin árbol)
    // ------------------------------------------------------------
    mostrarTablaInforme(informe, pesoAsistencia) {
        let html = `
            <div style="max-height:500px; overflow-y:auto; margin-top:12px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:var(--bg-hover); position:sticky; top:0; z-index:3;">
                            <th style="padding:8px; text-align:left; min-width:120px;">Estudiante</th>
                            <th style="padding:8px; text-align:center; background:rgba(166,227,161,0.1);">✅ Presente</th>
                            <th style="padding:8px; text-align:center; background:rgba(243,139,168,0.1);">❌ Ausente</th>
                            <th style="padding:8px; text-align:center; background:rgba(249,226,175,0.1);">⏰ Tardía</th>
                            <th style="padding:8px; text-align:center; background:rgba(137,180,250,0.1);">📝 Justificada</th>
                            <th style="padding:8px; text-align:center;">Total Lec.</th>
                            <th style="padding:8px; text-align:center;">% Asist.</th>
                            <th style="padding:8px; text-align:center; background:rgba(249,226,175,0.15); color:#f9e2af;">Nota (${pesoAsistencia}%)</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (const item of informe) {
            const color = item.porcentajeAsistencia >= 80 ? '#a6e3a1' : (item.porcentajeAsistencia >= 60 ? '#f9e2af' : '#f38ba8');
            const notaColor = item.notaPonderada >= (pesoAsistencia * 0.7) ? '#a6e3a1' : '#f38ba8';

            html += `
                <tr style="border-bottom:1px solid var(--border-color);">
                    <td style="padding:6px 8px; font-weight:500;">${escapeHtml(item.nombre)}</td>
                    <td style="padding:6px 8px; text-align:center; background:rgba(166,227,161,0.05);">${item.leccionesPresente}</td>
                    <td style="padding:6px 8px; text-align:center; background:rgba(243,139,168,0.05);">${item.leccionesAusente}</td>
                    <td style="padding:6px 8px; text-align:center; background:rgba(249,226,175,0.05);">${item.leccionesTardia}</td>
                    <td style="padding:6px 8px; text-align:center; background:rgba(137,180,250,0.05);">${item.leccionesJustificada}</td>
                    <td style="padding:6px 8px; text-align:center;">${item.totalLecciones}</td>
                    <td style="padding:6px 8px; text-align:center; font-weight:bold; color:${color};">${item.porcentajeAsistencia}%</td>
                    <td style="padding:6px 8px; text-align:center; font-weight:700; color:${notaColor}; background:rgba(249,226,175,0.05);">
                        ${item.notaPonderada}
                    </td>
                </tr>
            `;
        }

        html += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top:12px; font-size:12px; color:var(--text-muted);">
                * Configuración: máximo de ausencias permitidas = <strong>${this.maxAusencias}</strong>, 
                ${this.tardiasPorAusencia} tardías = 1 ausencia.<br>
                💡 La <strong>Nota</strong> es el porcentaje de asistencia ponderado por el peso asignado (${pesoAsistencia}%).<br>
                📊 Los totales corresponden a la suma de todas las lecciones de todos los registros.
            </div>
        `;

        Swal.fire({
            title: '📊 Informe de Asistencia por Estudiante (basado en lecciones)',
            html: html,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            confirmButtonText: 'Ok',
            showCloseButton: true,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '1100px'
        });
    }

    // ------------------------------------------------------------
    // Configuración de porcentaje
    // ------------------------------------------------------------
    async mostrarConfiguracionPorcentaje() {
        const result = await Swal.fire({
            title: 'Configurar porcentaje y parámetros de asistencia',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">Porcentaje que la asistencia aporta a la nota final:</label>
                    <input id="swal-porcentaje" class="swal2-input" type="number" min="0" max="100" value="${this.porcentajeAsignado}" step="1">
                    <span style="font-size:11px; color:var(--text-muted);">Ejemplo: 10% → la asistencia vale hasta 10 puntos.</span>
                    
                    <label style="font-size:13px; color:var(--text-secondary); margin-top:8px;">Máximo de ausencias permitidas (para obtener 0% en asistencia):</label>
                    <input id="swal-max-ausencias" class="swal2-input" type="number" min="1" max="20" value="${this.maxAusencias}" step="1">
                    <span style="font-size:11px; color:var(--text-muted);">Si un estudiante tiene más de este número de ausencias (o su equivalente), su nota de asistencia será 0.</span>
                    
                    <label style="font-size:13px; color:var(--text-secondary); margin-top:8px;">Tardías que equivalen a una ausencia:</label>
                    <input id="swal-tardias-por-ausencia" class="swal2-input" type="number" min="1" max="10" value="${this.tardiasPorAusencia}" step="1">
                    <span style="font-size:11px; color:var(--text-muted);">Ejemplo: 2 → cada 2 tardías cuentan como 1 ausencia.</span>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const p = parseFloat(document.getElementById('swal-porcentaje').value);
                const maxA = parseInt(document.getElementById('swal-max-ausencias').value);
                const tardias = parseInt(document.getElementById('swal-tardias-por-ausencia').value);
                if (isNaN(p) || p < 0 || p > 100) {
                    Swal.showValidationMessage('Porcentaje debe estar entre 0 y 100');
                    return;
                }
                if (isNaN(maxA) || maxA < 1) {
                    Swal.showValidationMessage('Máximo de ausencias debe ser al menos 1');
                    return;
                }
                if (isNaN(tardias) || tardias < 1) {
                    Swal.showValidationMessage('Tardías por ausencia debe ser al menos 1');
                    return;
                }
                return { porcentaje: p, maxAusencias: maxA, tardiasPorAusencia: tardias };
            }
        });
        if (result.isConfirmed) {
            const { porcentaje, maxAusencias, tardiasPorAusencia } = result.value;
            await this.guardarPorcentaje(porcentaje, maxAusencias, tardiasPorAusencia);
        }
    }

    // ------------------------------------------------------------
    // Descargar PDF con historial de asistencia por estudiante
    // ------------------------------------------------------------
    async descargarPDFAsistencia() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) {
            this.app.ui.showError('No hay sección seleccionada');
            return;
        }

        const estudiantes = this.getEstudiantes();
        if (estudiantes.length === 0) {
            this.app.ui.showError('No hay estudiantes');
            return;
        }

        try {
            // Cargar librerías si no están disponibles
            await this.cargarLibreriasPDF();

            // Verificar que jsPDF y autoTable estén disponibles
            if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
                throw new Error('jsPDF no está disponible después de la carga');
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('landscape', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();

            // Verificar autoTable
            if (typeof doc.autoTable !== 'function') {
                throw new Error('jspdf-autotable no se cargó correctamente');
            }

            const todos = await this.getRegistros();
            const dataPorEstudiante = {};
            for (const est of estudiantes) {
                const estudianteId = Number(est.id);
                const registros = todos.filter(r => Number(r.estudianteId) === estudianteId);
                registros.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                dataPorEstudiante[est.id] = {
                    nombre: this.app.students.getFullName(est),
                    registros: registros
                };
            }

            const seccion = this.app.sections.getCurrent();
            const titulo = `Historial de Asistencia - ${seccion ? seccion.nombre : 'Sección'}`;
            doc.setFontSize(16);
            doc.text(titulo, pageWidth / 2, 15, { align: 'center' });
            doc.setFontSize(10);
            doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });

            let yPos = 30;

            for (const [id, data] of Object.entries(dataPorEstudiante)) {
                const { nombre, registros } = data;

                if (registros.length === 0) {
                    doc.setFontSize(11);
                    doc.text(`Estudiante: ${nombre} - Sin registros`, 14, yPos);
                    yPos += 8;
                    continue;
                }

                doc.setFontSize(12);
                doc.text(`Estudiante: ${nombre}`, 14, yPos);
                yPos += 6;

                const tableData = registros.map(r => {
                    const fecha = r.fecha || 'Sin fecha';
                    const estado = r.estado || 'presente';
                    const lecciones = r.lecciones || this.leccionesPorDefecto;
                    return [fecha, estado, lecciones];
                });

                const tableHeight = tableData.length * 6 + 10;
                if (yPos + tableHeight > pageHeight - 15) {
                    doc.addPage();
                    yPos = 20;
                }

                doc.autoTable({
                    startY: yPos,
                    head: [['Fecha', 'Estado', 'Lecciones']],
                    body: tableData,
                    theme: 'striped',
                    styles: { fontSize: 9 },
                    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
                    margin: { left: 14, right: 14 }
                });

                yPos = doc.lastAutoTable.finalY + 6;
            }

            doc.save(`Historial_Asistencia_${new Date().toISOString().slice(0,10)}.pdf`);
            this.app.ui.showSuccess('PDF generado correctamente');
        } catch (error) {
            console.error('Error generando PDF:', error);
            this.app.ui.showError('Error al generar el PDF: ' + error.message);
        }
    }

    // ------------------------------------------------------------
    // Cargar librerías jsPDF y autoTable desde CDN (mejorado)
    // ------------------------------------------------------------
    cargarLibreriasPDF() {
        return new Promise((resolve, reject) => {
            // Si ya están cargadas y autoTable funciona, resolver
            if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                try {
                    const testDoc = new window.jspdf.jsPDF();
                    if (typeof testDoc.autoTable === 'function') {
                        resolve();
                        return;
                    }
                } catch (e) {
                    // Si falla, continuar con la carga
                }
            }

            // Cargar jsPDF
            const script1 = document.createElement('script');
            script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script1.crossOrigin = 'anonymous';
            script1.onload = () => {
                // Cargar autoTable
                const script2 = document.createElement('script');
                script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
                script2.crossOrigin = 'anonymous';
                script2.onload = () => {
                    // Verificar que autoTable esté disponible
                    if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                        // Forzar asignación si no se aplicó automáticamente
                        if (typeof window.jspdf.jsPDF.prototype.autoTable === 'undefined') {
                            if (typeof window.jspdf.autoTable !== 'undefined') {
                                window.jspdf.jsPDF.prototype.autoTable = window.jspdf.autoTable;
                            }
                        }
                        resolve();
                    } else {
                        reject(new Error('jsPDF no disponible después de cargar autoTable'));
                    }
                };
                script2.onerror = () => reject(new Error('Error cargando jspdf-autotable'));
                document.head.appendChild(script2);
            };
            script1.onerror = () => reject(new Error('Error cargando jsPDF'));
            document.head.appendChild(script1);
        });
    }
}