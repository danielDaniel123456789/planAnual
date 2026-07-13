// ==================== CONSTANTES GLOBALES ====================

const DB_NAME = 'SistemaCalificacionesV35DB';
const DB_VERSION = 35;

const STORES = {
    SECCIONES: 'secciones',
    ESTUDIANTES: 'estudiantes',
    TRABAJOS_COTIDIANO: 'trabajos_cotidiano',
    TRABAJOS_TAREA: 'trabajos_tarea',
    EXAMENES: 'examenes',
    PROYECTOS: 'proyectos',
    CALIFICACIONES: 'calificaciones',
    PUNTAJES_CRITERIOS: 'puntajes_criterios',
    CONFIGURACION: 'configuracion',
    BITACORA: 'bitacora',
    HORARIOS: 'horarios',
    EVALUACIONES: 'evaluaciones',
    LINKS: 'links',
    SALIDAS_BANO: 'salidas_bano',
    ASISTENCIA: 'asistencia',
    PORCENTAJES: 'porcentajes',
    ASISTENCIA_DETALLADA: 'asistencia_detallada'
};

const TIPOS_TRABAJO = {
    COTIDIANO: { id: 'cotidiano', nombre: 'Trabajo Cotidiano', puntosMax: 100, icono: '', color: '#6a9955' },
    TAREA: { id: 'tarea', nombre: 'Tarea', puntosMax: 150, icono: '', color: '#9cdcfe' },
    EXAMEN: { id: 'examen', nombre: 'Examen', puntosMax: 100, icono: '', color: '#dcdcaa' },
    PROYECTO: { id: 'proyecto', nombre: 'Proyecto', puntosMax: 100, icono: '', color: '#f4a261' }
};

const CATEGORIAS_MENU = [
    { id: 'cotidiano', nombre: 'Trabajos Cotidianos', icono: 'fas fa-clipboard-list', color: '#6a9955' },
    { id: 'tarea', nombre: 'Tareas', icono: 'fas fa-tasks', color: '#9cdcfe' },
    { id: 'examen', nombre: 'Exámenes', icono: 'fas fa-file-alt', color: '#dcdcaa' },
    { id: 'proyecto', nombre: 'Proyectos', icono: 'fas fa-rocket', color: '#f4a261' },
    { id: 'asistencia', nombre: 'Asistencia', icono: 'fas fa-calendar-check', color: '#9b59b6' },
    { id: 'bitacora', nombre: 'Bitácora', icono: 'fas fa-book', color: '#ce9178' },
    { id: 'bano', nombre: 'Control de Baño', icono: 'fas fa-restroom', color: '#f4a261' }
];

const PORCENTAJES_DEFAULT = {
    cotidiano: { porcentaje: 20, activo: true },
    tarea: { porcentaje: 20, activo: true },
    examen: { porcentaje: 30, activo: true },
    proyecto: { porcentaje: 20, activo: true },
    asistencia: { porcentaje: 10, activo: true }
};