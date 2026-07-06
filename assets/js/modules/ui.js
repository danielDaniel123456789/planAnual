     class UI {
            async showToast(message, type, timer) {
                timer = timer || 1500;
                return Swal.fire({
                    icon: type || 'success',
                    title: message,
                    timer: timer,
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                });
            }
            async showConfirm(message, title) {
                return Swal.fire({
                    title: title || 'Confirmar',
                    text: message,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonText: 'Sí, confirmar',
                    cancelButtonText: 'Cancelar',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                });
            }
            async showPrompt(title, inputType, defaultValue, placeholder) {
                return Swal.fire({
                    title: title,
                    input: inputType || 'text',
                    inputValue: defaultValue || '',
                    inputPlaceholder: placeholder || '',
                    showCancelButton: true,
                    confirmButtonText: 'Aceptar',
                    cancelButtonText: 'Cancelar',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)'
                });
            }
            async showTextarea(title, defaultValue, placeholder) {
                return Swal.fire({
                    title: title,
                    input: 'textarea',
                    inputValue: defaultValue || '',
                    inputPlaceholder: placeholder || '',
                    showCancelButton: true,
                    confirmButtonText: 'Guardar',
                    cancelButtonText: 'Cancelar',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    inputAttributes: { 'aria-label': 'Escribe el contenido aquí' }
                });
            }
            async showFormularioPlan() {
                return Swal.fire({
                    title: 'Agregar Enlace al Plan',
                    html: `
                        <div style="display:flex; flex-direction:column; gap:8px; text-align:left;">
                            <label style="font-size:13px; color:var(--text-secondary);">Nombre del enlace</label>
                            <input id="swal-nombre" class="swal2-input" placeholder="Ej. Plan Anual">
                            <label style="font-size:13px; color:var(--text-secondary);">URL del enlace</label>
                            <input id="swal-url" class="swal2-input" placeholder="https://ejemplo.com/plan">
                            <label style="font-size:13px; color:var(--text-secondary);">Tipo de plan</label>
                            <select id="swal-tipo" class="swal2-input" style="appearance:auto;">
                                <option value="plan_anual">Plan Anual</option>
                                <option value="plan_pedagogico">Plan Pedagógico</option>
                                <option value="otro">Otro</option>
                            </select>
                        </div>
                    `,
                    showCancelButton: true,
                    confirmButtonText: 'Agregar',
                    cancelButtonText: 'Cancelar',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    preConfirm: () => {
                        const nombre = document.getElementById('swal-nombre').value;
                        const url = document.getElementById('swal-url').value;
                        const tipo = document.getElementById('swal-tipo').value;
                        if (!nombre) { Swal.showValidationMessage('El nombre es obligatorio'); return; }
                        if (!url) { Swal.showValidationMessage('La URL es obligatoria'); return; }
                        return { nombre, url, tipo };
                    }
                });
            }
            async showInputNumber(title, defaultValue, placeholder, min, max) {
                return Swal.fire({
                    title: title,
                    input: 'number',
                    inputValue: defaultValue !== null ? String(defaultValue) : '',
                    inputPlaceholder: placeholder || '0-100',
                    showCancelButton: true,
                    confirmButtonText: 'Guardar',
                    cancelButtonText: 'Cancelar',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    inputAttributes: { min: min !== undefined ? String(min) : '0', max: max !== undefined ? String(max) : '100', step: '1' },
                    preConfirm: (value) => {
                        const num = parseFloat(value);
                        if (isNaN(num)) { Swal.showValidationMessage('Ingresa un número válido'); return; }
                        if (num < (min || 0) || num > (max || 100)) {
                            Swal.showValidationMessage(`El valor debe estar entre ${min || 0} y ${max || 100}`);
                            return;
                        }
                        return num;
                    }
                });
            }
            showSuccess(message) { this.showToast(message, 'success'); }
            showError(message) { this.showToast(message, 'error'); }
            showInfo(message) { this.showToast(message, 'info'); }
        }
        var ui = new UI();