class Grades {
    constructor(database) {
        this.db = database;
        this.works = { cotidiano: [], tarea: [], examen: [], proyecto: [], rubro: [] };
        this.percentages = { ...PORCENTAJES_DEFAULT };
        this.currentSectionId = null;
        this.calificaciones = {};
    }
    async loadWorks(sectionId) {
        this.currentSectionId = sectionId;
        this.works.cotidiano = await this.db.getByIndex(STORES.TRABAJOS_COTIDIANO, 'seccionId', sectionId);
        this.works.tarea = await this.db.getByIndex(STORES.TRABAJOS_TAREA, 'seccionId', sectionId);
        this.works.examen = await this.db.getByIndex(STORES.EXAMENES, 'seccionId', sectionId);
        this.works.proyecto = await this.db.getByIndex(STORES.PROYECTOS, 'seccionId', sectionId);
        this.works.rubro = await this.db.getByIndex(STORES.TRABAJOS_RUBRO, 'seccionId', sectionId);
        await this.loadPercentages(sectionId);
        await this.loadCalificaciones(sectionId);
        return this.works;
    }
    async loadCalificaciones(sectionId) {
        this.calificaciones = {};
        const allCalif = await this.db.getAll(STORES.CALIFICACIONES);
        for (const calif of allCalif) {
            if (calif.seccionId === sectionId) {
                const key = `${calif.estudianteId}_${calif.trabajoId}_${calif.tipoTrabajo}`;
                this.calificaciones[key] = calif.nota;
            }
        }
        return this.calificaciones;
    }
    async loadPercentages(sectionId) {
        const data = await this.db.get(STORES.PORCENTAJES, sectionId);
        if (data) { this.percentages = data.porcentajes; } else { this.percentages = { ...PORCENTAJES_DEFAULT }; }
        return this.percentages;
    }
    async addWork(sectionId, type, data) {
        const storeMap = {
            cotidiano: STORES.TRABAJOS_COTIDIANO,
            tarea: STORES.TRABAJOS_TAREA,
            examen: STORES.EXAMENES,
            proyecto: STORES.PROYECTOS,
            rubro: STORES.TRABAJOS_RUBRO
        };
        const workData = { ...data, seccionId: sectionId, fecha: data.fecha || getDayMonth() };
        const id = await this.db.add(storeMap[type], workData);
        await this.loadWorks(sectionId);
        return id;
    }
    async deleteWork(type, id) {
        const storeMap = {
            cotidiano: STORES.TRABAJOS_COTIDIANO,
            tarea: STORES.TRABAJOS_TAREA,
            examen: STORES.EXAMENES,
            proyecto: STORES.PROYECTOS,
            rubro: STORES.TRABAJOS_RUBRO
        };
        await this.db.delete(storeMap[type], id);
        await this.loadWorks(this.currentSectionId);
        return true;
    }
    async updateWork(type, id, data) {
        const storeMap = {
            cotidiano: STORES.TRABAJOS_COTIDIANO,
            tarea: STORES.TRABAJOS_TAREA,
            examen: STORES.EXAMENES,
            proyecto: STORES.PROYECTOS,
            rubro: STORES.TRABAJOS_RUBRO
        };
        const work = await this.db.get(storeMap[type], id);
        if (work) {
            Object.assign(work, data);
            await this.db.put(storeMap[type], work);
            await this.loadWorks(this.currentSectionId);
            return true;
        }
        return false;
    }
    async saveGrade(sectionId, estudianteId, trabajoId, tipoTrabajo, nota) {
        const key = [sectionId, estudianteId, trabajoId, tipoTrabajo];
        const existing = await this.db.get(STORES.CALIFICACIONES, key);
        const notaPorcentaje = Math.round(nota);
        if (existing) {
            existing.nota = notaPorcentaje;
            await this.db.put(STORES.CALIFICACIONES, existing);
        } else {
            await this.db.add(STORES.CALIFICACIONES, {
                seccionId: sectionId,
                estudianteId: estudianteId,
                trabajoId: trabajoId,
                tipoTrabajo: tipoTrabajo,
                nota: notaPorcentaje
            });
        }
        await this.loadCalificaciones(sectionId);
        return true;
    }
    getGrade(estudianteId, trabajoId, tipoTrabajo) {
        const key = `${estudianteId}_${trabajoId}_${tipoTrabajo}`;
        return this.calificaciones[key] !== undefined ? this.calificaciones[key] : null;
    }
    getWorksByType(type) { return this.works[type] || []; }
    getWorkById(type, id) { const works = this.works[type] || []; return works.find(w => w.id === id) || null; }
    calcularNotaFinal(estudianteId) {
        const tipos = ['cotidiano', 'tarea', 'examen', 'proyecto'];
        let total = 0;
        let totalPonderado = 0;
        for (const tipo of tipos) {
            const works = this.works[tipo] || [];
            const porcentaje = this.percentages[tipo]?.porcentaje || 0;
            if (works.length === 0 || porcentaje === 0) continue;
            let sumaNotas = 0;
            let count = 0;
            for (const work of works) {
                const nota = this.getGrade(estudianteId, work.id, tipo);
                if (nota !== null) { sumaNotas += nota;
                    count++; }
            }
            if (count > 0) {
                const promedio = sumaNotas / count;
                totalPonderado += porcentaje;
                total += (promedio * porcentaje) / 100;
            }
        }
        return totalPonderado > 0 ? Math.round(total) : null;
    }
    getColumnas() {
        const tipos = ['cotidiano', 'tarea', 'examen', 'proyecto'];
        const columnas = [];
        for (const tipo of tipos) {
            const items = this.works[tipo] || [];
            for (const item of items) {
                columnas.push({
                    tipo: tipo,
                    id: item.id,
                    nombre: item.nombre,
                    puntosMax: item.puntosMax || 100
                });
            }
        }
        return columnas;
    }
    getColumnasAgrupadas() {
        const tipos = ['cotidiano', 'tarea', 'examen', 'proyecto'];
        const resultado = {};
        for (const tipo of tipos) {
            const items = this.works[tipo] || [];
            resultado[tipo] = items.map(item => ({
                id: item.id,
                nombre: item.nombre,
                puntosMax: item.puntosMax || 100
            }));
        }
        return resultado;
    }
    getDatosEstudiante(estudianteId, columnas) {
        const datos = {};
        for (const col of columnas) {
            const nota = this.getGrade(estudianteId, col.id, col.tipo);
            datos[`${col.id}_${col.tipo}`] = nota;
        }
        return datos;
    }
    calcularPromedioPorTipo(estudianteId, tipo) {
        const works = this.works[tipo] || [];
        if (works.length === 0) return null;
        let suma = 0;
        let count = 0;
        for (const work of works) {
            const nota = this.getGrade(estudianteId, work.id, tipo);
            if (nota !== null) { suma += nota;
                count++; }
        }
        return count > 0 ? Math.round(suma / count) : null;
    }
}
var grades = new Grades(db);