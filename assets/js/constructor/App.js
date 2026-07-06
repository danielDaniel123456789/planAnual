// ============================================================
// App.js - Clase principal que integra todos los managers
// ============================================================

class App extends RubrosApp {
    constructor() {
        super();
        console.log('🚀 Iniciando App principal...');
        
        // Los managers de rubros se inicializan en init()
        this.studentManager = new StudentManager(this);
        this.planManager = new PlanManager(this);
        this.finalGradesManager = new FinalGradesManager(this);
        this.workManager = new WorkManager(this);
        this.groupModeManager = new GroupModeManager(this);
        this.quickAddManager = new QuickAddManager(this);
        this.machoteManager = new MachoteManager(this);
        
        console.log('✅ Todos los managers instanciados');
    }

    // ============================================================
    // MÉTODO RENDER CONTENT
    // ============================================================
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
        if (this.currentCategory === 'rubro') {
            await this.renderRubros(container);
            return;
        }
        await this.workItemsView.render(container, this.currentCategory);
    }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - Rubros (SIN LÁPIZ)
    // ============================================================
    async addRubro() { 
        if (this.rubrosManager && typeof this.rubrosManager.addRubro === 'function') {
            await this.rubrosManager.addRubro();
        } else {
            await this.addRubroFallback();
        }
    }

    async editarCeldaRubro(id, campo) {
        if (this.rubrosManager && typeof this.rubrosManager.editarCeldaRubro === 'function') {
            await this.rubrosManager.editarCeldaRubro(id, campo);
        } else {
            await this.editarCeldaRubroFallback(id, campo);
        }
    }

    async deleteRubro(id) { 
        if (this.rubrosManager && typeof this.rubrosManager.deleteRubro === 'function') {
            await this.rubrosManager.deleteRubro(id);
        } else {
            await this.deleteRubroFallback(id);
        }
    }

    async importarRubros() { 
        if (this.rubrosManager && typeof this.rubrosManager.importarRubros === 'function') {
            await this.rubrosManager.importarRubros();
        } else {
            await this.importarRubrosFallback();
        }
    }

    // ... el resto de delegaciones (StudentManager, PlanManager, etc.)
    // ... y el método init() sobrescrito

    async init() {
        console.log('🚀 Iniciando App...');
        await this.db.init();
        this.config.load();
        this.applyTheme();
        await this.loadData();
        this.setupEvents();
        
        if (!this.rubrosManager) {
            console.warn('⚠️ rubrosManager no disponible, inicializando...');
            this.initRubrosManager();
        }
        console.log('📋 rubrosManager:', this.rubrosManager ? '✅ Disponible' : '❌ NO DISPONIBLE (usando fallback)');
        
        await this.render();
        console.log('✅ App lista!');
    }
}

// INICIALIZACIÓN
document.addEventListener('DOMContentLoaded', async function() {
    try {
        const app = new App();
        window.app = app;
        await app.init();
        console.log('✅ App iniciada correctamente');
    } catch (error) {
        console.error('❌ Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error al iniciar',
            text: error.message || 'Revisa la consola',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
});