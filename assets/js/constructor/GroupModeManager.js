// ============================================================
// GroupModeManager.js - Modo grupal para evaluación
// ============================================================

class GroupModeManager {
    constructor(app) {
        this.app = app;
    }

    async openWork(type, id, preserveFocus = false) {
        if (type === 'machote') {
            this.app.ui.showError('Los machotes no tienen modo grupal porque no se califican');
            return;
        }

        const work = this.app.grades.getWorkById(type, id);
        if (!work) return;
        this.app.currentWork = work;
        this.app.currentWorkType = type;

        const container = document.getElementById('mainContent');
        const studentsList = this.app.students.list || [];

        if (!this.app._seleccionGrupal) {
            this.app._seleccionGrupal = {};
        }
        const key = `${type}_${id}`;
        if (!this.app._seleccionGrupal[key]) {
            this.app._seleccionGrupal[key] = {
                activo: false,
                seleccionados: [],
                notaGrupal: '',
                terminoBusqueda: ''
            };
        }
        const estadoGrupal = this.app._seleccionGrupal[key];

        const seleccionadosIds = new Set(estadoGrupal.seleccionados);
        let estudiantesSeleccionados = [];
        let estudiantesNoSeleccionados = [];
        
        for (const student of studentsList) {
            if (seleccionadosIds.has(student.id)) {
                estudiantesSeleccionados.push(student);
            } else {
                estudiantesNoSeleccionados.push(student);
            }
        }
        
        const ordenSeleccion = estadoGrupal.seleccionados;
        estudiantesSeleccionados.sort((a, b) => {
            return ordenSeleccion.indexOf(a.id) - ordenSeleccion.indexOf(b.id);
        });

        const terminoBusqueda = estadoGrupal.terminoBusqueda || '';
        if (terminoBusqueda && terminoBusqueda.trim() !== '') {
            const termino = terminoBusqueda.toLowerCase().trim();
            estudiantesNoSeleccionados = estudiantesNoSeleccionados.filter(student => {
                const nombreCompleto = this.app.students.getFullName(student).toLowerCase();
                return nombreCompleto.includes(termino);
            });
        }

        let notaGrupalActual = estadoGrupal.notaGrupal || '';
        if (estudiantesSeleccionados.length > 0 && !notaGrupalActual) {
            const primerEstudiante = estudiantesSeleccionados[0];
            const notaPrimero = this.app.grades.getGrade(primerEstudiante.id, work.id, type);
            if (notaPrimero !== null && !isNaN(notaPrimero)) {
                notaGrupalActual = notaPrimero;
            }
        }

        const countSeleccionados = estadoGrupal.seleccionados.length;

        let html = this.buildWorkHeaderHTML(type, id, work, estadoGrupal, countSeleccionados);
        html += this.buildWorkSearchBarHTML(type, id, terminoBusqueda, estudiantesNoSeleccionados, countSeleccionados, estadoGrupal);
        
        if (estadoGrupal.activo) {
            html += this.buildGroupAreaHTML(type, id, work, estudiantesSeleccionados, estadoGrupal, countSeleccionados, notaGrupalActual);
        }
        
        html += this.buildWorkStudentTableHTML(type, id, work, estudiantesNoSeleccionados, terminoBusqueda, estadoGrupal, studentsList.length);
        html += this.buildWorkFooterHTML(studentsList.length, countSeleccionados, estudiantesNoSeleccionados, terminoBusqueda, estadoGrupal);

        container.innerHTML = html;

        if (preserveFocus) {
            setTimeout(() => {
                const input = document.getElementById(`buscadorEstudiantes_${type}_${id}`);
                if (input) {
                    input.focus();
                    const length = input.value.length;
                    input.setSelectionRange(length, length);
                }
            }, 50);
        }
    }

    buildWorkHeaderHTML(type, id, work, estadoGrupal, countSeleccionados) {
        const tipoLabels = {
            cotidiano: 'Cotidiano',
            tarea: 'Tarea',
            examen: 'Examen',
            proyecto: 'Proyecto',
            asistencia: 'Asistencia'
        };
        return `
            <div class="works-header">
                <div>
                    <button class="btn-action btn-primary" onclick="window.app?.closeWork()" style="margin-bottom:8px;">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                    <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-top:4px;">
                        <h2 style="margin:0;">${escapeHtml(work.nombre)}</h2>
                        <span style="font-size:12px; color:var(--text-secondary); background:var(--bg-hover); padding:4px 12px; border-radius:12px;">
                            ${tipoLabels[type] || type}
                        </span>
                        ${work.fechaAsignacion ? `<span style="font-size:11px; color:var(--text-muted);">📅 ${work.fechaAsignacion}</span>` : ''}
                        ${work.fechaEntrega ? `<span style="font-size:11px; color:var(--text-muted);">⏰ ${work.fechaEntrega}</span>` : ''}
                    </div>
                    <p style="color:var(--text-secondary); font-size:13px; margin-top:4px;">
                        <i class="fas fa-keyboard"></i> Escribe la nota directamente en el campo
                        ${estadoGrupal.activo ? '· <span style="color:#a6e3a1; font-weight:600;">👥 Modo grupal activo</span>' : ''}
                    </p>
                </div>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action ${estadoGrupal.activo ? 'btn-success' : 'btn-info'}" 
                        onclick="window.app?.toggleModoGrupal('${type}', ${id})"
                        style="${estadoGrupal.activo ? 'background:rgba(166,227,161,0.25); color:#a6e3a1; border:2px solid #a6e3a1;' : ''}">
                        <i class="fas fa-${estadoGrupal.activo ? 'users' : 'user-plus'}"></i>
                        ${estadoGrupal.activo ? '👥 Modo Grupal ACTIVO' : 'Activar Modo Grupal'}
                    </button>
                    ${estadoGrupal.activo && countSeleccionados > 0 ? `
                        <button class="btn-action btn-danger" onclick="window.app?.limpiarSeleccionGrupal('${type}', ${id})" style="padding:4px 12px; font-size:12px;">
                            <i class="fas fa-times"></i> Limpiar selección (${countSeleccionados})
                        </button>
                    ` : ''}
                    ${estadoGrupal.activo ? `
                        <button class="btn-action btn-warning" onclick="window.app?.calificarNuevoGrupo('${type}', ${id})" style="padding:4px 12px; font-size:12px; background:rgba(249,226,175,0.2); color:#f9e2af; border:1px solid rgba(249,226,175,0.3);">
                            <i class="fas fa-plus-circle"></i> Calificar nuevo grupo
                        </button>
                        <button class="btn-action btn-danger" onclick="window.app?.desactivarModoGrupal('${type}', ${id})" style="padding:4px 12px; font-size:12px;">
                            <i class="fas fa-power-off"></i> Desactivar Modo
                        </button>
                    ` : ''}
                </div>
            </div>`;
    }

    buildWorkSearchBarHTML(type, id, terminoBusqueda, estudiantesNoSeleccionados, countSeleccionados, estadoGrupal) {
        return `
            <div style="margin-bottom:12px; display:flex; gap:8px; align-items:center; background:var(--bg-card); padding:8px 12px; border-radius:8px; border:1px solid var(--border-color);">
                <i class="fas fa-search" style="color:var(--text-muted);"></i>
                <input type="text" 
                    id="buscadorEstudiantes_${type}_${id}" 
                    placeholder="Buscar estudiante por nombre..." 
                    value="${escapeHtml(terminoBusqueda)}"
                    style="flex:1; padding:6px 10px; border:1px solid var(--border-color); border-radius:4px; background:var(--bg-input); color:var(--text-primary); font-size:13px; outline:none;"
                    oninput="window.app?.filtrarEstudiantesGrupales('${type}', ${id}, this.value)"
                    onkeydown="if(event.key === 'Enter') { event.preventDefault(); }"
                />
                ${terminoBusqueda ? `
                    <button class="btn-action btn-secondary" onclick="window.app?.limpiarBusquedaGrupal('${type}', ${id})" style="padding:4px 8px; font-size:12px;">
                        <i class="fas fa-times"></i> Limpiar
                    </button>
                ` : ''}
                <span style="font-size:12px; color:var(--text-muted); white-space:nowrap;">
                    <i class="fas fa-users"></i> ${estudiantesNoSeleccionados.length} mostrados
                    ${estadoGrupal.activo ? `· <span style="color:#a6e3a1;">${countSeleccionados} en grupo</span>` : ''}
                </span>
            </div>`;
    }

    buildGroupAreaHTML(type, id, work, estudiantesSeleccionados, estadoGrupal, countSeleccionados, notaGrupalActual) {
        let html = `
            <div style="margin-bottom:12px; padding:12px 16px; background:rgba(166,227,161,0.08); border-radius:8px; border:2px solid rgba(166,227,161,0.3);">
                <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap; margin-bottom:8px;">
                    <span style="font-size:13px; color:#a6e3a1; font-weight:600;">
                        <i class="fas fa-users"></i> Grupo de evaluación (${countSeleccionados} estudiante${countSeleccionados !== 1 ? 's' : ''})
                    </span>
                    ${countSeleccionados > 1 ? `
                        <span style="font-size:11px; color:var(--text-secondary); background:rgba(166,227,161,0.15); padding:2px 12px; border-radius:12px;">
                            <i class="fas fa-people-arrows"></i> Nota grupal: se aplica a todos
                        </span>
                    ` : `
                        <span style="font-size:11px; color:var(--text-muted);">
                            <i class="fas fa-info-circle"></i> Selecciona 2+ estudiantes para nota grupal
                        </span>
                    `}
                </div>`;

        if (countSeleccionados > 1) {
            html += `
                <div style="display:flex; align-items:center; gap:12px; padding:8px 12px; background:rgba(166,227,161,0.1); border-radius:8px; border:1px solid rgba(166,227,161,0.3); margin-bottom:8px;">
                    <span style="font-size:12px; color:#a6e3a1; font-weight:600; white-space:nowrap;">
                        <i class="fas fa-edit"></i> Nota del grupo:
                    </span>
                    <input type="number" 
                        id="notaGrupal_${type}_${id}"
                        class="input-nota-grupal"
                        value="${notaGrupalActual}"
                        min="0" max="100"
                        placeholder="Escribe la nota del grupo..."
                        style="flex:1; max-width:150px; padding:6px 10px; border:2px solid #a6e3a1; border-radius:6px; background:rgba(166,227,161,0.05); color:var(--text-primary); font-weight:600; text-align:center; font-size:16px; outline:none; transition:all 0.3s;"
                        onfocus="this.style.borderColor='#89b4fa'; this.style.background='rgba(137,180,250,0.1)';"
                        onblur="this.style.borderColor='#a6e3a1'; this.style.background='rgba(166,227,161,0.05)';"
                        oninput="window.app?.actualizarNotaGrupal('${type}', ${id}, this.value)"
                        onchange="window.app?.aplicarNotaGrupal('${type}', ${id}, this.value)"
                    />
                    <span style="font-size:11px; color:var(--text-muted);">
                        <i class="fas fa-arrow-right"></i> Se aplica a ${countSeleccionados} estudiantes
                    </span>
                    <button onclick="window.app?.aplicarNotaGrupal('${type}', ${id}, document.getElementById('notaGrupal_${type}_${id}').value)" 
                        class="btn-action btn-success" style="padding:4px 12px; font-size:12px; background:rgba(166,227,161,0.2); color:#a6e3a1; border:1px solid rgba(166,227,161,0.3);">
                        <i class="fas fa-check"></i> Aplicar a todos
                    </button>
                    ${notaGrupalActual ? `
                        <span style="font-size:12px; color:#a6e3a1; font-weight:600; background:rgba(166,227,161,0.15); padding:2px 10px; border-radius:12px;">
                            ✅ ${notaGrupalActual}% aplicado
                        </span>
                    ` : ''}
                </div>`;
        }

        html += `
                <div id="chipsContainer_${type}_${id}" style="display:flex; flex-wrap:wrap; gap:8px;">`;
        
        if (estudiantesSeleccionados.length > 0) {
            estudiantesSeleccionados.forEach((student, index) => {
                const nombreCompleto = this.app.students.getFullName(student);
                const notaEstudiante = this.app.grades.getGrade(student.id, work.id, type);
                const notaMostrar = notaEstudiante !== null && !isNaN(notaEstudiante) ? `${Math.round(notaEstudiante)}%` : 'Sin nota';
                html += `
                    <div class="chip-item" data-student-id="${student.id}" style="display:flex; align-items:center; gap:6px; background:rgba(166,227,161,0.15); padding:4px 10px 4px 14px; border-radius:20px; border:1px solid rgba(166,227,161,0.3);">
                        <span style="font-size:10px; color:#a6e3a1; font-weight:600;">#${index + 1}</span>
                        <span style="font-size:13px; color:var(--text-primary); font-weight:500;">${escapeHtml(nombreCompleto)}</span>
                        <span style="font-size:10px; color:${notaEstudiante !== null && !isNaN(notaEstudiante) ? (notaEstudiante >= 70 ? '#a6e3a1' : '#f38ba8') : 'var(--text-muted)'}; background:rgba(0,0,0,0.1); padding:1px 8px; border-radius:10px; font-weight:${notaEstudiante !== null && !isNaN(notaEstudiante) ? '600' : '400'};">
                            ${notaMostrar}
                        </span>
                        <button onclick="window.app?.quitarEstudianteGrupo('${type}', ${id}, ${student.id})" 
                            style="background:transparent; border:none; color:#f38ba8; cursor:pointer; padding:2px 4px; font-size:12px; border-radius:50%;"
                            title="Quitar del grupo">
                            <i class="fas fa-times-circle"></i>
                        </button>
                    </div>`;
            });
        } else {
            html += `
                    <span style="font-size:12px; color:var(--text-muted); padding:6px 0;">
                        <i class="fas fa-hand-pointer"></i> Haz clic en "Agregar" para incluir estudiantes al grupo
                    </span>`;
        }

        html += `
                </div>`;

        if (countSeleccionados > 1) {
            html += `
                <div style="margin-top:8px; padding:6px 12px; background:rgba(166,227,161,0.05); border-radius:6px; border-left:3px solid #a6e3a1;">
                    <span style="font-size:11px; color:var(--text-secondary);">
                        <i class="fas fa-sync"></i> La nota grupal se <strong style="color:#a6e3a1;">actualiza automáticamente</strong> para todos los miembros
                    </span>
                </div>`;
        }

        html += `
            </div>`;
        return html;
    }

    buildWorkStudentTableHTML(type, id, work, estudiantesNoSeleccionados, terminoBusqueda, estadoGrupal, totalEstudiantes) {
        const isGrupalActivo = estadoGrupal.activo;
        let html = `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <div style="padding:8px 16px; background:var(--bg-hover); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:13px; color:var(--text-secondary);">
                        <i class="fas fa-list"></i> Estudiantes disponibles 
                        ${terminoBusqueda ? `· <span style="color:#f9e2af;">🔍 "${escapeHtml(terminoBusqueda)}"</span>` : ''}
                        (${estudiantesNoSeleccionados.length})
                    </span>
                    ${isGrupalActivo ? `
                        <span style="font-size:11px; color:var(--text-muted);">
                            <i class="fas fa-info-circle"></i> Haz clic en "Agregar" para incluir en el grupo
                        </span>
                    ` : ''}
                </div>
                <table class="data-table" id="tablaEstudiantes_${type}_${id}">
                    <thead>
                        <tr>
                            ${isGrupalActivo ? `<th style="min-width:40px; text-align:center;"><i class="fas fa-user-plus"></i></th>` : ''}
                            <th>#</th>
                            <th>Cédula</th>
                            <th>Estudiante</th>
                            <th>Nota (%)</th>
                        </tr>
                    </thead>
                    <tbody id="tbodyEstudiantes_${type}_${id}">`;

        if (estudiantesNoSeleccionados.length === 0 && totalEstudiantes > 0) {
            html += `
                <tr>
                    <td colspan="${isGrupalActivo ? '5' : '4'}" style="text-align:center; padding:40px; color:var(--text-muted);">
                        ${terminoBusqueda ? `
                            <i class="fas fa-search" style="font-size:32px; color:#f9e2af; display:block; margin-bottom:12px;"></i>
                            <p style="font-size:15px; color:var(--text-primary);">No se encontraron estudiantes con "${escapeHtml(terminoBusqueda)}"</p>
                            <p style="font-size:12px; color:var(--text-muted);">Prueba con otro término o limpia la búsqueda</p>
                        ` : `
                            <i class="fas fa-check-circle" style="font-size:32px; color:#a6e3a1; display:block; margin-bottom:12px;"></i>
                            <p style="font-size:15px; color:var(--text-primary);">¡Todos los estudiantes están en el grupo!</p>
                            <p style="font-size:12px; color:var(--text-muted);">${estadoGrupal.seleccionados.length} estudiantes seleccionados</p>
                        `}
                    </td>
                </tr>`;
        } else if (estudiantesNoSeleccionados.length === 0) {
            html += `
                <tr>
                    <td colspan="${isGrupalActivo ? '5' : '4'}" style="text-align:center; padding:40px; color:var(--text-muted);">
                        <i class="fas fa-users" style="font-size:32px; color:var(--text-muted); display:block; margin-bottom:12px;"></i>
                        <p style="font-size:15px; color:var(--text-primary);">No hay estudiantes registrados</p>
                    </td>
                </tr>`;
        } else {
            for (let i = 0; i < estudiantesNoSeleccionados.length; i++) {
                const student = estudiantesNoSeleccionados[i];
                const nombreCompleto = this.app.students.getFullName(student);
                const notaActual = this.app.grades.getGrade(student.id, work.id, type);
                const notaStr = notaActual !== null ? notaActual : '';
                const clase = notaActual !== null ? (notaActual >= 70 ? 'aprobado' : 'reprobado') : 'vacio';
                
                let nombreMostrar = nombreCompleto;
                if (terminoBusqueda && terminoBusqueda.trim() !== '') {
                    const termino = terminoBusqueda.toLowerCase().trim();
                    const nombreLower = nombreCompleto.toLowerCase();
                    const index = nombreLower.indexOf(termino);
                    if (index !== -1) {
                        const antes = nombreCompleto.substring(0, index);
                        const resaltado = nombreCompleto.substring(index, index + termino.length);
                        const despues = nombreCompleto.substring(index + termino.length);
                        nombreMostrar = `${escapeHtml(antes)}<span style="background:rgba(249,226,175,0.3); color:#f9e2af; font-weight:bold; padding:0 2px; border-radius:2px;">${escapeHtml(resaltado)}</span>${escapeHtml(despues)}`;
                    } else {
                        nombreMostrar = escapeHtml(nombreCompleto);
                    }
                } else {
                    nombreMostrar = escapeHtml(nombreCompleto);
                }
                
                html += `
                    <tr id="fila-trabajo-${student.id}">
                        ${isGrupalActivo ? `
                            <td style="text-align:center;">
                                <button class="btn-action btn-success" onclick="window.app?.agregarEstudianteGrupo('${type}', ${id}, ${student.id})" 
                                    style="padding:4px 12px; font-size:11px; background:rgba(166,227,161,0.15); color:#a6e3a1; border:1px solid rgba(166,227,161,0.3); border-radius:12px; cursor:pointer;">
                                    <i class="fas fa-plus"></i> Agregar
                                </button>
                            </td>
                        ` : ''}
                        <td>${i + 1}</td>
                        <td>${escapeHtml(student.cedula || '-')}</td>
                        <td style="text-align:left; font-weight:500; color:var(--text-primary);">
                            ${nombreMostrar}
                        </td>
                        <td class="nota-cell ${clase}">
                            <input type="number" 
                                class="input-nota ${clase}"
                                data-estudiante="${student.id}"
                                data-trabajo="${work.id}"
                                data-tipo="${type}"
                                value="${notaStr}"
                                min="0" max="100"
                                placeholder="-"
                                style="width:60px; padding:4px 6px; border:1px solid transparent; border-radius:4px; background:transparent; color:var(--text-primary); font-weight:600; text-align:center; font-size:13px; outline:none;"
                                onfocus="this.style.borderColor='var(--color-cotidiano)'; this.style.background='var(--bg-hover)';"
                                onblur="this.style.borderColor='transparent'; this.style.background='transparent'; window.app?.guardarNotaIndividual(this, '${type}', ${work.id});"
                                onchange="window.app?.guardarNotaIndividual(this, '${type}', ${work.id});"
                                ${isGrupalActivo ? 'disabled style="opacity:0.4; cursor:not-allowed;"' : ''}
                            />
                            ${isGrupalActivo ? '<span style="display:block; font-size:8px; color:var(--text-muted);">(usa el input grupal)</span>' : ''}
                        </td>
                    </tr>`;
            }
        }

        html += `
                    </tbody>
                </table>
            </div>`;
        return html;
    }

    buildWorkFooterHTML(totalEstudiantes, countSeleccionados, estudiantesNoSeleccionados, terminoBusqueda, estadoGrupal) {
        const notaGrupalActual = estadoGrupal.notaGrupal || '';
        return `
            <div style="margin-top:12px; padding:8px 16px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
                <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                    <span style="font-size:12px; color:var(--text-secondary);">
                        <i class="fas fa-users" style="color:#89b4fa;"></i> Total: ${totalEstudiantes} estudiantes
                    </span>
                    ${estadoGrupal.activo ? `
                        <span style="font-size:12px; color:#a6e3a1;">
                            <i class="fas fa-check-circle"></i> En grupo: ${countSeleccionados}
                        </span>
                        <span style="font-size:12px; color:var(--text-muted);">
                            <i class="fas fa-user-plus"></i> Disponibles: ${estudiantesNoSeleccionados.length}
                        </span>
                        ${countSeleccionados > 1 && notaGrupalActual ? `
                            <span style="font-size:12px; color:#f9e2af;">
                                <i class="fas fa-people-arrows"></i> Nota grupal: ${notaGrupalActual}%
                            </span>
                        ` : countSeleccionados > 1 ? `
                            <span style="font-size:12px; color:#f9e2af;">
                                <i class="fas fa-people-arrows"></i> Nota grupal activa
                            </span>
                        ` : ''}
                    ` : ''}
                    ${terminoBusqueda ? `
                        <span style="font-size:12px; color:#f9e2af;">
                            <i class="fas fa-search"></i> Filtro: "${escapeHtml(terminoBusqueda)}"
                        </span>
                    ` : ''}
                </div>
                <div style="display:flex; gap:8px; font-size:11px; color:var(--text-muted);">
                    <i class="fas fa-info-circle"></i>
                    <span>${estadoGrupal.activo ? '✅ Escribe la nota en el campo grupal para aplicarla a todos' : '🔘 Activa el "Modo Grupal" para evaluar en grupo'}</span>
                </div>
            </div>`;
    }

    // Métodos de control de grupo
    filtrarEstudiantesGrupales(type, workId, termino) {
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal) {
            this.app._seleccionGrupal = {};
        }
        if (!this.app._seleccionGrupal[key]) {
            this.app._seleccionGrupal[key] = {
                activo: false,
                seleccionados: [],
                notaGrupal: '',
                terminoBusqueda: ''
            };
        }
        this.app._seleccionGrupal[key].terminoBusqueda = termino;
        this.openWork(type, workId, true);
    }

    limpiarBusquedaGrupal(type, workId) {
        const key = `${type}_${workId}`;
        if (this.app._seleccionGrupal && this.app._seleccionGrupal[key]) {
            this.app._seleccionGrupal[key].terminoBusqueda = '';
        }
        this.openWork(type, workId, true);
    }

    calificarNuevoGrupo(type, workId) {
        const key = `${type}_${workId}`;
        if (this.app._seleccionGrupal && this.app._seleccionGrupal[key]) {
            this.app._seleccionGrupal[key].activo = false;
            this.app._seleccionGrupal[key].seleccionados = [];
            this.app._seleccionGrupal[key].notaGrupal = '';
            this.app._seleccionGrupal[key].terminoBusqueda = '';
        }
        this.openWork(type, workId);
        this.app.ui.showInfo('🔄 Modo grupal desactivado. Puedes seleccionar un nuevo grupo.', 'info', 2500);
    }

    toggleModoGrupal(type, workId) {
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal) {
            this.app._seleccionGrupal = {};
        }
        if (!this.app._seleccionGrupal[key]) {
            this.app._seleccionGrupal[key] = {
                activo: false,
                seleccionados: [],
                notaGrupal: ''
            };
        }
        this.app._seleccionGrupal[key].activo = !this.app._seleccionGrupal[key].activo;
        if (!this.app._seleccionGrupal[key].activo) {
            this.app._seleccionGrupal[key].seleccionados = [];
            this.app._seleccionGrupal[key].notaGrupal = '';
        }
        this.openWork(type, workId);
    }

    desactivarModoGrupal(type, workId) {
        const key = `${type}_${workId}`;
        if (this.app._seleccionGrupal && this.app._seleccionGrupal[key]) {
            this.app._seleccionGrupal[key].activo = false;
            this.app._seleccionGrupal[key].seleccionados = [];
            this.app._seleccionGrupal[key].notaGrupal = '';
        }
        this.openWork(type, workId);
        this.app.ui.showInfo('Modo grupal desactivado', 'info', 2000);
    }

    agregarEstudianteGrupo(type, workId, studentId) {
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal || !this.app._seleccionGrupal[key]) return;
        
        const estado = this.app._seleccionGrupal[key];
        if (!estado.activo) return;
        
        if (!estado.seleccionados.includes(studentId)) {
            estado.seleccionados.push(studentId);
            const student = this.app.students.getById(studentId);
            const nombre = this.app.students.getFullName(student);
            this.app.ui.showToast(`✅ ${nombre} agregado al grupo`, 'success', 1500);
            this.openWork(type, workId);
        }
    }

    quitarEstudianteGrupo(type, workId, studentId) {
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal || !this.app._seleccionGrupal[key]) return;
        
        const estado = this.app._seleccionGrupal[key];
        if (!estado.activo) return;
        
        estado.seleccionados = estado.seleccionados.filter(id => id !== studentId);
        
        if (estado.seleccionados.length < 2) {
            estado.notaGrupal = '';
        }
        
        const student = this.app.students.getById(studentId);
        const nombre = this.app.students.getFullName(student);
        this.app.ui.showToast(`↩️ ${nombre} quitado del grupo`, 'info', 1500);
        this.openWork(type, workId);
    }

    limpiarSeleccionGrupal(type, workId) {
        const key = `${type}_${workId}`;
        if (this.app._seleccionGrupal && this.app._seleccionGrupal[key]) {
            const count = this.app._seleccionGrupal[key].seleccionados.length;
            this.app._seleccionGrupal[key].seleccionados = [];
            this.app._seleccionGrupal[key].notaGrupal = '';
            this.app.ui.showToast(`🧹 ${count} estudiantes removidos del grupo`, 'info', 1500);
            this.openWork(type, workId);
        }
    }

    async actualizarNotaGrupal(type, workId, valor) {
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal || !this.app._seleccionGrupal[key]) return;
        
        const estado = this.app._seleccionGrupal[key];
        if (!estado.activo || estado.seleccionados.length <= 1) return;
        
        const nota = parseFloat(valor);
        if (isNaN(nota) || nota < 0 || nota > 100) {
            return;
        }
        
        estado.notaGrupal = valor;
        
        const allRows = document.querySelectorAll('tr[id^="fila-trabajo-"]');
        const seleccionadosIds = new Set(estado.seleccionados);
        
        for (const row of allRows) {
            const inputField = row.querySelector('.input-nota');
            if (inputField) {
                const estudianteInput = parseInt(inputField.dataset.estudiante);
                if (seleccionadosIds.has(estudianteInput)) {
                    inputField.value = nota;
                    inputField.className = `input-nota ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
                    const td = inputField.closest('.nota-cell');
                    if (td) {
                        td.className = `nota-cell ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
                    }
                }
            }
        }
        
        this.actualizarChipsNotas(type, workId);
    }

    async aplicarNotaGrupal(type, workId, valor) {
        if (!valor || valor.trim() === '') {
            this.app.ui.showError('Por favor, escribe una nota válida');
            return;
        }
        
        const nota = parseFloat(valor);
        if (isNaN(nota) || nota < 0 || nota > 100) {
            this.app.ui.showError('La nota debe ser un número entre 0 y 100');
            return;
        }
        
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal || !this.app._seleccionGrupal[key]) {
            this.app.ui.showError('No hay grupo seleccionado');
            return;
        }
        
        const estado = this.app._seleccionGrupal[key];
        if (!estado.activo || estado.seleccionados.length <= 1) {
            this.app.ui.showError('Necesitas al menos 2 estudiantes para nota grupal');
            return;
        }
        
        const estudiantesAAplicar = [...estado.seleccionados];
        let errores = 0;
        
        const btnAplicar = document.querySelector(`#notaGrupal_${type}_${workId}`)?.parentElement?.querySelector('.btn-success');
        const textoOriginal = btnAplicar?.innerHTML;
        if (btnAplicar) {
            btnAplicar.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';
            btnAplicar.disabled = true;
        }
        
        for (const id of estudiantesAAplicar) {
            try {
                await this.app.grades.saveGrade(
                    this.app.currentSectionId,
                    id,
                    workId,
                    type,
                    nota
                );
            } catch (error) {
                console.error(`Error guardando nota para estudiante ${id}:`, error);
                errores++;
            }
        }
        
        if (btnAplicar) {
            btnAplicar.innerHTML = textoOriginal || '<i class="fas fa-check"></i> Aplicar a todos';
            btnAplicar.disabled = false;
        }
        
        if (errores > 0) {
            this.app.ui.showError(`Error al guardar en ${errores} estudiantes`);
            return;
        }
        
        estado.notaGrupal = valor;
        
        const allRows = document.querySelectorAll('tr[id^="fila-trabajo-"]');
        const idsAActualizar = new Set(estudiantesAAplicar);
        
        for (const row of allRows) {
            const inputField = row.querySelector('.input-nota');
            if (inputField) {
                const estudianteInput = parseInt(inputField.dataset.estudiante);
                if (idsAActualizar.has(estudianteInput)) {
                    inputField.value = nota;
                    inputField.className = `input-nota ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
                    const td = inputField.closest('.nota-cell');
                    if (td) {
                        td.className = `nota-cell ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
                    }
                }
            }
        }
        
        this.actualizarChipsNotas(type, workId);
        
        this.app.ui.showSuccess(`✅ Nota ${nota}% aplicada a ${estudiantesAAplicar.length} estudiantes`);
        this.app.updateStats();
    }

    actualizarChipsNotas(type, workId) {
        const key = `${type}_${workId}`;
        if (!this.app._seleccionGrupal || !this.app._seleccionGrupal[key]) return;
        
        const estado = this.app._seleccionGrupal[key];
        if (!estado.activo || estado.seleccionados.length === 0) return;
        
        const chipsContainer = document.getElementById(`chipsContainer_${type}_${workId}`);
        if (!chipsContainer) return;
        
        const seleccionadosIds = new Set(estado.seleccionados);
        const estudiantesSeleccionados = this.app.students.list.filter(s => seleccionadosIds.has(s.id));
        
        const ordenSeleccion = estado.seleccionados;
        estudiantesSeleccionados.sort((a, b) => {
            return ordenSeleccion.indexOf(a.id) - ordenSeleccion.indexOf(b.id);
        });
        
        let newChipsHtml = '';
        estudiantesSeleccionados.forEach((student, index) => {
            const nombreCompleto = this.app.students.getFullName(student);
            const notaEstudiante = this.app.grades.getGrade(student.id, workId, type);
            const notaMostrar = notaEstudiante !== null && !isNaN(notaEstudiante) ? `${Math.round(notaEstudiante)}%` : 'Sin nota';
            newChipsHtml += `
                <div class="chip-item" data-student-id="${student.id}" style="display:flex; align-items:center; gap:6px; background:rgba(166,227,161,0.15); padding:4px 10px 4px 14px; border-radius:20px; border:1px solid rgba(166,227,161,0.3);">
                    <span style="font-size:10px; color:#a6e3a1; font-weight:600;">#${index + 1}</span>
                    <span style="font-size:13px; color:var(--text-primary); font-weight:500;">${escapeHtml(nombreCompleto)}</span>
                    <span style="font-size:10px; color:var(--text-muted); background:rgba(0,0,0,0.1); padding:1px 8px; border-radius:10px;">${notaMostrar}</span>
                    <button onclick="window.app?.quitarEstudianteGrupo('${type}', ${workId}, ${student.id})" 
                        style="background:transparent; border:none; color:#f38ba8; cursor:pointer; padding:2px 4px; font-size:12px; border-radius:50%;"
                        title="Quitar del grupo">
                        <i class="fas fa-times-circle"></i>
                    </button>
                </div>
            `;
        });
        
        if (estudiantesSeleccionados.length === 0) {
            newChipsHtml = `
                <span style="font-size:12px; color:var(--text-muted); padding:6px 0;">
                    <i class="fas fa-hand-pointer"></i> Haz clic en "Agregar" para incluir estudiantes al grupo
                </span>
            `;
        }
        
        chipsContainer.innerHTML = newChipsHtml;
    }

    async guardarNotaIndividual(input, type, workId) {
        const estudianteId = parseInt(input.dataset.estudiante);
        const tipoTrabajo = input.dataset.tipo;
        const valor = input.value.trim();

        if (valor === '') {
            return;
        }

        const nota = parseFloat(valor);
        if (isNaN(nota) || nota < 0 || nota > 100) {
            this.app.ui.showError('La nota debe ser un número entre 0 y 100');
            const notaActual = this.app.grades.getGrade(estudianteId, workId, tipoTrabajo);
            input.value = notaActual !== null ? notaActual : '';
            return;
        }

        const key = `${estudianteId}_${workId}_${tipoTrabajo}`;
        if (this.app.guardandoNotas[key]) return;
        this.app.guardandoNotas[key] = true;

        try {
            await this.app.grades.saveGrade(
                this.app.currentSectionId,
                estudianteId,
                workId,
                tipoTrabajo,
                nota
            );
            
            input.className = `input-nota ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
            const td = input.closest('.nota-cell');
            if (td) {
                td.className = `nota-cell ${nota >= 70 ? 'aprobado' : 'reprobado'}`;
            }

            this.app.updateStats();
        } catch (error) {
            console.error('Error guardando nota:', error);
            this.app.ui.showError('Error al guardar la nota');
            const notaActual = this.app.grades.getGrade(estudianteId, workId, tipoTrabajo);
            input.value = notaActual !== null ? notaActual : '';
        } finally {
            this.app.guardandoNotas[key] = false;
        }
    }
}