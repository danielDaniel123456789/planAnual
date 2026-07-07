// ============================================================
// BitacoraManager.js - Con depuración
// ============================================================

class BitacoraManager {
    constructor(app) {
        this.app = app;
    }

    async getEntries() {
        try {
            const seccionId = this.app.currentSectionId;
            if (!seccionId) return [];
            const entries = await this.app.db.getByIndex(STORES.BITACORA, 'seccionId', seccionId);
            entries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            return entries;
        } catch (e) {
            console.error('Error en getEntries:', e);
            return [];
        }
    }

    async getEntry(id) {
        try {
            return await this.app.db.get(STORES.BITACORA, id);
        } catch (e) {
            console.error('Error en getEntry:', e);
            return null;
        }
    }

    async addEntry(titulo, contenido) {
        try {
            const seccionId = this.app.currentSectionId;
            if (!seccionId) throw new Error('No hay sección');
            const newEntry = {
                titulo: titulo.trim(),
                contenido: contenido.trim(),
                fecha: getDayMonth(),
                timestamp: new Date().toISOString(),
                seccionId: seccionId
            };
            const id = await this.app.db.add(STORES.BITACORA, newEntry);
            return { ...newEntry, id };
        } catch (e) {
            console.error('Error en addEntry:', e);
            throw e;
        }
    }

    async editEntry(id, titulo, contenido) {
        try {
            const entry = await this.app.db.get(STORES.BITACORA, id);
            if (!entry) throw new Error('Entrada no encontrada');
            entry.titulo = titulo.trim();
            entry.contenido = contenido.trim();
            await this.app.db.put(STORES.BITACORA, entry);
            return true;
        } catch (e) {
            console.error('Error en editEntry:', e);
            throw e;
        }
    }

    async deleteEntry(id) {
        try {
            await this.app.db.delete(STORES.BITACORA, id);
            return true;
        } catch (e) {
            console.error('Error en deleteEntry:', e);
            throw e;
        }
    }

    // ---- UI ----

    async renderBitacora(container) {
        const entries = await this.getEntries();
        let html = `
            <div class="works-header">
                <h2><i class="fas fa-book" style="color:#f38ba8;"></i> Bitácora (Notas) <span class="count">(${entries.length})</span></h2>
                <button class="btn-action btn-primary" onclick="window.app.addBitacora()">
                    <i class="fas fa-plus"></i> Nueva Nota
                </button>
            </div>
            <div style="margin-bottom:12px; padding:8px 12px; background:var(--bg-hover); border-radius:6px; border-left:3px solid #f38ba8;">
                <span style="font-size:12px; color:var(--text-muted);">
                    <i class="fas fa-info-circle" style="color:#f38ba8;"></i> 
                    Las notas se guardan en la base de datos y están asociadas a la sección actual.
                </span>
            </div>`;

        if (entries.length === 0) {
            html += `<div class="empty-state"><p>No hay notas</p></div>`;
            container.innerHTML = html;
            return;
        }

        html += `<div style="display:flex; flex-direction:column; gap:12px;">`;
        for (const entry of entries) {
            html += `
                <div style="background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); padding:12px 16px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px; flex-wrap:wrap;">
                        <div style="flex:1;">
                            <h3 style="margin:0 0 4px 0; font-size:15px;">${escapeHtml(entry.titulo)}</h3>
                            <span style="font-size:11px; color:var(--text-muted);"><i class="fas fa-calendar-alt"></i> ${entry.fecha || 'Sin fecha'}</span>
                        </div>
                        <div style="display:flex; gap:4px;">
                            <button class="btn-action btn-primary" onclick="window.app.editBitacora(${entry.id})" style="padding:4px 8px; font-size:12px;">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="btn-action btn-danger" onclick="window.app.deleteBitacora(${entry.id})" style="padding:4px 8px; font-size:12px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div style="margin-top:8px; font-size:13px; color:var(--text-secondary); white-space:pre-wrap;">
                        ${escapeHtml(entry.contenido)}
                    </div>
                </div>`;
        }
        html += `</div>`;
        container.innerHTML = html;
    }

    // ---- CRUD desde UI ----

    async addBitacora() {
        const result = await Swal.fire({
            title: 'Nueva Nota',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label>📝 Título:</label>
                    <input id="swal-titulo" class="swal2-input" placeholder="Título">
                    <label>📄 Contenido:</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6" placeholder="Escribe tu nota..."></textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value.trim();
                const contenido = document.getElementById('swal-contenido').value.trim();
                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return; }
                if (!contenido) { Swal.showValidationMessage('El contenido es obligatorio'); return; }
                return { titulo, contenido };
            }
        });
        if (result.isConfirmed && result.value) {
            try {
                await this.addEntry(result.value.titulo, result.value.contenido);
                await this.app.render();
                this.app.ui.showSuccess('Nota agregada');
            } catch (e) {
                this.app.ui.showError('Error al guardar: ' + e.message);
            }
        }
    }

    async editBitacora(id) {
        console.log('editBitacora llamado con id:', id);
        const entry = await this.getEntry(id);
        if (!entry) {
            this.app.ui.showError('Nota no encontrada');
            return;
        }
        const result = await Swal.fire({
            title: 'Editar Nota',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label>📝 Título:</label>
                    <input id="swal-titulo" class="swal2-input" value="${escapeHtml(entry.titulo)}">
                    <label>📄 Contenido:</label>
                    <textarea id="swal-contenido" class="swal2-textarea" rows="6">${escapeHtml(entry.contenido)}</textarea>
                </div>`,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value.trim();
                const contenido = document.getElementById('swal-contenido').value.trim();
                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return; }
                if (!contenido) { Swal.showValidationMessage('El contenido es obligatorio'); return; }
                return { titulo, contenido };
            }
        });
        if (result.isConfirmed && result.value) {
            try {
                await this.editEntry(id, result.value.titulo, result.value.contenido);
                await this.app.render();
                this.app.ui.showSuccess('Nota actualizada');
            } catch (e) {
                this.app.ui.showError('Error al actualizar: ' + e.message);
            }
        }
    }

    async deleteBitacora(id) {
        console.log('deleteBitacora llamado con id:', id);
        const entry = await this.getEntry(id);
        if (!entry) {
            this.app.ui.showError('Nota no encontrada');
            return;
        }
        const confirm = await this.app.ui.showConfirm(`¿Eliminar "${entry.titulo}"?`);
        if (confirm.isConfirmed) {
            try {
                await this.deleteEntry(id);
                await this.app.render();
                this.app.ui.showSuccess('Nota eliminada');
            } catch (e) {
                this.app.ui.showError('Error al eliminar: ' + e.message);
            }
        }
    }
}