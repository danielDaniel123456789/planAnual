// ============================================================
// BaseApp.js - Configuración y núcleo de la aplicación
// ============================================================

// Verificar si BaseApp ya está definida para evitar duplicados
if (typeof BaseApp === 'undefined') {

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
        if (this.currentCategory === 'bitacora') {
    if (this.bitacoraManager && typeof this.bitacoraManager.renderBitacora === 'function') {
        await this.bitacoraManager.renderBitacora(container);
    } else {
        container.innerHTML = `<div class="empty-state"><p>Módulo de Bitácora no disponible</p></div>`;
    }
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
            if (this.currentCategory === 'rubro') {
                // USAR EL MÉTODO DIRECTO DE LA APP
                if (typeof this.renderRubros === 'function') {
                    await this.renderRubros(container);
                } else {
                    // FALLBACK: renderizar rubros directamente
                    await this.renderRubrosFallback(container);
                }
                return;
            }
            await this.workItemsView.render(container, this.currentCategory);
        }

        // ============================================================
        // MÉTODO FALLBACK PARA RUBROS (si no está definido en la app)
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
                            <button class="btn-action btn-primary" onclick="window.app?.editarRubro(${rubro.id})" style="padding:4px 8px; font-size:12px;">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="btn-action btn-danger" onclick="window.app?.deleteRubro(${rubro.id})" style="padding:4px 8px; font-size:12px;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </td>
                    </tr>`;
            }

            html += `
                        </tbody>
                        <tfoot>
                            <tr style="border-top:2px solid var(--border-color); font-weight:bold;">
                                <td colspan="2" style="text-align:right; color:var(--text-secondary);">TOTAL:</td>
                                <td>
                                    <span style="background:rgba(249,226,175,0.25); color:${totalPorcentaje === 100 ? '#a6e3a1' : '#f38ba8'}; padding:2px 12px; border-radius:12px; font-weight:700;">
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
                        <span><i class="fas fa-calculator" style="color:#f9e2af;"></i> El total debe sumar <strong>100%</strong></span>
                    </div>
                </div>`;

            container.innerHTML = html;
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
                    <span style="font-size:13px; color:var(--text-muted);">Estudiantes, Plan, Trabajos Cotidianos, Tareas, Exámenes, Proyectos, Machotes, Asistencia, Bitácora, Notas Finales, Rubros</span>
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

    

    // Exponer BaseApp globalmente
    window.BaseApp = BaseApp;
    console.log('✅ BaseApp definida correctamente');

} else {
    console.log('ℹ️ BaseApp ya estaba definida, reutilizando...');
}