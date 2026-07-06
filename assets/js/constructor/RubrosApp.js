// ============================================================
// RubrosApp.js - Gestión de Rubros
// ============================================================

class RubrosApp extends BaseApp {
    constructor() {
        super();
        this.rubrosManager = null;
        console.log('🔍 Iniciando RubrosApp...');
    }

    // ============================================================
    // INICIALIZACIÓN DE RUBROSMANAGER
    // ============================================================
    initRubrosManager() {
        if (typeof RubrosManager !== 'undefined') {
            console.log('✅ RubrosManager está definido, instanciando...');
            this.rubrosManager = new RubrosManager(this);
            console.log('✅ rubrosManager instanciado:', this.rubrosManager);
        } else {
            console.warn('⚠️ RubrosManager NO está definido, usando métodos de respaldo');
            this.rubrosManager = null;
        }
        return this.rubrosManager;
    }

    // ============================================================
    // RENDERIZAR RUBROS (usa rubrosManager o fallback)
    // ============================================================
    async renderRubros(container) {
        console.log('📊 renderRubros llamado desde RubrosApp');
        
        if (this.rubrosManager && typeof this.rubrosManager.renderRubros === 'function') {
            console.log('✅ Usando rubrosManager.renderRubros');
            await this.rubrosManager.renderRubros(container);
            return;
        }
        
        console.log('⚠️ Usando renderRubros de respaldo');
        await this.renderRubrosFallback(container);
    }

    // ============================================================
    // FALLBACK (solo por si acaso, también sin lápiz)
    // ============================================================
    async renderRubrosFallback(container) {
        const rubros = this.grades.works['rubro'] || [];
        
        let html = `
            <div class="works-header">
                <h2><i class="fas fa-percent" style="color:#f9e2af;"></i> Rubros <span class="count">(${rubros.length})</span></h2>
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
                    <i class="fas fa-mouse-pointer"></i> Haz clic en nombre o porcentaje para editar
                </span>
            </div>`;

        if (rubros.length === 0) {
            html += `<div class="empty-state">...</div>`;
            container.innerHTML = html;
            return;
        }

        let totalPorcentaje = rubros.reduce((s, r) => s + (r.porcentaje || 0), 0);
        html += `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); width:100%;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead><tr>
                        <th>#</th><th>Nombre</th><th>Porcentaje (%)</th><th>Fecha</th><th>Eliminar</th>
                    </tr></thead>
                    <tbody>`;
        for (let i = 0; i < rubros.length; i++) {
            const r = rubros[i];
            html += `
                <tr>
                    <td>${i+1}</td>
                    <td>
                        <span onclick="window.app.editarCeldaRubro(${r.id},'nombre')" 
                              style="cursor:pointer; display:block; padding:4px 8px; border-radius:4px;"
                              onmouseover="this.style.background='rgba(249,226,175,0.1)'"
                              onmouseout="this.style.background='transparent'">
                            ${escapeHtml(r.nombre)}
                        </span>
                    </td>
                    <td>
                        <span onclick="window.app.editarCeldaRubro(${r.id},'porcentaje')"
                              style="cursor:pointer; display:block; padding:4px 8px; border-radius:4px; text-align:center; font-weight:600; color:#f9e2af;"
                              onmouseover="this.style.background='rgba(249,226,175,0.15)'"
                              onmouseout="this.style.background='transparent'">
                            ${r.porcentaje || 0}%
                        </span>
                    </td>
                    <td>${r.fecha || 'Sin fecha'}</td>
                    <td><button class="btn-action btn-danger" onclick="window.app.deleteRubro(${r.id})"><i class="fas fa-trash"></i></button></td>
                </tr>`;
        }
        html += `
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border-color);">
                            <td colspan="2" style="text-align:right;">TOTAL:</td>
                            <td style="text-align:center;">
                                <span style="background:rgba(249,226,175,0.25); padding:2px 12px; border-radius:12px; font-weight:700;">
                                    ${totalPorcentaje}% ${totalPorcentaje === 100 ? '✅' : totalPorcentaje > 100 ? '⚠️ Excede' : '⚠️ Faltante'}
                                </span>
                            </td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>`;
        container.innerHTML = html;
    }

    // ============================================================
    // CRUD DE RUBROS (delegación a rubrosManager o fallback)
    // ============================================================
    async addRubro() {
        if (this.rubrosManager && typeof this.rubrosManager.addRubro === 'function') {
            await this.rubrosManager.addRubro();
        } else {
            await this.addRubroFallback();
        }
    }

    async addRubroFallback() {
        // ... (mismo código que antes, pero sin cambios relevantes)
        // (lo omito por brevedad, pero debe existir)
    }

    async editarCeldaRubro(id, campo) {
        if (this.rubrosManager && typeof this.rubrosManager.editarCeldaRubro === 'function') {
            await this.rubrosManager.editarCeldaRubro(id, campo);
        } else {
            await this.editarCeldaRubroFallback(id, campo);
        }
    }

    async editarCeldaRubroFallback(id, campo) {
        // Implementación simple (similar a la de RubrosManager)
        // (puedes copiar la misma lógica)
    }

    async deleteRubro(id) {
        if (this.rubrosManager && typeof this.rubrosManager.deleteRubro === 'function') {
            await this.rubrosManager.deleteRubro(id);
        } else {
            await this.deleteRubroFallback(id);
        }
    }

    async deleteRubroFallback(id) {
        // ...
    }

    async importarRubros() {
        if (this.rubrosManager && typeof this.rubrosManager.importarRubros === 'function') {
            await this.rubrosManager.importarRubros();
        } else {
            await this.importarRubrosFallback();
        }
    }

    async importarRubrosFallback() {
        // ...
    }
}