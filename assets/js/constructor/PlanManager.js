// ============================================================
// PlanManager.js - Gestión del plan
// ============================================================

class PlanManager {
    constructor(app) {
        this.app = app;
    }

    async renderPlan(container) {
        const enlaces = this.app.plan.enlaces || [];
        const contenidos = this.app.plan.contenidos || [];
        const planAnual = enlaces.filter(e => e.tipo === 'plan_anual');
        const planPedagogico = enlaces.filter(e => e.tipo === 'plan_pedagogico');
        const otros = enlaces.filter(e => e.tipo === 'otro');
        const periodos = ['semana', 'mes'];
        const contenidoPorPeriodo = {};
        for (const p of periodos) { 
            contenidoPorPeriodo[p] = contenidos.filter(c => c.periodo === p); 
        }
        
        let html = `
            <div class="works-header">
                <h2><i class="fas fa-calendar-alt" style="color:#94e2d5;"></i> Plan <span class="count">(${enlaces.length + contenidos.length} items)</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-info" onclick="window.app?.addEnlacePlan()"><i class="fas fa-link"></i> Agregar Enlace</button>
                    <button class="btn-action btn-primary" onclick="window.app?.addContenidoPlan()"><i class="fas fa-plus"></i> Agregar Contenido</button>
                </div>
            </div>
            <div class="plan-container">
                <div class="plan-columna">
                    <h3><i class="fas fa-link" style="color:#94e2d5;"></i> Enlaces</h3>
                    ${this.renderEnlacesColumna(planAnual, '📅 Plan Anual')}
                    ${this.renderEnlacesColumna(planPedagogico, '📚 Plan Pedagógico')}
                    ${this.renderEnlacesColumna(otros, '📎 Otros Enlaces')}
                </div>
                <div class="plan-columna">
                    <h3><i class="fas fa-file-alt" style="color:#f9e2af;"></i> Contenido</h3>
                    ${this.renderContenidoColumna(contenidoPorPeriodo)}
                </div>
            </div>`;
        container.innerHTML = html;
    }

    renderEnlacesColumna(enlaces, titulo) {
        if (enlaces.length === 0) {
            return `
                <div style="margin-bottom:12px;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; font-weight:500;">${titulo}</div>
                    <div class="empty-message" style="padding:12px; font-size:13px; background:var(--bg-hover); border-radius:8px;">
                        <i class="fas fa-plus-circle" style="font-size:16px;"></i> Sin enlaces
                    </div>
                </div>`;
        }
        let html = `<div style="margin-bottom:12px;"><div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; font-weight:500;">${titulo}</div>`;
        for (const enlace of enlaces) {
            html += `
                <div class="plan-item">
                    <div class="plan-info">
                        <span class="plan-nombre">${escapeHtml(enlace.nombre)}</span>
                        <span class="plan-desc">
                            <i class="fas fa-link" style="font-size:10px;"></i> 
                            <a href="${escapeHtml(enlace.url)}" target="_blank" style="color:var(--color-plan); text-decoration:none;">
                                ${escapeHtml(enlace.url.length > 40 ? enlace.url.substring(0, 40) + '…' : enlace.url)}
                            </a>
                        </span>
                    </div>
                    <div class="plan-actions">
                        <button class="link-btn" onclick="window.open('${escapeHtml(enlace.url)}', '_blank')" title="Abrir enlace">
                            <i class="fas fa-external-link-alt"></i>
                        </button>
                        <button onclick="window.app?.deleteEnlacePlan(${enlace.id})" title="Eliminar">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>`;
        }
        html += '</div>';
        return html;
    }

    renderContenidoColumna(contenidoPorPeriodo) {
        const periodos = [{ key: 'semana', label: '📅 Por Semana' }, { key: 'mes', label: '📆 Por Mes' }];
        let html = '';
        for (const p of periodos) {
            const items = contenidoPorPeriodo[p.key] || [];
            html += `
                <div style="margin-bottom:12px;">
                    <div style="font-size:12px; color:var(--text-muted); margin-bottom:6px; font-weight:500;">${p.label}</div>`;
            if (items.length === 0) {
                html += `
                    <div class="empty-message" style="padding:12px; font-size:13px; background:var(--bg-hover); border-radius:8px;">
                        <i class="fas fa-plus-circle" style="font-size:16px;"></i> Sin contenido
                    </div>`;
            } else {
                for (const item of items) {
                    html += `
                        <div class="plan-contenido-item" style="margin-bottom:8px; padding:12px 16px;">
                            <div class="item-header">
                                <span class="item-titulo">${escapeHtml(item.titulo)}</span>
                                <span class="item-fecha">${item.fecha || 'Sin fecha'}</span>
                            </div>
                            <div class="item-contenido" style="max-height:100px; font-size:13px;">${escapeHtml(item.contenido || '')}</div>
                            <div class="item-actions">
                                <button onclick="window.app?.editarContenidoPlan(${item.id})"><i class="fas fa-pencil-alt"></i> Editar</button>
                                <button class="danger" onclick="window.app?.deleteContenidoPlan(${item.id})"><i class="fas fa-trash"></i></button>
                            </div>
                        </div>`;
                }
            }
            html += '</div>';
        }
        return html;
    }

    async addEnlacePlan() {
        const result = await this.app.ui.showFormularioPlan();
        if (result.isConfirmed && result.value) {
            await this.app.plan.addEnlace({ 
                nombre: result.value.nombre, 
                url: result.value.url, 
                tipo: result.value.tipo 
            });
            await this.app.render();
            this.app.ui.showSuccess('Enlace agregado al plan');
        }
    }

    async deleteEnlacePlan(id) {
        const enlace = this.app.plan.enlaces.find(e => e.id === id);
        if (!enlace) return;
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el enlace "${enlace.nombre}"?`);
        if (confirm.isConfirmed) { 
            await this.app.plan.deleteEnlace(id);
            await this.app.render();
            this.app.ui.showSuccess('Enlace eliminado'); 
        }
    }

    async addContenidoPlan() {
        const result = await Swal.fire({
            title: 'Agregar Contenido al Plan',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">Título</label>
                    <input id="swal-titulo" class="swal2-input" placeholder="Ej. Semana 1 - Introducción">
                    <label style="font-size:13px; color:var(--text-secondary);">Periodo</label>
                    <select id="swal-periodo" class="swal2-input" style="appearance:auto;">
                        <option value="semana">Por Semana</option>
                        <option value="mes">Por Mes</option>
                    </select>
                    <label style="font-size:13px; color:var(--text-secondary);">Contenido</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6" placeholder="Describe el contenido del plan..."></textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value;
                const periodo = document.getElementById('swal-periodo').value;
                const contenido = document.getElementById('swal-contenido').value;
                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return; }
                if (!contenido) { Swal.showValidationMessage('El contenido es obligatorio'); return; }
                return { titulo, periodo, contenido };
            }
        });
        if (result.isConfirmed && result.value) {
            await this.app.plan.addContenido({ 
                titulo: result.value.titulo, 
                periodo: result.value.periodo,
                contenido: result.value.contenido 
            });
            await this.app.render();
            this.app.ui.showSuccess('Contenido agregado al plan');
        }
    }

    async editarContenidoPlan(id) {
        const item = this.app.plan.contenidos.find(c => c.id === id);
        if (!item) return;
        const result = await Swal.fire({
            title: 'Editar Contenido',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">Título</label>
                    <input id="swal-titulo" class="swal2-input" value="${escapeHtml(item.titulo)}">
                    <label style="font-size:13px; color:var(--text-secondary);">Periodo</label>
                    <select id="swal-periodo" class="swal2-input" style="appearance:auto;">
                        <option value="semana" ${item.periodo === 'semana' ? 'selected' : ''}>Por Semana</option>
                        <option value="mes" ${item.periodo === 'mes' ? 'selected' : ''}>Por Mes</option>
                    </select>
                    <label style="font-size:13px; color:var(--text-secondary);">Contenido</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6">${escapeHtml(item.contenido || '')}</textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value;
                const periodo = document.getElementById('swal-periodo').value;
                const contenido = document.getElementById('swal-contenido').value;
                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return; }
                if (!contenido) { Swal.showValidationMessage('El contenido es obligatorio'); return; }
                return { titulo, periodo, contenido };
            }
        });
        if (result.isConfirmed && result.value) {
            await this.app.plan.updateContenido(id, result.value);
            await this.app.render();
            this.app.ui.showSuccess('Contenido actualizado');
        }
    }

    async deleteContenidoPlan(id) {
        const item = this.app.plan.contenidos.find(c => c.id === id);
        if (!item) return;
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el contenido "${item.titulo}"?`);
        if (confirm.isConfirmed) { 
            await this.app.plan.deleteContenido(id);
            await this.app.render();
            this.app.ui.showSuccess('Contenido eliminado'); 
        }
    }
}