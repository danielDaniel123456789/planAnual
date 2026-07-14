// ============================================================
// PlanManager.js - Gestión del plan (con editor WYSIWYG Quill)
// ============================================================

class PlanManager {
    constructor(app) {
        this.app = app;
        this.quillInstance = null;
    }

    // ------------------------------------------------------------
    // Renderizado principal
    // ------------------------------------------------------------
    async renderPlan(container) {
        const enlaces = this.app.plan.enlaces || [];
        const contenidos = this.app.plan.contenidos || [];

        const planAnual = enlaces.filter(e => e.tipo === 'plan_anual');
        const planPedagogico = enlaces.filter(e => e.tipo === 'plan_pedagogico');
        const otros = enlaces.filter(e => e.tipo === 'otro');

        let html = `
            <div class="works-header">
                <h2><i class="fas fa-calendar-alt" style="color:#94e2d5;"></i> Plan 
                    <span class="count">(${enlaces.length + contenidos.length} items)</span>
                </h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-info" onclick="window.app?.addEnlacePlan()">
                        <i class="fas fa-link"></i> Agregar Enlace
                    </button>
                    <button class="btn-action btn-primary" onclick="window.app?.addContenidoPlan()">
                        <i class="fas fa-plus"></i> Agregar Contenido
                    </button>
                </div>
            </div>

            <!-- Enlaces -->
            <div style="margin-bottom:24px; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); padding:12px 16px;">
                <h3 style="margin:0 0 8px 0; font-size:14px; color:var(--text-secondary);">
                    <i class="fas fa-link" style="color:#94e2d5;"></i> Enlaces
                </h3>
                <div style="display:flex; flex-wrap:wrap; gap:12px;">
                    ${this.renderEnlaces(planAnual, '📅 Plan Anual')}
                    ${this.renderEnlaces(planPedagogico, '📘 Plan Pedagógico')}
                    ${this.renderEnlaces(otros, '📎 Otros Enlaces')}
                </div>
            </div>

            <!-- Contenido -->
            <div style="background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color); padding:12px 16px;">
                <h3 style="margin:0 0 8px 0; font-size:14px; color:var(--text-secondary);">
                    <i class="fas fa-file-alt" style="color:#f9e2af;"></i> Contenido
                </h3>
                ${this.renderContenidoLista(contenidos)}
            </div>
        `;

        container.innerHTML = html;
    }

    // ------------------------------------------------------------
    // Enlaces (sin URL visible)
    // ------------------------------------------------------------
    renderEnlaces(enlaces, titulo) {
        if (enlaces.length === 0) {
            return `
                <div style="font-size:12px; color:var(--text-muted); padding:4px 0;">
                    <span style="background:var(--bg-hover); padding:4px 12px; border-radius:12px;">
                        ${titulo}: <em>Sin enlaces</em>
                    </span>
                </div>
            `;
        }

        let html = '';
        for (const enlace of enlaces) {
            html += `
                <div style="display:flex; align-items:center; gap:8px; background:var(--bg-hover); padding:4px 12px 4px 16px; border-radius:20px; border:1px solid var(--border-color);">
                    <span style="font-weight:500; font-size:13px; color:var(--text-primary);">
                        ${escapeHtml(enlace.nombre)}
                    </span>
                    <button class="btn-action btn-info" 
                            onclick="window.open('${escapeHtml(enlace.url)}', '_blank')" 
                            style="padding:2px 12px; font-size:11px; border-radius:12px;"
                            title="Abrir enlace en nueva pestaña">
                        <i class="fas fa-external-link-alt"></i> Abrir
                    </button>
                    <button onclick="window.app?.deleteEnlacePlan(${enlace.id})" 
                            style="background:transparent; border:none; color:#f38ba8; cursor:pointer; padding:2px 4px; font-size:13px;"
                            title="Eliminar enlace">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        return html;
    }

    // ------------------------------------------------------------
    // Contenido: lista plana (sin agrupar por periodo)
    // ------------------------------------------------------------
    renderContenidoLista(contenidos) {
        if (contenidos.length === 0) {
            return `
                <div style="padding:20px; text-align:center; color:var(--text-muted);">
                    <i class="fas fa-plus-circle"></i> No hay contenido agregado
                </div>
            `;
        }

        const sorted = [...contenidos].sort((a, b) => {
            const dateA = a.fechaCreacion || a.timestamp || a.fecha || '';
            const dateB = b.fechaCreacion || b.timestamp || b.fecha || '';
            return dateB.localeCompare(dateA);
        });

        let html = '<div style="display:flex; flex-direction:column; gap:12px;">';
        for (const item of sorted) {
            const contenidoHTML = item.contenido || '';
            html += `
                <div style="background:var(--bg-hover); border-radius:8px; padding:12px 16px; border-left:4px solid #f9e2af;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:8px;">
                        <div style="flex:1;">
                            <div style="font-weight:600; font-size:15px; color:var(--text-primary);">
                                ${escapeHtml(item.titulo)}
                            </div>
                            <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                                <i class="fas fa-calendar-alt"></i> ${item.fecha || 'Sin fecha'}
                            </div>
                            <div style="margin-top:8px; font-size:13px; color:var(--text-secondary); background:var(--bg-card); padding:8px; border-radius:4px; word-wrap:break-word; max-height:300px; overflow-y:auto;">
                                ${contenidoHTML}
                            </div>
                        </div>
                        <div style="display:flex; gap:4px; flex-shrink:0;">
                            <button class="btn-action btn-primary" onclick="window.app?.editarContenidoPlan(${item.id})" 
                                    style="padding:4px 10px; font-size:12px;">
                                <i class="fas fa-pencil-alt"></i> Editar
                            </button>
                            <button class="btn-action btn-danger" onclick="window.app?.deleteContenidoPlan(${item.id})" 
                                    style="padding:4px 10px; font-size:12px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        html += '</div>';
        return html;
    }

    // ------------------------------------------------------------
    // CRUD de enlaces
    // ------------------------------------------------------------
    async addEnlacePlan() {
        const result = await this.app.ui.showFormularioPlan();
        if (result.isConfirmed && result.value) {
            await this.app.plan.addEnlace({ 
                nombre: result.value.nombre, 
                url: result.value.url, 
                tipo: result.value.tipo 
            });
            await this.app.render();
            this.app.ui.showSuccess('Enlace agregado al plan');
        }
    }

    async deleteEnlacePlan(id) {
        const enlace = this.app.plan.enlaces.find(e => e.id === id);
        if (!enlace) return;
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el enlace "${enlace.nombre}"?`);
        if (confirm.isConfirmed) { 
            await this.app.plan.deleteEnlace(id);
            await this.app.render();
            this.app.ui.showSuccess('Enlace eliminado'); 
        }
    }

    // ------------------------------------------------------------
    // CRUD de contenido (sin periodo)
    // ------------------------------------------------------------
    async addContenidoPlan() {
        await this.cargarQuill();

        const result = await Swal.fire({
            title: 'Agregar Contenido al Plan',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left; height:100%;">
                    <label style="font-size:13px; color:var(--text-secondary);">Título</label>
                    <input id="swal-titulo" class="swal2-input" placeholder="Ej. Semana 1 - Introducción">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">Contenido (con formato)</label>
                    <div id="quill-editor-container" style="flex:1; min-height:400px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-card);"></div>
                    <div style="font-size:11px; color:var(--text-muted); margin-top:4px;">
                        <i class="fas fa-info-circle"></i> Puedes usar negrita, listas, colores, tablas y más.
                    </div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '90%',
            customClass: {
                popup: 'swal2-popup-fullscreen'
            },
            didOpen: () => {
                const popup = Swal.getPopup();
                if (popup) {
                    popup.style.maxHeight = '90vh';
                    popup.style.height = 'auto';
                    popup.style.display = 'flex';
                    popup.style.flexDirection = 'column';
                    // Ajustar el contenedor HTML
                    const htmlContainer = popup.querySelector('.swal2-html-container');
                    if (htmlContainer) {
                        htmlContainer.style.flex = '1';
                        htmlContainer.style.overflow = 'auto';
                        htmlContainer.style.padding = '0 20px 20px 20px';
                    }
                }
                const container = document.getElementById('quill-editor-container');
                if (container) {
                    container.style.flex = '1';
                    container.style.minHeight = '400px';
                    this.quillInstance = this.inicializarQuill(container, '');
                }
            },
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value.trim();
                const contenido = this.quillInstance ? this.quillInstance.root.innerHTML : '';

                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return; }
                if (!contenido || contenido === '<p><br></p>') {
                    Swal.showValidationMessage('El contenido no puede estar vacío');
                    return;
                }
                return { titulo, contenido };
            }
        });

        if (result.isConfirmed && result.value) {
            await this.app.plan.addContenido({ 
                titulo: result.value.titulo, 
                periodo: 'general',
                contenido: result.value.contenido 
            });
            await this.app.render();
            this.app.ui.showSuccess('Contenido agregado al plan');
        }
        this.quillInstance = null;
    }

    async editarContenidoPlan(id) {
        const item = this.app.plan.contenidos.find(c => c.id === id);
        if (!item) return;

        await this.cargarQuill();

        const result = await Swal.fire({
            title: 'Editar Contenido',
            html: `
                <div style="display:flex; flex-direction:column; gap:8px; text-align:left; height:100%;">
                    <label style="font-size:13px; color:var(--text-secondary);">Título</label>
                    <input id="swal-titulo" class="swal2-input" value="${escapeHtml(item.titulo)}">
                    
                    <label style="font-size:13px; color:var(--text-secondary);">Contenido (con formato)</label>
                    <div id="quill-editor-container" style="flex:1; min-height:400px; border-radius:4px; border:1px solid var(--border-color); background:var(--bg-card);"></div>
                </div>
            `,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            width: '90%',
            customClass: {
                popup: 'swal2-popup-fullscreen'
            },
            didOpen: () => {
                const popup = Swal.getPopup();
                if (popup) {
                    popup.style.maxHeight = '90vh';
                    popup.style.height = 'auto';
                    popup.style.display = 'flex';
                    popup.style.flexDirection = 'column';
                    const htmlContainer = popup.querySelector('.swal2-html-container');
                    if (htmlContainer) {
                        htmlContainer.style.flex = '1';
                        htmlContainer.style.overflow = 'auto';
                        htmlContainer.style.padding = '0 20px 20px 20px';
                    }
                }
                const container = document.getElementById('quill-editor-container');
                if (container) {
                    container.style.flex = '1';
                    container.style.minHeight = '400px';
                    // Usar setTimeout para asegurar que el DOM esté listo
                    setTimeout(() => {
                        this.quillInstance = this.inicializarQuill(container, item.contenido || '');
                    }, 50);
                }
            },
            preConfirm: () => {
                const titulo = document.getElementById('swal-titulo').value.trim();
                const contenido = this.quillInstance ? this.quillInstance.root.innerHTML : '';

                if (!titulo) { Swal.showValidationMessage('El título es obligatorio'); return; }
                if (!contenido || contenido === '<p><br></p>') {
                    Swal.showValidationMessage('El contenido no puede estar vacío');
                    return;
                }
                return { titulo, contenido };
            }
        });

        if (result.isConfirmed && result.value) {
            await this.app.plan.updateContenido(id, {
                titulo: result.value.titulo,
                contenido: result.value.contenido
            });
            await this.app.render();
            this.app.ui.showSuccess('Contenido actualizado');
        }
        this.quillInstance = null;
    }

    async deleteContenidoPlan(id) {
        const item = this.app.plan.contenidos.find(c => c.id === id);
        if (!item) return;
        const confirm = await this.app.ui.showConfirm(`¿Eliminar el contenido "${item.titulo}"?`);
        if (confirm.isConfirmed) { 
            await this.app.plan.deleteContenido(id);
            await this.app.render();
            this.app.ui.showSuccess('Contenido eliminado'); 
        }
    }

    // ------------------------------------------------------------
    // Inicializar Quill con tema oscuro
    // ------------------------------------------------------------
    inicializarQuill(container, contenidoInicial) {
        const quill = new Quill(container, {
            theme: 'snow',
            placeholder: 'Escribe el contenido con formato...',
            modules: {
                toolbar: [
                    ['bold', 'italic', 'underline', 'strike'],
                    ['blockquote', 'code-block'],
                    [{ 'header': 1 }, { 'header': 2 }],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    [{ 'script': 'sub' }, { 'script': 'super' }],
                    [{ 'indent': '-1' }, { 'indent': '+1' }],
                    [{ 'direction': 'rtl' }],
                    [{ 'size': ['small', false, 'large', 'huge'] }],
                    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                    [{ 'color': [] }, { 'background': [] }],
                    [{ 'font': [] }],
                    [{ 'align': [] }],
                    ['clean'],
                    ['link', 'image', 'video']
                ]
            }
        });

        if (contenidoInicial) {
            quill.root.innerHTML = contenidoInicial;
        }

        this.aplicarTemaOscuro(quill);
        return quill;
    }

    // ------------------------------------------------------------
    // Aplicar estilos oscuros a Quill
    // ------------------------------------------------------------
    aplicarTemaOscuro(quill) {
        const editor = quill.root;
        const toolbar = quill.getModule('toolbar').container;

        if (editor) {
            editor.style.color = 'var(--text-primary)';
            editor.style.background = 'var(--bg-card)';
            editor.style.fontSize = '14px';
            editor.style.lineHeight = '1.6';
        }

        if (toolbar) {
            toolbar.style.background = 'var(--bg-hover)';
            toolbar.style.border = '1px solid var(--border-color)';
            toolbar.style.borderRadius = '4px 4px 0 0';
            toolbar.style.padding = '4px';
            const buttons = toolbar.querySelectorAll('button, .ql-picker-label, .ql-picker-item');
            buttons.forEach(btn => {
                btn.style.color = 'var(--text-primary)';
                btn.style.fill = 'var(--text-primary)';
            });
            const pickers = toolbar.querySelectorAll('.ql-picker');
            pickers.forEach(picker => {
                picker.style.color = 'var(--text-primary)';
            });
            const svgs = toolbar.querySelectorAll('svg');
            svgs.forEach(svg => {
                svg.style.fill = 'var(--text-primary)';
            });
        }

        const container = editor.parentElement;
        if (container) {
            container.style.background = 'var(--bg-card)';
            container.style.border = '1px solid var(--border-color)';
            container.style.borderRadius = '0 0 4px 4px';
        }
    }

    // ------------------------------------------------------------
    // Carga dinámica de Quill (CSS + JS)
    // ------------------------------------------------------------
    cargarQuill() {
        return new Promise((resolve, reject) => {
            if (typeof Quill !== 'undefined') {
                resolve();
                return;
            }

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://cdn.quilljs.com/1.3.7/quill.snow.css';
            document.head.appendChild(link);

            const script = document.createElement('script');
            script.src = 'https://cdn.quilljs.com/1.3.7/quill.min.js';
            script.onload = () => {
                resolve();
            };
            script.onerror = () => {
                reject(new Error('Error al cargar Quill desde CDN'));
            };
            document.head.appendChild(script);
        });
    }
}