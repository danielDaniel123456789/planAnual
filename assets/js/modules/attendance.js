// ==================== MÓDULO DE ASISTENCIA ====================

class Attendance {
    constructor(database) {
        this.db = database;
        this.data = {};
        this.detailed = {};
        this.currentSectionId = null;
    }

    async load(sectionId) {
        this.currentSectionId = sectionId;
        
        // Cargar asistencia detallada
        const det = await this.db.get(STORES.ASISTENCIA_DETALLADA, sectionId);
        this.detailed = det?.estudiantes || {};
        
        return this.detailed;
    }

    async saveDetailed(sectionId, studentId, data) {
        this.detailed[studentId] = {
            ausencias: data.ausencias || 0,
            justificadas: data.justificadas || 0,
            injustificadas: data.injustificadas || 0,
            tardias: data.tardias || 0
        };
        
        await this.db.put(STORES.ASISTENCIA_DETALLADA, {
            seccionId: sectionId,
            estudiantes: this.detailed
        });
    }

    async getStudentData(studentId) {
        return this.detailed[studentId] || { ausencias: 0, justificadas: 0, injustificadas: 0, tardias: 0 };
    }

    async calculatePercentage(studentId) {
        const data = await this.getStudentData(studentId);
        const faltasEquivalentes = data.injustificadas + (data.tardias * 0.5);
        const porcentaje = Math.max(0, 100 - (faltasEquivalentes * 10));
        return Math.min(100, porcentaje);
    }

    async saveDaily(sectionId, fecha, studentId, estado) {
        await this.db.put(STORES.ASISTENCIA, {
            seccionId: sectionId,
            fecha: fecha,
            estudianteId: studentId,
            estado: estado
        });
    }

    async getDaily(sectionId, fecha) {
        const results = await this.db.getByIndex(STORES.ASISTENCIA, 'seccion_fecha', [sectionId, fecha]);
        const map = {};
        for (const r of results) {
            map[r.estudianteId] = r.estado;
        }
        return map;
    }

    async getAllBySection(sectionId) {
        return await this.db.getByIndex(STORES.ASISTENCIA, 'seccionId', sectionId);
    }

    async getDates(sectionId) {
        const all = await this.getAllBySection(sectionId);
        const dates = new Set();
        for (const item of all) {
            dates.add(item.fecha);
        }
        return Array.from(dates).sort();
    }

    async getStudentHistory(sectionId, studentId) {
        const all = await this.getAllBySection(sectionId);
        return all.filter(a => a.estudianteId === studentId).sort((a, b) => a.fecha.localeCompare(b.fecha));
    }

    async deleteDaily(sectionId, fecha, studentId) {
        const key = [sectionId, fecha, studentId];
        await this.db.delete(STORES.ASISTENCIA, key);
    }
}

// Instancia global
let attendance = null;