// ============================================================
// BitacoraManager.js - Gestión de Bitácora (Notas) en localStorage
// ============================================================

class BitacoraManager {
    constructor(app) {
        this.app = app;
        this.storageKey = 'bitacora_'; // Se concatenará con sectionId
    }

    // Obtener la clave única para la sección actual
    getKey() {
        const sectionId = this.app.currentSectionId || 'default';
        return `${this.storageKey}${sectionId}`;
    }

    // Obtener todas las entradas de la bitácora para la sección actual
    getEntries() {
        try {
            const data = localStorage.getItem(this.getKey());
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Error leyendo bitácora:', e);
            return [];
        }
    }

    // Guardar todas las entradas
    saveEntries(entries) {
        try {
            localStorage.setItem(this.getKey(), JSON.stringify(entries));
        } catch (e) {
            console.error('Error guardando bitácora:', e);
        }
    }

    // Agregar una nueva entrada
    addEntry(titulo, contenido) {
        const entries = this.getEntries();
        const newEntry = {
            id: Date.now(), // ID único basado en timestamp
            titulo: titulo.trim(),
            contenido: contenido.trim(),
            fecha: getDayMonth(), // función global
            timestamp: new Date().toISOString()
        };
        entries.unshift(newEntry); // Más reciente primero
        this.saveEntries(entries);
        return newEntry;
    }

    // Editar una entrada existente
    editEntry(id, titulo, contenido) {
        const entries = this.getEntries();
        const index = entries.findIndex(e => e.id === id);
        if (index === -1) return false;
        entries[index].titulo = titulo.trim();
        entries[index].contenido = contenido.trim();
        this.saveEntries(entries);
        return true;
    }

    // Eliminar una entrada
    deleteEntry(id) {
        const entries = this.getEntries();
        const filtered = entries.filter(e => e.id !== id);
        if (filtered.length === entries.length) return false;
        this.saveEntries(filtered);
        return true;
    }

    // Obtener una entrada por ID
    getEntry(id) {
        const entries = this.getEntries();
        return entries.find(e => e.id === id) || null;
    }

    // Renderizar la vista de bitácora
    async renderBitacora(container) {
        const entries = this.getEntries();

        let html = `
            <div class="works-header">
                <h2><i class="fas fa-book" style="color:#f38ba8;"></i> Bitácora (Notas) <span class="count">(${entries.length})</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-primary" onclick="window.app.addBitacora()">
                        <i class="fas fa-plus"></i> Nueva Nota
                    </button>
                </div>
            </div>
            <div style="margin-bottom:12px; padding:8px 12px; background:var(--bg-hover); border-radius:6px; border-left:3px solid #f38ba8;">
                <span style="font-size:12px; color:var(--text-muted);">
                    <i class="fas fa-info-circle" style="color:#f38ba8;"></i> 
                    Las notas se guardan en el navegador (localStorage) y están asociadas a la sección actual.
                </span>
            </div>`;

        if (entries.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-book" style="font-size:48px; opacity:0.3; color:#f38ba8;"></i>
                    <p>No hay notas en esta sección</p>
                    <button class="btn-action btn-primary" onclick="window.app.addBitacora()">
                        <i class="fas fa-plus"></i> Crear primera nota
                    </button>
                </div>`;
            container.innerHTML = html;
            return;
        }

        html += `
            <div style="display:flex; flex-direction:column; gap:12px;">`;

        for (const entry of entries) {
            html += `
                <div style="background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); padding:12px 16px; transition:all 0.2s;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
                        <div style="flex:1; min-width:0;">
                            <h3 style="margin:0 0 4px 0; font-size:15px; color:var(--text-primary);">${escapeHtml(entry.titulo)}</h3>
                            <span style="font-size:11px; color:var(--text-muted);">
                                <i class="fas fa-calendar-alt"></i> ${entry.fecha || 'Sin fecha'}
                            </span>
                        </div>
                        <div style="display:flex; gap:4px; flex-shrink:0;">
                            <button class="btn-action btn-primary" onclick="window.app.editarBitacora(${entry.id})" style="padding:4px 8px; font-size:12px;">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="btn-action btn-danger" onclick="window.app.deleteBitacora(${entry.id})" style="padding:4px 8px; font-size:12px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="margin-top:8px; font-size:13px; color:var(--text-secondary); white-space:pre-wrap; word-break:break-word;">
                        ${escapeHtml(entry.contenido)}
                    </div>
                </div>`;
        }

        html += `</div>`;

        container.innerHTML = html;
    }

    // === CRUD desde la UI ===

    async addBitacora() {
        const result = await Swal.fire({
            title: 'Nueva Nota',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Título:</label>
                    <input id="swal-titulo" class="swal2-input" placeholder="Título de la nota">
                    <label style="font-size:13px; color:var(--text-secondary);">📄 Contenido:</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6" placeholder="Escribe tu nota aquí..."></textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Guardar Nota',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value.trim();
                const contenido = document.getElementById('swal-contenido').value.trim();
                if (!titulo) {
                    Swal.showValidationMessage('El título es obligatorio');
                    return;
                }
                if (!contenido) {
                    Swal.showValidationMessage('El contenido es obligatorio');
                    return;
                }
                return { titulo, contenido };
            }
        });

        if (result.isConfirmed && result.value) {
            const { titulo, contenido } = result.value;
            this.addEntry(titulo, contenido);
            await this.app.render();
            this.app.ui.showSuccess('Nota agregada correctamente');
        }
    }

    async editBitacora(id) {
        const entry = this.getEntry(id);
        if (!entry) {
            this.app.ui.showError('Nota no encontrada');
            return;
        }

        const result = await Swal.fire({
            title: 'Editar Nota',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Título:</label>
                    <input id="swal-titulo" class="swal2-input" value="${escapeHtml(entry.titulo)}">
                    <label style="font-size:13px; color:var(--text-secondary);">📄 Contenido:</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6">${escapeHtml(entry.contenido)}</textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar Cambios',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value.trim();
                const contenido = document.getElementById('swal-contenido').value.trim();
                if (!titulo) {
                    Swal.showValidationMessage('El título es obligatorio');
                    return;
                }
                if (!contenido) {
                    Swal.showValidationMessage('El contenido es obligatorio');
                    return;
                }
                return { titulo, contenido };
            }
        });

        if (result.isConfirmed && result.value) {
            const { titulo, contenido } = result.value;
            this.editEntry(id, titulo, contenido);
            await this.app.render();
            this.app.ui.showSuccess('Nota actualizada correctamente');
        }
    }

    async deleteBitacora(id) {
        const entry = this.getEntry(id);
        if (!entry) return;
        const confirm = await this.app.ui.showConfirm(`¿Eliminar la nota "${entry.titulo}"?`);
        if (confirm.isConfirmed) {
            this.deleteEntry(id);
            await this.app.render();
            this.app.ui.showSuccess('Nota eliminada');
        }
    }
}