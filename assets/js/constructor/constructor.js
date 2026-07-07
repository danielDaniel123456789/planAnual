// ============================================================
// App - Clase principal que integra todos los managers
// ============================================================

class App extends BaseApp {
    constructor() {
        super();
        this.studentManager = new StudentManager(this);
        this.planManager = new PlanManager(this);
        this.finalGradesManager = new FinalGradesManager(this);
        this.workManager = new WorkManager(this);
        this.groupModeManager = new GroupModeManager(this);
        this.quickAddManager = new QuickAddManager(this);
        this.machoteManager = new MachoteManager(this);
       this.bitacoraManager = new BitacoraManager(this);
    }


     // Estos métodos deben estar dentro de la clase, no solo en el constructor
    async addBitacora() { await this.bitacoraManager.addBitacora(); }
    async editBitacora(id) { await this.bitacoraManager.editBitacora(id); }
    async deleteBitacora(id) { await this.bitacoraManager.deleteBitacora(id); }
    // ============================================================
    // DELEGACIÓN DE MÉTODOS - StudentManager
    // ============================================================
    async addStudent() { await this.studentManager.addStudent(); }
    async deleteStudent(id) { await this.studentManager.deleteStudent(id); }
    async importStudents() { await this.studentManager.importStudents(); }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - PlanManager
    // ============================================================
    async addEnlacePlan() { await this.planManager.addEnlacePlan(); }
    async deleteEnlacePlan(id) { await this.planManager.deleteEnlacePlan(id); }
    async addContenidoPlan() { await this.planManager.addContenidoPlan(); }
    async editarContenidoPlan(id) { await this.planManager.editarContenidoPlan(id); }
    async deleteContenidoPlan(id) { await this.planManager.deleteContenidoPlan(id); }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - FinalGradesManager
    // ============================================================
    async renderFinalGrades(container) { await this.finalGradesManager.renderFinalGrades(container); }
    seleccionarCategoria(tipo) { this.finalGradesManager.seleccionarCategoria(tipo); }
    limpiarSeleccionCategoria() { this.finalGradesManager.limpiarSeleccionCategoria(); }
    toggleGrupo(tipo) { this.finalGradesManager.toggleGrupo(tipo); }
    toggleAllGroups() { this.finalGradesManager.toggleAllGroups(); }
    mostrarInfoTrabajo(tipo, id, nombre, fecha, puntosMax, fechaAsignacion, fechaEntrega) { 
        this.finalGradesManager.mostrarInfoTrabajo(tipo, id, nombre, fecha, puntosMax, fechaAsignacion, fechaEntrega); 
    }
    async guardarNotaDesdeInputFinal(input) { await this.finalGradesManager.guardarNotaDesdeInputFinal(input); }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - WorkManager
    // ============================================================
    async addWork(type) { await this.workManager.addWork(type); }
    async editWork(type, id) { await this.workManager.editWork(type, id); }
    async deleteWork(type, id) { await this.workManager.deleteWork(type, id); }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - GroupModeManager
    // ============================================================
    async openWork(type, id, preserveFocus = false) { await this.groupModeManager.openWork(type, id, preserveFocus); }
    filtrarEstudiantesGrupales(type, workId, termino) { this.groupModeManager.filtrarEstudiantesGrupales(type, workId, termino); }
    limpiarBusquedaGrupal(type, workId) { this.groupModeManager.limpiarBusquedaGrupal(type, workId); }
    calificarNuevoGrupo(type, workId) { this.groupModeManager.calificarNuevoGrupo(type, workId); }
    toggleModoGrupal(type, workId) { this.groupModeManager.toggleModoGrupal(type, workId); }
    desactivarModoGrupal(type, workId) { this.groupModeManager.desactivarModoGrupal(type, workId); }
    agregarEstudianteGrupo(type, workId, studentId) { this.groupModeManager.agregarEstudianteGrupo(type, workId, studentId); }
    quitarEstudianteGrupo(type, workId, studentId) { this.groupModeManager.quitarEstudianteGrupo(type, workId, studentId); }
    limpiarSeleccionGrupal(type, workId) { this.groupModeManager.limpiarSeleccionGrupal(type, workId); }
    async actualizarNotaGrupal(type, workId, valor) { await this.groupModeManager.actualizarNotaGrupal(type, workId, valor); }
    async aplicarNotaGrupal(type, workId, valor) { await this.groupModeManager.aplicarNotaGrupal(type, workId, valor); }
    actualizarChipsNotas(type, workId) { this.groupModeManager.actualizarChipsNotas(type, workId); }
    async guardarNotaIndividual(input, type, workId) { await this.groupModeManager.guardarNotaIndividual(input, type, workId); }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - QuickAddManager
    // ============================================================
    async showAddRapido() { await this.quickAddManager.showAddRapido(); }

    // ============================================================
    // DELEGACIÓN DE MÉTODOS - MachoteManager
    // ============================================================
    async addMachote() { await this.machoteManager.addMachote(); }
    async verMachote(id) { await this.machoteManager.verMachote(id); }
    async editarMachote(id) { await this.machoteManager.editarMachote(id); }
    async deleteMachote(id) { await this.machoteManager.deleteMachote(id); }
    async importarMachotes() { await this.machoteManager.importarMachotes(); }
    async renderMachotes(container) { await this.machoteManager.renderMachotes(container); }
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
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
            text: error.message || 'Revisa la consola para más detalles',
            background: 'var(--bg-card)',
            color: 'var(--text-primary)'
        });
    }
});