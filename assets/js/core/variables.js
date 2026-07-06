 const DB_NAME = 'SistemaCalificacionesV42DB';  // Cambiar de V41 a V42
const DB_VERSION = 42;  // Cambiar de 41 a 42

const STORES = {
    SECCIONES: 'secciones',
    ESTUDIANTES: 'estudiantes',
    TRABAJOS_COTIDIANO: 'trabajos_cotidiano',
    TRABAJOS_TAREA: 'trabajos_tarea',
    EXAMENES: 'examenes',
    PROYECTOS: 'proyectos',
    TRABAJOS_RUBRO: 'trabajos_rubro',  // NUEVO
    CALIFICACIONES: 'calificaciones',
    CONFIGURACION: 'configuracion',
    BITACORA: 'bitacora',
    HORARIOS: 'horarios',
    EVALUACIONES: 'evaluaciones',
    LINKS: 'links',
    ASISTENCIA: 'asistencia',
    PORCENTAJES: 'porcentajes',
    ASISTENCIA_DETALLADA: 'asistencia_detallada',
    PLAN_ENLACES: 'plan_enlaces',
    PLAN_CONTENIDO: 'plan_contenido'
};

        const TIPOS_TRABAJO = {
            cotidiano: { id: 'cotidiano', nombre: 'Trabajo Cotidiano', puntosMax: 100, icono: '📝', color: '#89b4fa', label: 'Cotidianos' },
            tarea: { id: 'tarea', nombre: 'Tarea', puntosMax: 100, icono: '📚', color: '#a6e3a1', label: 'Tareas' },
            examen: { id: 'examen', nombre: 'Examen', puntosMax: 100, icono: '📝', color: '#f9e2af', label: 'Exámenes' },
            proyecto: { id: 'proyecto', nombre: 'Proyecto', puntosMax: 100, icono: '🚀', color: '#fab387', label: 'Proyectos' }
        };

    // ============================================================
// variables.js - Añadir rubro al menú de categorías
// ============================================================

const CATEGORIAS_MENU = [
    { id: 'estudiantes', nombre: 'Estudiantes', icono: 'fas fa-users', color: '#89b4fa' },
    { id: 'plan', nombre: 'Plan', icono: 'fas fa-calendar-alt', color: '#94e2d5' },
    { id: 'cotidiano', nombre: 'Trabajos Cotidianos', icono: 'fas fa-clipboard-list', color: '#89b4fa' },
    { id: 'tarea', nombre: 'Tareas', icono: 'fas fa-tasks', color: '#a6e3a1' },
    { id: 'examen', nombre: 'Exámenes', icono: 'fas fa-file-alt', color: '#f9e2af' },
    { id: 'proyecto', nombre: 'Proyectos', icono: 'fas fa-rocket', color: '#fab387' },
    { id: 'asistencia', nombre: 'Asistencia', icono: 'fas fa-calendar-check', color: '#cba6f7' },
    { id: 'bitacora', nombre: 'Bitácora', icono: 'fas fa-book', color: '#f38ba8' },
    { id: 'notas_finales', nombre: 'Notas Finales', icono: 'fas fa-chart-line', color: '#f9e2af' },
    { id: 'rubro', nombre: 'Rubros', icono: 'fas fa-percent', color: '#f9e2af' }  // NUEVO
];

        const PORCENTAJES_DEFAULT = {
            cotidiano: { porcentaje: 20, activo: true },
            tarea: { porcentaje: 20, activo: true },
            examen: { porcentaje: 30, activo: true },
            proyecto: { porcentaje: 20, activo: true },
            asistencia: { porcentaje: 10, activo: true }
        };