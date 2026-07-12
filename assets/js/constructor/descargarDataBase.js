// ============================================================
// descargarDataBase.js - Versión de depuración (CONSOLA)
// ============================================================

// CONFIGURACIÓN
const SERVER_URL = 'https://educr.app/databaseJSON/insert.php';
const REGISTER_URL = 'https://educr.app/databaseJSON/registrar_correo.php';
const DOWNLOAD_URL = 'https://educr.app/databaseJSON/download.php';
const API_KEY = 'miClaveSuperSecreta123';

// ============================================================
// FUNCIÓN PRINCIPAL: SUBIR (con logs)
// ============================================================
async function subirDataBase() {
    console.log('🚀 subirDataBase() iniciada');

    try {
        // --- PASO 1: Pedir correo ---
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
                if (!value) return 'Debes escribir un correo';
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                    return 'Correo electrónico inválido';
                }
                return null;
            }
        });

        console.log('📧 Resultado del modal:', result);

        if (!result.isConfirmed || !result.value) {
            console.log('❌ Usuario canceló');
            return;
        }

        const correo = result.value.trim();
        console.log(`✅ Correo ingresado: ${correo}`);

        // --- PASO 2: Mostrar carga ---
        console.log('⏳ Mostrando modal de carga...');
        Swal.fire({
            title: 'Subiendo respaldo...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // --- PASO 3: Obtener datos de IndexedDB ---
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

        // --- PASO 4: Enviar al servidor ---
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

        // --- PASO 5: Manejar error 404 (correo no registrado) ---
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
            const formReg = new URLSearchParams();
            formReg.append('api_key', API_KEY);
            formReg.append('correo', correo);
            const regResponse = await fetch(REGISTER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: formReg
            });
            const regTexto = await regResponse.text();
            console.log('📧 Respuesta registro:', regTexto);

            if (!regResponse.ok) {
                throw new Error('Error al registrar el correo: ' + regTexto);
            }

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

        // --- PASO 6: Otros errores ---
        if (!response.ok) {
            throw new Error(jsonResp?.error || textoRespuesta || 'Error en el servidor');
        }

        // --- PASO 7: Éxito ---
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
// OTRAS FUNCIONES (exportar, importar, eliminar, etc.)
// ============================================================
// ... (aquí van el resto de funciones, pero las omito por brevedad;
//      copia las que ya tenías para exportar, importar, eliminar,
//      registrar correo, descargar del servidor)
// ============================================================

// Menú principal
function mostrarOpcionesBaseDatos() {
    Swal.fire({
        title: 'Opciones de base de datos',
        html: `
            <div style="display:flex; flex-direction:column; gap:12px; margin-top:16px;">
                <button class="swal2-button-option" onclick="descargarDataBase(); Swal.close();">
                    <i class="fas fa-layer-group"></i> Exportar DB (local)
                </button>
                <button class="swal2-button-option" onclick="importarBaseDeDatos(); Swal.close();">
                    <i class="fas fa-cloud-upload-alt"></i> Importar DB (local)
                </button>
                <button class="swal2-button-option" onclick="registrarCorreoManual(); Swal.close();">
                    <i class="fas fa-envelope" style="color:#f9e2af;"></i> Registrar Correo
                </button>
                <button class="swal2-button-option" onclick="subirDataBase(); Swal.close();">
                    <i class="fas fa-upload" style="color:#89b4fa;"></i> Subir al Servidor
                </button>
                <button class="swal2-button-option" onclick="descargarBackupServidor(); Swal.close();">
                    <i class="fas fa-download" style="color:#a6e3a1;"></i> Descargar del Servidor
                </button>
                <button class="swal2-button-option" style="color:#f38ba8;" onclick="eliminarBaseDatos(); Swal.close();">
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

// (Aquí debes incluir el resto de funciones: descargarDataBase, importarBaseDeDatos, eliminarBaseDatos, registrarCorreoManual, registrarCorreoEnServidor, descargarBackupServidor)