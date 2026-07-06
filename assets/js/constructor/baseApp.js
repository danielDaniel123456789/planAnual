// ============================================================
// BaseApp.js - Configuración y núcleo de la aplicación
// ============================================================

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
    }

    async init() {
        console.log('🚀 Iniciando App...');
        await this.db.init();
        this.config.load();
        this.applyTheme();
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

    async render() {
        this.sidebarView.render(this.sections.list, this.currentSectionId);
        const current = this.sections.getCurrent();
        document.getElementById('currentSectionName').textContent = current ? escapeHtml(current.nombre) : 'Selecciona una sección';
        this.updateStats();
        await this.renderContent();
    }

async renderContent() {
    const container = document.getElementById('mainContent');
    if (!this.currentSectionId) {
        container.innerHTML = this.getEmptySectionHTML();
        return;
    }
    if (!this.currentCategory) {
        container.innerHTML = this.getDefaultViewHTML();
        return;
    }
    if (this.currentCategory === 'estudiantes') { 
        await this.studentManager.renderStudents(container); 
        return;
    }
    if (this.currentCategory === 'notas_finales') { 
        await this.finalGradesManager.renderFinalGrades(container); 
        return;
    }
    if (this.currentCategory === 'plan') { 
        await this.planManager.renderPlan(container); 
        return;
    }
    if (this.currentCategory === 'machote') {
        await this.machoteManager.renderMachotes(container);
        return;
    }
    if (this.currentCategory === 'rubro') {  // NUEVO
        await this.rubrosManager.renderRubros(container);
        return;
    }
    await this.workItemsView.render(container, this.currentCategory);
}

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
                <div class="stat-card"><i class="fas fa-users" style="color:#89b4fa;"></i><h3>${stats.estudiantes}</h3><p>Estudiantes</p></div>
                <div class="stat-card"><i class="fas fa-clipboard-list" style="color:#89b4fa;"></i><h3>${stats.cotidianos}</h3><p>Cotidianos</p></div>
                <div class="stat-card"><i class="fas fa-tasks" style="color:#a6e3a1;"></i><h3>${stats.tareas}</h3><p>Tareas</p></div>
                <div class="stat-card"><i class="fas fa-chart-line" style="color:#f9e2af;"></i><h3>${stats.promedio}%</h3><p>Promedio</p></div>
            </div>
            <div class="empty-state">
                <i class="fas fa-arrow-left"></i>
                <p>Selecciona una categoría del menú lateral</p>
                <span style="font-size:13px; color:var(--text-muted);">Estudiantes, Plan, Trabajos Cotidianos, Tareas, Exámenes, Proyectos, Machotes, Asistencia, Bitácora, Notas Finales</span>
            </div>`;
    }

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