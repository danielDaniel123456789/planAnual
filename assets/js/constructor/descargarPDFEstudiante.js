// ============================================================
// descargarPDFEstudiante.js - Descargar PDF individual por estudiante
// ============================================================

async function descargarPDFEstudiante() {
    try {
        // Verificar que la aplicación y datos estén disponibles
        if (!window.app) {
            Swal.fire('Error', 'La aplicación no está inicializada', 'error');
            return;
        }

        const students = window.app.students.list || [];
        if (students.length === 0) {
            Swal.fire('Información', 'No hay estudiantes registrados', 'info');
            return;
        }

        // Mostrar ventana de selección de estudiante con búsqueda
        const { value: studentId } = await Swal.fire({
            title: 'Buscar estudiante',
            input: 'select',
            inputOptions: buildStudentOptions(students),
            inputPlaceholder: 'Escribe para buscar...',
            showCancelButton: true,
            confirmButtonText: 'Generar PDF',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '500px',
            inputAttributes: {
                'aria-label': 'Selecciona o busca un estudiante'
            }
        });

        if (!studentId) return; // canceló

        const student = window.app.students.getById(parseInt(studentId));
        if (!student) {
            Swal.fire('Error', 'Estudiante no encontrado', 'error');
            return;
        }

        // Generar y descargar PDF
        await generarPDFEstudiante(student);

    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo generar el PDF: ' + error.message, 'error');
    }
}

// Construir opciones para el select con búsqueda
function buildStudentOptions(students) {
    const options = {};
    for (const student of students) {
        const nombreCompleto = window.app.students.getFullName(student);
        const cedula = student.cedula || 'Sin cédula';
        options[student.id] = `${nombreCompleto} (${cedula})`;
    }
    return options;
}

// Generar PDF del estudiante
async function generarPDFEstudiante(student) {
    // Cargar librerías si no están disponibles
    await cargarLibreriasPDF();

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        throw new Error('jsPDF no está disponible');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Obtener datos del estudiante
    const nombreCompleto = window.app.students.getFullName(student);
    const cedula = student.cedula || 'No registrada';
    const correo = student.correo || 'No registrado';

    // Obtener datos del profesor/configuración
    const config = window.app.config;
    const nombreProfesor = config.get('nombreProfesor') || 'Profesor';
    const nombreColegio = config.get('nombreColegio') || 'Colegio';
    const ministerio = config.get('ministerioEducacion') || 'Ministerio de Educación';
    const regional = config.get('direccionRegional') || 'Dirección Regional';
    const circuito = config.get('circuitoEscolar') || 'Circuito Escolar';

    // Título y encabezado
    doc.setFontSize(14);
    doc.text(nombreColegio, pageWidth / 2, 15, { align: 'center' });
    doc.setFontSize(10);
    doc.text(ministerio, pageWidth / 2, 22, { align: 'center' });
    doc.text(regional, pageWidth / 2, 27, { align: 'center' });
    doc.text(circuito, pageWidth / 2, 32, { align: 'center' });

    // Datos del estudiante
    doc.setFontSize(12);
    doc.text(`Estudiante: ${nombreCompleto}`, 14, 45);
    doc.text(`Cédula: ${cedula}`, 14, 52);
    doc.text(`Correo: ${correo}`, 14, 59);

    // Obtener calificaciones
    const tipos = ['cotidiano', 'tarea', 'examen', 'proyecto'];
    const grades = window.app.grades;

    // Construir tabla de calificaciones
    const tableData = [];
    let totalPromedioPonderado = 0;
    let totalPeso = 0;

    for (const tipo of tipos) {
        const works = grades.getWorksByType(tipo);
        if (works.length === 0) continue;

        const porcentajeRubro = grades.percentages[tipo]?.porcentaje || 0;
        if (porcentajeRubro === 0) continue;

        // Obtener notas del estudiante para este tipo
        let notas = [];
        for (const work of works) {
            const nota = grades.getGrade(student.id, work.id, tipo);
            notas.push({
                nombre: work.nombre,
                nota: nota !== null ? nota : 'Sin calificar',
                puntosMax: work.puntosMax || 100,
                fecha: work.fecha || 'Sin fecha'
            });
        }

        // Calcular promedio del tipo (solo notas numéricas)
        const notasNumericas = notas.filter(n => typeof n.nota === 'number');
        if (notasNumericas.length > 0) {
            const promedio = notasNumericas.reduce((sum, n) => sum + n.nota, 0) / notasNumericas.length;
            const aporte = (promedio * porcentajeRubro) / 100;
            totalPromedioPonderado += aporte;
            totalPeso += porcentajeRubro;

            // Agregar fila de encabezado de tipo
            tableData.push([
                { content: tipo.toUpperCase(), colSpan: 2, styles: { fillColor: [200, 200, 200] } },
                { content: `Promedio: ${promedio.toFixed(1)}%`, colSpan: 2, styles: { fillColor: [200, 200, 200] } },
                { content: `Aporte: ${aporte.toFixed(1)}%`, colSpan: 1, styles: { fillColor: [200, 200, 200] } }
            ]);

            // Agregar cada trabajo
            for (const n of notas) {
                const notaStr = typeof n.nota === 'number' ? n.nota.toFixed(1) : n.nota;
                tableData.push([
                    n.nombre,
                    n.fecha,
                    notaStr,
                    `${n.puntosMax}`,
                    `${porcentajeRubro}%`
                ]);
            }
        } else {
            // Si no hay notas numéricas, mostrar mensaje
            tableData.push([
                { content: tipo.toUpperCase(), colSpan: 2, styles: { fillColor: [220, 220, 220] } },
                { content: 'Sin calificaciones', colSpan: 2 },
                { content: '', colSpan: 1 }
            ]);
        }
    }

    // Añadir asistencia
    const asistenciaManager = window.app.asistenciaManager;
    if (asistenciaManager) {
        await asistenciaManager.cargarPorcentaje();
        const porcentajeAsistencia = await asistenciaManager.calcularPorcentajeAsistencia(student.id);
        const pesoAsistencia = asistenciaManager.porcentajeAsignado || 10;
        const notaAsistencia = (porcentajeAsistencia * pesoAsistencia) / 100;

        tableData.push([
            { content: 'ASISTENCIA', colSpan: 2, styles: { fillColor: [200, 200, 200] } },
            { content: `${porcentajeAsistencia}%`, colSpan: 2 },
            { content: `Aporte: ${notaAsistencia.toFixed(1)}%`, colSpan: 1, styles: { fillColor: [200, 200, 200] } }
        ]);
        totalPromedioPonderado += notaAsistencia;
        totalPeso += pesoAsistencia;
    }

    // Nota final
    const notaFinal = totalPeso > 0 ? (totalPromedioPonderado / totalPeso) * 100 : 0;
    const notaFinalStr = notaFinal.toFixed(1) + '%';

    // Agregar tabla final
    const startY = 66;
    doc.autoTable({
        startY: startY,
        head: [['Trabajo', 'Fecha', 'Nota', 'Puntaje Máx', 'Rubro %']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9, cellPadding: 2 },
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 10 },
        columnStyles: {
            0: { cellWidth: 40 },
            1: { cellWidth: 25 },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 20, halign: 'center' },
            4: { cellWidth: 20, halign: 'center' }
        },
        didParseCell: (data) => {
            // Resaltar filas de encabezado de tipo
            if (data.cell.raw && data.cell.raw.colSpan) {
                data.cell.styles.fillColor = [200, 200, 200];
                data.cell.styles.fontStyle = 'bold';
            }
            // Colorear notas según aprobado
            if (data.section === 'body' && data.column.index === 2 && typeof data.cell.raw === 'number') {
                if (data.cell.raw >= 70) {
                    data.cell.styles.textColor = [0, 128, 0];
                    data.cell.styles.fontStyle = 'bold';
                } else {
                    data.cell.styles.textColor = [200, 0, 0];
                    data.cell.styles.fontStyle = 'bold';
                }
            }
        }
    });

    // Nota final
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Nota Final: ${notaFinalStr}`, 14, finalY);
    doc.text(`Profesor(a): ${nombreProfesor}`, 14, finalY + 8);

    // Pie de página
    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });

    // Guardar PDF
    const fileName = `notas_${nombreCompleto.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    Swal.fire({
        icon: 'success',
        title: 'PDF generado',
        text: `Descargado: ${fileName}`,
        timer: 2000,
        timerProgressBar: true
    });
}

// Función para cargar librerías PDF (similar a la de AsistenciaManager)
function cargarLibreriasPDF() {
    return new Promise((resolve, reject) => {
        // Si ya están cargadas y autoTable funciona, resolver
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
            try {
                const testDoc = new window.jspdf.jsPDF();
                if (typeof testDoc.autoTable === 'function') {
                    resolve();
                    return;
                }
            } catch (e) {
                // Si falla, continuar con la carga
            }
        }

        // Cargar jsPDF
        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.crossOrigin = 'anonymous';
        script1.onload = () => {
            // Cargar autoTable
            const script2 = document.createElement('script');
            script2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
            script2.crossOrigin = 'anonymous';
            script2.onload = () => {
                if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
                    if (typeof window.jspdf.jsPDF.prototype.autoTable === 'undefined') {
                        if (typeof window.jspdf.autoTable !== 'undefined') {
                            window.jspdf.jsPDF.prototype.autoTable = window.jspdf.autoTable;
                        }
                    }
                    resolve();
                } else {
                    reject(new Error('jsPDF no disponible después de cargar autoTable'));
                }
            };
            script2.onerror = () => reject(new Error('Error cargando jspdf-autotable'));
            document.head.appendChild(script2);
        };
        script1.onerror = () => reject(new Error('Error cargando jsPDF'));
        document.head.appendChild(script1);
    });
}