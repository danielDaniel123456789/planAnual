// ============================================================
// descargarPDFEstudiante.js - PDF con suma de notas por tipo
// ============================================================

// ============================================================
// descargarPDFEstudiante.js - PDF con sumas horizontales (una fila)
// ============================================================

async function descargarPDFEstudiante() {
    try {
        if (!window.app) {
            Swal.fire('Error', 'La aplicación no está inicializada', 'error');
            return;
        }

        const students = window.app.students.list || [];
        if (students.length === 0) {
            Swal.fire('Información', 'No hay estudiantes registrados', 'info');
            return;
        }

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
            width: '500px'
        });

        if (!studentId) return;

        const student = window.app.students.getById(parseInt(studentId));
        if (!student) {
            Swal.fire('Error', 'Estudiante no encontrado', 'error');
            return;
        }

        await generarPDFHorizontal(student);

    } catch (error) {
        console.error('Error:', error);
        Swal.fire('Error', 'No se pudo generar el PDF: ' + error.message, 'error');
    }
}

// Construir opciones para el select
function buildStudentOptions(students) {
    const options = {};
    for (const student of students) {
        const nombreCompleto = window.app.students.getFullName(student);
        const cedula = student.cedula || 'Sin cédula';
        options[student.id] = `${nombreCompleto} (${cedula})`;
    }
    return options;
}

// ============================================================
// Generar PDF con tabla horizontal (una fila)
// ============================================================
async function generarPDFHorizontal(student) {
    // Cargar librerías PDF
    await cargarLibreriasPDF();

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        throw new Error('jsPDF no está disponible');
    }

    const { jsPDF } = window.jspdf;
    // Usamos orientación horizontal (landscape) para más espacio
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Datos del estudiante
    const nombreCompleto = window.app.students.getFullName(student);
    const cedula = student.cedula || 'No registrada';
    const correo = student.correo || 'No registrado';

    // Configuración del profesor
    const config = window.app.config;
    const nombreProfesor = config.get('nombreProfesor') || 'Profesor';
    const nombreColegio = config.get('nombreColegio') || 'Colegio';
    const ministerio = config.get('ministerioEducacion') || 'Ministerio de Educación';
    const regional = config.get('direccionRegional') || 'Dirección Regional';
    const circuito = config.get('circuitoEscolar') || 'Circuito Escolar';

    // Encabezado institucional
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

    // ============================================================
    // CALCULAR SUMAS POR TIPO
    // ============================================================
    const grades = window.app.grades;
    const tipos = [
        { key: 'cotidiano', label: 'Cotidianos' },
        { key: 'tarea', label: 'Tareas' },
        { key: 'examen', label: 'Exámenes' },
        { key: 'proyecto', label: 'Proyectos' }
    ];

    const sumas = {};
    let sumaTotal = 0;

    for (const tipo of tipos) {
        const works = grades.getWorksByType(tipo.key);
        let suma = 0;
        for (const work of works) {
            const nota = grades.getGrade(student.id, work.id, tipo.key);
            if (nota !== null && !isNaN(nota)) {
                suma += nota;
            }
        }
        sumas[tipo.label] = Math.round(suma * 10) / 10;
        sumaTotal += sumas[tipo.label];
    }

    // Asistencia (si existe)
    const asistenciaManager = window.app.asistenciaManager;
    let notaAsistencia = 0;
    if (asistenciaManager && typeof asistenciaManager.calcularPorcentajeAsistencia === 'function') {
        await asistenciaManager.cargarPorcentaje();
        const porcentajeAsistencia = await asistenciaManager.calcularPorcentajeAsistencia(student.id);
        const pesoAsistencia = asistenciaManager.porcentajeAsignado || 10;
        notaAsistencia = (porcentajeAsistencia * pesoAsistencia) / 100;
        notaAsistencia = Math.round(notaAsistencia * 10) / 10;
        sumas['Asistencia'] = notaAsistencia;
        sumaTotal += notaAsistencia;
    }

    // Redondear total final
    sumaTotal = Math.round(sumaTotal * 10) / 10;

    // ============================================================
    // CONSTRUIR TABLA HORIZONTAL (una fila)
    // ============================================================
    // Cabecera: todos los conceptos + "Total"
    const headers = Object.keys(sumas);
    headers.push('Total');

    // Datos: los valores correspondientes + el total
    const values = Object.values(sumas);
    values.push(sumaTotal);

    // Convertir a formato que autoTable espera: [['Cotidianos', 'Tareas', ...], [valor1, valor2, ...]]
    const tableBody = [values];

    // ============================================================
    // GENERAR TABLA
    // ============================================================
    const startY = 66;
    doc.autoTable({
        startY: startY,
        head: [headers],
        body: tableBody,
        theme: 'striped',
        styles: { fontSize: 11, cellPadding: 4, halign: 'center' },
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 12 },
        columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30 },
            2: { cellWidth: 30 },
            3: { cellWidth: 30 },
            4: { cellWidth: 30 },
            5: { cellWidth: 30 } // Columna de Total
        },
        didParseCell: (data) => {
            // Resaltar la columna TOTAL (última columna)
            if (data.section === 'head' && data.column.index === headers.length - 1) {
                data.cell.styles.fillColor = [200, 200, 200];
                data.cell.styles.textColor = [0, 0, 0];
                data.cell.styles.fontStyle = 'bold';
            }
            if (data.section === 'body' && data.column.index === headers.length - 1) {
                data.cell.styles.fillColor = [200, 200, 200];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 13;
            }
            // Colorear notas según aprobado (>=70) o reprobado (en todas las columnas numéricas)
            if (data.section === 'body' && typeof data.cell.raw === 'number') {
                if (data.cell.raw >= 70) {
                    data.cell.styles.textColor = [0, 128, 0];
                } else {
                    data.cell.styles.textColor = [200, 0, 0];
                }
            }
        }
    });

    // ============================================================
    // PIE DE PÁGINA
    // ============================================================
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Profesor(a): ${nombreProfesor}`, 14, finalY + 8);

    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });

    // Guardar PDF
    const fileName = `resumen_horizontal_${nombreCompleto.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    Swal.fire({
        icon: 'success',
        title: 'PDF generado',
        text: `Descargado: ${fileName}`,
        timer: 2000,
        timerProgressBar: true
    });
}

// ============================================================
// Cargar librerías PDF (sin cambios)
// ============================================================
function cargarLibreriasPDF() {
    return new Promise((resolve, reject) => {
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
            try {
                const testDoc = new window.jspdf.jsPDF();
                if (typeof testDoc.autoTable === 'function') {
                    resolve();
                    return;
                }
            } catch (e) {
                // continuar con la carga
            }
        }

        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.crossOrigin = 'anonymous';
        script1.onload = () => {
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

// Construir opciones para el select
function buildStudentOptions(students) {
    const options = {};
    for (const student of students) {
        const nombreCompleto = window.app.students.getFullName(student);
        const cedula = student.cedula || 'Sin cédula';
        options[student.id] = `${nombreCompleto} (${cedula})`;
    }
    return options;
}

// ============================================================
// Generar PDF con resumen por tipo (solo sumas)
// ============================================================
async function generarPDFResumenPorTipo(student) {
    // Cargar librerías PDF
    await cargarLibreriasPDF();

    if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        throw new Error('jsPDF no está disponible');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Datos del estudiante
    const nombreCompleto = window.app.students.getFullName(student);
    const cedula = student.cedula || 'No registrada';
    const correo = student.correo || 'No registrado';

    // Configuración del profesor
    const config = window.app.config;
    const nombreProfesor = config.get('nombreProfesor') || 'Profesor';
    const nombreColegio = config.get('nombreColegio') || 'Colegio';
    const ministerio = config.get('ministerioEducacion') || 'Ministerio de Educación';
    const regional = config.get('direccionRegional') || 'Dirección Regional';
    const circuito = config.get('circuitoEscolar') || 'Circuito Escolar';

    // Encabezado institucional
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

    // ============================================================
    // CALCULAR SUMAS POR TIPO
    // ============================================================
    const grades = window.app.grades;
    const tipos = [
        { key: 'cotidiano', label: 'Cotidianos' },
        { key: 'tarea', label: 'Tareas' },
        { key: 'examen', label: 'Exámenes' },
        { key: 'proyecto', label: 'Proyectos' }
    ];

    const sumas = {};
    let sumaTotal = 0;

    for (const tipo of tipos) {
        const works = grades.getWorksByType(tipo.key);
        let suma = 0;
        for (const work of works) {
            const nota = grades.getGrade(student.id, work.id, tipo.key);
            if (nota !== null && !isNaN(nota)) {
                suma += nota;
            }
        }
        sumas[tipo.label] = Math.round(suma * 10) / 10;
        sumaTotal += sumas[tipo.label];
    }

    // Asistencia (si existe)
    const asistenciaManager = window.app.asistenciaManager;
    let notaAsistencia = 0;
    if (asistenciaManager && typeof asistenciaManager.calcularPorcentajeAsistencia === 'function') {
        await asistenciaManager.cargarPorcentaje();
        const porcentajeAsistencia = await asistenciaManager.calcularPorcentajeAsistencia(student.id);
        const pesoAsistencia = asistenciaManager.porcentajeAsignado || 10;
        notaAsistencia = (porcentajeAsistencia * pesoAsistencia) / 100;
        notaAsistencia = Math.round(notaAsistencia * 10) / 10;
        sumas['Asistencia'] = notaAsistencia;
        sumaTotal += notaAsistencia;
    }

    // Redondear total final
    sumaTotal = Math.round(sumaTotal * 10) / 10;

    // ============================================================
    // CONSTRUIR TABLA DE RESUMEN (dos columnas: Concepto, Suma)
    // ============================================================
    const tableData = [];
    for (const [concepto, valor] of Object.entries(sumas)) {
        tableData.push([concepto, valor]);
    }
    // Fila de total
    tableData.push(['TOTAL', sumaTotal]);

    // ============================================================
    // GENERAR TABLA
    // ============================================================
    const startY = 66;
    doc.autoTable({
        startY: startY,
        head: [['Concepto', 'Suma']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 11, cellPadding: 4 },
        headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 12 },
        columnStyles: {
            0: { cellWidth: 80 },
            1: { cellWidth: 40, halign: 'center' }
        },
        didParseCell: (data) => {
            // Resaltar la fila de TOTAL
            if (data.section === 'body' && data.row.index === tableData.length - 1) {
                data.cell.styles.fillColor = [200, 200, 200];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fontSize = 12;
            }
            // Colorear notas según aprobado (>=70) o reprobado
            if (data.section === 'body' && data.column.index === 1 && typeof data.cell.raw === 'number') {
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

    // ============================================================
    // PIE DE PÁGINA
    // ============================================================
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.text(`Profesor(a): ${nombreProfesor}`, 14, finalY + 8);

    doc.setFontSize(9);
    doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth - 14, pageHeight - 10, { align: 'right' });

    // Guardar PDF
    const fileName = `resumen_notas_${nombreCompleto.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);

    Swal.fire({
        icon: 'success',
        title: 'PDF generado',
        text: `Descargado: ${fileName}`,
        timer: 2000,
        timerProgressBar: true
    });
}

// ============================================================
// Cargar librerías PDF (sin cambios)
// ============================================================
function cargarLibreriasPDF() {
    return new Promise((resolve, reject) => {
        if (typeof window.jspdf !== 'undefined' && typeof window.jspdf.jsPDF !== 'undefined') {
            try {
                const testDoc = new window.jspdf.jsPDF();
                if (typeof testDoc.autoTable === 'function') {
                    resolve();
                    return;
                }
            } catch (e) {
                // continuar con la carga
            }
        }

        const script1 = document.createElement('script');
        script1.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script1.crossOrigin = 'anonymous';
        script1.onload = () => {
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