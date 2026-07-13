// ============================================================
// StudentManager.js - Gestión de estudiantes (con edición)
// ============================================================

class StudentManager {
    constructor(app) {
        this.app = app;
    }

    // ------------------------------------------------------------
    // Renderizado de la tabla de estudiantes
    // ------------------------------------------------------------
    async renderStudents(container) {
        const studentsList = this.app.students.list || [];
        let html = `
            <div class="students-header">
                <h2><i class="fas fa-users" style="color:#89b4fa;"></i> Estudiantes <span class="count">(${studentsList.length})</span></h2>
                <div class="students-actions">
                    <button class="btn-action btn-success" onclick="window.app?.importStudents()"><i class="fas fa-file-import"></i> Importar</button>
                    <button class="btn-action btn-primary" onclick="window.app?.addStudent()"><i class="fas fa-plus"></i> Agregar</button>
                </div>
            </div>`;
        
        if (studentsList.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>No hay estudiantes registrados</p>
                    <button class="btn-action btn-primary" onclick="window.app?.importStudents()"><i class="fas fa-file-import"></i> Importar estudiantes</button>
                </div>`;
            container.innerHTML = html;
            return;
        }
        
        html += `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Cédula</th>
                            <th>Nombre</th>
                            <th>Apellidos</th>
                            <th>Correo</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;
        
        for (let i = 0; i < studentsList.length; i++) {
            const student = studentsList[i];
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td>${escapeHtml(student.cedula || '-')}</td>
                    <td style="font-weight:500; color:var(--text-primary);">${escapeHtml(student.nombre || '-')}</td>
                    <td>${escapeHtml(student.apellidos || '-')}</td>
                    <td>${escapeHtml(student.correo || '-')}</td>
                    <td style="text-align:center; white-space:nowrap;">
                        <!-- Botón Editar -->
                        <button class="btn-action btn-primary" 
                                onclick="window.app?.editStudent(${student.id})" 
                                style="padding:4px 8px; font-size:12px; margin-right:4px;" 
                                title="Editar estudiante">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <!-- Botón Eliminar -->
                        <button class="btn-action btn-danger" 
                                onclick="window.app?.deleteStudent(${student.id})" 
                                style="padding:4px 8px; font-size:12px;" 
                                title="Eliminar estudiante">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }
        html += `</tbody></table></div>`;
        container.innerHTML = html;
    }

    // ------------------------------------------------------------
    // Agregar estudiante (nuevo)
    // ------------------------------------------------------------
    async addStudent() {
        const result = await Swal.fire({
            title: 'Agregar Estudiante',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">Cédula</label>
                    <input id="swal-cedula" class="swal2-input" placeholder="Ej. 1-1234-5678">
                    <label style="font-size:13px; color:var(--text-secondary);">Nombre</label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Nombre del estudiante">
                    <label style="font-size:13px; color:var(--text-secondary);">Apellidos</label>
                    <input id="swal-apellidos" class="swal2-input" placeholder="Apellidos del estudiante">
                    <label style="font-size:13px; color:var(--text-secondary);">Correo</label>
                    <input id="swal-correo" class="swal2-input" placeholder="correo@ejemplo.com" type="email">
                </div>`,
            showCancelButton: true,
            confirmButtonText: 'Agregar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            preConfirm: () => {
                const cedula = document.getElementById('swal-cedula').value.trim();
                const nombre = document.getElementById('swal-nombre').value.trim();
                const apellidos = document.getElementById('swal-apellidos').value.trim();
                const correo = document.getElementById('swal-correo').value.trim();
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                return { cedula, nombre, apellidos, correo };
            }
        });
        if (result.isConfirmed && result.value) {
            await this.app.students.addStudent(result.value);
            await this.app.render();
            this.app.ui.showSuccess('Estudiante agregado correctamente');
        }
    }

    // ------------------------------------------------------------
    // Editar estudiante (NUEVO)
    // ------------------------------------------------------------
    async editStudent(id) {
        const student = this.app.students.getById(id);
        if (!student) {
            this.app.ui.showError('Estudiante no encontrado');
            return;
        }

        const result = await Swal.fire({
            title: '✏️ Editar Estudiante',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">Cédula</label>
                    <input id="swal-cedula" class="swal2-input" value="${escapeHtml(student.cedula || '')}" placeholder="Ej. 1-1234-5678">
                    <label style="font-size:13px; color:var(--text-secondary);">Nombre</label>
                    <input id="swal-nombre" class="swal2-input" value="${escapeHtml(student.nombre || '')}" placeholder="Nombre del estudiante">
                    <label style="font-size:13px; color:var(--text-secondary);">Apellidos</label>
                    <input id="swal-apellidos" class="swal2-input" value="${escapeHtml(student.apellidos || '')}" placeholder="Apellidos">
                    <label style="font-size:13px; color:var(--text-secondary);">Correo</label>
                    <input id="swal-correo" class="swal2-input" value="${escapeHtml(student.correo || '')}" placeholder="correo@ejemplo.com" type="email">
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '480px',
            preConfirm: () => {
                const cedula = document.getElementById('swal-cedula').value.trim();
                const nombre = document.getElementById('swal-nombre').value.trim();
                const apellidos = document.getElementById('swal-apellidos').value.trim();
                const correo = document.getElementById('swal-correo').value.trim();
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                // Validación básica de correo (si se proporciona)
                if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
                    Swal.showValidationMessage('El correo electrónico no es válido');
                    return;
                }
                return { cedula, nombre, apellidos, correo };
            }
        });

        if (result.isConfirmed && result.value) {
            // Actualizar en la base de datos
            await this.app.students.updateStudent(id, result.value);
            // Refrescar la vista
            await this.app.render();
            this.app.ui.showSuccess('✅ Estudiante actualizado correctamente');
        }
    }

    // ------------------------------------------------------------
    // Eliminar estudiante
    // ------------------------------------------------------------
    async deleteStudent(id) {
        const student = this.app.students.getById(id);
        if (!student) return;
        const nombreCompleto = this.app.students.getFullName(student);
        const confirm = await this.app.ui.showConfirm(`¿Eliminar a "${nombreCompleto}"?`);
        if (confirm.isConfirmed) {
            await this.app.students.deleteStudent(id);
            await this.app.render();
            this.app.ui.showSuccess('Estudiante eliminado');
        }
    }

    // ------------------------------------------------------------
    // Importar estudiantes desde texto (CSV)
    // ------------------------------------------------------------
    async importStudents() {
        const result = await this.app.ui.showTextarea(
            'Importar Estudiantes',
            '',
            'Formato: cédula, nombre, apellidos, correo (uno por línea)\nEjemplo:\n1-1234-5678, Juan, Pérez, juan@email.com\n1-2345-6789, María, Gómez, maria@email.com'
        );
        if (!result.isConfirmed || !result.value) return;
        
        const lines = result.value.split('\n').filter(line => line.trim());
        const studentsToImport = [];
        let errors = 0;
        
        for (const line of lines) {
            const parts = line.split(',').map(s => s.trim());
            if (parts.length >= 3) {
                studentsToImport.push({ 
                    cedula: parts[0] || '', 
                    nombre: parts[1] || '', 
                    apellidos: parts[2] || '',
                    correo: parts[3] || '' 
                });
            } else { 
                errors++; 
            }
        }
        
        if (studentsToImport.length === 0) { 
            this.app.ui.showError('No se encontraron datos válidos para importar'); 
            return; 
        }
        
        const confirm = await this.app.ui.showConfirm(
            `Se importarán ${studentsToImport.length} estudiantes. ${errors > 0 ? `(${errors} líneas omitidas por formato inválido)` : ''}`
        );
        if (confirm.isConfirmed) {
            await this.app.students.save(studentsToImport);
            await this.app.render();
            this.app.ui.showSuccess(`✅ ${studentsToImport.length} estudiantes importados correctamente`);
        }
    }
}