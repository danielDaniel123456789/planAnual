// ------------------------------------------------------------
// Descargar PDF con historial de asistencia (resumen por estudiante)
// ------------------------------------------------------------
async descargarPDFAsistencia() {
    const seccionId = this.app.currentSectionId;
    if (!seccionId) {
        this.app.ui.showError('No hay sección seleccionada');
        return;
    }

    const estudiantes = this.getEstudiantes();
    if (estudiantes.length === 0) {
        this.app.ui.showError('No hay estudiantes');
        return;
    }

    try {
        await this.cargarLibreriasPDF();
        if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
            throw new Error('jsPDF no está disponible');
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('landscape', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();

        // Cargar configuración
        await this.cargarPorcentaje();
        const pesoAsistencia = this.porcentajeAsignado;
        const maxAusencias = this.maxAusencias;
        const tardiasPorAusencia = this.tardiasPorAusencia;

        const todos = await this.getRegistros();

        // Calcular datos por estudiante (misma lógica que mostrarInformeEstudiante)
        const datosEstudiantes = [];
        for (const est of estudiantes) {
            const estudianteId = Number(est.id);
            const registrosEst = todos.filter(r => Number(r.estudianteId) === estudianteId);

            let leccionesPresente = 0;
            let leccionesAusente = 0;
            let leccionesTardia = 0;
            let leccionesJustificada = 0;
            let totalLeccionesEst = 0;

            for (const reg of registrosEst) {
                const lec = reg.lecciones || this.leccionesPorDefecto;
                totalLeccionesEst += lec;
                switch (reg.estado) {
                    case 'presente': leccionesPresente += lec; break;
                    case 'ausente': leccionesAusente += lec; break;
                    case 'tardia': leccionesTardia += lec; break;
                    case 'justificada': leccionesJustificada += lec; break;
                }
            }

            let porcentajeAsistencia = 100;
            let notaPonderada = 0;

            if (registrosEst.length === 0) {
                porcentajeAsistencia = 100;
                notaPonderada = (100 * pesoAsistencia) / 100;
            } else {
                const leccionesPerdidas = leccionesAusente + (leccionesTardia / tardiasPorAusencia);
                const maxLeccionesPermitidas = maxAusencias * this.leccionesPorDefecto;
                if (totalLeccionesEst > 0) {
                    if (leccionesPerdidas >= maxLeccionesPermitidas) {
                        porcentajeAsistencia = 0;
                    } else {
                        porcentajeAsistencia = 100 * (1 - leccionesPerdidas / maxLeccionesPermitidas);
                    }
                }
                porcentajeAsistencia = Math.round(porcentajeAsistencia * 10) / 10;
                notaPonderada = Math.round(((porcentajeAsistencia * pesoAsistencia) / 100) * 10) / 10;
            }

            datosEstudiantes.push({
                nombre: this.app.students.getFullName(est),
                presente: Math.round(leccionesPresente * 10) / 10,
                ausente: Math.round(leccionesAusente * 10) / 10,
                tardia: Math.round(leccionesTardia * 10) / 10,
                justificada: Math.round(leccionesJustificada * 10) / 10,
                totalLecciones: totalLeccionesEst,
                porcentaje: porcentajeAsistencia,
                nota: notaPonderada
            });
        }

        // Ordenar por nombre
        datosEstudiantes.sort((a, b) => a.nombre.localeCompare(b.nombre));

        // Título
        const seccion = this.app.sections.getCurrent();
        const titulo = `Informe de Asistencia - ${seccion ? seccion.nombre : 'Sección'}`;
        doc.setFontSize(16);
        doc.text(titulo, pageWidth / 2, 15, { align: 'center' });
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleString()}`, pageWidth / 2, 22, { align: 'center' });
        doc.text(`Peso de asistencia: ${pesoAsistencia}% | Máx. ausencias: ${maxAusencias} | ${tardiasPorAusencia} tardías = 1 ausencia`, pageWidth / 2, 28, { align: 'center' });

        // Preparar datos para la tabla
        const tableBody = datosEstudiantes.map(item => [
            item.nombre,
            item.presente,
            item.ausente,
            item.tardia,
            item.justificada,
            item.totalLecciones,
            `${item.porcentaje}%`,
            item.nota
        ]);

        const colores = {
            aprobado: [166, 227, 161],   // verde
            reprobado: [243, 139, 168]   // rojo
        };

        // Generar tabla con autoTable
        doc.autoTable({
            startY: 32,
            head: [['Estudiante', 'Presente', 'Ausente', 'Tardía', 'Justificada', 'Total Lec.', '% Asist.', `Nota (${pesoAsistencia}%)`]],
            body: tableBody,
            theme: 'striped',
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255], fontSize: 10 },
            columnStyles: {
                0: { cellWidth: 40, fontStyle: 'bold' },
                1: { cellWidth: 18, halign: 'center' },
                2: { cellWidth: 18, halign: 'center' },
                3: { cellWidth: 18, halign: 'center' },
                4: { cellWidth: 18, halign: 'center' },
                5: { cellWidth: 20, halign: 'center' },
                6: { cellWidth: 20, halign: 'center' },
                7: { cellWidth: 22, halign: 'center' }
            },
            didParseCell: (data) => {
                // Colorear según nota
                if (data.section === 'body' && data.column.index === 7) {
                    const nota = data.cell.raw;
                    if (typeof nota === 'number') {
                        const peso = pesoAsistencia;
                        const umbral = (peso * 0.7);
                        if (nota >= umbral) {
                            data.cell.styles.textColor = [0, 128, 0];
                            data.cell.styles.fontStyle = 'bold';
                        } else {
                            data.cell.styles.textColor = [200, 0, 0];
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                }
                // Colorear % asistencia
                if (data.section === 'body' && data.column.index === 6) {
                    const pct = parseFloat(data.cell.raw);
                    if (pct >= 80) {
                        data.cell.styles.textColor = [0, 128, 0];
                    } else if (pct >= 60) {
                        data.cell.styles.textColor = [200, 150, 0];
                    } else {
                        data.cell.styles.textColor = [200, 0, 0];
                    }
                }
            },
            margin: { left: 10, right: 10 }
        });

        // Pie de página
        const finalY = doc.lastAutoTable.finalY + 6;
        if (finalY < pageHeight - 20) {
            doc.setFontSize(9);
            doc.text('* La Nota es el porcentaje de asistencia ponderado por el peso asignado.', 14, finalY);
        }

        doc.save(`Informe_Asistencia_${new Date().toISOString().slice(0,10)}.pdf`);
        this.app.ui.showSuccess('PDF generado correctamente');
    } catch (error) {
        console.error('Error generando PDF:', error);
        this.app.ui.showError('Error al generar el PDF: ' + error.message);
    }
}