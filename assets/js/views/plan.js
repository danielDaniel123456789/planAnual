    class Plan {
            constructor(database) {
                this.db = database;
                this.enlaces = [];
                this.contenidos = [];
                this.currentSectionId = null;
            }
            async load(sectionId) {
                this.currentSectionId = sectionId;
                this.enlaces = await this.db.getByIndex(STORES.PLAN_ENLACES, 'seccionId', sectionId);
                this.contenidos = await this.db.getByIndex(STORES.PLAN_CONTENIDO, 'seccionId', sectionId);
                this.contenidos.sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
                return { enlaces: this.enlaces, contenidos: this.contenidos };
            }
            async addEnlace(data) {
                const enlace = { ...data, seccionId: this.currentSectionId, fecha: getDayMonth(), fechaCreacion: new Date().toISOString() };
                const id = await this.db.add(STORES.PLAN_ENLACES, enlace);
                await this.load(this.currentSectionId);
                return id;
            }
            async deleteEnlace(id) { await this.db.delete(STORES.PLAN_ENLACES, id);
                await this.load(this.currentSectionId); return true; }
            async addContenido(data) {
                const contenido = { ...data, seccionId: this.currentSectionId, fecha: getDayMonth(), fechaCreacion: new Date().toISOString() };
                const id = await this.db.add(STORES.PLAN_CONTENIDO, contenido);
                await this.load(this.currentSectionId);
                return id;
            }
            async deleteContenido(id) { await this.db.delete(STORES.PLAN_CONTENIDO, id);
                await this.load(this.currentSectionId); return true; }
            async updateContenido(id, data) {
                const contenido = await this.db.get(STORES.PLAN_CONTENIDO, id);
                if (contenido) {
                    contenido.titulo = data.titulo || contenido.titulo;
                    contenido.contenido = data.contenido || contenido.contenido;
                    contenido.periodo = data.periodo || contenido.periodo;
                    await this.db.put(STORES.PLAN_CONTENIDO, contenido);
                    await this.load(this.currentSectionId);
                    return true;
                }
                return false;
            }
            getEnlacesByTipo(tipo) { return this.enlaces.filter(e => e.tipo === tipo); }
            getContenidosByPeriodo(periodo) { return this.contenidos.filter(c => c.periodo === periodo); }
        }
        var plan = new Plan(db);