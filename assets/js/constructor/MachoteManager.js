// ============================================================
// MachoteManager.js - Gestión de Machotes (NUEVA CLASE)
// ============================================================

class MachoteManager {
    constructor(app) {
        this.app = app;
        this.tipo = 'machote';
        this.tipoLabel = 'Machotes';
        this.tipoIcono = 'fas fa-cubes';
        this.tipoColor = '#e84393';
        
        // Machotes NO tienen calificación, solo son plantillas/referencias
        this.TIPOS_TRABAJO = {
            machote: { nombre: 'Machote', puntosMax: 0 }
        };
    }

    async renderMachotes(container) {
        const machotes = this.app.grades.works[this.tipo] || [];
        
        let html = `
            <div class="works-header">
                <h2><i class="${this.tipoIcono}" style="color:${this.tipoColor};"></i> ${this.tipoLabel} <span class="count">(${machotes.length})</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-primary" onclick="window.app?.addMachote()">
                        <i class="fas fa-plus"></i> Crear Machote
                    </button>
                    <button class="btn-action btn-info" onclick="window.app?.importarMachotes()">
                        <i class="fas fa-file-import"></i> Importar
                    </button>
                </div>
            </div>`;

        if (machotes.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="${this.tipoIcono}" style="font-size:48px; color:${this.tipoColor}; opacity:0.3;"></i>
                    <p>No hay machotes creados</p>
                    <p style="font-size:13px; color:var(--text-muted);">Los machotes son plantillas o referencias que puedes usar como guía</p>
                    <button class="btn-action btn-primary" onclick="window.app?.addMachote()">
                        <i class="fas fa-plus"></i> Crear primer machote
                    </button>
                </div>`;
            container.innerHTML = html;
            return;
        }

        html += `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Categoría</th>
                            <th>Fecha</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;

        for (let i = 0; i < machotes.length; i++) {
            const machote = machotes[i];
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight:500; color:var(--text-primary);">
                        <i class="${this.tipoIcono}" style="color:${this.tipoColor}; margin-right:8px;"></i>
                        ${escapeHtml(machote.nombre)}
                    </td>
                    <td style="color:var(--text-secondary); font-size:13px;">
                        ${escapeHtml(machote.descripcion || 'Sin descripción')}
                    </td>
                    <td>
                        <span style="background:rgba(232,67,147,0.15); color:${this.tipoColor}; padding:2px 10px; border-radius:12px; font-size:12px;">
                            ${escapeHtml(machote.categoria || 'General')}
                        </span>
                    </td>
                    <td style="font-size:12px; color:var(--text-muted);">
                        ${machote.fecha || 'Sin fecha'}
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-action btn-info" onclick="window.app?.verMachote(${machote.id})" style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn-action btn-primary" onclick="window.app?.editarMachote(${machote.id})" style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-action btn-danger" onclick="window.app?.deleteMachote(${machote.id})" style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }

        html += `
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top:12px; padding:12px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
                <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--text-muted);">
                    <span><i class="fas fa-info-circle" style="color:${this.tipoColor};"></i> Los machotes son plantillas de referencia, no se califican</span>
                    <span><i class="fas fa-tag" style="color:${this.tipoColor};"></i> Puedes categorizarlos para mejor organización</span>
                    <span><i class="fas fa-upload" style="color:${this.tipoColor};"></i> Importa machotes desde archivos CSV</span>
                </div>
            </div>`;

        container.innerHTML = html;
    }

    async addMachote() {
        const result = await Swal.fire({
            title: 'Crear Nuevo Machote',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre del Machote:</label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Ej. Plantilla de Proyecto">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📂 Categoría:</label>
                    <input id="swal-categoria" class="swal2-input" placeholder="Ej. Proyectos, Exámenes, etc.">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📄 Descripción:</label>
                    <textarea id="swal-descripcion" class="swal2-textarea" rows="4" placeholder="Describe el propósito de este machote..."></textarea>
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📋 Contenido del Machote:</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6" placeholder="Escribe el contenido detallado del machote..."></textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Crear Machote',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '500px',
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value.trim();
                const categoria = document.getElementById('swal-categoria').value.trim();
                const descripcion = document.getElementById('swal-descripcion').value.trim();
                const contenido = document.getElementById('swal-contenido').value.trim();
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                
                return { nombre, categoria, descripcion, contenido };
            }
        });

        if (result.isConfirmed && result.value) {
            const data = result.value;
            const machoteData = {
                nombre: data.nombre,
                categoria: data.categoria || 'General',
                descripcion: data.descripcion || '',
                contenido: data.contenido || '',
                fecha: getDayMonth(),
                activo: true
            };
            
            await this.app.grades.addWork(this.app.currentSectionId, this.tipo, machoteData);
            await this.app.render();
            this.app.ui.showSuccess('✅ Machote creado correctamente');
        }
    }

    async verMachote(id) {
        const machote = this.app.grades.getWorkById(this.tipo, id);
        if (!machote) return;

        Swal.fire({
            title: `<i class="${this.tipoIcono}" style="color:${this.tipoColor};"></i> ${escapeHtml(machote.nombre)}`,
            html: `
                <div style="text-align:left; font-size:13px; color:var(--text-secondary);">
                    <div style="margin-bottom:12px; padding:10px; background:var(--bg-hover); border-radius:8px; border-left:4px solid ${this.tipoColor};">
                        <span style="font-weight:600; color:var(--text-primary);">📂 Categoría:</span>
                        <span style="background:rgba(232,67,147,0.15); color:${this.tipoColor}; padding:2px 10px; border-radius:12px; margin-left:8px;">
                            ${escapeHtml(machote.categoria || 'General')}
                        </span>
                        <span style="display:block; margin-top:4px;">
                            <span style="font-weight:600; color:var(--text-primary);">📅 Fecha:</span>
                            ${escapeHtml(machote.fecha || 'Sin fecha')}
                        </span>
                    </div>
                    
                    ${machote.descripcion ? `
                        <div style="margin-bottom:10px;">
                            <span style="font-weight:600; color:var(--text-primary);">📄 Descripción:</span>
                            <p style="margin-top:4px; padding:8px; background:var(--bg-hover); border-radius:6px;">
                                ${escapeHtml(machote.descripcion)}
                            </p>
                        </div>
                    ` : ''}
                    
                    ${machote.contenido ? `
                        <div>
                            <span style="font-weight:600; color:var(--text-primary);">📋 Contenido:</span>
                            <div style="margin-top:4px; padding:12px; background:var(--bg-hover); border-radius:6px; max-height:300px; overflow-y:auto; white-space:pre-wrap;">
                                ${escapeHtml(machote.contenido)}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div style="margin-top:12px; padding-top:10px; border-top:1px solid var(--border-color); font-size:11px; color:var(--text-muted); text-align:center;">
                        <i class="fas fa-info-circle"></i> Los machotes son solo para referencia, no se califican
                    </div>
                </div>
            `,
            icon: 'info',
            confirmButtonText: '✅ Entendido',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '550px'
        });
    }

    async editarMachote(id) {
        const machote = this.app.grades.getWorkById(this.tipo, id);
        if (!machote) return;

        const result = await Swal.fire({
            title: `Editar Machote: ${escapeHtml(machote.nombre)}`,
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre:</label>
                    <input id="swal-nombre" class="swal2-input" value="${escapeHtml(machote.nombre)}">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📂 Categoría:</label>
                    <input id="swal-categoria" class="swal2-input" value="${escapeHtml(machote.categoria || '')}">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📄 Descripción:</label>
                    <textarea id="swal-descripcion" class="swal2-textarea" rows="4">${escapeHtml(machote.descripcion || '')}</textarea>
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📋 Contenido:</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6">${escapeHtml(machote.contenido || '')}</textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '500px',
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value.trim();
                const categoria = document.getElementById('swal-categoria').value.trim();
                const descripcion = document.getElementById('swal-descripcion').value.trim();
                const contenido = document.getElementById('swal-contenido').value.trim();
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                
                return { nombre, categoria, descripcion, contenido };
            }
        });

        if (result.isConfirmed && result.value) {
            const data = result.value;
            await this.app.grades.updateWork(this.tipo, id, {
                nombre: data.nombre,
                categoria: data.categoria || 'General',
                descripcion: data.descripcion || '',
                contenido: data.contenido || ''
            });
            
            await this.app.render();
            this.app.ui.showSuccess('✅ Machote actualizado correctamente');
        }
    }

    async deleteMachote(id) {
        const machote = this.app.grades.getWorkById(this.tipo, id);
        if (!machote) return;
        
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el machote "${machote.nombre}"?`);
        if (confirm.isConfirmed) {
            await this.app.grades.deleteWork(this.tipo, id);
            await this.app.render();
            this.app.ui.showSuccess('Machote eliminado');
        }
    }

    async importarMachotes() {
        const result = await this.app.ui.showTextarea(
            'Importar Machotes',
            '',
            'Formato: nombre, categoría, descripción, contenido (uno por línea)\nEjemplo:\nPlantilla Proyecto, Proyectos, Plantilla para proyectos finales, Contenido detallado...\nGuía de Examen, Exámenes, Guía para preparar exámenes, Contenido de la guía...'
        );
        
        if (!result.isConfirmed || !result.value) return;
        
        const lines = result.value.split('\n').filter(line => line.trim());
        const machotesToImport = [];
        let errors = 0;
        
        for (const line of lines) {
            const parts = line.split(',').map(s => s.trim());
            if (parts.length >= 1) {
                machotesToImport.push({
                    nombre: parts[0] || 'Machote sin nombre',
                    categoria: parts[1] || 'General',
                    descripcion: parts[2] || '',
                    contenido: parts.slice(3).join(',') || '',
                    fecha: getDayMonth(),
                    activo: true
                });
            } else {
                errors++;
            }
        }
        
        if (machotesToImport.length === 0) {
            this.app.ui.showError('No se encontraron datos válidos para importar');
            return;
        }
        
        const confirm = await this.app.ui.showConfirm(
            `Se importarán ${machotesToImport.length} machotes. ${errors > 0 ? `(${errors} líneas omitidas por formato inválido)` : ''}`
        );
        
        if (confirm.isConfirmed) {
            for (const machote of machotesToImport) {
                await this.app.grades.addWork(this.app.currentSectionId, this.tipo, machote);
            }
            await this.app.render();
            this.app.ui.showSuccess(`✅ ${machotesToImport.length} machotes importados correctamente`);
        }
    }
}