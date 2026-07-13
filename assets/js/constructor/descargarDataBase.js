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
// 6. SUBIR DB AL SERVIDOR (con registro automático)
// ============================================================
// ============================================================
// 6. SUBIR DB AL SERVIDOR (VERSIÓN SIMPLIFICADA Y ROBUSTA)
// ============================================================
// ============================================================
// 6. SUBIR DB AL SERVIDOR (VERSIÓN CON SELECCIÓN DE ARCHIVO)
// ============================================================
// ============================================================
// 6. SUBIR DB AL SERVIDOR (VERSIÓN DEFINITIVA - CON INPUT NATIVO)
// ============================================================
async function subirDataBase() {
    console.log(' subirDataBase() iniciada');

    try {
        // Cerrar cualquier modal abierto
        Swal.close();

        // 1. Pedir correo con input nativo de SweetAlert
        console.log('📧 Mostrando modal para pedir correo...');
        const result = await Swal.fire({
            title: 'Subir respaldo al servidor',
            input: 'email',
            inputLabel: 'Correo electrónico',
            inputPlaceholder: 'ejemplo@correo.com',
            showCancelButton: true,
            confirmButtonText: 'Subir',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            inputValidator: (value) => {
                if (!value) {
                    return 'Debes escribir un correo';
                }
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Correo electrónico inválido';
                }
                return null; // válido
            }
        });

        console.log('📧 Resultado del modal:', result);

        if (!result.isConfirmed || !result.value) {
            console.log('❌ Usuario canceló o cerró el modal');
            return;
        }

        const correo = result.value.trim();
        console.log(`✅ Correo ingresado: ${correo}`);

        // 2. Mostrar carga
        console.log('⏳ Mostrando modal de carga...');
        Swal.fire({
            title: 'Subiendo respaldo...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // 3. Obtener datos de IndexedDB
        console.log('📦 Obteniendo datos de IndexedDB...');
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
        console.log(`📦 JSON generado: ${jsonString.length} bytes`);

        // 4. Enviar al servidor
        console.log('📤 Enviando al servidor...');
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
        console.log(`📥 Respuesta del servidor (status ${response.status}):`, textoRespuesta);

        let jsonResp;
        try { jsonResp = JSON.parse(textoRespuesta); } catch { jsonResp = { raw: textoRespuesta }; }

        // 5. Manejar error 404 (correo no registrado)
        if (response.status === 404) {
            console.log('⚠️ Correo no registrado (404)');
            Swal.close(); // Cerrar modal de carga

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

            // Registrar correo
            console.log('📧 Registrando correo...');
            await registrarCorreoEnServidor(correo);

            await Swal.fire({
                icon: 'success',
                title: 'Correo registrado',
                text: 'Ahora reintentaremos la subida.',
                timer: 1500,
                timerProgressBar: true
            });

            // Reintentar llamando a la misma función (recursivo)
            await subirDataBase();
            return;
        }

        // 6. Otros errores
        if (!response.ok) {
            throw new Error(jsonResp?.error || textoRespuesta || 'Error en el servidor');
        }

        // 7. Éxito
        console.log('✅ Subida exitosa');
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
async function descargarBackupServidor() {
    try {
        const { value: correo } = await Swal.fire({
            title: 'Descargar respaldo desde el servidor',
            input: 'email',
            inputLabel: 'Correo electrónico',
            inputPlaceholder: 'ejemplo@correo.com',
            showCancelButton: true,
            confirmButtonText: 'Descargar',
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
            title: 'Descargando respaldo...',
            text: 'Por favor espera.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        const url = `${DOWNLOAD_URL}?api_key=${API_KEY}&correo=${encodeURIComponent(correo)}`;
        const response = await fetch(url);

        if (response.status === 404) {
            Swal.close();
            Swal.fire('Error', 'No se encontró respaldo para este correo.', 'error');
            return;
        }

        if (!response.ok) {
            const text = await response.text();
            let json;
            try { json = JSON.parse(text); } catch { json = { error: text }; }
            throw new Error(json.error || 'Error al descargar');
        }

        const jsonData = await response.json();

        // Confirmar restauración
        Swal.close();
        const confirm = await Swal.fire({
            title: '⚠️ Restaurar respaldo',
            text: 'Esto SOBRESCRIBIRÁ todos los datos actuales en tu base de datos local. ¿Continuar?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, restaurar',
            cancelButtonText: 'Cancelar'
        });

        if (!confirm.isConfirmed) return;

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