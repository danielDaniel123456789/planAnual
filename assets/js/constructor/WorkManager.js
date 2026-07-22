// ============================================================
// WorkManager.js - Gestión de trabajos (crear, editar, eliminar)
// ============================================================

// Función auxiliar para generar código único basado en fecha/hora (formato: YYYYMMDDHHmmSS)
function generarCodigoTrabajo() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

class WorkManager {
    constructor(app) {
        this.app = app;
    }

    // ------------------------------------------
    // AGREGAR TRABAJO (con porcentaje automático y código [COD--XXX])
    // ------------------------------------------
    async addWork(type) {
        const tipoLabels = {
            cotidiano: 'Trabajo Cotidiano',
            tarea: 'Tarea',
            examen: 'Examen',
            proyecto: 'Proyecto',
            asistencia: 'Asistencia'
        };
        const tipoIconos = {
            cotidiano: '',
            tarea: '',
            examen: '',
            proyecto: '',
            asistencia: '📅'
        };

        // Mostrar diálogo
        const result = await Swal.fire({
            title: `Agregar ${tipoLabels[type] || type}`,
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">
                        📝 Nombre del trabajo (se agregará el porcentaje automáticamente):
                    </label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Ej. Proyecto Final">

                    <label style="font-size:13px; color:var(--text-secondary);">🎯 Porcentaje a calificar:</label>
                    <input id="swal-puntos" class="swal2-input" type="number" value="1" min="1" max="100">

                    <label style="font-size:13px; color:var(--text-secondary);">📅 Fecha de asignación:</label>
                    <input id="swal-fecha-asignacion" class="swal2-input" type="date">

                    <label style="font-size:13px; color:var(--text-secondary);">⏰ Fecha de entrega:</label>
                    <input id="swal-fecha-entrega" class="swal2-input" type="date">

                    <label style="font-size:13px; color:var(--text-secondary);">📋 Rúbrica (hipervínculo Teams...):</label>
                    <textarea id="swal-rubrica" class="swal2-textarea" rows="3" placeholder="hipervínculo Teams..."></textarea>

                    <div style="margin-top: 8px; font-size: 14px; color: var(--text-secondary); background: var(--bg-hover); padding: 6px 10px; border-radius: 6px;">
                        💡 El nombre final será: <span id="preview-nombre" style="font-weight: bold; color: var(--accent);">(escribe algo)</span>
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Crear',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            didOpen: () => {
                const inputNombre = document.getElementById('swal-nombre');
                const inputPuntos = document.getElementById('swal-puntos');
                const preview = document.getElementById('preview-nombre');

                const actualizarPreview = () => {
                    const nombreBase = inputNombre.value.trim() || '(sin nombre)';
                    const puntos = parseInt(inputPuntos.value) || 0;
                    const codigo = generarCodigoTrabajo();
                    preview.textContent = `[COD-${codigo}] ${nombreBase} -(${puntos}%)`;
                };

                inputNombre.addEventListener('input', actualizarPreview);
                inputPuntos.addEventListener('input', actualizarPreview);
                actualizarPreview();
            },
            preConfirm: () => {
                const nombreBase = document.getElementById('swal-nombre').value.trim();
                const puntosMax = parseInt(document.getElementById('swal-puntos').value) || 100;
                const fechaAsignacion = document.getElementById('swal-fecha-asignacion').value;
                const fechaEntrega = document.getElementById('swal-fecha-entrega').value;
                const rubrica = document.getElementById('swal-rubrica').value.trim();

                if (!nombreBase) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }

                // Generar código único en el momento de guardar
                const codigo = generarCodigoTrabajo();
                const nombreFinal = `${nombreBase} [COD--${codigo}] (${puntosMax}%)`;

                return {
                    nombre: nombreFinal,
                    puntosMax: puntosMax,
                    fechaAsignacion: fechaAsignacion,
                    fechaEntrega: fechaEntrega,
                    rubrica: rubrica
                };
            }
        });

        if (result.isConfirmed && result.value) {
            const data = result.value;
            const workData = {
                nombre: data.nombre,
                puntosMax: data.puntosMax,
                fecha: getDayMonth(),
                fechaAsignacion: data.fechaAsignacion || '',
                fechaEntrega: data.fechaEntrega || '',
                rubrica: data.rubrica || null,
                activo: true
            };

            await this.app.grades.addWork(this.app.currentSectionId, type, workData);
            await this.app.render();
            this.app.ui.showSuccess(`✅ ${tipoLabels[type] || type} creado correctamente`);
        }
    }

    // ------------------------------------------
    // EDITAR TRABAJO (se conserva el código existente)
    // ------------------------------------------
    async editWork(type, id) {
        const work = this.app.grades.getWorkById(type, id);
        if (!work) return;

        const tipoLabels = {
            cotidiano: 'Trabajo Cotidiano',
            tarea: 'Tarea',
            examen: 'Examen',
            proyecto: 'Proyecto',
            asistencia: 'Asistencia'
        };

        const result = await Swal.fire({
            title: `Editar ${tipoLabels[type] || type}: ${escapeHtml(work.nombre)}`,
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre:</label>
                    <input id="swal-nombre" class="swal2-input" value="${escapeHtml(work.nombre)}">

                    <label style="font-size:13px; color:var(--text-secondary);">🎯 Puntaje máximo:</label>
                    <input id="swal-puntos" class="swal2-input" type="number" value="${work.puntosMax || 100}" min="1" max="100">

                    <label style="font-size:13px; color:var(--text-secondary);">📅 Fecha de asignación:</label>
                    <input id="swal-fecha-asignacion" class="swal2-input" type="date" value="${work.fechaAsignacion || ''}">

                    <label style="font-size:13px; color:var(--text-secondary);">⏰ Fecha de entrega:</label>
                    <input id="swal-fecha-entrega" class="swal2-input" type="date" value="${work.fechaEntrega || ''}">

                    <label style="font-size:13px; color:var(--text-secondary);">📋 Rúbrica:</label>
                    <textarea id="swal-rubrica" class="swal2-textarea" rows="3">${escapeHtml(work.rubrica || '')}</textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value.trim();
                const puntosMax = parseInt(document.getElementById('swal-puntos').value) || 100;
                const fechaAsignacion = document.getElementById('swal-fecha-asignacion').value;
                const fechaEntrega = document.getElementById('swal-fecha-entrega').value;
                const rubrica = document.getElementById('swal-rubrica').value.trim();

                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }

                return { nombre, puntosMax, fechaAsignacion, fechaEntrega, rubrica };
            }
        });

        if (result.isConfirmed && result.value) {
            const data = result.value;
            await this.app.grades.updateWork(type, id, {
                nombre: data.nombre,
                puntosMax: data.puntosMax,
                fechaAsignacion: data.fechaAsignacion || '',
                fechaEntrega: data.fechaEntrega || '',
                rubrica: data.rubrica || null
            });

            await this.app.render();
            this.app.ui.showSuccess('✅ Trabajo actualizado correctamente');
        }
    }

    // ------------------------------------------
    // ELIMINAR TRABAJO
    // ------------------------------------------
    async deleteWork(type, id) {
        const work = this.app.grades.getWorkById(type, id);
        if (!work) return;

        const tipoLabels = {
            cotidiano: 'Trabajo Cotidiano',
            tarea: 'Tarea',
            examen: 'Examen',
            proyecto: 'Proyecto',
            asistencia: 'Asistencia',
            machote: 'Machote'
        };

        const confirm = await this.app.ui.showConfirm(`¿Eliminar ${tipoLabels[type] || type} "${work.nombre}"?`);
        if (confirm.isConfirmed) {
            await this.app.grades.deleteWork(type, id);
            await this.app.render();
            this.app.ui.showSuccess('✅ Trabajo eliminado correctamente');
        }
    }
}