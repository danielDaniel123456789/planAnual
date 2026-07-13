// ============================================================
// descargarCVC_Estudiantes - Exportar todos los estudiantes a CSV/Excel
// ============================================================

// ============================================================
// descargarCVC_Estudiantes - Exportar todos los estudiantes a CSV/Excel (con UTF-8 y separador ;)
// ============================================================

async function descargarCVC_Estudiantes() {
    try {
        const app = window.app;
        if (!app) {
            Swal.fire('Error', 'La aplicación no está inicializada', 'error');
            return;
        }

        const students = app.students.list || [];
        if (students.length === 0) {
            Swal.fire('Información', 'No hay estudiantes registrados', 'info');
            return;
        }

        // Mostrar indicador de carga
        Swal.fire({
            title: 'Generando archivo CSV...',
            text: 'Por favor espera.',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); }
        });

        // Obtener configuración de asistencia
        const asistenciaManager = app.asistenciaManager;
        let pesoAsistencia = 10;
        if (asistenciaManager) {
            await asistenciaManager.cargarPorcentaje();
            pesoAsistencia = asistenciaManager.porcentajeAsignado || 10;
        }

        const grades = app.grades;
        const tipos = [
            { key: 'cotidiano', label: 'Cotidianos' },
            { key: 'tarea', label: 'Tareas' },
            { key: 'examen', label: 'Exámenes' },
            { key: 'proyecto', label: 'Proyectos' }
        ];

        // Construir filas del CSV
        const rows = [];
        // Encabezados (usamos ; como separador)
        const headers = ['Cédula;Nombre;Cotidianos;Tareas;Exámenes;Proyectos;Asistencia;Total'];
        rows.push(headers[0]);

        // Procesar cada estudiante
        for (const student of students) {
            const nombreCompleto = app.students.getFullName(student);
            const cedula = student.cedula || '';

            // Calcular sumas por tipo
            let sumaCotidianos = 0;
            let sumaTareas = 0;
            let sumaExamenes = 0;
            let sumaProyectos = 0;

            for (const tipo of tipos) {
                const works = grades.getWorksByType(tipo.key);
                let suma = 0;
                for (const work of works) {
                    const nota = grades.getGrade(student.id, work.id, tipo.key);
                    if (nota !== null && !isNaN(nota)) {
                        suma += nota;
                    }
                }
                // Asignar según tipo
                if (tipo.key === 'cotidiano') sumaCotidianos = Math.round(suma * 10) / 10;
                else if (tipo.key === 'tarea') sumaTareas = Math.round(suma * 10) / 10;
                else if (tipo.key === 'examen') sumaExamenes = Math.round(suma * 10) / 10;
                else if (tipo.key === 'proyecto') sumaProyectos = Math.round(suma * 10) / 10;
            }

            // Calcular asistencia (ponderada)
            let notaAsistencia = 0;
            if (asistenciaManager && typeof asistenciaManager.calcularPorcentajeAsistencia === 'function') {
                const porcentajeAsistencia = await asistenciaManager.calcularPorcentajeAsistencia(student.id);
                notaAsistencia = (porcentajeAsistencia * pesoAsistencia) / 100;
                notaAsistencia = Math.round(notaAsistencia * 10) / 10;
            }

            // Total
            const total = Math.round((sumaCotidianos + sumaTareas + sumaExamenes + sumaProyectos + notaAsistencia) * 10) / 10;

            // Crear fila (usamos ; como separador)
            // El nombre va entre comillas dobles para evitar problemas con comas o puntos y comas
            const row = [
                cedula,
                `"${nombreCompleto}"`,
                sumaCotidianos,
                sumaTareas,
                sumaExamenes,
                sumaProyectos,
                notaAsistencia,
                total
            ];
            rows.push(row.join(';'));
        }

        // Generar contenido CSV
        let csvContent = rows.join('\n');

        // Añadir BOM (Byte Order Mark) para que Excel reconozca UTF-8
        const BOM = '\uFEFF';
        csvContent = BOM + csvContent;

        // Crear blob y descargar
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fecha = new Date().toISOString().slice(0, 10);
        a.download = `resumen_notas_${fecha}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Swal.close();
        Swal.fire({
            icon: 'success',
            title: '✅ Archivo CSV generado',
            text: `Descargado: ${a.download}`,
            timer: 3000,
            timerProgressBar: true
        });

    } catch (error) {
        console.error('Error generando CSV:', error);
        Swal.close();
        Swal.fire({
            icon: 'error',
            title: '❌ Error',
            text: error.message || 'No se pudo generar el CSV',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
}