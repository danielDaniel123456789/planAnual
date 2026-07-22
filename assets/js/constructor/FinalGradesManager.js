// ============================================================
// FinalGradesManager.js - Notas finales (CON ASISTENCIA REAL)
// ============================================================

class FinalGradesManager {
    constructor(app) {
        this.app = app;
        this.tipoLabels = {
            cotidiano: 'Cotidianos',
            tarea: 'Tareas',
            examen: 'Exámenes',
            proyecto: 'Proyectos',
            asistencia: 'Asistencia'
        };
        this.tipoColores = {
            cotidiano: '#4a7ec7',
            tarea: '#3da55d',
            examen: '#d4a017',
            proyecto: '#e67e22',
            asistencia: '#8e44ad'
        };
        this.tipoColoresBgFluorescente = {
            cotidiano: 'rgba(74, 126, 199, 0.35)',
            tarea: 'rgba(61, 165, 93, 0.35)',
            examen: 'rgba(212, 160, 23, 0.35)',
            proyecto: 'rgba(230, 126, 34, 0.35)',
            asistencia: 'rgba(142, 68, 173, 0.35)'
        };
        this.tipoColoresBgApagado = {
            cotidiano: 'rgba(74, 126, 199, 0.05)',
            tarea: 'rgba(61, 165, 93, 0.05)',
            examen: 'rgba(212, 160, 23, 0.05)',
            proyecto: 'rgba(230, 126, 34, 0.05)',
            asistencia: 'rgba(142, 68, 173, 0.05)'
        };
        this.tipoColoresBgHover = {
            cotidiano: 'rgba(74, 126, 199, 0.55)',
            tarea: 'rgba(61, 165, 93, 0.55)',
            examen: 'rgba(212, 160, 23, 0.55)',
            proyecto: 'rgba(230, 126, 34, 0.55)',
            asistencia: 'rgba(142, 68, 173, 0.55)'
        };
        this.tipoColoresBorde = {
            cotidiano: 'rgba(74, 126, 199, 0.6)',
            tarea: 'rgba(61, 165, 93, 0.6)',
            examen: 'rgba(212, 160, 23, 0.6)',
            proyecto: 'rgba(230, 126, 34, 0.6)',
            asistencia: 'rgba(142, 68, 173, 0.6)'
        };
        this.tipoIconos = {
            cotidiano: 'fas fa-clipboard-list',
            tarea: 'fas fa-tasks',
            examen: 'fas fa-file-alt',
            proyecto: 'fas fa-rocket',
            asistencia: 'fas fa-calendar-check'
        };
        this.tiposNotasFinales = ['cotidiano', 'tarea', 'examen', 'proyecto', 'asistencia'];
    }

    // ------------------------------------------------------------
    // Método auxiliar: calcular porcentaje de asistencia real
    // ------------------------------------------------------------
// ------------------------------------------------------------
// Calcular asistencia del estudiante (misma lógica que en AsistenciaManager)
// ------------------------------------------------------------
async calcularAsistenciaEstudiante(studentId) {
    const seccionId = this.app.currentSectionId;
    if (!seccionId) return 0;

    // Obtener todos los registros de asistencia de la sección
    let todos = [];
    try {
        todos = await this.app.db.getByIndex(STORES.ASISTENCIA, 'seccionId', seccionId);
    } catch (e) {
        console.warn('Error obteniendo registros de asistencia:', e);
        return 0;
    }

    if (!todos || todos.length === 0) {
        // Sin registros → 100% de asistencia (puedes cambiarlo a 0 si prefieres)
        return 100;
    }

    // Obtener parámetros de asistencia desde AsistenciaManager (o cargarlos directamente)
    const asistenciaManager = this.app.asistenciaManager;
    if (!asistenciaManager) {
        // Si no existe, usar valores por defecto
        const maxAusencias = 3;
        const tardiasPorAusencia = 2;
        const leccionesPorDefecto = 1;
        return await this._calcularAsistenciaConParametros(studentId, todos, maxAusencias, tardiasPorAusencia, leccionesPorDefecto);
    }

    // Cargar configuración si no está cargada
    await asistenciaManager.cargarPorcentaje();
    const maxAusencias = asistenciaManager.maxAusencias;
    const tardiasPorAusencia = asistenciaManager.tardiasPorAusencia;
    const leccionesPorDefecto = asistenciaManager.leccionesPorDefecto;

    return await this._calcularAsistenciaConParametros(studentId, todos, maxAusencias, tardiasPorAusencia, leccionesPorDefecto);
}

// ------------------------------------------------------------
// Método auxiliar para el cálculo (evita duplicar código)
// ------------------------------------------------------------
async _calcularAsistenciaConParametros(studentId, todos, maxAusencias, tardiasPorAusencia, leccionesPorDefecto) {
    const estudianteIdNum = Number(studentId);
    const registrosEst = todos.filter(r => Number(r.estudianteId) === estudianteIdNum);

    let leccionesPresente = 0;
    let leccionesAusente = 0;
    let leccionesTardia = 0;
    let leccionesJustificada = 0;
    let totalLeccionesEst = 0;

    for (const reg of registrosEst) {
        const lec = reg.lecciones || leccionesPorDefecto;
        totalLeccionesEst += lec;
        switch (reg.estado) {
            case 'presente': leccionesPresente += lec; break;
            case 'ausente': leccionesAusente += lec; break;
            case 'tardia': leccionesTardia += lec; break;
            case 'justificada': leccionesJustificada += lec; break;
        }
    }

    if (registrosEst.length === 0 || totalLeccionesEst === 0) {
        return 100; // Si no hay registros o total 0, consideramos 100%
    }

    const leccionesPerdidas = leccionesAusente + (leccionesTardia / tardiasPorAusencia);
    const maxLeccionesPermitidas = maxAusencias * leccionesPorDefecto;

    let porcentajeAsistencia = 100;
    if (totalLeccionesEst > 0) {
        if (leccionesPerdidas >= maxLeccionesPermitidas) {
            porcentajeAsistencia = 0;
        } else {
            porcentajeAsistencia = 100 * (1 - leccionesPerdidas / maxLeccionesPermitidas);
        }
    }
    porcentajeAsistencia = Math.round(porcentajeAsistencia * 10) / 10;

    return porcentajeAsistencia;
}

    // ------------------------------------------------------------
    // Render principal
    // ------------------------------------------------------------
    async renderFinalGrades(container) {
        const studentsList = this.app.students.list || [];
        const columnasAgrupadas = this.app.grades.getColumnasAgrupadas();

        if (studentsList.length === 0) {
            container.innerHTML = this.getEmptyStudentsHTML();
            return;
        }

        // Inicializar estados de expansión
        for (const tipo of this.tiposNotasFinales) {
            if (!(tipo in this.app._gruposExpandidos)) {
                this.app._gruposExpandidos[tipo] = false;
            }
        }

        // Construir grupos (incluyendo asistencia si hay registros)
        const grupos = await this.buildGroups(columnasAgrupadas);
        const todasLasColumnas = this.flattenColumns(grupos);
        const totalColumnas = todasLasColumnas.length;

        if (totalColumnas === 0) {
            container.innerHTML = this.getEmptyWorksHTML();
            return;
        }

        let html = this.buildHeaderHTML(grupos, studentsList.length, totalColumnas);
        html += this.buildFilterBarHTML(grupos);
        html += this.buildTableHeaderHTML(grupos, todasLasColumnas);
        html += await this.buildTableBodyHTML(studentsList, todasLasColumnas);
        html += this.buildFooterHTML(grupos);

        container.innerHTML = html;
    }

    // ------------------------------------------------------------
    // Construcción de grupos (AHORA ASINCRÓNICA)
    // ------------------------------------------------------------
    async buildGroups(columnasAgrupadas) {
        const grupos = [];
        const tipos = this.tiposNotasFinales;

        // Verificar si hay registros de asistencia en la sección
        const seccionId = this.app.currentSectionId;
        let hayAsistencia = false;
        if (seccionId) {
            const registros = await this.app.attendance.getAllBySection(seccionId);
            hayAsistencia = registros.length > 0;
        }

        for (const tipo of tipos) {
            let items = [];
            let esAsistencia = false;

          if (tipo === 'asistencia') {
    // Verificar si el porcentaje de asistencia está activo
    const porcentajeAsistencia = this.app.grades.percentages?.asistencia;
    if (porcentajeAsistencia && porcentajeAsistencia.activo) {
        esAsistencia = true;
        items = [{ id: 'asistencia', nombre: 'Asistencia', puntosMax: 100, esAsistencia: true }];
    }
} else {
    items = columnasAgrupadas[tipo] || [];
}

            if (items.length === 0) continue;

            const expandido = this.app._gruposExpandidos[tipo] || false;
            const estaSeleccionado = this.app._categoriaSeleccionada === tipo;
            const color = estaSeleccionado ? this.tipoColores[tipo] : 'var(--text-muted)';
            const colorBg = estaSeleccionado ? this.tipoColoresBgFluorescente[tipo] : this.tipoColoresBgApagado[tipo];
            const colorBgHover = this.tipoColoresBgHover[tipo] || 'var(--bg-active)';
            const bordeColor = estaSeleccionado ? this.tipoColoresBorde[tipo] : 'transparent';

            grupos.push({
                tipo: tipo,
                label: this.tipoLabels[tipo] || tipo,
                color: color,
                colorBg: colorBg,
                colorBgHover: colorBgHover,
                bordeColor: bordeColor,
                icono: this.tipoIconos[tipo] || 'fas fa-tag',
                items: items,
                expandido: expandido,
                esAsistencia: esAsistencia,
                estaSeleccionado: estaSeleccionado,
                columnas: expandido ? items.map(item => ({
                    id: item.id,
                    nombre: item.nombre || `${this.tipoLabels[tipo]} ${items.indexOf(item) + 1}`,
                    nombreCompleto: item.nombre || `${this.tipoLabels[tipo]} ${items.indexOf(item) + 1}`,
                    puntosMax: item.puntosMax || 100,
                    esGrupo: false,
                    esAsistencia: esAsistencia,
                    tipo: tipo,
                    color: color,
                    colorBg: colorBg,
                    colorBgHover: colorBgHover,
                    bordeColor: bordeColor,
                    grupoLabel: this.tipoLabels[tipo] || tipo,
                    expandido: true,
                    fecha: item.fecha || 'Sin fecha',
                    rubrica: item.rubrica || null,
                    fechaAsignacion: item.fechaAsignacion || null,
                    fechaEntrega: item.fechaEntrega || null,
                    estaSeleccionado: estaSeleccionado
                })) : [{
                    id: `grupo_${tipo}`,
                    nombre: `${this.tipoLabels[tipo] || tipo} (${items.length})`,
                    nombreCompleto: `${this.tipoLabels[tipo] || tipo} (${items.length})`,
                    puntosMax: 100,
                    esGrupo: true,
                    esAsistencia: esAsistencia,
                    tipo: tipo,
                    color: color,
                    colorBg: colorBg,
                    colorBgHover: colorBgHover,
                    bordeColor: bordeColor,
                    grupoLabel: this.tipoLabels[tipo] || tipo,
                    items: items,
                    expandido: false,
                    estaSeleccionado: estaSeleccionado
                }]
            });
        }
        return grupos;
    }

    flattenColumns(grupos) {
        const todas = [];
        for (const grupo of grupos) {
            for (const col of grupo.columnas) {
                todas.push(col);
            }
        }
        return todas;
    }

    // ------------------------------------------------------------
    // Métodos auxiliares para HTML (sin cambios importantes)
    // ------------------------------------------------------------
    getEmptyStudentsHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No hay estudiantes registrados para calcular notas finales</p>
                <button class="btn-action btn-primary" onclick="window.app?.onCategoryClick('estudiantes')">
                    <i class="fas fa-users"></i> Gestionar Estudiantes
                </button>
            </div>`;
    }

    getEmptyWorksHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-chart-line"></i>
                <p>No hay trabajos registrados</p>
            </div>`;
    }

    buildHeaderHTML(grupos, estudiantesCount, totalColumnas) {
        const todasExpandidas = Object.values(this.app._gruposExpandidos).every(v => v === true);
        return `
            <div class="works-header">
                <h2>
                    <i class="fas fa-calculator"></i>
                    Notas Finales - Edición Directa
                    <span class="count">(${estudiantesCount} estudiantes · ${totalColumnas} columnas)</span>
                </h2>Cotidiano
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-info" onclick="window.app?.toggleAllGroups()">
                        <i class="fas fa-${todasExpandidas ? 'compress-arrows-alt' : 'expand-arrows-alt'}"></i>
                        ${todasExpandidas ? 'Agrupar todo' : 'Desagrupar todo'}
                    </button>
                    ${this.app._categoriaSeleccionada ? `
                        <button class="btn-action btn-secondary" onclick="window.app?.limpiarSeleccionCategoria()" style="background:var(--bg-hover); color:var(--text-secondary);">
                            <i class="fas fa-times"></i> Limpiar selección
                        </button>
                    ` : ''}
                   

                 
<button class="btn-action btn-info" onclick="descargarPDFEstudiante()">
    <i class="fas fa-file-pdf"></i> PDF por Estudiante
</button>

<button class="btn-action btn-info" onclick="descargarCVC_Estudiantes()">
    <i class="fas fa-file-pdf"></i> SEA CVC 
</button>
                </div>
            </div>`;
    }

    buildFilterBarHTML(grupos) {
        return `
            <div style="display:flex; gap:16px; flex-wrap:wrap; margin-bottom:12px; padding:8px 12px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
                ${grupos.map(g => {
                    const isSelected = this.app._categoriaSeleccionada === g.tipo;
                    return `
                        <span style="display:flex; align-items:center; gap:6px; font-size:12px; cursor:pointer; padding:4px 10px; border-radius:6px; background:${isSelected ? g.colorBg : 'transparent'}; border:${isSelected ? '2px solid ' + g.color : '2px solid transparent'}; transition:all 0.3s;"
                            onclick="window.app?.seleccionarCategoria('${g.tipo}')" 
                            onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'"
                            title="Click para seleccionar ${g.label}">
                            <span style="display:inline-block; width:14px; height:14px; border-radius:4px; background:${g.color};"></span>
                            <span style="color:${isSelected ? g.color : 'var(--text-secondary)'}; font-weight:${isSelected ? '700' : '400'};">${g.label}</span>
                            <span style="font-size:10px; color:var(--text-muted);">${g.expandido ? '🔓' : '🔒'}</span>
                            ${isSelected ? '<span style="font-size:12px; color:' + g.color + ';">✦</span>' : ''}
                        </span>
                    `;
                }).join('')}
                <span style="display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-muted); margin-left:auto;">
                    <i class="fas fa-arrows-alt-v"></i> Columnas <strong>fluorescentes</strong> verticalmente
                </span>
            </div>`;
    }

    buildTableHeaderHTML(grupos, todasLasColumnas) {
        let html = `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <table class="data-table" id="tablaNotasFinales">
                    <thead>
                        <tr>
                            <th style="position:sticky; left:0; background:var(--bg-secondary); z-index:11; min-width:40px;">#</th>
                            <th style="position:sticky; left:40px; background:var(--bg-secondary); z-index:11; min-width:120px;">Estudiante</th>`;

        for (const grupo of grupos) {
            const colspan = grupo.expandido ? grupo.items.length : 1;
            const isSelected = grupo.estaSeleccionado;
            const borderColor = isSelected ? grupo.color : 'var(--border-color)';
            const textColor = isSelected ? grupo.color : 'var(--text-muted)';
            html += `
                <th colspan="${colspan}" style="background:${grupo.colorBg}; border-bottom:3px solid ${borderColor}; cursor:pointer; padding:8px 4px; text-align:center; transition:all 0.3s;" 
                    onclick="window.app?.toggleGrupo('${grupo.tipo}')" title="Click para ${grupo.expandido ? 'agrupar' : 'desagrupar'}">
                    <i class="${grupo.icono}" style="color:${textColor}; margin-right:4px; transition:all 0.3s;"></i>
                    <span style="color:${textColor}; font-weight:${isSelected ? '700' : '400'}; transition:all 0.3s;">${grupo.label}</span>
                    <span style="color:var(--text-muted); font-size:10px;">(${grupo.expandido ? grupo.items.length + ' items' : 'Σ ' + grupo.items.length + ' items'})</span>
                    <i class="fas fa-${grupo.expandido ? 'compress-arrows-alt' : 'expand-arrows-alt'}" style="font-size:10px; margin-left:4px; color:${textColor}; transition:all 0.3s;"></i>
                    ${isSelected ? `<span style="display:block; font-size:8px; color:${grupo.color}; font-weight:700;">✦ FLUORESCENTE</span>` : ''}
                </th>`;
        }
        html += `
                            <th style="background:var(--bg-active); min-width:80px; text-align:center; font-size:14px; color:var(--text-primary);">
                                <i class="fas fa-sigma"></i> SUMA TOTAL
                            </th>
                        </tr>
                        
                        <tr>
                            <th style="background:var(--bg-secondary);"></th>
                            <th style="background:var(--bg-secondary);"></th>`;

        for (const col of todasLasColumnas) {
            const color = col.color || 'var(--text-muted)';
            const colorBg = col.colorBg || 'var(--bg-hover)';
            const isSelected = col.estaSeleccionado !== undefined ? col.estaSeleccionado : false;
            
            if (col.esGrupo) {
                html += `
                    <th style="background:${colorBg}; color:${color}; font-size:11px; text-align:center; border-bottom:2px solid ${color}; padding:4px; transition:all 0.3s;">
                        <i class="fas fa-sigma"></i> ${col.nombre}
                        <span style="display:block; font-size:8px; color:var(--text-muted);">(suma)</span>
                    </th>`;
            } else {
                const nombreLargo = col.nombre.length > 7;
                const nombreMostrar = nombreLargo ? col.nombre.substring(0, 7) + '…' : col.nombre;
                const nombreCompleto = col.nombreCompleto || col.nombre;
                const fechaAsignacion = col.fechaAsignacion || 'Sin fecha';
                const fechaEntrega = col.fechaEntrega || 'Sin fecha';
                
                html += `
                    <th style="background:${colorBg}; border-bottom:2px solid ${color}; min-width:65px; padding:4px 2px; text-align:center; transition:all 0.3s; ${isSelected ? 'box-shadow: inset 0 0 20px ' + color + ';' : ''}" 
                        title="${escapeHtml(nombreCompleto)}">
                        <div style="display:flex; align-items:center; justify-content:center; gap:3px;">
                            <i class="fas fa-pencil-alt" style="font-size:9px; opacity:${isSelected ? '0.9' : '0.3'}; color:${color};"></i>
                            <span style="color:${color}; font-weight:${isSelected ? '700' : '400'}; font-size:10px; transition:all 0.3s;">
                                ${escapeHtml(nombreMostrar)}
                            </span>
                            ${nombreLargo ? `
                                <i class="fas fa-info-circle" 
                                   style="font-size:11px; color:${color}; cursor:pointer; opacity:${isSelected ? '0.9' : '0.4'}; transition:all 0.3s;"
                                   onclick="event.stopPropagation(); window.app?.mostrarInfoTrabajo('${col.tipo}', ${col.id}, '${escapeHtml(col.nombreCompleto)}', '${col.fecha || 'Sin fecha'}', ${col.puntosMax || 100}, '${fechaAsignacion}', '${fechaEntrega}')"
                                   title="Ver detalles de ${escapeHtml(col.nombreCompleto)}">
                                </i>
                            ` : ''}
                        </div>
                        <span style="display:block; font-size:7px; color:${color}; opacity:${isSelected ? '0.8' : '0.3'}; transition:all 0.3s;">
                            ${col.grupoLabel}
                        </span>
                    </th>`;
            }
        }
        html += `
                            <th style="background:var(--bg-active);"></th>
                        </tr>
                    </thead>
                    <tbody>`;
        return html;
    }

    // ------------------------------------------------------------
    // Cuerpo de la tabla (AHORA ASINCRÓNICO y con corrección de student)
    // ------------------------------------------------------------
    async buildTableBodyHTML(studentsList, todasLasColumnas) {
        let html = '';
        for (let i = 0; i < studentsList.length; i++) {
            const student = studentsList[i];
            const nombreCompleto = this.app.students.getFullName(student);
            let sumaTotalEstudiante = 0;

            html += `
                <tr id="fila-${student.id}" style="transition:all 0.3s;">
                    <td style="position:sticky; left:0; background:var(--bg-card); z-index:5; text-align:center; font-weight:600;">${i + 1}</td>
                    <td style="position:sticky; left:40px; background:var(--bg-card); z-index:5; font-weight:500; color:var(--text-primary); text-align:left;">${escapeHtml(nombreCompleto)}</td>`;

            for (const col of todasLasColumnas) {
                const color = col.color || 'var(--text-muted)';
                const colorBg = col.colorBg || 'var(--bg-hover)';
                const colorBgHover = col.colorBgHover || 'var(--bg-active)';
                const isSelected = col.estaSeleccionado !== undefined ? col.estaSeleccionado : false;
                const bordeColor = col.bordeColor || 'transparent';
                
                if (col.esGrupo) {
                    let sumaGrupo = 0;
                    let tieneNota = false;
                   if (col.esAsistencia) {
    // Calcular el porcentaje de asistencia (0-100)
    const porcentajeAsistencia = await this.calcularAsistenciaEstudiante(student.id);
    
    // Obtener el porcentaje asignado a asistencia (ej. 10)
    const porcentajeAsignado = this.app.grades.percentages?.asistencia?.porcentaje || 10;
    // Calcular el valor ponderado (ej. 50% * 10% = 5%)
    const notaPonderada = (porcentajeAsistencia * porcentajeAsignado) / 100;
    // Redondear a 1 decimal
    const notaMostrar = notaPonderada > 0 ? Math.round(notaPonderada * 10) / 10 : 0;

    // Sumar a la suma total del estudiante
    sumaTotalEstudiante += notaPonderada;

    // Clase CSS para colorear según aprobado/reprobado (se puede ajustar)
    const clase = notaPonderada >= 70 ? 'aprobado' : 'reprobado';

    html += `
        <td class="nota-cell ${clase}" style="background:${colorBg}; text-align:center;">
            <span style="font-weight:600; font-size:13px; color:${notaPonderada >= 70 ? '#a6e3a1' : '#f38ba8'};">
                ${notaMostrar > 0 ? notaMostrar : '-'}
            </span>
            <span style="display:block; font-size:7px; color:var(--text-muted);">(peso ${porcentajeAsignado}%)</span>
        </td>`;
}else {
                        for (const item of col.items) {
                            const nota = this.app.grades.getGrade(student.id, item.id, col.tipo);
                            if (nota !== null && !isNaN(nota)) {
                                sumaGrupo += nota;
                                tieneNota = true;
                            }
                        }
                    }
                    
                    if (tieneNota) {
                        sumaTotalEstudiante += sumaGrupo;
                    }
                    const clase = tieneNota ? (sumaGrupo >= 70 ? 'aprobado' : 'reprobado') : 'pendiente';
                    html += `
                        <td class="total-cell ${clase}" style="font-weight:${isSelected ? '700' : '400'}; background:${colorBg}; font-size:${isSelected ? '14px' : '12px'}; text-align:center; transition:all 0.3s; opacity:${isSelected ? '1' : '0.5'}; border-left:2px solid ${bordeColor};">
                            ${tieneNota ? Math.round(sumaGrupo) : '-'}
                        </td>`;
                } else {
                    let nota = null;
                    let notaStr = '';
                    
                    if (col.esAsistencia) {
                        // Asistencia: calcular porcentaje real
                        const porcentajeAsistencia = await this.calcularAsistenciaEstudiante(student.id);
                        if (porcentajeAsistencia !== null) {
                            nota = porcentajeAsistencia;
                            notaStr = nota !== null && !isNaN(nota) ? nota : '';
                        }
                    } else {
                        nota = this.app.grades.getGrade(student.id, col.id, col.tipo);
                        notaStr = nota !== null && !isNaN(nota) ? nota : '';
                    }
                    
                    const clase = nota !== null && !isNaN(nota) ? (nota >= 70 ? 'aprobado' : '') : 'vacio';
                    
                    if (nota !== null && !isNaN(nota)) {
                        sumaTotalEstudiante += nota;
                    }
                    
                    const esSoloLectura = col.esAsistencia;
                    const inputAttr = esSoloLectura ? 'disabled' : '';
                    const inputStyle = esSoloLectura ? 'opacity:0.8; cursor:not-allowed;' : '';
                    
                    const celdaStyle = isSelected ? 
                        `background:${colorBg}; border-left:3px solid ${color}; box-shadow: inset 0 0 30px ${color};` : 
                        `background:${colorBg}; border-left:1px solid transparent;`;
                    const opacidad = isSelected ? '1' : '0.4';
                    
                    html += `
                        <td class="nota-cell ${clase}" style="${celdaStyle} transition:all 0.3s; opacity:${opacidad};">
                            <input type="number" 
                                class="input-nota ${clase}"
                                data-estudiante="${student.id}"
                                data-trabajo="${col.id}"
                                data-tipo="${col.tipo}"
                                data-fila="${student.id}"
                                ${inputAttr}
                                value="${notaStr}"
                                min="0" max="100"
                                placeholder="-"
                                style="width:50px; padding:4px 2px; border:1px solid transparent; border-radius:4px; background:transparent; color:var(--text-primary); font-weight:${isSelected ? '700' : '400'}; text-align:center; font-size:${isSelected ? '13px' : '11px'}; outline:none; transition:all 0.3s; ${inputStyle}"
                                onfocus="if(!this.disabled){this.style.borderColor='${color}'; this.style.background='${colorBgHover}'; this.style.boxShadow='0 0 20px ${color}';}"
                                onblur="if(!this.disabled){this.style.borderColor='transparent'; this.style.background='transparent'; this.style.boxShadow='none'; window.app?.guardarNotaDesdeInputFinal(this);}"
                                onchange="if(!this.disabled){window.app?.guardarNotaDesdeInputFinal(this);}"
                            />
                            ${esSoloLectura ? '<span style="display:block; font-size:7px; color:var(--text-muted);">(auto)</span>' : ''}
                            ${isSelected ? '<span style="display:block; font-size:7px; color:' + color + '; font-weight:700;">✦</span>' : ''}
                        </td>`;
                }
            }

            const claseSuma = sumaTotalEstudiante > 0 ? (sumaTotalEstudiante >= 70 ? 'aprobado' : 'reprobado') : 'pendiente';
            html += `
                <td class="total-cell ${claseSuma}" id="suma-${student.id}" style="font-weight:700; font-size:15px; background:var(--bg-active); min-width:70px; text-align:center;">
                    ${sumaTotalEstudiante > 0 ? Math.round(sumaTotalEstudiante) : '-'}
                </td>
            </tr>`;
        }

        html += `</tbody></table></div>`;
        return html;
    }

    // ------------------------------------------------------------
    // Footer y demás métodos (sin cambios relevantes)
    // ------------------------------------------------------------
    buildFooterHTML(grupos) {
        const tipoLabels = this.tipoLabels;
        return `
            <div style="margin-top:12px; display:flex; gap:16px; flex-wrap:wrap; font-size:11px; color:var(--text-muted); padding:6px 4px;">
                <span><span style="color:#a6e3a1; font-weight:bold;">●</span> Aprobado (≥70)</span>
                <span><span style="color:#f38ba8; font-weight:bold;">●</span> Reprobado (&lt;70)</span>
                <span><span style="color:var(--text-muted);">●</span> Sin calificar</span>
                <span><i class="fas fa-eye"></i> <strong>${this.app._categoriaSeleccionada ? '🔦 Enfocado en: ' + (tipoLabels[this.app._categoriaSeleccionada] || this.app._categoriaSeleccionada) : 'Ninguna categoría seleccionada'}</strong></span>
                <span><i class="fas fa-arrows-alt-v" style="color:#f9e2af;"></i> Columna <strong>fluorescente</strong> vertical</span>
            </div>`;
    }

    seleccionarCategoria(tipo) {
        if (this.app._categoriaSeleccionada === tipo) {
            this.app._categoriaSeleccionada = null;
        } else {
            this.app._categoriaSeleccionada = tipo;
        }
        this.app.render();
    }

    limpiarSeleccionCategoria() {
        this.app._categoriaSeleccionada = null;
        this.app.render();
    }

    toggleGrupo(tipo) {
        if (!this.app._gruposExpandidos) {
            this.app._gruposExpandidos = {};
            for (const t of this.tiposNotasFinales) {
                this.app._gruposExpandidos[t] = false;
            }
        }
        this.app._gruposExpandidos[tipo] = !this.app._gruposExpandidos[tipo];
        this.app.render();
    }

    toggleAllGroups() {
        if (!this.app._gruposExpandidos) {
            this.app._gruposExpandidos = {};
            for (const t of this.tiposNotasFinales) {
                this.app._gruposExpandidos[t] = false;
            }
        }
        const allExpanded = Object.values(this.app._gruposExpandidos).every(v => v === true);
        for (const t of this.tiposNotasFinales) {
            this.app._gruposExpandidos[t] = !allExpanded;
        }
        this.app.render();
    }

    mostrarInfoTrabajo(tipo, id, nombre, fecha, puntosMax, fechaAsignacion, fechaEntrega) {
        // (Método sin cambios, solo por completitud)
        const tipoLabel = {
            cotidiano: 'Trabajo Cotidiano',
            tarea: 'Tarea',
            examen: 'Examen',
            proyecto: 'Proyecto',
            asistencia: 'Asistencia'
        };
        const tipoIcono = {
            cotidiano: '',
            tarea: '',
            examen: '',
            proyecto: '',
            asistencia: '📅'
        };
        const tipoColor = {
            cotidiano: '#4a7ec7',
            tarea: '#3da55d',
            examen: '#d4a017',
            proyecto: '#e67e22',
            asistencia: '#8e44ad'
        };
        
        let trabajoData = null;
        let rubrica = null;
        let fechaAsig = 'No definida';
        let fechaEnt = 'No definida';
        
        if (tipo !== 'asistencia') {
            const works = this.app.grades.works[tipo] || [];
            trabajoData = works.find(w => w.id === id);
            if (trabajoData) {
                rubrica = trabajoData.rubrica || null;
                if (trabajoData.fechaAsignacion) {
                    const date = new Date(trabajoData.fechaAsignacion + 'T00:00:00');
                    fechaAsig = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                if (trabajoData.fechaEntrega) {
                    const date = new Date(trabajoData.fechaEntrega + 'T00:00:00');
                    fechaEnt = date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                }
            }
        }
        
        let diasRestantesHtml = '';
        if (trabajoData && trabajoData.fechaEntrega) {
            const hoy = new Date();
            hoy.setHours(0, 0, 0, 0);
            const fechaLimite = new Date(trabajoData.fechaEntrega + 'T00:00:00');
            const diffTime = fechaLimite - hoy;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays > 0) {
                diasRestantesHtml = `
                    <span style="font-weight:600; color:var(--text-primary);">⏳ Días restantes:</span>
                    <span style="color:${diffDays <= 3 ? '#f38ba8' : '#a6e3a1'}; font-weight:600;">${diffDays} días</span>
                `;
            } else if (diffDays === 0) {
                diasRestantesHtml = `
                    <span style="font-weight:600; color:var(--text-primary);">⏳ Días restantes:</span>
                    <span style="color:#f9e2af; font-weight:600;">¡Último día!</span>
                `;
            } else {
                diasRestantesHtml = `
                    <span style="font-weight:600; color:var(--text-primary);">⏳ Días restantes:</span>
                    <span style="color:#f38ba8; font-weight:600;">⏰ Vencido (${Math.abs(diffDays)} días atrasado)</span>
                `;
            }
        }
        
        let rubricaHtml = '';
        if (rubrica && rubrica.criterios && rubrica.criterios.length > 0) {
            rubricaHtml = `
                <div style="margin-top:12px; border-top:1px solid var(--border-color); padding-top:12px;">
                    <strong style="color:var(--text-primary); font-size:13px;"> Rúbrica de evaluación:</strong>
                    <div style="margin-top:8px; display:grid; grid-template-columns:1fr 1fr; gap:4px 16px; font-size:12px;">
                        ${rubrica.criterios.map((c, i) => `
                            <div style="display:flex; justify-content:space-between; padding:2px 4px; background:var(--bg-hover); border-radius:4px;">
                                <span style="color:var(--text-secondary);">${i+1}. ${escapeHtml(c.nombre)}</span>
                                <span style="color:var(--text-primary); font-weight:600;">${c.maxPuntos} pts</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        let avanceHtml = '';
        if (tipo !== 'asistencia' && trabajoData) {
            const studentsList = this.app.students.list || [];
            let notasRegistradas = 0;
            let totalEstudiantes = studentsList.length;
            
            for (const student of studentsList) {
                const nota = this.app.grades.getGrade(student.id, trabajoData.id, tipo);
                if (nota !== null && !isNaN(nota)) {
                    notasRegistradas++;
                }
            }
            
            if (totalEstudiantes > 0) {
                const porcentaje = Math.round((notasRegistradas / totalEstudiantes) * 100);
                avanceHtml = `
                    <div style="margin-top:8px;">
                        <span style="font-weight:600; color:var(--text-primary);">📊 Calificaciones registradas:</span>
                        <span>${notasRegistradas}/${totalEstudiantes} estudiantes (${porcentaje}%)</span>
                        <div style="width:100%; height:6px; background:var(--bg-hover); border-radius:4px; margin-top:4px; overflow:hidden;">
                            <div style="width:${porcentaje}%; height:100%; background:${porcentaje >= 70 ? '#a6e3a1' : '#f9e2af'}; border-radius:4px; transition:width 0.3s;"></div>
                        </div>
                    </div>
                `;
            }
        }
        
        Swal.fire({
            title: `<i class="fas fa-info-circle" style="color:${tipoColor[tipo] || '#f9e2af'};"></i> ${escapeHtml(nombre)}`,
            html: `
                <div style="text-align:left; font-size:13px; color:var(--text-secondary);">
                    <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 16px; margin-bottom:8px;">
                        <span style="font-weight:600; color:var(--text-primary);">📂 Tipo:</span>
                        <span>${tipoIcono[tipo] || '📄'} ${tipoLabel[tipo] || tipo}</span>
                        
                        <span style="font-weight:600; color:var(--text-primary);">📅 Fecha de asignación:</span>
                        <span>${fechaAsig}</span>
                        
                        <span style="font-weight:600; color:var(--text-primary);">⏰ Fecha máxima de entrega:</span>
                        <span>${fechaEnt}</span>
                        
                        ${diasRestantesHtml ? `<span></span><span></span>` : ''}
                        ${diasRestantesHtml}
                        
                        <span style="font-weight:600; color:var(--text-primary);">🎯 Puntaje máximo:</span>
                        <span>${puntosMax || 100}%</span>
                        
                        ${trabajoData && trabajoData.activo !== undefined ? `
                            <span style="font-weight:600; color:var(--text-primary);">📊 Estado:</span>
                            <span>${trabajoData.activo ? '✅ Activo' : '❌ Inactivo'}</span>
                        ` : ''}
                    </div>
                    
                    ${avanceHtml}
                    
                    ${rubricaHtml}
                    
                    <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border-color); font-size:11px; color:var(--text-muted); text-align:center;">
                        <i class="fas fa-edit"></i> Puedes editar las notas en la tabla principal
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: '✅ Entendido',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px'
        });
    }

    async guardarNotaDesdeInputFinal(input) {
        const estudianteId = parseInt(input.dataset.estudiante);
        const trabajoId = parseInt(input.dataset.trabajo);
        const tipoTrabajo = input.dataset.tipo;
        const valor = input.value.trim();

        if (valor === '') {
            return;
        }

        const nota = parseFloat(valor);
        if (isNaN(nota) || nota < 0 || nota > 100) {
            this.app.ui.showError('La nota debe ser un número entre 0 y 100');
            const notaActual = this.app.grades.getGrade(estudianteId, trabajoId, tipoTrabajo);
            input.value = notaActual !== null ? notaActual : '';
            return;
        }

        const key = `${estudianteId}_${trabajoId}_${tipoTrabajo}`;
        if (this.app.guardandoNotas[key]) return;
        this.app.guardandoNotas[key] = true;

        try {
            await this.app.grades.saveGrade(
                this.app.currentSectionId,
                estudianteId,
                trabajoId,
                tipoTrabajo,
                nota
            );

            input.className = `input-nota ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
            const td = input.closest('.nota-cell');
            if (td) {
                td.className = `nota-cell ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
            }

            this.recalcularSumaFila(estudianteId);
            this.app.updateStats();

        } catch (error) {
            console.error('Error guardando nota:', error);
            this.app.ui.showError('Error al guardar la nota');
            const notaActual = this.app.grades.getGrade(estudianteId, trabajoId, tipoTrabajo);
            input.value = notaActual !== null ? notaActual : '';
        } finally {
            this.app.guardandoNotas[key] = false;
        }
    }

    recalcularSumaFila(estudianteId) {
        const fila = document.getElementById(`fila-${estudianteId}`);
        if (!fila) return;

        const inputs = fila.querySelectorAll('.nota-cell input:not([disabled])');
        let sumaTotal = 0;

        for (const inp of inputs) {
            const val = inp.value.trim();
            if (val !== '') {
                const nota = parseFloat(val);
                if (!isNaN(nota) && nota >= 0 && nota <= 100) {
                    sumaTotal += nota;
                }
            }
        }

        const sumaCell = document.getElementById(`suma-${estudianteId}`);
        if (sumaCell) {
            const claseSuma = sumaTotal > 0 ? (sumaTotal >= 70 ? 'aprobado' : 'reprobado') : 'pendiente';
            sumaCell.textContent = sumaTotal > 0 ? Math.round(sumaTotal) : '-';
            sumaCell.className = `total-cell ${claseSuma}`;
            sumaCell.style.cssText = 'font-weight:700; font-size:15px; background:var(--bg-active); min-width:70px; text-align:center;';
        }
    }
}