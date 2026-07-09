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
            fecha,
            timestamp,
            estudianteId,
            estado,
            lecciones: this.leccionesPorDefecto
        };
        const id = await this.app.db.add(STORES.ASISTENCIA, nuevoRegistro);
        // Guardar el id en el mapa para futuras actualizaciones
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

        // Si no hay estados cargados, inicializar todos a presente
        if (Object.keys(this.estadosActuales).length === 0) {
            for (const est of estudiantes) {
                this.estadosActuales[est.id] = 'presente';
            }
        }

        const hoy = getDayMonth();
        const timestamp = new Date().toISOString(); // nuevo timestamp

        try {
            for (const est of estudiantes) {
                const estado = this.estadosActuales[est.id] || 'presente';
                const nuevoReg = {
                    seccionId,
                    fecha: hoy,
                    timestamp,
                    estudianteId: est.id,
                    estado,
                    lecciones: this.leccionesPorDefecto
                };
                const id = await this.app.db.add(STORES.ASISTENCIA, nuevoReg);
                // Actualizar mapa de ids para la fecha actual (hoy)
                this.registrosActuales[est.id] = id;
            }
            this.app.ui.showSuccess(`✅ Nuevo pase de lista del ${hoy} guardado (${timestamp})`);
            // Mostrar el nuevo registro
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

    // ------------------------------------------------------------
    // Informe por estudiante
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

        const todos = await this.getRegistros();
        const fechasUnicas = new Set(todos.map(r => r.fecha));
        const totalClases = fechasUnicas.size;

        const informe = [];
        for (const est of estudiantes) {
            const registrosEst = todos.filter(r => r.estudianteId === est.id);
            let ausenciasJustificadas = 0, ausenciasInjustificadas = 0, tardias = 0;
            for (const r of registrosEst) {
                if (r.estado === 'justificada') ausenciasJustificadas++;
                else if (r.estado === 'ausente') ausenciasInjustificadas++;
                else if (r.estado === 'tardia') tardias++;
            }
            const faltasEquivalentes = ausenciasInjustificadas + (tardias * 0.5);
            const asistidas = Math.max(0, totalClases - faltasEquivalentes);
            const porcentaje = totalClases > 0 ? Math.min(100, Math.round((asistidas / totalClases) * 100)) : 100;

            informe.push({
                nombre: this.app.students.getFullName(est),
                totalClases,
                ausenciasJustificadas,
                ausenciasInjustificadas,
                tardias,
                porcentaje
            });
        }

        let tablaHtml = `
            <div style="max-height:400px; overflow-y:auto; margin-top:12px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:var(--bg-hover);">
                            <th style="padding:8px; text-align:left;">Estudiante (click para filtrar)</th>
                            <th style="padding:8px; text-align:center;">Clases</th>
                            <th style="padding:8px; text-align:center;">Justificadas</th>
                            <th style="padding:8px; text-align:center;">Injustificadas</th>
                            <th style="padding:8px; text-align:center;">Tardías</th>
                            <th style="padding:8px; text-align:center;">% Asistencia</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        for (const item of informe) {
            const color = item.porcentaje >= 80 ? '#a6e3a1' : (item.porcentaje >= 60 ? '#f9e2af' : '#f38ba8');
            tablaHtml += `
                <tr style="border-bottom:1px solid var(--border-color); cursor:pointer;" 
                    onclick="window.app.asistenciaManager.filtrarPorEstudiante('${escapeHtml(item.nombre)}')"
                    onmouseover="this.style.background='var(--bg-hover)'" 
                    onmouseout="this.style.background='transparent'">
                    <td style="padding:6px 8px;">${escapeHtml(item.nombre)}</td>
                    <td style="padding:6px 8px; text-align:center;">${item.totalClases}</td>
                    <td style="padding:6px 8px; text-align:center;">${item.ausenciasJustificadas}</td>
                    <td style="padding:6px 8px; text-align:center;">${item.ausenciasInjustificadas}</td>
                    <td style="padding:6px 8px; text-align:center;">${item.tardias}</td>
                    <td style="padding:6px 8px; text-align:center; font-weight:bold; color:${color};">${item.porcentaje}%</td>
                </tr>
            `;
        }
        tablaHtml += `
                    </tbody>
                </table>
            </div>
            <div style="margin-top:12px; font-size:12px; color:var(--text-muted);">
                * Una tardía equivale a media falta. El porcentaje se calcula sobre el total de clases (${totalClases}).
                <br>💡 Haz clic en cualquier estudiante para filtrar y editar sus registros.
            </div>
        `;

        Swal.fire({
            title: '📊 Informe de Asistencia por Estudiante',
            html: tablaHtml,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            confirmButtonText: 'Ok',
            showCloseButton: true,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '650px'
        });
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