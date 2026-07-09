// ============================================================
// database.js - Gestión de IndexedDB (VERSIÓN DEFINITIVA)
// ============================================================

class Database {
    constructor() {
        this.db = null;
        this.initialized = false;
    }

    init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.initialized = true;
                console.log('📦 Base de datos inicializada (versión ' + DB_VERSION + ')');
                resolve(this.db);
            };
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                this.upgrade(db);
            };
        });
    }

    upgrade(db) {
        console.log('🔄 Ejecutando upgrade a versión', DB_VERSION);

        // ============================================================
        // DEFINICIÓN DE STORES CON SUS ÍNDICES
        // ============================================================
        const storeDefs = [
            {
                name: STORES.SECCIONES,
                keyPath: 'id',
                autoIncrement: true,
                indexes: []
            },
            {
                name: STORES.ESTUDIANTES,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.TRABAJOS_COTIDIANO,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.TRABAJOS_TAREA,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.EXAMENES,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.PROYECTOS,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.TRABAJOS_RUBRO,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.CALIFICACIONES,
                keyPath: ['seccionId', 'estudianteId', 'trabajoId', 'tipoTrabajo'],
                autoIncrement: false,
                indexes: []
            },
            {
                name: STORES.CONFIGURACION,
                keyPath: 'clave',
                autoIncrement: false,
                indexes: []
            },
            {
                name: STORES.BITACORA,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.HORARIOS,
                keyPath: 'seccionId',
                autoIncrement: false,
                indexes: []
            },
            {
                name: STORES.EVALUACIONES,
                keyPath: 'seccionId',
                autoIncrement: false,
                indexes: []
            },
            {
                name: STORES.LINKS,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.ASISTENCIA,
                keyPath: ['seccionId', 'fecha', 'estudianteId'],
                autoIncrement: false,
                indexes: [
                    { name: 'seccionId', keyPath: 'seccionId' },
                    { name: 'seccion_fecha', keyPath: ['seccionId', 'fecha'] }  // compuesto
                ]
            },
            {
                name: STORES.PORCENTAJES,
                keyPath: 'seccionId',
                autoIncrement: false,
                indexes: []
            },
            {
                name: STORES.ASISTENCIA_DETALLADA,
                keyPath: 'seccionId',
                autoIncrement: false,
                indexes: []
            },
            {
                name: STORES.PLAN_ENLACES,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            },
            {
                name: STORES.PLAN_CONTENIDO,
                keyPath: 'id',
                autoIncrement: true,
                indexes: [{ name: 'seccionId', keyPath: 'seccionId' }]
            }
        ];

        // Crear o actualizar stores e índices
        for (const def of storeDefs) {
            let store;
            if (db.objectStoreNames.contains(def.name)) {
                // Si el store ya existe, lo obtenemos
                store = db.transaction(def.name, 'readwrite').objectStore(def.name);
            } else {
                // Crear store nuevo
                store = db.createObjectStore(def.name, {
                    keyPath: def.keyPath,
                    autoIncrement: def.autoIncrement
                });
                console.log('✅ Store creado:', def.name);
            }

            // Crear índices faltantes
            for (const idx of def.indexes) {
                if (!store.indexNames.contains(idx.name)) {
                    store.createIndex(idx.name, idx.keyPath);
                    console.log(`✅ Índice creado: ${def.name}.${idx.name}`);
                } else {
                    console.log(`ℹ️ Índice ya existe: ${def.name}.${idx.name}`);
                }
            }
        }

        // Caso especial: si el store ASISTENCIA no se creó (por error), forzar recreación

        if (db.objectStoreNames.contains(STORES.ASISTENCIA)) {
            db.deleteObjectStore(STORES.ASISTENCIA);
        }
        // Crear store con clave 'id' autoincrementable
        const asistenciaStore = db.createObjectStore(STORES.ASISTENCIA, {
            keyPath: 'id',
            autoIncrement: true
        });
        asistenciaStore.createIndex('seccionId', 'seccionId');
        asistenciaStore.createIndex('fecha', 'fecha');
        asistenciaStore.createIndex('estudianteId', 'estudianteId');
        asistenciaStore.createIndex('seccion_fecha', ['seccionId', 'fecha']);
        console.log('✅ Store ASISTENCIA recreado correctamente.');
    }

    ensureInitialized() {
        if (!this.initialized || !this.db) {
            throw new Error('Base de datos no inicializada');
        }
    }

    // ============================================================
    // OPERACIONES CRUD
    // ============================================================

    get(storeName, id) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    getAll(storeName) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    getByIndex(storeName, indexName, value) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                if (!store.indexNames.contains(indexName)) {
                    reject(new Error(`Índice "${indexName}" no encontrado en el store "${storeName}"`));
                    return;
                }
                const index = store.index(indexName);
                const request = index.getAll(value);
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    add(storeName, data) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.add(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    put(storeName, data) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.put(data);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    delete(storeName, id) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }

    deleteByIndex(storeName, indexName, value) {
        this.ensureInitialized();
        return new Promise((resolve, reject) => {
            try {
                const tx = this.db.transaction(storeName, 'readwrite');
                const store = tx.objectStore(storeName);
                if (!store.indexNames.contains(indexName)) {
                    reject(new Error(`Índice "${indexName}" no encontrado en el store "${storeName}"`));
                    return;
                }
                const index = store.index(indexName);
                const request = index.openCursor(value);
                const deleted = [];
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        deleted.push(cursor.value);
                        cursor.delete();
                        cursor.continue();
                    } else {
                        resolve(deleted);
                    }
                };
                request.onerror = () => reject(request.error);
            } catch (e) {
                reject(e);
            }
        });
    }
}

// Instancia global
var db = new Database();