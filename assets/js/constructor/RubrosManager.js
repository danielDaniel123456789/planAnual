// ============================================================
// RubrosManager.js - Gestión de Rubros (Edición Directa)
// ============================================================

class RubrosManager {
    constructor(app) {
        this.app = app;
        this.tipo = 'rubro';
        this.tipoLabel = 'Rubros';
        this.tipoIcono = 'fas fa-percent';
        this.tipoColor = '#f9e2af';
        console.log('✅ RubrosManager instanciado correctamente');
        
    }


    // ============================================================
// EDITAR RUBRO COMPLETO (nombre + porcentaje)
// ============================================================
async editRubro(id) {
    const rubro = this.app.grades.getWorkById(this.tipo, id);
    if (!rubro) {
        this.app.ui.showError('Rubro no encontrado');
        return;
    }

    const result = await Swal.fire({
        title: `✏️ Editar Rubro: ${escapeHtml(rubro.nombre)}`,
        html: `
            <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                <label style="font-size:13px; color:var(--text-secondary);"> Nombre:</label>
                <input id="swal-nombre" class="swal2-input" value="${escapeHtml(rubro.nombre)}">
                <label style="font-size:13px; color:var(--text-secondary);">📊 Porcentaje (%):</label>
                <input id="swal-porcentaje" class="swal2-input" type="number" value="${rubro.porcentaje || 0}" min="0" max="100" step="1">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: '💾 Guardar',
        cancelButtonText: 'Cancelar',
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
                Swal.showValidationMessage('El porcentaje debe estar entre 0 y 100');
                return;
            }
            return { nombre, porcentaje };
        }
    });

    if (result.isConfirmed && result.value) {
        try {
            await this.app.grades.updateWork(this.tipo, id, {
                nombre: result.value.nombre,
                porcentaje: result.value.porcentaje
            });
            // Actualizar la vista sin recargar toda la app
            await this.app.render();
            this.app.ui.showSuccess('✅ Rubro actualizado correctamente');
        } catch (error) {
            console.error('Error al editar rubro:', error);
            this.app.ui.showError('Error al actualizar el rubro');
        }
    }
}
    async renderRubros(container) {
        console.log('📊 RubrosManager.renderRubros llamado');
        const rubros = this.app.grades.works[this.tipo] || [];
        
        let html = `
            <div class="works-header">
                <h2><i class="${this.tipoIcono}" style="color:${this.tipoColor};"></i> ${this.tipoLabel} <span class="count">(${rubros.length})</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-primary" onclick="window.app.addRubro()">
                        <i class="fas fa-plus"></i> Agregar Rubro
                    </button>
                    <button class="btn-action btn-info" onclick="window.app.importarRubros()">
                        <i class="fas fa-file-import"></i> Importar
                    </button>
                </div>
            </div>
            <div style="margin-bottom:12px; padding:8px 12px; background:var(--bg-hover); border-radius:6px; border-left:3px solid #f9e2af;">
                <span style="font-size:12px; color:var(--text-muted);">
                    <i class="fas fa-mouse-pointer" style="color:#f9e2af;"></i> 
                    💡 <strong>Haz clic en cualquier nombre o porcentaje</strong> para editarlo directamente
                </span>
            </div>`;

        if (rubros.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="${this.tipoIcono}" style="font-size:48px; color:${this.tipoColor}; opacity:0.3;"></i>
                    <p>No hay rubros creados</p>
                    <p style="font-size:13px; color:var(--text-muted);">Los rubros definen los porcentajes de evaluación</p>
                    <button class="btn-action btn-primary" onclick="window.app.addRubro()">
                        <i class="fas fa-plus"></i> Crear primer rubro
                    </button>
                </div>`;
            container.innerHTML = html;
            return;
        }

        let totalPorcentaje = 0;
        for (const rubro of rubros) {
            totalPorcentaje += (rubro.porcentaje || 0);
        }

        // Tabla con ancho 100% y celdas clickeables
        html += `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); width:100%;">
                <table class="data-table" id="tablaRubros" style="width:100%; table-layout:auto; border-collapse:collapse;">
                    <thead>
                        <tr>
                            <th style="width:5%; min-width:40px;">#</th>
                            <th style="width:40%; min-width:150px;">Nombre</th>
                            <th style="width:25%; min-width:120px;">Porcentaje (%)</th>
                            <th style="width:20%; min-width:100px;">Fecha</th>
                            <th style="width:10%; text-align:center; min-width:50px;">Eliminar</th>
                        </tr>
                    </thead>
                    <tbody>`;

        for (let i = 0; i < rubros.length; i++) {
            const rubro = rubros[i];
            html += `
                <tr id="rubro-fila-${rubro.id}">
                    <td style="text-align:center; color:var(--text-muted); font-size:13px;">${i + 1}</td>
                    <td style="padding:4px 6px;">
                        <span 
                            class="editable-cell" 
                            id="rubro-nombre-${rubro.id}"
                            data-id="${rubro.id}"
                            data-field="nombre"
                            style="display:block; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:500; color:var(--text-primary); transition:all 0.2s; border:1px solid transparent;"
                            onclick="window.app.editarCeldaRubro(${rubro.id}, 'nombre')"
                            onmouseover="this.style.background='rgba(249,226,175,0.1)'; this.style.borderColor='rgba(249,226,175,0.3)';"
                            onmouseout="this.style.background='transparent'; this.style.borderColor='transparent';"
                            title="Haz clic para editar el nombre">
                            ${escapeHtml(rubro.nombre)}
                        </span>
                    </td>
                    <td style="padding:4px 6px;">
                        <span 
                            class="editable-cell" 
                            id="rubro-porcentaje-${rubro.id}"
                            data-id="${rubro.id}"
                            data-field="porcentaje"
                            style="display:block; padding:6px 10px; border-radius:4px; cursor:pointer; font-weight:600; color:#f9e2af; transition:all 0.2s; text-align:center; border:1px solid transparent;"
                            onclick="window.app.editarCeldaRubro(${rubro.id}, 'porcentaje')"
                            onmouseover="this.style.background='rgba(249,226,175,0.15)'; this.style.borderColor='rgba(249,226,175,0.3)';"
                            onmouseout="this.style.background='transparent'; this.style.borderColor='transparent';"
                            title="Haz clic para editar el porcentaje">
                            ${rubro.porcentaje || 0}%
                        </span>
                    </td>
                    <td style="font-size:12px; color:var(--text-muted); text-align:center;">
                        ${rubro.fecha || 'Sin fecha'}
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-action btn-danger" onclick="window.app.deleteRubro(${rubro.id})" style="padding:4px 8px; font-size:12px;" title="Eliminar rubro">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }

        const totalColor = totalPorcentaje === 100 ? '#a6e3a1' : totalPorcentaje > 100 ? '#f38ba8' : '#f9e2af';
        const totalEmoji = totalPorcentaje === 100 ? ' ✅' : totalPorcentaje > 100 ? ' ⚠️ Excede 100%' : ' ⚠️ Faltante';

        html += `
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border-color); font-weight:bold;">
                            <td colspan="2" style="text-align:right; color:var(--text-secondary); padding:8px 12px;">TOTAL:</td>
                            <td style="text-align:center; padding:8px 12px;">
                                <span style="background:rgba(249,226,175,0.25); color:${totalColor}; padding:4px 16px; border-radius:12px; font-weight:700; font-size:14px;">
                                    ${totalPorcentaje}%
                                    ${totalEmoji}
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
                    <span><i class="fas fa-mouse-pointer" style="color:${this.tipoColor};"></i> <strong>Haz clic</strong> en cualquier nombre o porcentaje para editarlo</span>
                </div>
            </div>`;

        container.innerHTML = html;
    }

    // ============================================================
    // AGREGAR RUBRO
    // ============================================================
    async addRubro() {
        console.log('📊 RubrosManager.addRubro llamado');
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
                    <label style="font-size:13px; color:var(--text-secondary);"> Nombre:</label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Ej. Trabajos Cotidianos">
                    <label style="font-size:13px; color:var(--text-secondary);">📊 Porcentaje (%):</label>
                    <input id="swal-porcentaje" class="swal2-input" type="number" min="0" max="${restante}" placeholder="Ej. 25" value="${Math.min(25, restante)}">
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
                    Swal.showValidationMessage('El porcentaje debe ser entre 0 y 100');
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
            await this.app.grades.addWork(this.app.currentSectionId, this.tipo, {
                nombre: data.nombre,
                porcentaje: data.porcentaje,
                fecha: getDayMonth(),
                activo: true
            });
            await this.app.render();
            this.app.ui.showSuccess(`✅ Rubro "${data.nombre}" creado con ${data.porcentaje}%`);
        }
    }

    // ============================================================
    // EDITAR CELDA DIRECTAMENTE (SIN LÁPIZ)
    // ============================================================
    async editarCeldaRubro(id, campo) {
        console.log(`📊 Editando rubro ${id}, campo: ${campo}`);
        
        const rubro = this.app.grades.getWorkById(this.tipo, id);
        if (!rubro) {
            this.app.ui.showError('Rubro no encontrado');
            return;
        }

        const valorActual = campo === 'nombre' ? rubro.nombre : rubro.porcentaje || 0;
        const esPorcentaje = campo === 'porcentaje';
        
        let restante = 100;
        if (esPorcentaje) {
            const rubros = this.app.grades.works[this.tipo] || [];
            const totalActual = rubros.reduce((sum, r) => sum + (r.porcentaje || 0), 0);
            restante = 100 - (totalActual - (rubro.porcentaje || 0));
        }

        const result = await Swal.fire({
            title: esPorcentaje ? `✏️ Editar porcentaje de "${rubro.nombre}"` : `✏️ Editar nombre del rubro`,
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    ${esPorcentaje ? `
                        <div style="padding:8px 12px; background:var(--bg-hover); border-radius:6px; margin-bottom:8px;">
                            <span style="font-size:12px; color:var(--text-secondary);">
                                📊 Porcentaje disponible: <strong style="color:#f9e2af;">${restante}%</strong>
                            </span>
                        </div>
                        <label style="font-size:13px; color:var(--text-secondary);">📊 Porcentaje (%):</label>
                        <input id="swal-valor" class="swal2-input" type="number" min="0" max="${restante}" value="${valorActual}" step="1">
                        <div style="font-size:11px; color:var(--text-muted);">Rango permitido: 0% - ${restante}%</div>
                    ` : `
                        <label style="font-size:13px; color:var(--text-secondary);"> Nombre:</label>
                        <input id="swal-valor" class="swal2-input" value="${escapeHtml(valorActual)}">
                    `}
                </div>`,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '480px',
            preConfirm: () => {
                const valor = document.getElementById('swal-valor').value.trim();
                if (!valor) {
                    Swal.showValidationMessage('El valor es obligatorio');
                    return;
                }
                if (esPorcentaje) {
                    const num = parseFloat(valor);
                    if (isNaN(num) || num < 0 || num > 100) {
                        Swal.showValidationMessage('El porcentaje debe ser entre 0 y 100');
                        return;
                    }
                    if (num > restante) {
                        Swal.showValidationMessage(`El porcentaje no puede exceder el ${restante}% disponible`);
                        return;
                    }
                    return { valor: num };
                }
                return { valor };
            }
        });

        if (!result.isConfirmed || !result.value) return;

        try {
            const nuevoValor = result.value.valor;
            const updateData = {};
            if (campo === 'nombre') {
                updateData.nombre = nuevoValor;
            } else {
                updateData.porcentaje = nuevoValor;
            }
            
            await this.app.grades.updateWork(this.tipo, id, updateData);
            
            // Actualizar la celda sin recargar toda la tabla
            const celdaId = `rubro-${campo}-${id}`;
            const celda = document.getElementById(celdaId);
            if (celda) {
                if (campo === 'nombre') {
                    celda.textContent = nuevoValor;
                } else {
                    celda.textContent = `${nuevoValor}%`;
                }
            }
            
            // Actualizar el total
            await this.actualizarTotalRubros();
            
            this.app.ui.showSuccess(`✅ ${campo === 'nombre' ? 'Nombre' : 'Porcentaje'} actualizado correctamente`);
        } catch (error) {
            console.error('Error al actualizar rubro:', error);
            this.app.ui.showError('Error al actualizar el rubro');
        }
    }

    // ============================================================
    // ACTUALIZAR TOTAL DE RUBROS
    // ============================================================
    async actualizarTotalRubros() {
        const rubros = this.app.grades.works[this.tipo] || [];
        const total = rubros.reduce((sum, r) => sum + (r.porcentaje || 0), 0);
        
        const totalCell = document.querySelector('#tablaRubros tfoot td span');
        if (totalCell) {
            const totalColor = total === 100 ? '#a6e3a1' : total > 100 ? '#f38ba8' : '#f9e2af';
            const totalEmoji = total === 100 ? ' ✅' : total > 100 ? ' ⚠️ Excede 100%' : ' ⚠️ Faltante';
            totalCell.style.color = totalColor;
            totalCell.textContent = `${total}% ${totalEmoji}`;
        }
    }

    // ============================================================
    // ELIMINAR RUBRO
    // ============================================================
    async deleteRubro(id) {
        console.log('📊 RubrosManager.deleteRubro llamado para id:', id);
        const rubro = this.app.grades.getWorkById(this.tipo, id);
        if (!rubro) {
            this.app.ui.showError('Rubro no encontrado');
            return;
        }
        
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el rubro "${rubro.nombre}" (${rubro.porcentaje}%)?`);
        if (confirm.isConfirmed) {
            await this.app.grades.deleteWork(this.tipo, id);
            await this.app.render();
            this.app.ui.showSuccess('Rubro eliminado');
        }
    }

    // ============================================================
    // IMPORTAR RUBROS
    // ============================================================
    async importarRubros() {
        console.log('📊 RubrosManager.importarRubros llamado');
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