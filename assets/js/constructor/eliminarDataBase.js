// ============================================================
// eliminarDataBase.js - Eliminar todos los datos de la base de datos
// ============================================================

async function eliminarBaseDatos() {
    try {
        // Verificar que la base de datos esté inicializada
        if (!db || !db.db) {
            Swal.fire('Error', 'La base de datos no está inicializada', 'error');
            return;
        }

        // Obtener todos los stores
        const storeNames = Array.from(db.db.objectStoreNames);
        if (storeNames.length === 0) {
            Swal.fire('Información', 'No hay stores que eliminar.', 'info');
            return;
        }

        // Contar registros actuales
        let totalRecords = 0;
        for (const name of storeNames) {
            const data = await db.getAll(name);
            totalRecords += data.length;
        }

        // Mostrar advertencia con campo para escribir "eliminar"
        const confirmResult = await Swal.fire({
            title: '⚠️ ELIMINAR TODOS LOS DATOS',
            html: `
                <div style="text-align:left;">
                    <p style="color:#f38ba8; font-weight:bold; font-size:16px;">
                        ¡Esta acción es <strong>IRREVERSIBLE</strong>!
                    </p>
                    <p>Se eliminarán <strong>${totalRecords}</strong> registros de <strong>${storeNames.length}</strong> stores.</p>
                    <p style="margin-top:12px; color:var(--text-secondary);">
                        Para confirmar, escribe la palabra <strong style="color:#f9e2af;">"eliminar"</strong> en el campo de abajo.
                    </p>
                    <input id="swal-confirm-text" class="swal2-input" placeholder="Escribe 'eliminar' aquí" style="margin-top:8px;">
                </div>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar todos los datos',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '520px',
            preConfirm: () => {
                const input = document.getElementById('swal-confirm-text');
                const value = input?.value?.trim() || '';
                if (value !== 'eliminar') {
                    Swal.showValidationMessage('Debes escribir exactamente la palabra "eliminar" para confirmar.');
                    return false;
                }
                return true;
            }
        });

        if (!confirmResult.isConfirmed) return;

        // Segunda confirmación (más segura)
        const secondConfirm = await Swal.fire({
            title: '¿Estás completamente seguro?',
            text: `Se borrarán ${totalRecords} registros. Esta acción no se puede deshacer.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });

        if (!secondConfirm.isConfirmed) return;

        // Iniciar eliminación
        Swal.fire({
            title: 'Eliminando datos...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Limpiar cada store
        for (const storeName of storeNames) {
            await db.clear(storeName);
        }

        // Recargar la aplicación
        Swal.fire({
            icon: 'success',
            title: '✅ Datos eliminados',
            text: 'Todos los datos han sido eliminados. La aplicación se recargará.',
            timer: 2000,
            timerProgressBar: true
        });

        // Reiniciar la aplicación
        if (window.app) {
            // Forzar recarga de datos y renderizado
            await window.app.sections.load();
            if (window.app.sections.list.length === 0) {
                await window.app.sections.create('Sección Principal');
                await window.app.sections.load();
            }
            window.app.currentSectionId = window.app.sections.list[0]?.id || null;
            await window.app.loadData();
            await window.app.render();
        } else {
            // Si no hay app, recargar la página
            location.reload();
        }

    } catch (error) {
        console.error('Error al eliminar la base de datos:', error);
        Swal.fire('Error', 'No se pudo eliminar la base de datos: ' + error.message, 'error');
    }
}

// Asegurar que db.clear exista (si no está definido en otro lado)
if (!db.clear) {
    db.clear = function(storeName) {
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    };
}