// ============================================================
// AlertManager.js - Gestión de alertas/recordatorios generales
// ============================================================

class AlertManager {
    constructor() {
        this.STORAGE_KEY = 'app_alertas';
        this.alertas = [];
        this.cargarAlertas();
    }

    // ------------------------------------------------------------
    // Carga y guardado en localStorage
    // ------------------------------------------------------------
    cargarAlertas() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            this.alertas = data ? JSON.parse(data) : [];
        } catch (e) {
            this.alertas = [];
        }
        // Asegurar campos obligatorios y limpiar campos obsoletos
        this.alertas = this.alertas.map(a => ({
            id: a.id || Date.now(),
            mensaje: a.mensaje || '',
            frecuencia: a.frecuencia || 'siempre',
            intervalo: a.intervalo || 1,
            activa: a.activa !== undefined ? a.activa : true,
            ultimaVezMostrada: a.ultimaVezMostrada || null
        }));
        this.guardarAlertas();
    }

    guardarAlertas() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.alertas));
    }

    // ------------------------------------------------------------
    // CRUD básico
    // ------------------------------------------------------------
    obtenerAlertas() {
        return this.alertas;
    }

    obtenerAlertaPorId(id) {
        return this.alertas.find(a => a.id === id);
    }

    agregarAlerta(datos) {
        const nueva = {
            id: Date.now(),
            mensaje: datos.mensaje,
            frecuencia: datos.frecuencia || 'siempre',
            intervalo: datos.intervalo || 1,
            activa: true,
            ultimaVezMostrada: null
        };
        this.alertas.push(nueva);
        this.guardarAlertas();
        return nueva;
    }

    actualizarAlerta(id, datos) {
        const index = this.alertas.findIndex(a => a.id === id);
        if (index === -1) return false;
        const alerta = this.alertas[index];
        if (datos.mensaje !== undefined) alerta.mensaje = datos.mensaje;
        if (datos.frecuencia !== undefined) alerta.frecuencia = datos.frecuencia;
        if (datos.intervalo !== undefined) alerta.intervalo = datos.intervalo;
        if (datos.activa !== undefined) alerta.activa = datos.activa;
        this.guardarAlertas();
        return true;
    }

    eliminarAlerta(id) {
        this.alertas = this.alertas.filter(a => a.id !== id);
        this.guardarAlertas();
    }

    // ------------------------------------------------------------
    // Lógica de activación (frecuencias)
    // ------------------------------------------------------------
    obtenerAlertasActivas() {
        const ahora = new Date();
        const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());

        return this.alertas.filter(alerta => {
            if (!alerta.activa) return false;

            // Si no tiene última vez mostrada, debe mostrarse ahora
            if (!alerta.ultimaVezMostrada) return true;

            const ultima = new Date(alerta.ultimaVezMostrada);

            switch (alerta.frecuencia) {
                case 'siempre':
                    return true;

                case 'diario': {
                    const ultimaFecha = new Date(ultima.getFullYear(), ultima.getMonth(), ultima.getDate());
                    return ultimaFecha < hoy;
                }

                case 'horario': {
                    const diffHoras = (ahora - ultima) / (1000 * 60 * 60);
                    return diffHoras >= (alerta.intervalo || 1);
                }

                case 'dias': {
                    const diffDias = Math.floor((hoy - ultima) / (1000 * 60 * 60 * 24));
                    return diffDias >= (alerta.intervalo || 1);
                }

                default:
                    return false;
            }
        });
    }

    marcarComoMostrada(id) {
        const alerta = this.obtenerAlertaPorId(id);
        if (alerta) {
            alerta.ultimaVezMostrada = new Date().toISOString();
            this.guardarAlertas();
        }
    }

    // ------------------------------------------------------------
    // Mostrar alertas en el centro de la pantalla (con confirmación)
    // ------------------------------------------------------------
    async mostrarAlertas() {
        const activas = this.obtenerAlertasActivas();
        if (activas.length === 0) return;

        // Mostrar una por una (secuencial) y esperar a que el usuario cierre
        for (const alerta of activas) {
            await Swal.fire({
                icon: 'info',
                title: '📢 Recordatorio',
                text: alerta.mensaje,
                confirmButtonText: 'Cerrar',
                confirmButtonColor: '#3085d6',
                background: 'var(--bg-card)',
                color: 'var(--text-primary)',
                // Sin timer, la alerta permanece hasta que el usuario haga clic en "Cerrar"
            });
            // Marcar como mostrada SOLO después de que el usuario cierre
            this.marcarComoMostrada(alerta.id);
        }
    }

    // ------------------------------------------------------------
    // Formulario para agregar alerta (sin fechas)
    // ------------------------------------------------------------
    async agregarAlertaFormulario() {
        const result = await Swal.fire({
            title: 'Nueva Alerta',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Mensaje:</label>
                    <textarea id="swal-mensaje" class="swal2-textarea" rows="3" placeholder="Escribe el mensaje..."></textarea>
                    <label style="font-size:13px; color:var(--text-secondary);">⏱️ Frecuencia:</label>
                    <select id="swal-frecuencia" class="swal2-input" style="appearance:auto;">
                        <option value="siempre">Siempre (cada vez que cargue la página)</option>
                        <option value="diario">Una vez al día</option>
                        <option value="horario">Cada X horas</option>
                        <option value="dias">Cada X días</option>
                    </select>
                    <div id="campoIntervalo" style="display:none;">
                        <label style="font-size:13px; color:var(--text-secondary);">Intervalo:</label>
                        <input id="swal-intervalo" class="swal2-input" type="number" min="1" value="1">
                        <span id="intervaloLabel" style="font-size:11px; color:var(--text-muted);">(horas o días según frecuencia)</span>
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '✅ Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '500px',
            didOpen: () => {
                const freq = document.getElementById('swal-frecuencia');
                const campoIntervalo = document.getElementById('campoIntervalo');
                const label = document.getElementById('intervaloLabel');
                const intervaloInput = document.getElementById('swal-intervalo');

                const actualizarIntervalo = () => {
                    const val = freq.value;
                    if (val === 'siempre' || val === 'diario') {
                        campoIntervalo.style.display = 'none';
                    } else if (val === 'horario') {
                        campoIntervalo.style.display = 'block';
                        label.textContent = '(horas)';
                        intervaloInput.min = 1;
                        intervaloInput.value = 1;
                    } else if (val === 'dias') {
                        campoIntervalo.style.display = 'block';
                        label.textContent = '(días)';
                        intervaloInput.min = 1;
                        intervaloInput.value = 1;
                    }
                };
                freq.addEventListener('change', actualizarIntervalo);
                actualizarIntervalo();
            },
            preConfirm: () => {
                const mensaje = document.getElementById('swal-mensaje').value.trim();
                if (!mensaje) {
                    Swal.showValidationMessage('El mensaje es obligatorio');
                    return;
                }
                const frecuencia = document.getElementById('swal-frecuencia').value;
                let intervalo = 1;
                if (frecuencia === 'horario' || frecuencia === 'dias') {
                    intervalo = parseInt(document.getElementById('swal-intervalo').value) || 1;
                    if (intervalo < 1) {
                        Swal.showValidationMessage('El intervalo debe ser al menos 1');
                        return;
                    }
                }
                return { mensaje, frecuencia, intervalo };
            }
        });

        if (result.isConfirmed && result.value) {
            this.agregarAlerta(result.value);
            return true;
        }
        return false;
    }

    // ------------------------------------------------------------
    // Formulario para editar alerta (sin fechas)
    // ------------------------------------------------------------
    async editarAlertaFormulario(id) {
        const alerta = this.obtenerAlertaPorId(id);
        if (!alerta) {
            Swal.fire('Error', 'Alerta no encontrada', 'error');
            return false;
        }

        const result = await Swal.fire({
            title: '✏️ Editar Alerta',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                    <label style="font-size:13px; color:var(--text-secondary);">📝 Mensaje:</label>
                    <textarea id="swal-mensaje" class="swal2-textarea" rows="3">${escapeHtml(alerta.mensaje)}</textarea>
                    <label style="font-size:13px; color:var(--text-secondary);">⏱️ Frecuencia:</label>
                    <select id="swal-frecuencia" class="swal2-input" style="appearance:auto;">
                        <option value="siempre" ${alerta.frecuencia === 'siempre' ? 'selected' : ''}>Siempre</option>
                        <option value="diario" ${alerta.frecuencia === 'diario' ? 'selected' : ''}>Una vez al día</option>
                        <option value="horario" ${alerta.frecuencia === 'horario' ? 'selected' : ''}>Cada X horas</option>
                        <option value="dias" ${alerta.frecuencia === 'dias' ? 'selected' : ''}>Cada X días</option>
                    </select>
                    <div id="campoIntervalo" style="${alerta.frecuencia === 'horario' || alerta.frecuencia === 'dias' ? 'block' : 'none'};">
                        <label style="font-size:13px; color:var(--text-secondary);">Intervalo:</label>
                        <input id="swal-intervalo" class="swal2-input" type="number" min="1" value="${alerta.intervalo || 1}">
                        <span id="intervaloLabel" style="font-size:11px; color:var(--text-muted);">${alerta.frecuencia === 'horario' ? '(horas)' : '(días)'}</span>
                    </div>
                    <label style="font-size:13px; color:var(--text-secondary);">Activa:</label>
                    <input id="swal-activa" type="checkbox" ${alerta.activa ? 'checked' : ''}>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: '💾 Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '500px',
            didOpen: () => {
                const freq = document.getElementById('swal-frecuencia');
                const campoIntervalo = document.getElementById('campoIntervalo');
                const label = document.getElementById('intervaloLabel');
                const intervaloInput = document.getElementById('swal-intervalo');

                const actualizarIntervalo = () => {
                    const val = freq.value;
                    if (val === 'siempre' || val === 'diario') {
                        campoIntervalo.style.display = 'none';
                    } else if (val === 'horario') {
                        campoIntervalo.style.display = 'block';
                        label.textContent = '(horas)';
                        intervaloInput.min = 1;
                    } else if (val === 'dias') {
                        campoIntervalo.style.display = 'block';
                        label.textContent = '(días)';
                        intervaloInput.min = 1;
                    }
                };
                freq.addEventListener('change', actualizarIntervalo);
                actualizarIntervalo();
            },
            preConfirm: () => {
                const mensaje = document.getElementById('swal-mensaje').value.trim();
                if (!mensaje) {
                    Swal.showValidationMessage('El mensaje es obligatorio');
                    return;
                }
                const frecuencia = document.getElementById('swal-frecuencia').value;
                let intervalo = 1;
                if (frecuencia === 'horario' || frecuencia === 'dias') {
                    intervalo = parseInt(document.getElementById('swal-intervalo').value) || 1;
                    if (intervalo < 1) {
                        Swal.showValidationMessage('El intervalo debe ser al menos 1');
                        return;
                    }
                }
                const activa = document.getElementById('swal-activa').checked;
                return { mensaje, frecuencia, intervalo, activa };
            }
        });

        if (result.isConfirmed && result.value) {
            this.actualizarAlerta(id, result.value);
            return true;
        }
        return false;
    }

    // ------------------------------------------------------------
    // Panel de administración
    // ------------------------------------------------------------
    async mostrarPanel() {
        const alertas = this.obtenerAlertas();
        let tablaHtml = `
            <div style="max-height:300px; overflow-y:auto; margin-bottom:12px;">
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <thead>
                        <tr style="background:var(--bg-hover);">
                            <th style="padding:6px; text-align:left;">Mensaje</th>
                            <th style="padding:6px; text-align:center;">Frecuencia</th>
                            <th style="padding:6px; text-align:center;">Activa</th>
                            <th style="padding:6px; text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        if (alertas.length === 0) {
            tablaHtml += `<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No hay alertas</td></tr>`;
        } else {
            for (const a of alertas) {
                let frecuenciaTexto = '';
                if (a.frecuencia === 'siempre') frecuenciaTexto = 'Siempre';
                else if (a.frecuencia === 'diario') frecuenciaTexto = 'Diario';
                else if (a.frecuencia === 'horario') frecuenciaTexto = `Cada ${a.intervalo} hora(s)`;
                else if (a.frecuencia === 'dias') frecuenciaTexto = `Cada ${a.intervalo} día(s)`;
                const activaTexto = a.activa ? '✅' : '❌';
                tablaHtml += `
                    <tr style="border-bottom:1px solid var(--border-color);">
                        <td style="padding:6px;">${escapeHtml(a.mensaje)}</td>
                        <td style="text-align:center;">${frecuenciaTexto}</td>
                        <td style="text-align:center;">${activaTexto}</td>
                        <td style="text-align:center;">
                            <button class="btn-action btn-primary" onclick="window.app?.editarAlerta(${a.id})" style="padding:2px 8px; font-size:11px; margin-right:4px;">✏️</button>
                            <button class="btn-action btn-danger" onclick="window.app?.eliminarAlerta(${a.id})" style="padding:2px 8px; font-size:11px;">🗑️</button>
                        </td>
                    </tr>
                `;
            }
        }
        tablaHtml += `</tbody></table></div>`;

        await Swal.fire({
            title: '📢 Administrar Alertas',
            html: `
                ${tablaHtml}
                <div style="display:flex; gap:8px; margin-top:12px;">
                    <button class="btn-action btn-success" onclick="window.app?.agregarAlerta()" style="flex:1;">➕ Nueva Alerta</button>
                    <button class="btn-action btn-info" onclick="window.app?.mostrarAlertasAhora()" style="flex:1;">🔔 Mostrar ahora</button>
                </div>
            `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '700px'
        });
    }
}