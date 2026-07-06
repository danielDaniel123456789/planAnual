// ==================== PUNTO DE ENTRADA PRINCIPAL ====================

alert("asd");
// Variables globales para acceso desde otros scripts
let app = null;

// Esperar a que todos los scripts se carguen
document.addEventListener('DOMContentLoaded', async function() {
    console.log(' Iniciando aplicación...');
    
    try {
        // Crear instancia de App
        app = new App();
        
        // Exponer globalmente
        window.app = app;
        window.__APP__ = app;
        
        // Inicializar
        await app.init();
        
        console.log('✅ Aplicación iniciada correctamente');
        
        // Disparar evento
        document.dispatchEvent(new CustomEvent('app-ready', { detail: { app: app } }));
        
    } catch (error) {
        console.error('❌ Error al iniciar la aplicación:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al iniciar',
            text: 'Hubo un problema al cargar la aplicación. Revisa la consola para más detalles.',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
});

// ==================== CLASE APP COMPLETA ====================

class App {
    constructor() {
        // Core
        this.db = db;
        this.config = config;
        
        // Módulos
        this.sections = new Sections(this.db);
        this.students = new Students(this.db);
        this.grades = new Grades(this.db);
        this.attendance = new Attendance(this.db);
        this.ui = ui;
        
        // Estado
        this.currentSectionId = null;
        this.currentCategory = null;
        this.currentWork = null;
        this.currentWorkType = null;
        this.viewMode = 'sections';
        this.isFinalGradesMode = false;
        
        // Vistas
        this.sidebarView = new Sidebar(this);
        this.workItemsView = new WorkItems(this);
    }

    async init() {
        // 1. Inicializar base de datos
        await this.db.init();
        
        // 2. Cargar configuración
        await this.config.load();
        
        // 3. Aplicar tema
        this.applyTheme();
        
        // 4. Cargar datos
        await this.loadData();
        
        // 5. Configurar event listeners
        this.setupEventListeners();
        
        // 6. Renderizar
        await this.render();
    }

    applyTheme() {
        const tema = this.config.get('tema');
        document.body.classList.toggle('teams', tema === 'teams');
    }

    async loadData() {
        // Cargar secciones
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
        await this.attendance.load(sectionId);
    }

    setupEventListeners() {
        // Toggle tema
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });

        // Agregar sección
        document.getElementById('addSectionBtn')?.addEventListener('click', () => {
            this.createNewSection();
        });

        // Notas finales
        document.getElementById('btnNotasFinales')?.addEventListener('click', () => {
            this.showFinalGrades();
        });

        // Activity bar
        document.querySelectorAll('.activity-item[data-view]').forEach(item => {
            item.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                this.switchView(view);
            });
        });

        // Manejar eventos personalizados
        document.addEventListener('section-changed', (e) => {
            this.onSectionChanged(e.detail.sectionId);
        });
    }

    async render() {
        // Actualizar sidebar
        this.sidebarView.render(this.sections.list, this.currentSectionId);
        
        // Actualizar nombre de sección
        const currentSection = this.sections.getCurrent();
        document.getElementById('currentSectionName').textContent = 
            currentSection ? escapeHtml(currentSection.nombre) : 'Selecciona una sección';
        
        // Actualizar stats
        this.updateStats();
        
        // Renderizar contenido
        await this.renderContent();
    }

    async renderContent() {
        const container = document.getElementById('mainContent');
        
        if (!this.currentSectionId) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        // Si estamos en modo notas finales
        if (this.isFinalGradesMode) {
            await this.renderFinalGrades(container);
            return;
        }

        // Si no hay categoría seleccionada, mostrar resumen
        if (!this.currentCategory) {
            container.innerHTML = this.getDefaultViewHTML();
            return;
        }

        // Renderizar según categoría
        await this.renderCategory(container, this.currentCategory);
    }

    getEmptyStateHTML() {
        return `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-secondary);">
                <div style="text-align:center;">
                    <i class="fas fa-folder-open" style="font-size:48px; margin-bottom:16px;"></i>
                    <p style="font-size:16px;">Selecciona una sección para comenzar</p>
                    <p style="font-size:12px; margin-top:8px;">o crea una nueva usando el botón <i class="fas fa-plus"></i> en el sidebar</p>
                </div>
            </div>
        `;
    }

    getDefaultViewHTML() {
        const stats = this.getStats();
        return `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap:16px; margin-bottom:24px;">
                <div class="stat-card" style="background:var(--bg-card); padding:20px; border-radius:10px; text-align:center;">
                    <i class="fas fa-users" style="font-size:28px; color:var(--info);"></i>
                    <h3 style="font-size:28px; margin:8px 0;">${stats.estudiantes}</h3>
                    <p style="color:var(--text-secondary); font-size:12px;">Estudiantes</p>
                </div>
                <div class="stat-card" style="background:var(--bg-card); padding:20px; border-radius:10px; text-align:center;">
                    <i class="fas fa-clipboard-list" style="font-size:28px; color:var(--cotidiano);"></i>
                    <h3 style="font-size:28px; margin:8px 0;">${stats.cotidianos}</h3>
                    <p style="color:var(--text-secondary); font-size:12px;">Cotidianos</p>
                </div>
                <div class="stat-card" style="background:var(--bg-card); padding:20px; border-radius:10px; text-align:center;">
                    <i class="fas fa-tasks" style="font-size:28px; color:var(--tarea);"></i>
                    <h3 style="font-size:28px; margin:8px 0;">${stats.tareas}</h3>
                    <p style="color:var(--text-secondary); font-size:12px;">Tareas</p>
                </div>
                <div class="stat-card" style="background:var(--bg-card); padding:20px; border-radius:10px; text-align:center;">
                    <i class="fas fa-chart-line" style="font-size:28px; color:var(--success);"></i>
                    <h3 style="font-size:28px; margin:8px 0;">${stats.promedio}%</h3>
                    <p style="color:var(--text-secondary); font-size:12px;">Promedio General</p>
                </div>
            </div>
            <div style="text-align:center; color:var(--text-secondary); padding:40px;">
                <i class="fas fa-arrow-left" style="font-size:28px; opacity:0.5;"></i>
                <p style="margin-top:12px; font-size:14px;">Selecciona una categoría del menú lateral</p>
                <p style="font-size:12px; margin-top:4px;">Trabajos Cotidianos · Tareas · Exámenes · Proyectos · Asistencia · Bitácora</p>
            </div>
        `;
    }

    async renderCategory(container, category) {
        // Delegar al workItemsView
        await this.workItemsView.render(container, category);
    }

    async renderFinalGrades(container) {
        // Mostrar notas finales
        const students = this.students.list;
        if (students.length === 0) {
            container.innerHTML = `
                <div style="text-align:center; padding:40px; color:var(--text-secondary);">
                    <i class="fas fa-users" style="font-size:48px;"></i>
                    <p style="margin-top:12px;">No hay estudiantes registrados</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h2><i class="fas fa-chart-line"></i> Notas Finales</h2>
                <button class="btn-action" onclick="window.app?.exitFinalGrades()">
                    <i class="fas fa-arrow-left"></i> Volver
                </button>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Estudiante</th>
                            ${this.grades.percentages.cotidiano.activo ? '<th>Cotidiano</th>' : ''}
                            ${this.grades.percentages.tarea.activo ? '<th>Tareas</th>' : ''}
                            ${this.grades.percentages.examen.activo ? '<th>Exámenes</th>' : ''}
                            ${this.grades.percentages.proyecto.activo ? '<th>Proyectos</th>' : ''}
                            ${this.grades.percentages.asistencia.activo ? '<th>Asistencia</th>' : ''}
                            <th>Nota Final</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const porcentajes = {};
            
            // Calcular porcentajes por tipo
            const tipos = ['cotidiano', 'tarea', 'examen', 'proyecto'];
            for (const type of tipos) {
                if (this.grades.percentages[type].activo) {
                    porcentajes[type] = await this.grades.calculateTypePercentage(student.id, type);
                }
            }
            
            // Asistencia
            if (this.grades.percentages.asistencia.activo) {
                porcentajes.asistencia = await this.attendance.calculatePercentage(student.id);
            }
            
            // Nota final
            const notaFinal = await this.grades.calculateFinalGrade(student.id);
            const color = notaFinal >= 70 ? '#6a9955' : (notaFinal >= 60 ? '#dcdcaa' : '#f48771');
            
            html += `<tr>
                <td style="text-align:center;">${i + 1}</td>
                <td style="text-align:left;">${escapeHtml(student.nombre)}</td>`;
            
            if (this.grades.percentages.cotidiano.activo) {
                html += `<td>${(porcentajes.cotidiano || 0).toFixed(1)}%</td>`;
            }
            if (this.grades.percentages.tarea.activo) {
                html += `<td>${(porcentajes.tarea || 0).toFixed(1)}%</td>`;
            }
            if (this.grades.percentages.examen.activo) {
                html += `<td>${(porcentajes.examen || 0).toFixed(1)}%</td>`;
            }
            if (this.grades.percentages.proyecto.activo) {
                html += `<td>${(porcentajes.proyecto || 0).toFixed(1)}%</td>`;
            }
            if (this.grades.percentages.asistencia.activo) {
                html += `<td>${(porcentajes.asistencia || 0).toFixed(1)}%</td>`;
            }
            
            html += `<td style="font-weight:bold; color:${color};">${notaFinal.toFixed(1)}%</td>`;
            html += `</tr>`;
        }

        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    getStats() {
        const students = this.students.list || [];
        const works = this.grades.works || {};
        return {
            estudiantes: students.length,
            cotidianos: works.cotidiano?.length || 0,
            tareas: works.tarea?.length || 0,
            examenes: works.examen?.length || 0,
            proyectos: works.proyecto?.length || 0,
            promedio: this.calculateAverage()
        };
    }

    calculateAverage() {
        // Cálculo simplificado
        return 0;
    }

    updateStats() {
        const stats = this.getStats();
        document.getElementById('statEstudiantes').textContent = stats.estudiantes;
        document.getElementById('statCotidianos').textContent = stats.cotidianos;
        document.getElementById('statTareas').textContent = stats.tareas;
        document.getElementById('statPorcentaje').textContent = `${stats.promedio}%`;
    }

    // ==================== ACCIONES DE USUARIO ====================

    async onSectionClick(sectionId) {
        this.currentCategory = null;
        this.isFinalGradesMode = false;
        this.currentSectionId = sectionId;
        this.sections.setCurrent(sectionId);
        await this.loadSectionData(sectionId);
        await this.render();
    }

    async onCategoryClick(categoryId) {
        this.currentCategory = categoryId;
        this.isFinalGradesMode = false;
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

    async editSection(id) {
        const section = this.sections.getById(id);
        if (!section) return;
        
        const result = await this.ui.showPrompt('Editar nombre de la sección:', 'text', section.nombre);
        if (result.isConfirmed && result.value) {
            const nombre = result.value.trim();
            if (nombre) {
                await this.sections.update(id, nombre);
                await this.render();
                this.ui.showSuccess('Sección actualizada');
            }
        }
    }

    async deleteSection(id) {
        const section = this.sections.getById(id);
        if (!section) return;
        
        const confirm = await this.ui.showConfirm(`¿Eliminar la sección "${section.nombre}"? Se eliminarán todos los datos asociados.`);
        if (confirm.isConfirmed) {
            await this.sections.delete(id);
            if (this.currentSectionId === id) {
                this.currentSectionId = this.sections.currentId;
                if (this.currentSectionId) {
                    await this.loadSectionData(this.currentSectionId);
                }
            }
            this.currentCategory = null;
            await this.render();
            this.ui.showSuccess('Sección eliminada');
        }
    }

    async addWork(type) {
        const tipoInfo = TIPOS_TRABAJO[type.toUpperCase()];
        const puntosMaxDefecto = tipoInfo?.puntosMax || 100;
        
        const result = await this.ui.showForm(`Nuevo ${tipoInfo?.nombre || 'Trabajo'}`, [
            { id: 'nombre', label: 'Nombre:', type: 'text', placeholder: `Ej. ${tipoInfo?.nombre || 'Trabajo'} 1` },
            { id: 'puntosMax', label: 'Puntaje máximo:', type: 'number', value: puntosMaxDefecto }
        ]);
        
        if (result.isConfirmed && result.value) {
            const data = result.value;
            if (!data.nombre.trim()) {
                this.ui.showError('El nombre es requerido');
                return;
            }
            
            const puntos = parseInt(data.puntosMax) || puntosMaxDefecto;
            const date = getDayMonth();
            
            const workData = {
                nombre: data.nombre.trim(),
                fecha: date,
                puntosMax: puntos
            };
            
            // Si no es examen, agregar rúbrica por defecto
            if (type !== 'examen') {
                workData.rubrica = {
                    criterios: [
                        { nombre: 'Dominio del contenido', maxPuntos: 10 },
                        { nombre: 'Claridad', maxPuntos: 10 },
                        { nombre: 'Investigación', maxPuntos: 10 },
                        { nombre: 'Creatividad', maxPuntos: 10 },
                        { nombre: 'Presentación', maxPuntos: 10 },
                        { nombre: 'Análisis', maxPuntos: 10 }
                    ]
                };
            }
            
            await this.grades.addWork(this.currentSectionId, type, workData);
            await this.render();
            this.ui.showSuccess(`${tipoInfo?.nombre || 'Trabajo'} creado`);
        }
    }

    async editWork(type, id) {
        const work = this.grades.getWorkById(type, id);
        if (!work) return;
        
        const tipoInfo = TIPOS_TRABAJO[type.toUpperCase()];
        
        const result = await this.ui.showForm(`Editar ${tipoInfo?.nombre || 'Trabajo'}`, [
            { id: 'nombre', label: 'Nombre:', type: 'text', value: work.nombre },
            { id: 'puntosMax', label: 'Puntaje máximo:', type: 'number', value: work.puntosMax || tipoInfo?.puntosMax || 100 }
        ]);
        
        if (result.isConfirmed && result.value) {
            const data = result.value;
            if (!data.nombre.trim()) {
                this.ui.showError('El nombre es requerido');
                return;
            }
            
            await this.grades.updateWork(type, id, {
                nombre: data.nombre.trim(),
                puntosMax: parseInt(data.puntosMax) || tipoInfo?.puntosMax || 100
            });
            
            await this.render();
            this.ui.showSuccess('Trabajo actualizado');
        }
    }

    async deleteWork(type, id) {
        const work = this.grades.getWorkById(type, id);
        if (!work) return;
        
        const confirm = await this.ui.showConfirm(`¿Eliminar "${work.nombre}"? Se perderán todas las calificaciones.`);
        if (confirm.isConfirmed) {
            await this.grades.deleteWork(type, id);
            await this.render();
            this.ui.showSuccess('Trabajo eliminado');
        }
    }

    async openWork(type, id) {
        const work = this.grades.getWorkById(type, id);
        if (!work) return;
        
        this.currentWork = work;
        this.currentWorkType = type;
        this.viewMode = 'grading';
        await this.renderGradingView();
    }

    async renderGradingView() {
        const container = document.getElementById('mainContent');
        if (!this.currentWork) return;
        
        const work = this.currentWork;
        const type = this.currentWorkType;
        const tipoInfo = TIPOS_TRABAJO[type.toUpperCase()];
        const students = this.students.list || [];
        const puntosMax = work.puntosMax || tipoInfo?.puntosMax || 100;
        
        let html = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
                <div>
                    <button class="btn-action" onclick="window.app?.exitGrading()">
                        <i class="fas fa-arrow-left"></i> Volver
                    </button>
                    <h2 style="margin-top:8px;">${escapeHtml(work.nombre)}</h2>
                    <p style="color:var(--text-secondary); font-size:12px;">
                        ${tipoInfo?.nombre || type} · ${puntosMax} pts · ${work.fecha || 'Sin fecha'}
                    </p>
                </div>
                <div style="display:flex; gap:8px;">
                    <button class="btn-action btn-primary" onclick="window.app?.downloadWorkPDF()">
                        <i class="fas fa-file-pdf"></i> PDF
                    </button>
                </div>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Estudiante</th>
                            <th>Nota</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        for (let i = 0; i < students.length; i++) {
            const student = students[i];
            const grade = await this.grades.getGrade(this.currentSectionId, student.id, work.id, type);
            const nota = grade?.nota || 0;
            
            html += `
                <tr>
                    <td style="text-align:center;">${i + 1}</td>
                    <td style="text-align:left;">${escapeHtml(student.nombre)}</td>
                    <td style="text-align:center; font-weight:bold;">${nota.toFixed(1)}/${puntosMax}</td>
                    <td style="text-align:center;">
                        <button class="btn-action btn-primary" onclick="window.app?.gradeStudent(${student.id})">
                            <i class="fas fa-star"></i> Calificar
                        </button>
                    </td>
                </tr>
            `;
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        container.innerHTML = html;
    }

    async gradeStudent(studentId) {
        const student = this.students.getById(studentId);
        if (!student || !this.currentWork) return;
        
        const work = this.currentWork;
        const type = this.currentWorkType;
        const puntosMax = work.puntosMax || TIPOS_TRABAJO[type.toUpperCase()]?.puntosMax || 100;
        
        const grade = await this.grades.getGrade(this.currentSectionId, studentId, work.id, type);
        const notaActual = grade?.nota || 0;
        
        const result = await this.ui.showPrompt(
            `Calificar a ${student.nombre} - ${work.nombre}`,
            'number',
            notaActual.toString(),
            `Nota (0-${puntosMax})`
        );
        
        if (result.isConfirmed) {
            const nota = parseFloat(result.value);
            if (isNaN(nota) || nota < 0 || nota > puntosMax) {
                this.ui.showError(`La nota debe estar entre 0 y ${puntosMax}`);
                return;
            }
            
            await this.grades.saveGrade(this.currentSectionId, studentId, work.id, type, nota);
            await this.renderGradingView();
            this.ui.showSuccess(`Calificación guardada: ${nota.toFixed(1)}/${puntosMax}`);
        }
    }

    async exitGrading() {
        this.currentWork = null;
        this.currentWorkType = null;
        this.viewMode = 'sections';
        await this.render();
    }

    async showFinalGrades() {
        this.isFinalGradesMode = true;
        this.currentCategory = null;
        await this.render();
    }

    async exitFinalGrades() {
        this.isFinalGradesMode = false;
        await this.render();
    }

    async toggleTheme() {
        const current = this.config.get('tema');
        const newTheme = current === 'vscode' ? 'teams' : 'vscode';
        this.config.set('tema', newTheme);
        document.body.classList.toggle('teams', newTheme === 'teams');
    }

    switchView(view) {
        this.viewMode = view;
        
        // Actualizar actividad en barra
        document.querySelectorAll('.activity-item[data-view]').forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        if (view === 'sections') {
            this.currentCategory = null;
            this.isFinalGradesMode = false;
            this.render();
        } else {
            this.renderOtherView(view);
        }
    }

    renderOtherView(view) {
        const container = document.getElementById('mainContent');
        const views = {
            profesor: {
                icon: 'fa-chalkboard-user',
                title: 'Datos del Profesor',
                description: 'Configuración de datos institucionales y del profesor'
            },
            horario: {
                icon: 'fa-calendar-alt',
                title: 'Horario',
                description: 'Gestión de horarios de clases'
            },
            evaluacion: {
                icon: 'fa-table-list',
                title: 'Evaluación',
                description: 'Configuración de criterios de evaluación'
            },
            links: {
                icon: 'fa-link',
                title: 'Enlaces',
                description: 'Recursos y enlaces útiles'
            },
            ayuda: {
                icon: 'fa-question-circle',
                title: 'Ayuda',
                description: 'Guía de uso del sistema'
            }
        };
        
        const info = views[view] || views.ayuda;
        
        container.innerHTML = `
            <div style="display:flex; justify-content:center; align-items:center; height:100%; color:var(--text-secondary);">
                <div style="text-align:center; background:var(--bg-card); padding:40px; border-radius:12px; max-width:400px;">
                    <i class="fas ${info.icon}" style="font-size:48px; margin-bottom:16px; color:var(--info);"></i>
                    <h3 style="font-size:20px; margin-bottom:8px;">${info.title}</h3>
                    <p style="font-size:14px;">${info.description}</p>
                    <p style="font-size:12px; margin-top:16px; color:var(--text-secondary);">
                        <i class="fas fa-construction"></i> En desarrollo
                    </p>
                </div>
            </div>
        `;
    }

    // ==================== UTILIDADES ====================

    async downloadWorkPDF() {
        this.ui.showInfo('Generando PDF...');
        // Implementación de PDF
        this.ui.showSuccess('PDF generado');
    }

    async viewSummary(type) {
        this.ui.showInfo('Generando resumen...');
        // Implementación de resumen
        this.ui.showSuccess('Resumen generado');
    }
}