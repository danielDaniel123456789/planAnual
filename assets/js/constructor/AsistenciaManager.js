// ============================================================
// AsistenciaManager.js - Gestión de asistencia con guardado automático
// ============================================================

class AsistenciaManager {
    constructor(app) {
        this.app = app;
        this.filtro = '';
        this.fechaSeleccionada = null;
        this.estadosActuales = {};       // { estudianteId: estado }
        this.registrosActuales = {};     // { estudianteId: id_del_registro } para actualizar directamente
        this.porcentajeAsignado = 10;
        this.leccionesPorDefecto = 6;
        this.estudiantesCache = [];
    }

    // ------------------------------------------------------------
    // Carga y guardado de porcentaje
    // ------------------------------------------------------------
    async cargarPorcentaje() {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) return;
        const data = await this.app.db.get(STORES.PORCENTAJES, seccionId);
        if (data?.porcentajes?.asistencia) {
            this.porcentajeAsignado = data.porcentajes.asistencia.porcentaje || 10;
        } else {
            this.porcentajeAsignado = 10;
        }
    }

    async guardarPorcentaje(nuevoPorcentaje) {
        const seccionId = this.app.currentSectionId;
        if (!seccionId) return;
        let data = await this.app.db.get(STORES.PORCENTAJES, seccionId);
        if (!data) {
            data = { seccionId, porcentajes: { ...PORCENTAJES_DEFAULT } };
        }
        data.porcentajes.asistencia = { porcentaje: nuevoPorcentaje, activo: true };
        await this.app.db.put(STORES.PORCENTAJES, data);
        this.porcentajeAsignado = nuevoPorcentaje;
        await this.app.grades.loadPercentages(seccionId);
        this.renderAsistencia(document.getElementById('mainContent'));
        this.app.ui.showSuccess(`Porcentaje de asistencia actualizado a ${nuevoPorcentaje}%`);
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

        this.registrosActuales = {};
        this.estadosActuales = {};

        // Si hay registros de hoy, los usamos, si no, inicializamos con presente
        for (const est of estudiantes) {
            const reg = registrosHoy.find(r => r.estudianteId === est.id);
            if (reg) {
                this.estadosActuales[est.id] = reg.estado;
                this.registrosActuales[est.id] = reg.id;  // guardamos el id para actualizar
                // Actualizar lecciones globales si todos tienen el mismo valor
                if (registrosHoy.length > 0) {
                    const lec = reg.lecciones || this.leccionesPorDefecto;
                    const allSame = registrosHoy.every(r => r.lecciones === lec);
                    if (allSame) {
                        this.leccionesPorDefecto = lec;
                        const input = document.getElementById('leccionesPorDefecto');
                        if (input) input.value = lec;
                    }
                }
            } else {
                this.estadosActuales[est.id] = 'presente';
                this.registrosActuales[est.id] = null;  // no existe aún
            }
        }
        return this.construirTabla(estudiantes, 'hoy');
    }

    async renderTablaFecha(timestamp) {
        const estudiantes = this.getEstudiantes();
        const registros = await this.getRegistrosPorFecha(timestamp);

        this.registrosActuales = {};
        this.estadosActuales = {};

        // Mapa de estudiante -> estado
        const mapa = {};
        for (const r of registros) {
            mapa[r.estudianteId] = { estado: r.estado, id: r.id };
        }
        // Si hay registros, actualizar lecciones por defecto si todas coinciden
        if (registros.length > 0) {
            const lec = registros[0].lecciones || this.leccionesPorDefecto;
            const allSame = registros.every(r => r.lecciones === lec);
            if (allSame) {
                this.leccionesPorDefecto = lec;
                const input = document.getElementById('leccionesPorDefecto');
                if (input) input.value = lec;
            }
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
            ? `📅 Hoy - Nuevo pase de lista (Lecciones: ${this.leccionesPorDefecto})`
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
    // Guardado automático al cambiar estado
    // ------------------------------------------------------------
    async cambiarEstadoYGuardar(estudianteId, nuevoEstado) {
        // Actualizar estado en memoria
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
            ? new Date().toISOString()   // Para hoy, usamos timestamp actual (podríamos usar el mismo si ya existe)
            : this.fechaSeleccionada;     // Para historial, usamos el timestamp de esa fecha

        // Si es "hoy", necesitamos saber si ya existe un registro para este estudiante en la fecha de hoy (sin timestamp fijo)
        // Para simplificar, buscamos por secciónId, fecha y estudianteId, y actualizamos o creamos.
        // Pero como tenemos el id en this.registrosActuales, lo usamos si existe.
        const registroId = this.registrosActuales[estudianteId];

        try {
            if (registroId) {
                // Actualizar registro existente
                const registro = await this.app.db.get(STORES.ASISTENCIA, registroId);
                if (registro) {
                    registro.estado = nuevoEstado;
                    // Las lecciones se mantienen (no se cambian aquí)
                    await this.app.db.put(STORES.ASISTENCIA, registro);
                } else {
                    // Si por alguna razón no se encuentra, crear nuevo
                    await this.crearRegistro(estudianteId, seccionId, fecha, timestamp, nuevoEstado);
                }
            } else {
                // Crear nuevo registro
                await this.crearRegistro(estudianteId, seccionId, fecha, timestamp, nuevoEstado);
            }

            // Mostrar mensaje breve (toast)
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
            // Revertir el select al estado anterior (no implementado por simplicidad)
        }
    }

   async crearRegistro(estudianteId, seccionId, fecha, timestamp, estado) {
    const nuevoRegistro = {
        seccionId,
        fecha: fecha || getDayMonth(),        // DD/MM/YYYY
        timestamp: timestamp || new Date().toISOString(), // ISO con hora
        estudianteId,
        estado,
        lecciones: this.leccionesPorDefecto
    };
    const id = await this.app.db.add(STORES.ASISTENCIA, nuevoRegistro);
    this.registrosActuales[estudianteId] = id;
    return id;
}

    // ------------------------------------------------------------
    // Nuevo pase de lista (crea un nuevo timestamp para hoy)
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
                estado: 'presente',   // <-- Todos presentes
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
        // Actualizar botones activos
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

    const pesoAsistencia = this.app.grades.percentages?.asistencia?.porcentaje || 10;
    const todos = await this.getRegistros();

    // Si quieres calcular el total de lecciones como la suma de TODOS los registros (no agrupados)
    // O podrías seguir agrupando por día para el total de lecciones, pero para el detalle usar todos los registros.
    // Decido: total de lecciones = suma de lecciones de todos los registros (cada pase de lista)
    // Esto da una visión de "cuántas veces se ha pasado lista" en total.

    // Para el total de lecciones, sumamos todas las lecciones de todos los registros
    let totalLeccionesGlobal = 0;
    for (const reg of todos) {
        totalLeccionesGlobal += (reg.lecciones || 6);
    }

    const informe = [];
    for (const est of estudiantes) {
        const estudianteId = Number(est.id);
        const registrosEst = todos.filter(r => Number(r.estudianteId) === estudianteId);

        // Contadores por estado (sobre todos los registros, no agrupados)
        let leccionesPresente = 0;
        let leccionesAusente = 0;
        let leccionesTardia = 0;
        let leccionesJustificada = 0;
        let diasFaltados = 0;

        // Detalle por cada registro (timestamp)
        const detalleRegistros = [];

        for (const reg of registrosEst) {
            const lec = reg.lecciones || 6;
            const estado = reg.estado || 'presente';
            // Guardar fecha y hora formateada
            const fechaDisplay = this.formatearTimestamp(reg.timestamp || reg.fecha);
            detalleRegistros.push({
                timestamp: reg.timestamp,
                fecha: reg.fecha,
                fechaDisplay: fechaDisplay,
                estado: estado,
                lecciones: lec,
                id: reg.id
            });

            switch (estado) {
                case 'presente':
                    leccionesPresente += lec;
                    break;
                case 'ausente':
                    leccionesAusente += lec;
                    diasFaltados++;
                    break;
                case 'tardia':
                    leccionesTardia += lec;
                    diasFaltados++;
                    break;
                case 'justificada':
                    leccionesJustificada += lec;
                    break;
                default:
                    leccionesPresente += lec;
                    break;
            }
        }

        // Ordenar detalle por timestamp (más reciente primero)
        detalleRegistros.sort((a, b) => {
            if (a.timestamp && b.timestamp) {
                return b.timestamp.localeCompare(a.timestamp);
            }
            return b.fecha.localeCompare(a.fecha);
        });

        // Calcular lecciones perdidas (ausente + 0.5*tardia)
        const leccionesPerdidas = leccionesAusente + (leccionesTardia * 0.5);

        let porcentajeAsistencia = 100;
        if (registrosEst.length > 0 && totalLeccionesGlobal > 0) {
            const asistidas = Math.max(0, totalLeccionesGlobal - leccionesPerdidas);
            porcentajeAsistencia = Math.min(100, Math.round((asistidas / totalLeccionesGlobal) * 100));
        } else if (registrosEst.length === 0) {
            porcentajeAsistencia = 100;
        }

        const notaPonderada = (porcentajeAsistencia * pesoAsistencia) / 100;
        const notaMostrar = Math.round(notaPonderada * 10) / 10;

        informe.push({
            nombre: this.app.students.getFullName(est),
            totalRegistros: registrosEst.length,  // Número de pases de lista
            diasFaltados: diasFaltados,
            leccionesPresente: Math.round(leccionesPresente * 10) / 10,
            leccionesAusente: Math.round(leccionesAusente * 10) / 10,
            leccionesTardia: Math.round(leccionesTardia * 10) / 10,
            leccionesJustificada: Math.round(leccionesJustificada * 10) / 10,
            leccionesPerdidas: Math.round(leccionesPerdidas * 10) / 10,
            totalLecciones: totalLeccionesGlobal,
            porcentajeAsistencia: porcentajeAsistencia,
            notaPonderada: notaMostrar,
            detalleRegistros: detalleRegistros  // Array con todos los registros individuales
        });
    }

    this.mostrarTablaInforme(informe, pesoAsistencia);
}


// Método auxiliar para mostrar la tabla (extraído para claridad)
mostrarTablaInforme(informe, pesoAsistencia) {
    let html = `
        <style>
            .tree-row {
                cursor: pointer;
                transition: background 0.2s;
            }
            .tree-row:hover {
                background: var(--bg-hover) !important;
            }
            .tree-detail {
                display: none;
                background: var(--bg-card-secondary);
                border-left: 3px solid var(--border-color);
            }
            .tree-detail.open {
                display: table-row;
            }
            .tree-detail td {
                padding: 4px 8px;
                font-size: 12px;
                color: var(--text-secondary);
            }
            .estado-badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 12px;
                font-size: 11px;
                font-weight: 600;
            }
            .estado-presente { background: rgba(166,227,161,0.2); color: #a6e3a1; }
            .estado-ausente { background: rgba(243,139,168,0.2); color: #f38ba8; }
            .estado-tardia { background: rgba(249,226,175,0.2); color: #f9e2af; }
            .estado-justificada { background: rgba(137,180,250,0.2); color: #89b4fa; }
            .toggle-icon {
                display: inline-block;
                transition: transform 0.3s;
                margin-right: 6px;
            }
            .toggle-icon.open {
                transform: rotate(90deg);
            }
            .tree-row td:first-child {
                position: sticky;
                left: 0;
                background: var(--bg-card);
                z-index: 1;
            }
            .tree-detail td:first-child {
                position: sticky;
                left: 0;
                background: var(--bg-card-secondary);
                z-index: 1;
            }
            .detalle-tabla {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
                background: transparent;
            }
            .detalle-tabla th {
                padding: 4px 8px;
                text-align: left;
                background: var(--bg-hover);
                font-weight: 600;
            }
            .detalle-tabla td {
                padding: 4px 8px;
                border-bottom: 1px solid var(--border-color);
            }
        </style>
        <div style="max-height:500px; overflow-y:auto; margin-top:12px;">
            <table style="width:100%; border-collapse:collapse; font-size:13px;">
                <thead>
                    <tr style="background:var(--bg-hover); position:sticky; top:0; z-index:3;">
                        <th style="padding:8px; text-align:left; min-width:140px;">Estudiante</th>
                        <th style="padding:8px; text-align:center;">Pases</th>
                        <th style="padding:8px; text-align:center;">Faltados</th>
                        <th style="padding:8px; text-align:center; background:rgba(166,227,161,0.1);">✅ Presente</th>
                        <th style="padding:8px; text-align:center; background:rgba(243,139,168,0.1);">❌ Ausente</th>
                        <th style="padding:8px; text-align:center; background:rgba(249,226,175,0.1);">⏰ Tardía</th>
                        <th style="padding:8px; text-align:center; background:rgba(137,180,250,0.1);">📝 Justificada</th>
                        <th style="padding:8px; text-align:center;">Perdidas</th>
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
        const rowId = `row-${item.nombre.replace(/\s+/g, '_')}`;
        const detailId = `detail-${item.nombre.replace(/\s+/g, '_')}`;

        html += `
            <tr class="tree-row" id="${rowId}" onclick="window.app.asistenciaManager.toggleDetalle('${detailId}', this)" style="border-bottom:1px solid var(--border-color);">
                <td style="padding:6px 8px; font-weight:500;">
                    <span class="toggle-icon" id="icon-${detailId}">▶</span>
                    ${escapeHtml(item.nombre)}
                </td>
                <td style="padding:6px 8px; text-align:center;">${item.totalRegistros}</td>
                <td style="padding:6px 8px; text-align:center;">${item.diasFaltados}</td>
                <td style="padding:6px 8px; text-align:center; background:rgba(166,227,161,0.05);">${item.leccionesPresente}</td>
                <td style="padding:6px 8px; text-align:center; background:rgba(243,139,168,0.05);">${item.leccionesAusente}</td>
                <td style="padding:6px 8px; text-align:center; background:rgba(249,226,175,0.05);">${item.leccionesTardia}</td>
                <td style="padding:6px 8px; text-align:center; background:rgba(137,180,250,0.05);">${item.leccionesJustificada}</td>
                <td style="padding:6px 8px; text-align:center;">${item.leccionesPerdidas}</td>
                <td style="padding:6px 8px; text-align:center;">${item.totalLecciones}</td>
                <td style="padding:6px 8px; text-align:center; font-weight:bold; color:${color};">${item.porcentajeAsistencia}%</td>
                <td style="padding:6px 8px; text-align:center; font-weight:700; color:${notaColor}; background:rgba(249,226,175,0.05);">
                    ${item.notaPonderada}
                </td>
            </tr>
            <tr class="tree-detail" id="${detailId}">
                <td colspan="11" style="padding:0;">
                    <div style="padding:8px 16px; background:var(--bg-card-secondary);">
                        <table class="detalle-tabla">
                            <thead>
                                <tr>
                                    <th style="min-width:140px;">📅 Fecha y Hora</th>
                                    <th style="text-align:center;">Estado</th>
                                    <th style="text-align:center;">Lecciones</th>
                                </tr>
                            </thead>
                            <tbody>
        `;

        if (item.detalleRegistros && item.detalleRegistros.length > 0) {
            for (const reg of item.detalleRegistros) {
                const estadoLabel = {
                    'presente': '✅ Presente',
                    'ausente': '❌ Ausente',
                    'tardia': '⏰ Tardía',
                    'justificada': '📝 Justificada'
                }[reg.estado] || reg.estado;

                const estadoClass = {
                    'presente': 'estado-presente',
                    'ausente': 'estado-ausente',
                    'tardia': 'estado-tardia',
                    'justificada': 'estado-justificada'
                }[reg.estado] || '';

                html += `
                    <tr>
                        <td>${reg.fechaDisplay}</td>
                        <td style="text-align:center;">
                            <span class="estado-badge ${estadoClass}">${estadoLabel}</span>
                        </td>
                        <td style="text-align:center;">${reg.lecciones}</td>
                    </tr>
                `;
            }
        } else {
            html += `
                <tr>
                    <td colspan="3" style="padding:8px; text-align:center; color:var(--text-muted);">Sin registros</td>
                </tr>
            `;
        }

        html += `
                            </tbody>
                        </table>
                    </div>
                </td>
            </tr>
        `;
    }

    html += `
                </tbody>
            </table>
        </div>
        <div style="margin-top:12px; font-size:12px; color:var(--text-muted);">
            * Una tardía equivale a <strong>media lección</strong> perdida.<br>
            💡 La <strong>Nota</strong> es el porcentaje de asistencia ponderado por el peso asignado (${pesoAsistencia}%).<br>
            📌 Haz clic en el nombre de un estudiante para expandir/colapsar el detalle de todos sus pases de lista.
        </div>
    `;

    Swal.fire({
        title: '📊 Informe de Asistencia por Estudiante (historial completo)',
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


toggleDetalle(detailId, rowElement) {
    const detailRow = document.getElementById(detailId);
    const icon = document.getElementById(`icon-${detailId}`);
    if (!detailRow) return;

    const isOpen = detailRow.classList.contains('open');
    if (isOpen) {
        detailRow.classList.remove('open');
        if (icon) icon.classList.remove('open');
    } else {
        detailRow.classList.add('open');
        if (icon) icon.classList.add('open');
        // Cerrar otros detalles (opcional)
        // Si quieres que solo se abra uno a la vez, descomenta esto:
        // document.querySelectorAll('.tree-detail.open').forEach(row => {
        //     if (row.id !== detailId) {
        //         row.classList.remove('open');
        //         const otherIcon = document.getElementById(`icon-${row.id}`);
        //         if (otherIcon) otherIcon.classList.remove('open');
        //     }
        // });
    }
}
    // ------------------------------------------------------------
    // Configuración de porcentaje
    // ------------------------------------------------------------
    async mostrarConfiguracionPorcentaje() {
        const result = await Swal.fire({
            title: 'Configurar porcentaje de asistencia',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">Porcentaje que la asistencia aporta a la nota final:</label>
                    <input id="swal-porcentaje" class="swal2-input" type="number" min="0" max="100" value="${this.porcentajeAsignado}" step="1">
                    <span style="font-size:11px; color:var(--text-muted);">Ejemplo: si pones 10%, la asistencia valdrá hasta 10 puntos en la nota final.</span>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const val = parseFloat(document.getElementById('swal-porcentaje').value);
                if (isNaN(val) || val < 0 || val > 100) {
                    Swal.showValidationMessage('Ingresa un valor entre 0 y 100');
                    return;
                }
                return val;
            }
        });
        if (result.isConfirmed) {
            await this.guardarPorcentaje(result.value);
        }
    }
}