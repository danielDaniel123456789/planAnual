     class WorkItems {
            constructor(app) { this.app = app; }
            async render(container, type) {
                if (!container) return;
                const works = this.app.grades.getWorksByType(type);
                const tipoInfo = TIPOS_TRABAJO[type];
                let html = `
                    <div class="works-header">
                        <h2>
                            <span class="icon-badge">${tipoInfo?.icono || ''}</span>
                            ${tipoInfo?.nombre || type}
                            <span class="count">(${works.length} items)</span>
                        </h2>
                        <button class="btn-action btn-primary" onclick="window.app?.addWork('${type}')">
                            <i class="fas fa-plus"></i> Nuevo
                        </button>
                    </div>`;
                if (works.length === 0) {
                    html += `
                        <div class="empty-state">
                            <i class="fas fa-inbox"></i>
                            <p>No hay ${tipoInfo?.nombre?.toLowerCase() || 'trabajos'} registrados</p>
                            <button class="btn-action btn-primary" onclick="window.app?.addWork('${type}')">
                                <i class="fas fa-plus"></i> Agregar primero
                            </button>
                        </div>`;
                    container.innerHTML = html;
                    return;
                }
                html += '<div class="works-list">';
                for (const work of works) {
                    html += `
                        <div class="work-item" onclick="window.app?.openWork('${type}', ${work.id})">
                            <div class="work-item-info">
                                <div class="work-item-name">${escapeHtml(work.nombre)}</div>
                                <div class="work-item-date">
                                    <i class="fas fa-calendar-alt"></i> ${work.fecha || 'Sin fecha'}
                                    ${work.puntosMax ? ` · ${work.puntosMax}%` : ' · 100%'}
                                </div>
                            </div>
                            <div class="work-item-actions">
                                <button class="btn-action btn-danger" onclick="event.stopPropagation(); window.app?.deleteWork('${type}', ${work.id})" title="Eliminar">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>`;
                }
                html += '</div>';
                container.innerHTML = html;
            }
        }
    
    