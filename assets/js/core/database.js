     class Database {
            constructor() { this.db = null; this.initialized = false; }
            init() {
                return new Promise((resolve, reject) => {
                    const request = indexedDB.open(DB_NAME, DB_VERSION);
                    request.onerror = function() { reject(request.error); };
                    request.onsuccess = function() {
                        this.db = request.result;
                        this.initialized = true;
                        console.log('📦 Base de datos inicializada');
                        resolve(this.db);
                    }.bind(this);
                    request.onupgradeneeded = function(event) {
                        const db = event.target.result;
                        this.upgrade(db);
                    }.bind(this);
                });
            }
            upgrade(db) {
                console.log('🔄 Actualizando base de datos...');
                const stores = [
                    { name: STORES.SECCIONES, key: 'id' },
                    { name: STORES.ESTUDIANTES, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.TRABAJOS_COTIDIANO, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.TRABAJOS_TAREA, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.EXAMENES, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.PROYECTOS, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.CALIFICACIONES, key: ['seccionId', 'estudianteId', 'trabajoId', 'tipoTrabajo'] },
                    { name: STORES.CONFIGURACION, key: 'clave' },
                    { name: STORES.BITACORA, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.HORARIOS, key: 'seccionId' },
                    { name: STORES.EVALUACIONES, key: 'seccionId' },
                    { name: STORES.LINKS, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.ASISTENCIA, key: ['seccionId', 'fecha', 'estudianteId'], indexes: ['seccion_fecha'] },
                    { name: STORES.PORCENTAJES, key: 'seccionId' },
                    { name: STORES.ASISTENCIA_DETALLADA, key: 'seccionId' },
                    { name: STORES.PLAN_ENLACES, key: 'id', indexes: ['seccionId'] },
                    { name: STORES.PLAN_CONTENIDO, key: 'id', indexes: ['seccionId'] }
                ];
                stores.forEach(function(storeDef) {
                    if (!db.objectStoreNames.contains(storeDef.name)) {
                        const autoInc = !Array.isArray(storeDef.key);
                        const store = db.createObjectStore(storeDef.name, { keyPath: storeDef.key, autoIncrement: autoInc });
                        if (storeDef.indexes) {
                            storeDef.indexes.forEach(function(indexName) {
                                store.createIndex(indexName, indexName);
                            });
                        }
                        console.log('✅ Store creado:', storeDef.name);
                    }
                });
            }
            ensureInitialized() { if (!this.initialized || !this.db) throw new Error('Base de datos no inicializada'); }
            get(storeName, id) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readonly');
                        const store = tx.objectStore(storeName);
                        const request = store.get(id);
                        request.onsuccess = function() { resolve(request.result); };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
            getAll(storeName) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readonly');
                        const store = tx.objectStore(storeName);
                        const request = store.getAll();
                        request.onsuccess = function() { resolve(request.result || []); };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
            getByIndex(storeName, indexName, value) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readonly');
                        const store = tx.objectStore(storeName);
                        const index = store.index(indexName);
                        const request = index.getAll(value);
                        request.onsuccess = function() { resolve(request.result || []); };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
            add(storeName, data) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readwrite');
                        const store = tx.objectStore(storeName);
                        const request = store.add(data);
                        request.onsuccess = function() { resolve(request.result); };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
            put(storeName, data) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readwrite');
                        const store = tx.objectStore(storeName);
                        const request = store.put(data);
                        request.onsuccess = function() { resolve(request.result); };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
            delete(storeName, id) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readwrite');
                        const store = tx.objectStore(storeName);
                        const request = store.delete(id);
                        request.onsuccess = function() { resolve(); };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
            deleteByIndex(storeName, indexName, value) {
                this.ensureInitialized();
                return new Promise((resolve, reject) => {
                    try {
                        const tx = this.db.transaction(storeName, 'readwrite');
                        const store = tx.objectStore(storeName);
                        const index = store.index(indexName);
                        const request = index.openCursor(value);
                        const deleted = [];
                        request.onsuccess = function(event) {
                            const cursor = event.target.result;
                            if (cursor) {
                                deleted.push(cursor.value);
                                cursor.delete();
                                cursor.continue();
                            } else { resolve(deleted); }
                        };
                        request.onerror = function() { reject(request.error); };
                    } catch (e) { reject(e); }
                });
            }
        }
        var db = new Database();