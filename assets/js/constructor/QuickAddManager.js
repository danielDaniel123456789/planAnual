// ============================================================
// QuickAddManager.js - Agregado rápido de elementos
// ============================================================

class QuickAddManager {
    constructor(app) {
        this.app = app;
    }

    async showAddRapido() {
        const result = await Swal.fire({
            title: 'Agregar Rápido',
            html: `
            <div style="display:flex; flex-direction:column; gap:12px; text-align:left;">
                <label style="font-size:13px; color:var(--text-secondary);">📋 ¿Qué deseas agregar?</label>
                <select id="swal-tipo" class="swal2-input" style="appearance:auto;">
                    <option value="estudiante">👤 Estudiante</option>
                    <option value="cotidiano">📝 Trabajo Cotidiano</option>
                    <option value="tarea">📚 Tarea</option>
                    <option value="examen">📝 Examen</option>
                    <option value="proyecto">🚀 Proyecto</option>
                    <option value="machote">📦 Machote</option>
                    <option value="rubro">📊 Rubro</option>  <!-- NUEVO -->
                    <option value="plan">📅 Plan</option>
                </select>
                
                <div id="quickAddFields">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre:</label>
                    <input id="swal-nombre" class="swal2-input" placeholder="Escribe el nombre...">
                </div>
            </div>`,
            showCancelButton: true,
            confirmButtonText: '✅ Agregar',
            cancelButtonText: '❌ Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '480px',
            didOpen: () => {
                const tipoSelect = document.getElementById('swal-tipo');
                const container = document.getElementById('quickAddFields');
                
                tipoSelect.addEventListener('change', function() {
                    const tipo = this.value;
                    let placeholder = '';
                    let extraFields = '';
                    
                    switch(tipo) {
                        case 'estudiante':
                            placeholder = 'Nombre del estudiante';
                            extraFields = `
                                <label style="font-size:13px; color:var(--text-secondary); margin-top:8px;">📋 Cédula:</label>
                                <input id="swal-cedula" class="swal2-input" placeholder="1-1234-5678">
                                
                                <label style="font-size:13px; color:var(--text-secondary);">📧 Correo:</label>
                                <input id="swal-correo" class="swal2-input" placeholder="correo@ejemplo.com" type="email">
                            `;
                            break;
                        case 'plan':
                            placeholder = 'Título del contenido';
                            extraFields = `
                                <label style="font-size:13px; color:var(--text-secondary); margin-top:8px;">📄 Contenido:</label>
                                <textarea id="swal-contenido" class="swal2-textarea" rows="4" placeholder="Describe el contenido..."></textarea>
                                
                                <label style="font-size:13px; color:var(--text-secondary);">📅 Periodo:</label>
                                <select id="swal-periodo" class="swal2-input" style="appearance:auto;">
                                    <option value="semana">Por Semana</option>
                                    <option value="mes">Por Mes</option>
                                </select>
                            `;
                            break;
                        default:
                            placeholder = 'Nombre del trabajo';
                            extraFields = `
                                <label style="font-size:13px; color:var(--text-secondary); margin-top:8px;">🎯 Puntaje máximo:</label>
                                <input id="swal-puntos" class="swal2-input" type="number" value="100" min="1" max="100">
                                
                                <label style="font-size:13px; color:var(--text-secondary);">📅 Fecha de entrega:</label>
                                <input id="swal-fecha" class="swal2-input" type="date">
                            `;
                    }
                    
                    container.innerHTML = `
                        <label style="font-size:13px; color:var(--text-secondary);">📝 Nombre:</label>
                        <input id="swal-nombre" class="swal2-input" placeholder="${placeholder}">
                        ${extraFields}
                    `;
                });
                
                // Trigger inicial
                tipoSelect.dispatchEvent(new Event('change'));
            },
            preConfirm: () => {
                const tipo = document.getElementById('swal-tipo').value;
                const nombre = document.getElementById('swal-nombre').value.trim();
                
                if (!nombre) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return;
                }
                
                const result = { tipo, nombre };
                
                if (tipo === 'estudiante') {
                    result.cedula = document.getElementById('swal-cedula')?.value || '';
                    result.correo = document.getElementById('swal-correo')?.value || '';
                } else if (tipo === 'plan') {
                    result.contenido = document.getElementById('swal-contenido')?.value || '';
                    result.periodo = document.getElementById('swal-periodo')?.value || 'semana';
                } else {
                    result.puntosMax = parseInt(document.getElementById('swal-puntos')?.value) || 100;
                    result.fecha = document.getElementById('swal-fecha')?.value || '';
                }
                
                return result;
            }
        });

        if (!result.isConfirmed || !result.value) return;

        const data = result.value;
        
        try {
            switch(data.tipo) {
                case 'estudiante':
                    await this.app.students.addStudent({
                        nombre: data.nombre,
                        cedula: data.cedula || '',
                        apellidos: '',
                        correo: data.correo || ''
                    });
                    this.app.ui.showSuccess(`✅ Estudiante "${data.nombre}" agregado`);
                    break;
                    
                case 'plan':
                    await this.app.plan.addContenido({
                        titulo: data.nombre,
                        contenido: data.contenido || '',
                        periodo: data.periodo || 'semana'
                    });
                    this.app.ui.showSuccess(`✅ Contenido "${data.nombre}" agregado al plan`);
                    break;
                    
                case 'machote':
                    await this.app.grades.addWork(this.app.currentSectionId, 'machote', {
                        nombre: data.nombre,
                        categoria: 'General',
                        descripcion: '',
                        contenido: '',
                        fecha: getDayMonth(),
                        activo: true
                    });
                    this.app.ui.showSuccess(`✅ Machote "${data.nombre}" creado`);
                    break;
                    
                    
                default:
                    const tipoLabels = {
                        cotidiano: 'Trabajo Cotidiano',
                        tarea: 'Tarea',
                        examen: 'Examen',
                        proyecto: 'Proyecto'
                    };
                    await this.app.grades.addWork(this.app.currentSectionId, data.tipo, {
                        nombre: data.nombre,
                        puntosMax: data.puntosMax || 100,
                        fecha: getDayMonth(),
                        fechaEntrega: data.fecha || '',
                        activo: true
                    });
                    this.app.ui.showSuccess(`✅ ${tipoLabels[data.tipo] || data.tipo} "${data.nombre}" creado`);
            }
            
            await this.app.render();
            
        } catch (error) {
            console.error('Error en agregado rápido:', error);
            this.app.ui.showError('Error al agregar el elemento');
        }
    }
}