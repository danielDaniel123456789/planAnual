// ============================================================
// descargarDataBase.js - Exportar toda la base de datos como JSON
// ============================================================

async function descargarDataBase() {
    try {
        // Verificar que la base de datos esté inicializada
        if (!db || !db.db) {
            Swal.fire('Error', 'La base de datos no está inicializada', 'error');
            return;
        }

        // Mostrar indicador de carga
        Swal.fire({
            title: 'Exportando base de datos...',
            text: 'Por favor espera, esto puede tomar unos segundos.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Obtener todos los stores
        const storeNames = db.db.objectStoreNames;
        const exportData = {};

        for (const storeName of storeNames) {
            const data = await db.getAll(storeName);
            exportData[storeName] = data;
        }

        // Agregar metadatos
        exportData._metadata = {
            exportDate: new Date().toISOString(),
            dbName: DB_NAME,
            dbVersion: DB_VERSION,
            totalStores: storeNames.length,
            totalRecords: Object.values(exportData).reduce((sum, arr) => sum + arr.length, 0)
        };

        // Convertir a JSON
        const json = JSON.stringify(exportData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Crear enlace de descarga
        const a = document.createElement('a');
        a.href = url;
        const fecha = new Date().toISOString().slice(0, 10);
        a.download = `backup_${DB_NAME}_${fecha}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Mostrar éxito
        Swal.fire({
            icon: 'success',
            title: '✅ Base de datos exportada',
            html: `
                <p>Archivo: <strong>${a.download}</strong></p>
                <p>Total de registros: ${exportData._metadata.totalRecords}</p>
            `,
            timer: 3000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error('Error al exportar la base de datos:', error);
        Swal.fire('Error', 'No se pudo exportar la base de datos: ' + error.message, 'error');
    }
}