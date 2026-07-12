// ============================================================
// profesor.js - Gestión de datos del profesor
// ============================================================

function mostrarProfesor() {
    const container = document.getElementById('mainContent');
    if (!container) return;

    const datos = obtenerDatosProfesor();

    const html = `
        <div class="works-header">
            <h2><i class="fas fa-chalkboard-user" style="color:#89b4fa;"></i> Datos del Profesor</h2>
            <button class="btn-action btn-primary" onclick="guardarProfesor()">
                <i class="fas fa-save"></i> Guardar
            </button>
        </div>
        <div style="max-width:600px; margin:0 auto; background:var(--bg-card); padding:24px; border-radius:var(--radius); border:1px solid var(--border-color);">
            <form id="formProfesor" style="display:flex; flex-direction:column; gap:16px;">
                <div>
                    <label style="display:block; margin-bottom:4px; font-weight:500; color:var(--text-secondary);">👤 Nombre del Profesor</label>
                    <input type="text" id="prof-nombre" value="${escapeHtml(datos.nombreProfesor)}" class="swal2-input" style="width:100%;" placeholder="Ej. Juan Pérez">
                </div>
                <div>
                    <label style="display:block; margin-bottom:4px; font-weight:500; color:var(--text-secondary);">🏛️ Ministerio de Educación</label>
                    <input type="text" id="prof-ministerio" value="${escapeHtml(datos.ministerioEducacion)}" class="swal2-input" style="width:100%;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:4px; font-weight:500; color:var(--text-secondary);">📍 Dirección Regional</label>
                    <input type="text" id="prof-regional" value="${escapeHtml(datos.direccionRegional)}" class="swal2-input" style="width:100%;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:4px; font-weight:500; color:var(--text-secondary);">🔵 Circuito Escolar</label>
                    <input type="text" id="prof-circuito" value="${escapeHtml(datos.circuitoEscolar)}" class="swal2-input" style="width:100%;">
                </div>
                <div>
                    <label style="display:block; margin-bottom:4px; font-weight:500; color:var(--text-secondary);">🏫 Nombre del Colegio</label>
                    <input type="text" id="prof-colegio" value="${escapeHtml(datos.nombreColegio)}" class="swal2-input" style="width:100%;">
                </div>
                <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
                    <button type="button" class="btn-action btn-success" onclick="guardarProfesor()" style="padding:8px 24px;">
                        <i class="fas fa-save"></i> Guardar Cambios
                    </button>
                </div>
            </form>
        </div>
    `;

    container.innerHTML = html;
}

function obtenerDatosProfesor() {
    if (typeof config === 'undefined') {
        console.warn('Config no disponible, usando defaults');
        return {
            nombreProfesor: '',
            ministerioEducacion: 'MINISTERIO DE EDUCACIÓN PÚBLICA',
            direccionRegional: 'DIRECCIÓN REGIONAL DE SAN JOSÉ OESTE',
            circuitoEscolar: 'CIRCUITO ESCOLAR 01',
            nombreColegio: 'COLEGIO TÉCNICO PROFESIONAL DE EDUCACIÓN COMERCIAL Y DE SERVICIOS'
        };
    }
    return {
        nombreProfesor: config.get('nombreProfesor') || '',
        ministerioEducacion: config.get('ministerioEducacion') || 'MINISTERIO DE EDUCACIÓN PÚBLICA',
        direccionRegional: config.get('direccionRegional') || 'DIRECCIÓN REGIONAL DE SAN JOSÉ OESTE',
        circuitoEscolar: config.get('circuitoEscolar') || 'CIRCUITO ESCOLAR 01',
        nombreColegio: config.get('nombreColegio') || 'COLEGIO TÉCNICO PROFESIONAL DE EDUCACIÓN COMERCIAL Y DE SERVICIOS'
    };
}

function guardarProfesor() {
    const nombre = document.getElementById('prof-nombre')?.value?.trim() || '';
    const ministerio = document.getElementById('prof-ministerio')?.value?.trim() || '';
    const regional = document.getElementById('prof-regional')?.value?.trim() || '';
    const circuito = document.getElementById('prof-circuito')?.value?.trim() || '';
    const colegio = document.getElementById('prof-colegio')?.value?.trim() || '';

    if (!nombre) {
        if (typeof ui !== 'undefined') {
            ui.showError('El nombre del profesor es obligatorio');
        } else {
            Swal.fire('Error', 'El nombre del profesor es obligatorio', 'error');
        }
        return;
    }

    if (typeof config === 'undefined') {
        Swal.fire('Error', 'Configuración no disponible', 'error');
        return;
    }

    config.set('nombreProfesor', nombre);
    config.set('ministerioEducacion', ministerio);
    config.set('direccionRegional', regional);
    config.set('circuitoEscolar', circuito);
    config.set('nombreColegio', colegio);

    if (typeof ui !== 'undefined') {
        ui.showSuccess('✅ Datos del profesor actualizados');
    } else {
        Swal.fire('Éxito', 'Datos del profesor actualizados', 'success');
    }

    // Refrescar la vista para mostrar los nuevos valores
    mostrarProfesor();
}

// Asegurar que escapeHtml esté disponible
if (typeof escapeHtml === 'undefined') {
    window.escapeHtml = function(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    };
}