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

    async marcarTodosPresentes(seccionId, fecha, lecciones) {
  const students = await this.db.getByIndex(STORES.ESTUDIANTES, 'seccionId', seccionId);
  for (const student of students) {
    await this.saveDaily(seccionId, fecha, student.id, 'presente', lecciones);
  }
}

// En attendance.js, dentro de la clase Attendance

// Obtiene el porcentaje asignado a asistencia desde la configuración
async getPorcentajeAsignado(sectionId) {
    const data = await this.db.get(STORES.PORCENTAJES, sectionId);
    if (data && data.porcentajes && data.porcentajes.asistencia) {
        return data.porcentajes.asistencia.porcentaje || 10;
    }
    return 10; // valor por defecto
}

// Obtiene el total de clases (fechas únicas) para la sección
async getTotalClases(sectionId) {
    const todos = await this.db.getByIndex(STORES.ASISTENCIA, 'seccionId', sectionId);
    const fechas = new Set();
    for (const item of todos) {
        fechas.add(item.fecha);
    }
    return fechas.size;
}

// Calcula el porcentaje de asistencia de un estudiante, considerando el total de clases y el porcentaje asignado
async calculatePercentage(studentId) {
    const sectionId = this.currentSectionId;
    if (!sectionId) return 0;
    const data = await this.getStudentData(studentId);
    const totalClases = await this.getTotalClases(sectionId);
    if (totalClases === 0) return 0;
    const faltasEquivalentes = (data.injustificadas || 0) + ((data.tardias || 0) * 0.5);
    const porcentajeAsistencia = Math.max(0, 100 - (faltasEquivalentes / totalClases) * 100);
    const porcentajeAsignado = await this.getPorcentajeAsignado(sectionId);
    return (porcentajeAsistencia / 100) * porcentajeAsignado;
}
async cambiarEstado(seccionId, fecha, estudianteId, nuevoEstado, lecciones = null) {
  // Obtener registro existente o crearlo
  const key = [seccionId, fecha, estudianteId];
  let record = await this.db.get(STORES.ASISTENCIA, key);
  if (!record) {
    record = { seccionId, fecha, estudianteId, estado: nuevoEstado, lecciones: lecciones || 0 };
  } else {
    record.estado = nuevoEstado;
    if (lecciones !== null) record.lecciones = lecciones;
  }
  await this.db.put(STORES.ASISTENCIA, record);
}

async calcularPorcentajeAsistencia(estudianteId) {
    const seccionId = this.app.currentSectionId;
    if (!seccionId) return 0;

    // Cargar configuración si no está cargada
    await this.cargarPorcentaje();

    // Obtener todos los registros de la sección
    const todos = await this.getRegistros();
    if (todos.length === 0) return 100; // sin registros = 100% (o podríamos poner 0)

    // 1. Obtener todas las fechas únicas de la sección (total de días de clase)
    const fechasUnicas = new Set();
    for (const reg of todos) {
        let fecha = reg.timestamp ? reg.timestamp.split('T')[0] : reg.fecha;
        if (fecha && fecha.includes('/')) {
            const partes = fecha.split('/');
            fecha = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
        fechasUnicas.add(fecha);
    }
    const totalDias = fechasUnicas.size;
    if (totalDias === 0) return 100;

    // 2. Obtener registros del estudiante y agrupar por día (último estado)
    const estudianteIdNum = Number(estudianteId);
    const registrosEst = todos.filter(r => Number(r.estudianteId) === estudianteIdNum);
    const estadoPorDia = new Map(); // fecha -> estado
    for (const reg of registrosEst) {
        let fecha = reg.timestamp ? reg.timestamp.split('T')[0] : reg.fecha;
        if (fecha && fecha.includes('/')) {
            const partes = fecha.split('/');
            fecha = `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
        // Tomar el último registro del día (por timestamp)
        const ts = reg.timestamp || reg.fecha;
        if (!estadoPorDia.has(fecha) || ts > estadoPorDia.get(fecha).timestamp) {
            estadoPorDia.set(fecha, { estado: reg.estado, timestamp: ts });
        }
    }

    // 3. Contar días por estado
    let ausencias = 0, tardias = 0, justificadas = 0, presentes = 0;
    for (const [fecha, info] of estadoPorDia) {
        const estado = info.estado || 'presente';
        switch (estado) {
            case 'ausente': ausencias++; break;
            case 'tardia': tardias++; break;
            case 'justificada': justificadas++; break;
            default: presentes++;
        }
    }

    // 4. Calcular ausencias equivalentes
    const ausenciasEquivalentes = ausencias + (tardias / this.tardiasPorAusencia);
    const maxAus = this.maxAusencias;

    // 5. Calcular nota de asistencia (0-100)
    let nota = 100;
    if (ausenciasEquivalentes >= maxAus) {
        nota = 0;
    } else {
        nota = 100 * (1 - ausenciasEquivalentes / maxAus);
    }
    // Redondear a 1 decimal
    return Math.round(nota * 10) / 10;
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

// Al final de attendance.js
window.Attendance = Attendance;