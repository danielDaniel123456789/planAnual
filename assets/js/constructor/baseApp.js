// ============================================================
// BaseApp.js - Configuración y núcleo de la aplicación
// ============================================================

// Verificar si BaseApp ya está definida para evitar duplicados
if (typeof BaseApp === 'undefined') {

// *** PROTECCIÓN: si Attendance no está definida, crear una dummy ***
if (typeof Attendance === 'undefined') {
    console.warn('⚠️ Attendance no está definida. Creando implementación dummy para evitar errores.');
    window.Attendance = class Attendance {
        constructor(db) {
            this.db = db;
            this.data = {};
            this.detailed = {};
            this.currentSectionId = null;
        }
        async load(sectionId) {
            console.warn('⚠️ [Attendance dummy] load', sectionId);
            this.currentSectionId = sectionId;
            return {};
        }
        async saveDetailed(sectionId, studentId, data) {
            console.warn('⚠️ [Attendance dummy] saveDetailed', sectionId, studentId, data);
            return;
        }
        async getStudentData(studentId) {
            return { ausencias: 0, justificadas: 0, injustificadas: 0, tardias: 0 };
        }
        async calculatePercentage(studentId) {
            return 0;
        }
        async markAllPresent(seccionId, fecha, lecciones) {
            console.warn('⚠️ [Attendance dummy] markAllPresent');
            return;
        }
        async getPorcentajeAsignado(sectionId) {
            return 10;
        }
        async getTotalClases(sectionId) {
            return 0;
        }
        async cambiarEstado(seccionId, fecha, estudianteId, nuevoEstado, lecciones) {
            console.warn('⚠️ [Attendance dummy] cambiarEstado');
            return;
        }
        async calcularPorcentajeAsistencia(seccionId, estudianteId, configuracion) {
            return 100;
        }
        async saveDaily(sectionId, fecha, studentId, estado) {
            console.warn('⚠️ [Attendance dummy] saveDaily');
            return;
        }
        async getDaily(sectionId, fecha) {
            return {};
        }
        async getAllBySection(sectionId) {
            return [];
        }
        async getDates(sectionId) {
            return [];
        }
        async getStudentHistory(sectionId, studentId) {
            return [];
        }
        async deleteDaily(sectionId, fecha, studentId) {
            console.warn('⚠️ [Attendance dummy] deleteDaily');
            return;
        }
    };
}

class BaseApp {
    constructor() {
        this.db = db;
        this.config = config;
        this.ui = ui;
        this.sections = sections;
        this.students = students;
        this.grades = grades;
        this.plan = plan;
        this.currentSectionId = null;
        this.currentCategory = null;
        this.currentWork = null;
        this.currentWorkType = null;
        this.guardandoNotas = {};
        this._gruposExpandidos = {};
        this._categoriaSeleccionada = null;
        this._seleccionGrupal = {};
        this.sidebarView = new Sidebar(this);
        this.workItemsView = new WorkItems(this);

        // *** Instancia de Attendance (se creará bajo demanda) ***
        this._attendance = null;

        // Managers (se inicializan en la clase hija)
        this.studentManager = null;
        this.planManager = null;
        this.finalGradesManager = null;
        this.machoteManager = null;
        this.bitacoraManager = null;
        this.rubrosManager = null;
        // AsistenciaManager necesita this.app.attendance
        this.asistenciaManager = new AsistenciaManager(this);
    }

    // *** GETTER LAZY con protección ***
    get attendance() {
        if (!this._attendance) {
            // Attendance ya debería estar definida (por la dummy o por el script real)
            try {
                this._attendance = new Attendance(this.db);
                console.log('✅ Attendance instanciado correctamente');
            } catch (e) {
                console.error('❌ Error al instanciar Attendance:', e);
                // Fallback extremo: crear un objeto con métodos vacíos
                this._attendance = {
                    load: async () => {},
                    saveDetailed: async () => {},
                    getStudentData: async () => ({ ausencias: 0, justificadas: 0, injustificadas: 0, tardias: 0 }),
                    calculatePercentage: async () => 0,
                    markAllPresent: async () => {},
                    getPorcentajeAsignado: async () => 10,
                    getTotalClases: async () => 0,
                    cambiarEstado: async () => {},
                    calcularPorcentajeAsistencia: async () => 100,
                    saveDaily: async () => {},
                    getDaily: async () => ({}),
                    getAllBySection: async () => [],
                    getDates: async () => [],
                    getStudentHistory: async () => [],
                    deleteDaily: async () => {}
                };
                console.warn('⚠️ Se usará un objeto dummy para Attendance');
            }
        }
        return this._attendance;
    }

    async init() {
        console.log(' Iniciando App...');
        await this.db.init();
        this.config.load();
        this.applyTheme();
        // Forzar la creación de attendance (para asegurar que esté disponible)
        try {
            this.attendance; // llama al getter
        } catch(e) {
            console.warn('⚠️ Attendance no disponible al iniciar:', e);
        }
        await this.loadData();
        this.setupEvents();
        await this.render();
        console.log('✅ App lista!');
    }

    applyTheme() {
        const tema = this.config.get('tema');
        document.body.setAttribute('data-theme', tema === 'teams' ? 'light' : 'dark');
    }

    async loadData() {
        await this.sections.load();
        if (this.sections.currentId) {
            this.currentSectionId = this.sections.currentId;
            await this.loadSectionData(this.currentSectionId);
        }
    }

    async loadSectionData(sectionId) {
        this.currentSectionId = sectionId;
        await this.students.load(sectionId);
        await this.grades.loadWorks(sectionId);
        await this.plan.load(sectionId);
        // Usamos el getter attendance (ya sea real o dummy)
        await this.attendance.load(sectionId);
    }

    setupEvents() {
        document.getElementById('themeToggle')?.addEventListener('click', () => { this.toggleTheme(); });
        document.getElementById('addSectionBtn')?.addEventListener('click', () => { this.createNewSection(); });
        document.getElementById('sectionSelect')?.addEventListener('change', (e) => {
            const id = parseInt(e.target.value);
            if (id) this.onSectionClick(id);
        });
        document.getElementById('btnAddRapido')?.addEventListener('click', () => { this.showAddRapido(); });
    }

    // ============================================================
    // RENDER PRINCIPAL
    // ============================================================
    async render() {
        this.sidebarView.render(this.sections.list, this.currentSectionId);

        const current = this.sections.getCurrent();

        const sectionNameSpan = document.getElementById('currentSectionName');
        if (sectionNameSpan) {
            if (current) {
                sectionNameSpan.textContent = current.nombre;
            } else {
                sectionNameSpan.textContent = 'Selecciona una sección';
            }
        }

        const editarBtnContainer = document.getElementById('editarSeccionBtn');
        if (editarBtnContainer) {
            if (current) {
                editarBtnContainer.innerHTML = `
                    <button class="btn-action btn-primary" onclick="window.app?.editarNombreSeccion()" 
                        style="padding:4px 10px; font-size:12px; background:rgba(137,180,250,0.15); color:#89b4fa; border:1px solid rgba(137,180,250,0.3); border-radius:4px; cursor:pointer; margin-right:6px;">
                        <i class="fas fa-pencil-alt" style="font-size:11px;"></i> Editar
                    </button>
                    
                    <button class="btn-action btn-danger" onclick="window.app?.eliminarSeccion()" 
                        style="padding:4px 10px; font-size:12px; background:rgba(243,139,168,0.15); color:#f38ba8; border:1px solid rgba(243,139,168,0.3); border-radius:4px; cursor:pointer;">
                        <i class="fas fa-trash" style="font-size:11px;"></i> Eliminar
                    </button>
                    
                    <button class="btn-action" onclick="window.app.showSectionMenu()"
                        style="padding:4px 8px; font-size:18px; background:transparent; border:none; color:var(--text-secondary); cursor:pointer; margin-left:4px;">
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                `;
            } else {
                editarBtnContainer.innerHTML = '';
            }
        }

        const headerActions = document.querySelector('.header-actions');
        if (headerActions) {
            headerActions.innerHTML = '';
        }

        this.updateStats();
        await this.renderContent();
    }

    // ============================================================
    // RENDER DE CONTENIDO
    // ============================================================
    async renderContent() {
    const container = document.getElementById('mainContent');
    if (!this.currentSectionId) {
        container.innerHTML = this.getEmptySectionHTML();
        return;
    }

    // --- Categoría: Asistencia ---
    if (this.currentCategory === 'asistencia') {
        if (this.asistenciaManager && typeof this.asistenciaManager.renderAsistencia === 'function') {
            await this.asistenciaManager.renderAsistencia(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Asistencia no disponible</p></div>`;
        }
        return;
    }

    // --- Categoría: Bitácora ---
    if (this.currentCategory === 'bitacora') {
        if (this.bitacoraManager && typeof this.bitacoraManager.renderBitacora === 'function') {
            await this.bitacoraManager.renderBitacora(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Bitácora no disponible</p></div>`;
        }
        return;
    }

    // --- NUEVA CATEGORÍA: REGLAS (rule) ---
    if (this.currentCategory === 'rule') {
        if (this.ruleManager && typeof this.ruleManager.renderRule === 'function') {
            await this.ruleManager.renderRule(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Reglas no disponible</p></div>`;
        }
        return;
    }

    // --- Vista por defecto si no hay categoría seleccionada ---
    if (!this.currentCategory) {
        container.innerHTML = this.getDefaultViewHTML();
        return;
    }

    // --- Categoría: Estudiantes ---
    if (this.currentCategory === 'estudiantes') {
        if (this.studentManager && typeof this.studentManager.renderStudents === 'function') {
            await this.studentManager.renderStudents(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Estudiantes no disponible</p></div>`;
        }
        return;
    }

    // --- Categoría: Notas Finales ---
    if (this.currentCategory === 'notas_finales') {
        if (this.finalGradesManager && typeof this.finalGradesManager.renderFinalGrades === 'function') {
            await this.finalGradesManager.renderFinalGrades(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Notas Finales no disponible</p></div>`;
        }
        return;
    }

    // --- Categoría: Plan ---
    if (this.currentCategory === 'plan') {
        if (this.planManager && typeof this.planManager.renderPlan === 'function') {
            await this.planManager.renderPlan(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Plan no disponible</p></div>`;
        }
        return;
    }

    // --- Categoría: Machote ---
    if (this.currentCategory === 'machote') {
        if (this.machoteManager && typeof this.machoteManager.renderMachotes === 'function') {
            await this.machoteManager.renderMachotes(container);
        } else {
            container.innerHTML = `<div class="empty-state"><p>Módulo de Machotes no disponible</p></div>`;
        }
        return;
    }

    // --- Categoría: Rubro ---
    if (this.currentCategory === 'rubro') {
        if (this.rubrosManager && typeof this.rubrosManager.renderRubros === 'function') {
            await this.rubrosManager.renderRubros(container);
        } else {
            await this.renderRubrosFallback(container);
        }
        return;
    }

    // Si no coincide con ninguna categoría especial, usar WorkItems (para cotidiano, tarea, examen, proyecto, etc.)
    await this.workItemsView.render(container, this.currentCategory);
}

    // ============================================================
    // MENÚ DE SECCIÓN
    // ============================================================
    async showSectionMenu() {
        const result = await Swal.fire({
            title: 'Opciones de sección',
            text: `¿Qué deseas hacer con "${this.sections.getCurrent()?.nombre || 'esta sección'}"?`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: '✏️ Editar nombre',
            cancelButtonText: '🗑️ Eliminar sección',
            showCloseButton: true,
            background: 'var(--bg-card)',
            color: 'var(--text-primary)',
            reverseButtons: true
        });

        if (result.isConfirmed) {
            await this.editarNombreSeccion();
        } else if (result.dismiss === Swal.DismissReason.cancel) {
            await this.eliminarSeccion();
        }
    }

    // ============================================================
    // EDITAR NOMBRE DE SECCIÓN
    // ============================================================
    async editarNombreSeccion() {
        const current = this.sections.getCurrent();
        if (!current) {
            this.ui.showError('No hay sección seleccionada');
            return;
        }
        const result = await this.ui.showPrompt('Nuevo nombre de la sección:', 'text', current.nombre);
        if (result.isConfirmed && result.value) {
            const nombre = result.value.trim();
            if (nombre) {
                await this.sections.update(current.id, nombre);
                await this.sections.load();
                await this.render();
                this.ui.showSuccess('Nombre actualizado');
            }
        }
    }

    // ============================================================
    // ELIMINAR SECCIÓN COMPLETA
    // ============================================================
    async eliminarSeccion() {
        const current = this.sections.getCurrent();
        if (!current) {
            this.ui.showError('No hay sección seleccionada');
            return;
        }

        const confirm = await this.ui.showConfirm(
            `¿Eliminar la sección "${current.nombre}"? Se perderán TODOS los datos asociados.`
        );

        if (!confirm.isConfirmed) return;

        const sectionId = current.id;

        try {
            const deleteBySection = async (storeName, keyName = 'seccionId') => {
                const all = await this.db.getAll(storeName);
                for (const item of all) {
                    if (item[keyName] === sectionId) {
                        const pk = Array.isArray(this.db.db.transaction(storeName).objectStore(storeName).keyPath)
                            ? item[this.db.db.transaction(storeName).objectStore(storeName).keyPath]
                            : item.id;
                        await this.db.delete(storeName, pk);
                    }
                }
            };

            await deleteBySection(STORES.ESTUDIANTES);

            const tiposTrabajo = ['cotidiano', 'tarea', 'examen', 'proyecto', 'rubro'];
            const storeMap = {
                cotidiano: STORES.TRABAJOS_COTIDIANO,
                tarea: STORES.TRABAJOS_TAREA,
                examen: STORES.EXAMENES,
                proyecto: STORES.PROYECTOS,
                rubro: STORES.TRABAJOS_RUBRO
            };
            for (const tipo of tiposTrabajo) {
                await deleteBySection(storeMap[tipo]);
            }

            await deleteBySection(STORES.PLAN_ENLACES);
            await deleteBySection(STORES.PLAN_CONTENIDO);
            await deleteBySection(STORES.BITACORA);
            await deleteBySection(STORES.ASISTENCIA);
            await deleteBySection(STORES.ASISTENCIA_DETALLADA, 'seccionId');
            await deleteBySection(STORES.PORCENTAJES, 'seccionId');
            await deleteBySection(STORES.HORARIOS, 'seccionId');
            await deleteBySection(STORES.EVALUACIONES, 'seccionId');

            const allCalif = await this.db.getAll(STORES.CALIFICACIONES);
            for (const calif of allCalif) {
                if (calif.seccionId === sectionId) {
                    await this.db.delete(STORES.CALIFICACIONES, [
                        calif.seccionId,
                        calif.estudianteId,
                        calif.trabajoId,
                        calif.tipoTrabajo
                    ]);
                }
            }

            await this.sections.delete(sectionId);
            await this.sections.load();

            if (this.sections.list.length === 0) {
                await this.sections.create('Sección Principal');
                await this.sections.load();
            }

            this.currentSectionId = this.sections.currentId;
            await this.loadSectionData(this.currentSectionId);
            this.currentCategory = null;
            await this.render();

            this.ui.showSuccess('Sección eliminada correctamente');
        } catch (error) {
            console.error('Error al eliminar sección:', error);
            this.ui.showError('Ocurrió un error al eliminar la sección. Revisa la consola.');
        }
    }

    // ============================================================
    // FALLBACK PARA RUBROS
    // ============================================================
    async renderRubrosFallback(container) {
        console.log('📊 Usando renderRubrosFallback');
        const rubros = this.grades.works['rubro'] || [];

        let html = `
            <div class="works-header">
                <h2><i class="fas fa-percent" style="color:#f9e2af;"></i> Rubros <span class="count">(${rubros.length})</span></h2>
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                    <button class="btn-action btn-primary" onclick="window.app?.addRubro()">
                        <i class="fas fa-plus"></i> Agregar Rubro
                    </button>
                    <button class="btn-action btn-info" onclick="window.app?.importarRubros()">
                        <i class="fas fa-file-import"></i> Importar
                    </button>
                </div>
            </div>`;

        if (rubros.length === 0) {
            html += `
                <div class="empty-state">
                    <i class="fas fa-percent" style="font-size:48px; color:#f9e2af; opacity:0.3;"></i>
                    <p>No hay rubros creados</p>
                    <p style="font-size:13px; color:var(--text-muted);">Los rubros definen los porcentajes de evaluación</p>
                    <button class="btn-action btn-primary" onclick="window.app?.addRubro()">
                        <i class="fas fa-plus"></i> Crear primer rubro
                    </button>
                </div>`;
            container.innerHTML = html;
            return;
        }

        let totalPorcentaje = 0;
        for (const rubro of rubros) {
            totalPorcentaje += (rubro.porcentaje || 0);
        }

        html += `
            <div style="overflow-x:auto; background:var(--bg-card); border-radius:var(--radius); border:1px solid var(--border-color);">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Nombre</th>
                            <th>Porcentaje (%)</th>
                            <th>Fecha</th>
                            <th style="text-align:center;">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>`;

        for (let i = 0; i < rubros.length; i++) {
            const rubro = rubros[i];
            html += `
                <tr>
                    <td>${i + 1}</td>
                    <td style="font-weight:500; color:var(--text-primary);">
                        <i class="fas fa-percent" style="color:#f9e2af; margin-right:8px;"></i>
                        ${escapeHtml(rubro.nombre)}
                    </td>
                    <td>
                        <span style="background:rgba(249,226,175,0.15); color:#f9e2af; padding:2px 12px; border-radius:12px; font-weight:600;">
                            ${rubro.porcentaje || 0}%
                        </span>
                    </td>
                    <td style="font-size:12px; color:var(--text-muted);">
                        ${rubro.fecha || 'Sin fecha'}
                    </td>
                    <td style="text-align:center;">
                        <button class="btn-action btn-primary" onclick="window.app?.editarRubro(${rubro.id})"
                            style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-action btn-danger" onclick="window.app?.deleteRubro(${rubro.id})"
                            style="padding:4px 8px; font-size:12px;">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>`;
        }

        const totalColor = totalPorcentaje === 100 ? '#a6e3a1' : totalPorcentaje > 100 ? '#f38ba8' : '#f9e2af';
        html += `
                    </tbody>
                    <tfoot>
                        <tr style="border-top:2px solid var(--border-color); font-weight:bold;">
                            <td colspan="2" style="text-align:right; color:var(--text-secondary);">TOTAL:</td>
                            <td>
                                <span style="background:rgba(249,226,175,0.25); color:${totalColor}; padding:2px 12px; border-radius:12px; font-weight:700;">
                                    ${totalPorcentaje}%
                                    ${totalPorcentaje === 100 ? ' ✅' : totalPorcentaje > 100 ? ' ⚠️ Excede 100%' : ' ⚠️ Faltante'}
                                </span>
                            </td>
                            <td colspan="2"></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
            <div style="margin-top:12px; padding:12px; background:var(--bg-card); border-radius:8px; border:1px solid var(--border-color);">
                <div style="display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--text-muted);">
                    <span><i class="fas fa-info-circle" style="color:#f9e2af;"></i> Los rubros definen los porcentajes de evaluación</span>
                    <span><i class="fas fa-calculator"></i> El total debe sumar <strong>100%</strong></span>
                </div>
            </div>`;

        container.innerHTML = html;
    }

    // ============================================================
    // VISTAS POR DEFECTO
    // ============================================================
    getEmptySectionHTML() {
        return `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-secondary);">
                <div style="text-align:center;">
                    <i class="fas fa-folder-open" style="font-size:48px; margin-bottom:16px; opacity:0.3;"></i>
                    <p style="font-size:16px;">Selecciona una sección para comenzar</p>
                    <p style="font-size:13px; color:var(--text-muted); margin-top:8px;">Usa el selector de secciones en el menú lateral</p>
                </div>
            </div>`;
    }

    getDefaultViewHTML() {
        const stats = this.getStats();
        return `
            <div class="stats-grid">
                <div class="stat-card"><i class="fas fa-users" style="color:#89b4fa;"></i>
                    <h3>${stats.estudiantes}</h3>
                    <p>Estudiantes</p>
                </div>
                <div class="stat-card"><i class="fas fa-clipboard-list" style="color:#89b4fa;"></i>
                    <h3>${stats.cotidianos}</h3>
                    <p>Cotidianos</p>
                </div>
                <div class="stat-card"><i class="fas fa-tasks" style="color:#a6e3a1;"></i>
                    <h3>${stats.tareas}</h3>
                    <p>Tareas</p>
                </div>
                <div class="stat-card"><i class="fas fa-chart-line" style="color:#f9e2af;"></i>
                    <h3>${stats.promedio}%</h3>
                    <p>Promedio</p>
                </div>
            </div>
            <div class="empty-state">
                <i class="fas fa-arrow-left"></i>
                <p>Selecciona una categoría del menú lateral</p>
                <span style="font-size:13px; color:var(--text-muted);">Estudiantes, Plan, Trabajos Cotidianos, Tareas, Exámenes, Proyectos, Machotes, Asistencia, Bitácora, Notas Finales, Rubros</span>
            </div>`;
    }

    // ============================================================
    // ESTADÍSTICAS
    // ============================================================
    getStats() {
        const studentsList = this.students.list || [];
        const works = this.grades.works || {};
        return {
            estudiantes: studentsList.length,
            cotidianos: works.cotidiano?.length || 0,
            tareas: works.tarea?.length || 0,
            promedio: '0'
        };
    }

    updateStats() {
        const stats = this.getStats();
        document.getElementById('statEstudiantes').textContent = stats.estudiantes;
        document.getElementById('statCotidianos').textContent = stats.cotidianos;
        document.getElementById('statTareas').textContent = stats.tareas;
        document.getElementById('statPorcentaje').textContent = stats.promedio + '%';
    }

    // ============================================================
    // ACCIONES
    // ============================================================
    async toggleTheme() {
        const current = this.config.get('tema');
        const newTheme = current === 'dark' ? 'light' : 'dark';
        this.config.set('tema', newTheme);
        document.body.setAttribute('data-theme', newTheme === 'light' ? 'light' : 'dark');
    }

    async onSectionClick(sectionId) {
        this.currentCategory = null;
        this.currentSectionId = sectionId;
        this.sections.setCurrent(sectionId);
        await this.loadSectionData(sectionId);
        await this.render();
    }

    async onCategoryClick(categoryId) {
        this.currentCategory = categoryId;
        await this.render();
    }

    async createNewSection() {
        const result = await this.ui.showPrompt('Nombre de la nueva sección:');
        if (result.isConfirmed && result.value) {
            const nombre = result.value.trim();
            if (nombre) {
                await this.sections.create(nombre);
                await this.sections.load();
                this.currentSectionId = this.sections.currentId;
                await this.loadSectionData(this.currentSectionId);
                this.currentCategory = null;
                await this.render();
                this.ui.showSuccess('Sección creada correctamente');
            }
        }
    }

    closeWork() {
        this.currentWork = null;
        this.currentWorkType = null;
        this.render();
    }

    async exportarExcel() {
        this.ui.showInfo('Función de exportación a Excel en desarrollo. Próximamente podrás descargar el archivo .xlsx');
    }
}

// Exponer BaseApp globalmente
window.BaseApp = BaseApp;
console.log('✅ BaseApp definida correctamente');

} else {
    console.log('ℹ️ BaseApp ya estaba definida, reutilizando...');
}