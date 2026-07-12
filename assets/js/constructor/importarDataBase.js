// ============================================================
// importarDataBase.js - Importar base de datos desde JSON
// ============================================================

async function importarBaseDeDatos() {
    try {
        // Verificar que la base de datos esté inicializada
        if (!db || !db.db) {
            Swal.fire('Error', 'La base de datos no está inicializada', 'error');
            return;
        }

        // Crear input de archivo oculto
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.click();

        // Esperar a que el usuario seleccione un archivo
        const file = await new Promise((resolve) => {
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (file) resolve(file);
                else resolve(null);
            };
            // Si el usuario cierra el diálogo sin seleccionar
            input.oncancel = () => resolve(null);
        });

        if (!file) {
            // El usuario canceló
            return;
        }

        // Leer el archivo
        const text = await file.text();
        let importData;
        try {
            importData = JSON.parse(text);
        } catch (e) {
            Swal.fire('Error', 'El archivo no es un JSON válido.', 'error');
            return;
        }

        // Validar estructura básica
        if (!importData._metadata || !importData._metadata.dbName) {
            Swal.fire('Error', 'El archivo no parece ser una exportación válida de la base de datos.', 'error');
            return;
        }

        // Mostrar resumen
        const storeNames = Object.keys(importData).filter(key => key !== '_metadata');
        const totalRecords = storeNames.reduce((sum, name) => sum + (importData[name]?.length || 0), 0);

        if (totalRecords === 0) {
            Swal.fire('Advertencia', 'El archivo no contiene datos para importar.', 'warning');
            return;
        }

        // Construir mensaje de confirmación
        let summaryHtml = `
            <div style="text-align:left; max-height:300px; overflow-y:auto;">
                <p><strong>Archivo:</strong> ${file.name}</p>
                <p><strong>Exportado:</strong> ${new Date(importData._metadata.exportDate).toLocaleString()}</p>
                <p><strong>Base de datos original:</strong> ${importData._metadata.dbName}</p>
                <p><strong>Total de registros:</strong> ${totalRecords}</p>
                <hr style="border-color:var(--border-color);">
                <ul style="list-style:none; padding:0; margin:0;">
        `;

        for (const name of storeNames) {
            const count = importData[name]?.length || 0;
            summaryHtml += `<li style="padding:4px 0; border-bottom:1px solid var(--border-color);">
                <span style="display:inline-block; width:200px; font-weight:500;">${name}</span>
                <span style="float:right;">${count} registros</span>
            </li>`;
        }
        summaryHtml += `</ul></div>`;

        const confirmResult = await Swal.fire({
            title: '⚠️ Importar base de datos',
            html: `
                <p style="color:var(--text-secondary);">Esta acción <strong style="color:#f38ba8;">SOBRESCRIBIRÁ</strong> todos los datos actuales.</p>
                ${summaryHtml}
                <p style="margin-top:12px; color:var(--text-muted); font-size:13px;">
                    <i class="fas fa-info-circle"></i> Los IDs se conservarán para mantener las relaciones.
                </p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '600px'
        });

        if (!confirmResult.isConfirmed) return;

        // Iniciar importación
        Swal.fire({
            title: 'Importando...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener todos los stores de la base de datos actual
        const currentStoreNames = Array.from(db.db.objectStoreNames);

        // Procesar cada store
        for (const storeName of storeNames) {
            const records = importData[storeName] || [];

            // Verificar que el store exista en la base de datos actual
            if (!currentStoreNames.includes(storeName)) {
                console.warn(`El store "${storeName}" no existe en la base de datos actual. Se omite.`);
                continue;
            }

            // Limpiar el store
            await db.clear(storeName);

            // Insertar registros
            for (const record of records) {
                await db.put(storeName, record);
            }
        }

        // Finalizar
        await Swal.fire({
            icon: 'success',
            title: '✅ Importación completada',
            html: `
                <p>Se importaron <strong>${totalRecords}</strong> registros de <strong>${storeNames.length}</strong> stores.</p>
                <p style="font-size:13px; color:var(--text-secondary);">La base de datos ha sido actualizada.</p>
            `,
            timer: 3000,
            timerProgressBar: true
        });

        // Recargar la aplicación para reflejar los cambios
        if (window.app) {
            // Recargar datos y renderizar
            await window.app.loadData();
            await window.app.render();
        } else {
            // Si no hay app, recargar la página
            location.reload();
        }

    } catch (error) {
        console.error('Error al importar la base de datos:', error);
        Swal.fire('Error', 'No se pudo importar la base de datos: ' + error.message, 'error');
    }
}

// Extender db con método clear si no existe
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