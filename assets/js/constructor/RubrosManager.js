// ============================================================
// RubrosManager.js - Gestión de Rubros (tabla con nombres y porcentajes)
// ============================================================

class RubrosManager {
    constructor(app) {
        this.app = app;
        this.tipo = 'rubro';
        this.tipoLabel = 'Rubros';
        this.tipoIcono = 'fas fa-percent';
        this.tipoColor = '#f9e2af';
    }

    async renderRubros(container) {
        const rubros = this.app.grades.works[this.tipo] || [];
        
        let html = `
            <div class="works-header">
                <h2><i class="${this.tipoIcono}" style="color:${this.tipoColor};"></i> ${this.tipoLabel} <span class="count">(${rubros.length})</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-primary" onclick="window.app?.addRubro()">
                        <i class="fas fa-plus"></i> Agregar Rubro
                    </button>
                    <button class="btn-action btn-info" onclick="window.app?.importarRubros()">
                        <i class="fas fa-file-import"></i> Importar
                    </button>
                </div>
            </div>`;

        if (rubros.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="${this.tipoIcono}" style="font-size:48px; color:${this.tipoColor}; opacity:0.3;"></i>
                    <p>No hay rubros creados</p>
                    <p style="font-size:13px; color:var(--text-muted);">Los rubros definen los porcentajes de evaluación</p>
                    <button class="btn-action btn-primary" onclick="window.app?.addRubro()">
                        <i class="fas fa-plus"></i> Crear primer rubro
                    </button>
                </div>`;
            container.innerHTML = html;
            return;
        }

        // Calcular total de porcentajes
        let totalPorcentaje = 0;
        for (const rubro of rubros) {
            totalPorcentaje += (rubro.porcentaje || 0);
        }

        html += `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nombre</th>
                            <th>Porcentaje (%)</th>
                            <th>Fecha</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;

        for (let i = 0; i < rubros.length; i++) {
            const rubro = rubros[i];
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight:500; color:var(--text-primary);">
                        <i class="${this.tipoIcono}" style="color:${this.tipoColor}; margin-right:8px;"></i>
                        ${escapeHtml(rubro.nombre)}
                    </td>
                    <td>
                        <span style="background:rgba(249,226,175,0.15); color:${this.tipoColor}; padding:2px 12px; border-radius:12px; font-weight:600;">
                            ${rubro.porcentaje || 0}%
                        </span>
                    </td>
                    <td style="font-size:12px; color:var(--text-muted);">
                        ${rubro.fecha || 'Sin fecha'}
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-action btn-primary" onclick="window.app?.editarRubro(${rubro.id})" style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-action btn-danger" onclick="window.app?.deleteRubro(${rubro.id})" style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }

        html += `
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border-color); font-weight:bold;">
                            <td colspan="2" style="text-align:right; color:var(--text-secondary);">TOTAL:</td>
                            <td>
                                <span style="background:rgba(249,226,175,0.25); color:${totalPorcentaje === 100 ? '#a6e3a1' : '#f38ba8'}; padding:2px 12px; border-radius:12px; font-weight:700;">
                                    ${totalPorcentaje}%
                                    ${totalPorcentaje === 100 ? ' ✅' : totalPorcentaje > 100 ? ' ⚠️ Excede 100%' : ' ⚠️ Faltante'}
                                </span>
                            </td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div style="margin-top:12px; padding:12px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
                <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--text-muted);">
                    <span><i class="fas fa-info-circle" style="color:${this.tipoColor};"></i> Los rubros definen los porcentajes de evaluación</span>
                    <span><i class="fas fa-calculator" style="color:${this.tipoColor};"></i> El total debe sumar <strong>100%</strong></span>
                    <span><i class="fas fa-upload" style="color:${this.tipoColor};"></i> Importa rubros desde archivos CSV</span>
                </div>
            </div>`;

        container.innerHTML = html;
    }

    async addRubro() {
        const rubros = this.app.grades.works[this.tipo] || [];
        const totalActual = rubros.reduce((sum, r) => sum + (r.porcentaje || 0), 0);
        const restante = Math.max(0, 100 - totalActual);

        const result = await Swal.fire({
            title: 'Agregar Nuevo Rubro',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <div style="padding:8px 12px; background:var(--bg-hover); border-radius:6px; margin-bottom:8px;">
                        <span style="font-size:12px; color:var(--text-secondary);">
                            📊 Porcentaje disponible: <strong style="color:#f9e2af;">${restante}%</strong>
                            (Total actual: ${totalActual}%)
                        </span>
                    </div>
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre del Rubro:</label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Ej. Trabajos Cotidianos, Exámenes, Proyectos...">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📊 Porcentaje (%):</label>
                    <input id="swal-porcentaje" class="swal2-input" type="number" min="0" max="${restante}" placeholder="Ej. 25" value="${Math.min(25, restante)}">
                    
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <i class="fas fa-info-circle"></i> El porcentaje debe ser entre 0 y ${restante}%
                    </div>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Agregar Rubro',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '480px',
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value.trim();
                const porcentaje = parseFloat(document.getElementById('swal-porcentaje').value);
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                
                if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
                    Swal.showValidationMessage('El porcentaje debe ser un número entre 0 y 100');
                    return;
                }
                
                if (porcentaje > restante) {
                    Swal.showValidationMessage(`El porcentaje no puede exceder el ${restante}% disponible`);
                    return;
                }
                
                return { nombre, porcentaje };
            }
        });

        if (result.isConfirmed && result.value) {
            const data = result.value;
            const rubroData = {
                nombre: data.nombre,
                porcentaje: data.porcentaje,
                fecha: getDayMonth(),
                activo: true
            };
            
            await this.app.grades.addWork(this.app.currentSectionId, this.tipo, rubroData);
            await this.app.render();
            this.app.ui.showSuccess(`✅ Rubro "${data.nombre}" creado con ${data.porcentaje}%`);
        }
    }

    async editarRubro(id) {
        const rubro = this.app.grades.getWorkById(this.tipo, id);
        if (!rubro) return;

        const rubros = this.app.grades.works[this.tipo] || [];
        const totalActual = rubros.reduce((sum, r) => sum + (r.porcentaje || 0), 0);
        const restante = 100 - (totalActual - (rubro.porcentaje || 0));

        const result = await Swal.fire({
            title: `Editar Rubro: ${escapeHtml(rubro.nombre)}`,
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <div style="padding:8px 12px; background:var(--bg-hover); border-radius:6px; margin-bottom:8px;">
                        <span style="font-size:12px; color:var(--text-secondary);">
                            📊 Porcentaje disponible: <strong style="color:#f9e2af;">${restante}%</strong>
                            (Total actual: ${totalActual}%)
                        </span>
                    </div>
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre:</label>
                    <input id="swal-nombre" class="swal2-input" value="${escapeHtml(rubro.nombre)}">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">📊 Porcentaje (%):</label>
                    <input id="swal-porcentaje" class="swal2-input" type="number" min="0" max="${restante}" value="${rubro.porcentaje || 0}">
                </div>`,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '480px',
            preConfirm: () => {
                const nombre = document.getElementById('swal-nombre').value.trim();
                const porcentaje = parseFloat(document.getElementById('swal-porcentaje').value);
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                
                if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
                    Swal.showValidationMessage('El porcentaje debe ser un número entre 0 y 100');
                    return;
                }
                
                if (porcentaje > restante) {
                    Swal.showValidationMessage(`El porcentaje no puede exceder el ${restante}% disponible`);
                    return;
                }
                
                return { nombre, porcentaje };
            }
        });

        if (result.isConfirmed && result.value) {
            const data = result.value;
            await this.app.grades.updateWork(this.tipo, id, {
                nombre: data.nombre,
                porcentaje: data.porcentaje
            });
            
            await this.app.render();
            this.app.ui.showSuccess('✅ Rubro actualizado correctamente');
        }
    }

    async deleteRubro(id) {
        const rubro = this.app.grades.getWorkById(this.tipo, id);
        if (!rubro) return;
        
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el rubro "${rubro.nombre}" (${rubro.porcentaje}%)?`);
        if (confirm.isConfirmed) {
            await this.app.grades.deleteWork(this.tipo, id);
            await this.app.render();
            this.app.ui.showSuccess('Rubro eliminado');
        }
    }

    async importarRubros() {
        const rubros = this.app.grades.works[this.tipo] || [];
        const totalActual = rubros.reduce((sum, r) => sum + (r.porcentaje || 0), 0);
        const restante = 100 - totalActual;

        const result = await this.app.ui.showTextarea(
            'Importar Rubros',
            '',
            `Formato: nombre, porcentaje (uno por línea)\nEjemplo:\nTrabajos Cotidianos, 25\nExámenes, 30\nProyectos, 20\n\n⚠️ Porcentaje disponible: ${restante}%`
        );
        
        if (!result.isConfirmed || !result.value) return;
        
        const lines = result.value.split('\n').filter(line => line.trim());
        const rubrosToImport = [];
        let errors = 0;
        let totalImportado = 0;
        
        for (const line of lines) {
            const parts = line.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                const nombre = parts[0];
                const porcentaje = parseFloat(parts[1]);
                if (nombre && !isNaN(porcentaje) && porcentaje >= 0 && porcentaje <= 100) {
                    rubrosToImport.push({
                        nombre: nombre,
                        porcentaje: porcentaje,
                        fecha: getDayMonth(),
                        activo: true
                    });
                    totalImportado += porcentaje;
                } else {
                    errors++;
                }
            } else {
                errors++;
            }
        }
        
        if (rubrosToImport.length === 0) {
            this.app.ui.showError('No se encontraron datos válidos para importar');
            return;
        }
        
        if (totalImportado > restante) {
            this.app.ui.showError(`El total de los rubros a importar (${totalImportado}%) excede el ${restante}% disponible`);
            return;
        }
        
        const confirm = await this.app.ui.showConfirm(
            `Se importarán ${rubrosToImport.length} rubros (${totalImportado}%). ${errors > 0 ? `(${errors} líneas omitidas)` : ''}`
        );
        
        if (confirm.isConfirmed) {
            for (const rubro of rubrosToImport) {
                await this.app.grades.addWork(this.app.currentSectionId, this.tipo, rubro);
            }
            await this.app.render();
            this.app.ui.showSuccess(`✅ ${rubrosToImport.length} rubros importados correctamente`);
        }
    }
}