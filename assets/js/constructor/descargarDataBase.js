// ============================================================
// descargarDataBase.js - Gestión completa de respaldos
// ============================================================

// --- CONFIGURACIÓN DEL SERVIDOR ---
const SERVER_URL = 'https://educr.app/databaseJSON/insert.php';
const REGISTER_URL = 'https://educr.app/databaseJSON/registrar_correo.php';
const DOWNLOAD_URL = 'https://educr.app/databaseJSON/download.php';
const API_KEY = 'miClaveSuperSecreta123'; // Debe coincidir con la del PHP

// ============================================================
// 1. EXPORTAR DB (descargar archivo JSON local)
// ============================================================
async function descargarDataBase() {
    try {
        if (!db || !db.db) {
            Swal.fire('Error', 'La base de datos no está inicializada', 'error');
            return;
        }

        Swal.fire({
            title: 'Exportando base de datos...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const storeNames = db.db.objectStoreNames;
        const exportData = {};
        for (const storeName of storeNames) {
            exportData[storeName] = await db.getAll(storeName);
        }
        exportData._metadata = {
            exportDate: new Date().toISOString(),
            dbName: DB_NAME,
            dbVersion: DB_VERSION,
            totalStores: storeNames.length,
            totalRecords: Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0)
        };

        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fecha = new Date().toISOString().slice(0, 10);
        a.download = `backup_${DB_NAME}_${fecha}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.fire({
            icon: 'success',
            title: '✅ Base de datos exportada',
            html: `<p>Archivo: <strong>${a.download}</strong></p><p>Total de registros: ${exportData._metadata.totalRecords}</p>`,
            timer: 3000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error('Error al exportar:', error);
        Swal.fire('Error', 'No se pudo exportar la base de datos: ' + error.message, 'error');
    }
}

// ============================================================
// 2. IMPORTAR DB (desde archivo JSON local)
// ============================================================
async function importarBaseDeDatos() {
    try {
        if (!db || !db.db) {
            Swal.fire('Error', 'La base de datos no está inicializada', 'error');
            return;
        }

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.click();

        const file = await new Promise((resolve) => {
            input.onchange = (e) => resolve(e.target.files[0]);
            input.oncancel = () => resolve(null);
        });

        if (!file) return;

        const text = await file.text();
        let importData;
        try { importData = JSON.parse(text); } catch {
            Swal.fire('Error', 'El archivo no es un JSON válido.', 'error');
            return;
        }

        if (!importData._metadata || !importData._metadata.dbName) {
            Swal.fire('Error', 'El archivo no parece una exportación válida.', 'error');
            return;
        }

        const storeNames = Object.keys(importData).filter(key => key !== '_metadata');
        const totalRecords = storeNames.reduce((sum, name) => sum + (importData[name]?.length || 0), 0);
        if (totalRecords === 0) {
            Swal.fire('Advertencia', 'El archivo no contiene datos para importar.', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: '⚠️ Importar base de datos',
            html: `
                <p style="color:var(--text-secondary);">Esta acción <strong style="color:#f38ba8;">SOBRESCRIBIRÁ</strong> todos los datos actuales.</p>
                <p><strong>Archivo:</strong> ${file.name}</p>
                <p><strong>Total de registros:</strong> ${totalRecords}</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, importar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });

        if (!confirm.isConfirmed) return;

        Swal.fire({
            title: 'Importando...',
            text: 'Por favor espera.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const currentStoreNames = Array.from(db.db.objectStoreNames);
        for (const storeName of storeNames) {
            if (!currentStoreNames.includes(storeName)) continue;
            await db.clear(storeName);
            for (const record of importData[storeName] || []) {
                await db.put(storeName, record);
            }
        }

        await Swal.fire({
            icon: 'success',
            title: '✅ Importación completada',
            html: `<p>Se importaron <strong>${totalRecords}</strong> registros.</p>`,
            timer: 3000,
            timerProgressBar: true
        });

        if (window.app) {
            await window.app.loadData();
            await window.app.render();
        } else {
            location.reload();
        }

    } catch (error) {
        console.error('Error al importar:', error);
        Swal.fire('Error', 'No se pudo importar: ' + error.message, 'error');
    }
}

// ============================================================
// 3. ELIMINAR DB (local)
// ============================================================
async function eliminarBaseDatos() {
    try {
        if (!db || !db.db) {
            Swal.fire('Error', 'La base de datos no está inicializada', 'error');
            return;
        }

        const storeNames = Array.from(db.db.objectStoreNames);
        let totalRecords = 0;
        for (const name of storeNames) {
            const data = await db.getAll(name);
            totalRecords += data.length;
        }

        const confirm = await Swal.fire({
            title: '⚠️ ELIMINAR TODOS LOS DATOS',
            html: `
                <p style="color:#f38ba8; font-weight:bold;">¡Esta acción es IRREVERSIBLE!</p>
                <p>Se eliminarán <strong>${totalRecords}</strong> registros de <strong>${storeNames.length}</strong> stores.</p>
                <p>Escribe la palabra <strong style="color:#f9e2af;">"eliminar"</strong> para confirmar.</p>
                <input id="swal-confirm-text" class="swal2-input" placeholder="Escribe 'eliminar' aquí">
            `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Eliminar todo',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const input = document.getElementById('swal-confirm-text');
                if (input?.value?.trim() !== 'eliminar') {
                    Swal.showValidationMessage('Debes escribir exactamente "eliminar"');
                    return false;
                }
                return true;
            }
        });

        if (!confirm.isConfirmed) return;

        const secondConfirm = await Swal.fire({
            title: '¿Estás completamente seguro?',
            text: `Se borrarán ${totalRecords} registros. Esta acción no se puede deshacer.`,
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar'
        });

        if (!secondConfirm.isConfirmed) return;

        Swal.fire({
            title: 'Eliminando datos...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        for (const storeName of storeNames) {
            await db.clear(storeName);
        }

        Swal.fire({
            icon: 'success',
            title: '✅ Datos eliminados',
            text: 'Todos los datos han sido eliminados. La aplicación se recargará.',
            timer: 2000,
            timerProgressBar: true
        });

        if (window.app) {
            await window.app.sections.load();
            if (window.app.sections.list.length === 0) {
                await window.app.sections.create('Sección Principal');
                await window.app.sections.load();
            }
            window.app.currentSectionId = window.app.sections.list[0]?.id || null;
            await window.app.loadData();
            await window.app.render();
        } else {
            location.reload();
        }

    } catch (error) {
        console.error('Error al eliminar:', error);
        Swal.fire('Error', 'No se pudo eliminar: ' + error.message, 'error');
    }
}

// ============================================================
// 4. REGISTRAR CORREO (función auxiliar)
// ============================================================
async function registrarCorreoEnServidor(correo) {
    const formData = new URLSearchParams();
    formData.append('api_key', API_KEY);
    formData.append('correo', correo);

    const response = await fetch(REGISTER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
    });

    const texto = await response.text();
    let json;
    try { json = JSON.parse(texto); } catch { json = { success: false, error: texto }; }

    if (!response.ok) {
        throw new Error(json.error || 'Error al registrar el correo');
    }
    return json;
}

// ============================================================
// 5. REGISTRAR CORREO MANUAL (desde el menú)
// ============================================================
async function registrarCorreoManual() {
    try {
        const { value: correo } = await Swal.fire({
            title: 'Registrar correo en el servidor',
            input: 'email',
            inputLabel: 'Correo electrónico',
            inputPlaceholder: 'ejemplo@correo.com',
            showCancelButton: true,
            confirmButtonText: 'Registrar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            inputValidator: (value) => {
                if (!value) return 'Debes escribir un correo';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Correo electrónico inválido';
                }
                return null;
            }
        });

        if (!correo) return;

        Swal.fire({
            title: 'Registrando...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        await registrarCorreoEnServidor(correo);

        Swal.fire({
            icon: 'success',
            title: '✅ Correo registrado',
            text: `El correo ${correo} ha sido registrado exitosamente.`,
            timer: 3000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error('Error al registrar correo:', error);
        Swal.fire({
            icon: 'error',
            title: '❌ Error',
            text: error.message || 'No se pudo registrar el correo',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
}

// ============================================================
// 6. SUBIR DB AL SERVIDOR (VERSIÓN CON NOTIFICACIONES, FRECUENCIA Y CORREO GUARDADO)
// ============================================================
async function subirDataBase() {
    console.log('📤 subirDataBase() iniciada');
    try {
        Swal.close();

        // 1. Correo (guardado o pedir)
        let correo = localStorage.getItem('sync_email');
        let correoConfirmado = false;

        if (correo) {
            const confirmResult = await Swal.fire({
                title: 'Subir respaldo al servidor',
                html: `<p>Correo actual: <strong>${correo}</strong></p><p style="font-size:13px; color:var(--text-muted);">¿Usar este correo o cambiarlo?</p>`,
                showCancelButton: true,
                confirmButtonText: 'Usar este correo',
                cancelButtonText: 'Cambiar correo',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            if (confirmResult.isConfirmed) {
                correoConfirmado = true;
            } else {
                const newCorreo = await pedirCorreo();
                if (newCorreo) {
                    correo = newCorreo;
                    localStorage.setItem('sync_email', correo);
                    correoConfirmado = true;
                }
            }
        } else {
            correo = await pedirCorreo();
            if (correo) {
                localStorage.setItem('sync_email', correo);
                correoConfirmado = true;
            }
        }
        if (!correoConfirmado) return;

        // 2. Frecuencia (en minutos)
        let intervalMin = parseInt(localStorage.getItem('sync_interval') || '0');
        if (!intervalMin || intervalMin < 1) {
            const intervalResult = await Swal.fire({
                title: 'Frecuencia de respaldo',
                text: '¿Cada cuánto tiempo quieres que te recordemos subir los cambios?',
                input: 'select',
                inputOptions: {
                    '1': '1 minuto',
                    '5': '5 minutos',
                    '15': '15 minutos',
                    '30': '30 minutos',
                    '60': '1 hora',
                    '1440': '1 día',
                    '10080': '7 días',
                    '43200': '30 días'
                },
                inputPlaceholder: 'Selecciona una opción',
                showCancelButton: true,
                confirmButtonText: 'Guardar y continuar',
                cancelButtonText: 'Saltar (no recordar)',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                inputValidator: (value) => {
                    if (!value) return 'Debes seleccionar una opción';
                    return null;
                }
            });

            if (intervalResult.isConfirmed) {
                intervalMin = parseInt(intervalResult.value);
                localStorage.setItem('sync_interval', String(intervalMin));
            } else {
                intervalMin = 0;
                localStorage.removeItem('sync_interval');
            }
        }

        // 3. Mostrar carga
        Swal.fire({
            title: 'Subiendo respaldo...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // 4. Obtener datos de IndexedDB
        if (!db || !db.db) {
            throw new Error('Base de datos no inicializada');
        }

        const storeNames = db.db.objectStoreNames;
        const exportData = {};
        for (const storeName of storeNames) {
            exportData[storeName] = await db.getAll(storeName);
        }
        exportData._metadata = {
            exportDate: new Date().toISOString(),
            dbName: DB_NAME,
            dbVersion: DB_VERSION,
            totalStores: storeNames.length,
            totalRecords: Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0)
        };
        const jsonString = JSON.stringify(exportData);

        // 5. Enviar al servidor
        const formData = new URLSearchParams();
        formData.append('api_key', API_KEY);
        formData.append('correo', correo);
        formData.append('json', jsonString);
        formData.append('version', '1.0');

        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData
        });

        const textoRespuesta = await response.text();
        let jsonResp;
        try { jsonResp = JSON.parse(textoRespuesta); } catch { jsonResp = { raw: textoRespuesta }; }

        // 6. Manejar error 404 (correo no registrado)
        if (response.status === 404) {
            Swal.close();
            const confirmar = await Swal.fire({
                title: 'Correo no registrado',
                text: `El correo "${correo}" no existe en el servidor. ¿Deseas registrarlo ahora?`,
                icon: 'question',
                showCancelButton: true,
                confirmButtonText: 'Sí, registrar',
                cancelButtonText: 'Cancelar',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            if (!confirmar.isConfirmed) return;

            await registrarCorreoEnServidor(correo);
            await Swal.fire({
                icon: 'success',
                title: 'Correo registrado',
                text: 'Ahora reintentaremos la subida.',
                timer: 1500,
                timerProgressBar: true
            });
            await subirDataBase();
            return;
        }

        if (!response.ok) {
            throw new Error(jsonResp?.error || textoRespuesta || 'Error en el servidor');
        }

        // 7. Éxito: limpiar bandera de cambios y actualizar fecha de última subida
        localStorage.removeItem('sync_pending');
        localStorage.setItem('sync_last_upload', new Date().toISOString());
        if (window.actualizarBadge) window.actualizarBadge();

        Swal.close();
        Swal.fire({
            icon: 'success',
            title: '✅ Respaldo subido al servidor',
            html: `
                <p>${jsonResp?.message || 'Respaldo guardado correctamente'}</p>
                <p style="font-size:12px; color:var(--text-muted);">
                    Correo: <strong>${correo}</strong><br>
                    Tamaño: ${(jsonString.length / 1024).toFixed(1)} KB
                </p>
            `,
            timer: 4000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error('❌ Error en subirDataBase:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: '❌ Error al subir',
            text: error.message || 'No se pudo conectar con el servidor',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
}

// ============================================================
// 7. DESCARGAR RESPALDO DESDE EL SERVIDOR Y RESTAURAR LOCALMENTE
// ============================================================
// ============================================================
// descargarBackupServidor - Corregida y consistente con HTML de prueba
// ============================================================
async function descargarBackupServidor() {
    try {
        // 1. Obtener correo guardado o pedirlo
        let correo = localStorage.getItem('sync_email');
        let correoConfirmado = false;

        if (correo) {
            const confirmResult = await Swal.fire({
                title: 'Descargar respaldo desde el servidor',
                html: `<p>Correo actual: <strong>${correo}</strong></p><p style="font-size:13px; color:var(--text-muted);">¿Usar este correo o cambiarlo?</p>`,
                showCancelButton: true,
                confirmButtonText: 'Usar este correo',
                cancelButtonText: 'Cambiar correo',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)'
            });
            if (confirmResult.isConfirmed) {
                correoConfirmado = true;
            } else {
                const newCorreo = await pedirCorreo();
                if (newCorreo) {
                    correo = newCorreo;
                    localStorage.setItem('sync_email', correo);
                    correoConfirmado = true;
                }
            }
        } else {
            correo = await pedirCorreo();
            if (correo) {
                localStorage.setItem('sync_email', correo);
                correoConfirmado = true;
            }
        }
        if (!correoConfirmado) return;

        // 2. Mostrar carga
        Swal.fire({
            title: 'Descargando respaldo...',
            text: 'Por favor espera.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // 3. Llamar al endpoint descargarJSON.php (igual que en el HTML de prueba)
        // Asegúrate de que DOWNLOAD_URL apunte a 'https://educr.app/databaseJSON/descargarJSON.php'
        // o define directamente la URL aquí:
        const url = `https://educr.app/databaseJSON/descargarJSON.php?api_key=${API_KEY}&correo=${encodeURIComponent(correo)}`;
        const response = await fetch(url);

        // 4. Manejar errores (igual que en el HTML)
        if (response.status === 404) {
            Swal.close();
            Swal.fire('Error', 'No se encontró respaldo para este correo.', 'error');
            return;
        }

        if (!response.ok) {
            const text = await response.text();
            Swal.close();
            Swal.fire('Error', `Error ${response.status}: ${text}`, 'error');
            return;
        }

        // 5. Obtener el JSON como texto (igual que en el HTML)
        const jsonText = await response.text();

        // Verificar que sea JSON válido
        let jsonData;
        try {
            jsonData = JSON.parse(jsonText);
        } catch (e) {
            Swal.close();
            Swal.fire('Error', 'El servidor devolvió un JSON inválido.', 'error');
            return;
        }

        // 6. Preguntar qué hacer con el archivo
        Swal.close();
        const action = await Swal.fire({
            title: 'Respaldo descargado correctamente',
            text: '¿Qué deseas hacer con el archivo?',
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Restaurar en la BD local',
            cancelButtonText: 'Solo descargar archivo',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });

        if (action.isConfirmed) {
            // --- RESTAURAR en IndexedDB ---
            Swal.fire({
                title: 'Restaurando...',
                allowOutsideClick: false,
                didOpen: () => { Swal.showLoading(); }
            });

            const storeNames = Object.keys(jsonData).filter(key => key !== '_metadata');
            const currentStoreNames = Array.from(db.db.objectStoreNames);
            for (const storeName of storeNames) {
                if (!currentStoreNames.includes(storeName)) continue;
                await db.clear(storeName);
                for (const record of jsonData[storeName] || []) {
                    await db.put(storeName, record);
                }
            }

            // Limpiar bandera de cambios pendientes
            localStorage.removeItem('sync_pending');
            if (window.actualizarBadge) window.actualizarBadge();
            // Actualizar fecha de última subida (para reiniciar el contador)
            localStorage.setItem('sync_last_upload', new Date().toISOString());

            Swal.fire({
                icon: 'success',
                title: '✅ Respaldo restaurado',
                text: 'Los datos han sido restaurados exitosamente.',
                timer: 3000,
                timerProgressBar: true
            });

            if (window.app) {
                await window.app.loadData();
                await window.app.render();
            }
        } else {
            // --- SOLO DESCARGAR como archivo .json ---
            const blob = new Blob([jsonText], { type: 'application/json' });
            const urlBlob = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = urlBlob;
            a.download = `backup_${correo}_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(urlBlob);

            Swal.fire({
                icon: 'success',
                title: '✅ Archivo descargado',
                text: `Respaldo guardado como ${a.download}`,
                timer: 3000,
                timerProgressBar: true
            });
        }

    } catch (error) {
        console.error('Error al descargar respaldo:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: '❌ Error',
            text: error.message || 'No se pudo descargar el respaldo',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
}

// ============================================================
// 8. MENÚ PRINCIPAL DE OPCIONES DE BASE DE DATOS
// ============================================================
function mostrarOpcionesBaseDatos() {
    Swal.fire({
        title: 'Opciones de base de datos',
        html: `
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
                <button class="swal2-button-option" onclick="descargarDataBase(); ">
                    <i class="fas fa-layer-group"></i> Exportar DB (local)
                </button>
                <button class="swal2-button-option" onclick="importarBaseDeDatos(); ">
                    <i class="fas fa-cloud-upload-alt"></i> Importar DB (local)
                </button>
                <button class="swal2-button-option" onclick="registrarCorreoManual(); ">
                    <i class="fas fa-envelope" style="color:#f9e2af;"></i> Registrar Correo
                </button>
                <button class="swal2-button-option" onclick="subirDataBase(); ">
                    <i class="fas fa-upload" style="color:#89b4fa;"></i> Subir al Servidor
                </button>
                <button class="swal2-button-option" onclick="descargarBackupServidor();">
                    <i class="fas fa-download" style="color:#a6e3a1;"></i> Descargar del Servidor
                </button>
                <button class="swal2-button-option" style="color:#f38ba8;" onclick="eliminarBaseDatos(); ">
                    <i class="fas fa-trash-alt"></i> Eliminar DB (local)
                </button>
            </div>
        `,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: 'Cerrar',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        width: '440px'
    });
}

// ============================================================
// 9. FUNCIÓN AUXILIAR PARA PEDIR CORREO (reutilizable)
// ============================================================
async function pedirCorreo() {
    const result = await Swal.fire({
        title: 'Correo electrónico para el respaldo',
        input: 'email',
        inputLabel: 'Correo',
        inputPlaceholder: 'ejemplo@correo.com',
        showCancelButton: true,
        confirmButtonText: 'Continuar',
        cancelButtonText: 'Cancelar',
        background: 'var(--bg-card)',
        color: 'var(--text-primary)',
        inputValidator: (value) => {
            if (!value) return 'Debes escribir un correo';
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                return 'Correo electrónico inválido';
            }
            return null;
        }
    });
    if (result.isConfirmed && result.value) {
        return result.value.trim();
    }
    return null;
}