// ============================================================
// WorkManager.js - Gestión de trabajos (crear, editar, eliminar)
// ============================================================

class WorkManager {
    constructor(app) {
        this.app = app;
    }

    async addWork(type) {
        const tipoLabels = {
            cotidiano: 'Trabajo Cotidiano',
            tarea: 'Tarea',
            examen: 'Examen',
            proyecto: 'Proyecto',
            asistencia: 'Asistencia'
        };
        const tipoIconos = {
            cotidiano: '📝',
            tarea: '📚',
            examen: '📝',
            proyecto: '🚀',
            asistencia: '📅'
        };

        const result = await Swal.fire({
            title: `Agregar ${tipoLabels[type] || type}`,
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre del trabajo:</label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Ej. ${tipoLabels[type] || type} 1">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">🎯 Puntaje máximo:</label>
                    <input id="swal-puntos" class="swal2-input" type="number" value="100" min="1" max="100">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📅 Fecha de asignación:</label>
                    <input id="swal-fecha-asignacion" class="swal2-input" type="date">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">⏰ Fecha de entrega:</label>
                    <input id="swal-fecha-entrega" class="swal2-input" type="date">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📋 Rúbrica (opcional):</label>
                    <textarea id="swal-rubrica" class="swal2-textarea" rows="3" placeholder="Criterios de evaluación..."></textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Crear',
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
            this.app.ui.showSuccess('Trabajo eliminado');
        }
    }
}