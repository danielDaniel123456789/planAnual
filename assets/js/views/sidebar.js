class Sidebar {
    constructor(app) {
        this.app = app;
        this.container = document.getElementById('sidebarContent');
        this.select = document.getElementById('sectionSelect');
    }
    render(sectionsList, currentId) {
        // Actualizar el selector en el header
        this.renderSelect(sectionsList, currentId);
        
        if (!this.container) return;
        
        if (!sectionsList || sectionsList.length === 0) {
            this.container.innerHTML = `
                <div style="padding:20px; text-align:center; color:var(--text-secondary);">
                    <i class="fas fa-folder-open" style="font-size:32px; margin-bottom:12px; opacity:0.3;"></i>
                    <p style="font-size:13px;">No hay secciones</p>
                    <button class="btn-action btn-primary" onclick="window.app?.createNewSection()" style="margin-top:12px;">
                        <i class="fas fa-plus"></i> Crear
                    </button>
                </div>`;
            return;
        }
        
        // Siempre mostrar el menú de categorías si hay una sección seleccionada
        if (currentId) {
            let html = '<div class="category-menu">';
            html += `<div class="category-menu-title"><i class="fas fa-th-large"></i> Categorías</div>`;
            for (const cat of CATEGORIAS_MENU) {
                const isActive = this.app?.currentCategory === cat.id;
                const count = this.getCategoryCount(cat.id);
                html += `
                    <div class="category-item ${isActive ? 'active' : ''}"
                         data-category="${cat.id}"
                         onclick="window.app?.onCategoryClick('${cat.id}')">
                        <div class="category-icon" style="color:${cat.color};"><i class="${cat.icono}"></i></div>
                        <span>${cat.nombre}</span>
                        <span class="count-badge">${count}</span>
                    </div>`;
            }
            html += '</div>';
            this.container.innerHTML = html;
        } else {
            this.container.innerHTML = `
                <div style="padding:20px; text-align:center; color:var(--text-secondary);">
                    <i class="fas fa-arrow-left" style="font-size:32px; margin-bottom:12px; opacity:0.3;"></i>
                    <p style="font-size:13px;">Selecciona una sección</p>
                </div>`;
        }
    }
    renderSelect(sectionsList, currentId) {
        if (!this.select) return;
        let html = `<option value="">-- Seleccionar sección --</option>`;
        for (const section of sectionsList) {
            const selected = section.id === currentId ? 'selected' : '';
            html += `<option value="${section.id}" ${selected}>${escapeHtml(section.nombre)}</option>`;
        }
        this.select.innerHTML = html;
    }
    getCategoryCount(categoryId) {
        if (categoryId === 'estudiantes') return this.app?.students?.list?.length || 0;
        if (categoryId === 'notas_finales') return this.app?.students?.list?.length || 0;
        if (categoryId === 'plan') {
            const enlaces = this.app?.plan?.enlaces?.length || 0;
            const contenidos = this.app?.plan?.contenidos?.length || 0;
            return enlaces + contenidos;
        }
        if (categoryId === 'rubro') {
            const works = this.app?.grades?.works || {};
            return (works['rubro'] || []).length;
        }
        const works = this.app?.grades?.works || {};
        const items = works[categoryId] || [];
        return items.length;
    }
}