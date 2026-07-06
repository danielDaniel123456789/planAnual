      class Sections {
            constructor(database) { this.db = database; this.list = []; this.currentId = null; }
            async load() {
                this.list = await this.db.getAll(STORES.SECCIONES);
                if (this.list.length === 0) {
                    const id = await this.create('Sección Principal');
                    this.list = await this.db.getAll(STORES.SECCIONES);
                    this.currentId = id;
                } else { this.currentId = this.list[0].id; }
                return this.list;
            }
            async create(nombre) { const id = await this.db.add(STORES.SECCIONES, { nombre }); return id; }
            async update(id, nombre) {
                const section = await this.db.get(STORES.SECCIONES, id);
                if (section) {
                    section.nombre = nombre;
                    await this.db.put(STORES.SECCIONES, section);
                    const index = this.list.findIndex(s => s.id === id);
                    if (index !== -1) this.list[index] = section;
                    return true;
                }
                return false;
            }
            async delete(id) {
                await this.db.delete(STORES.SECCIONES, id);
                this.list = this.list.filter(s => s.id !== id);
                if (this.currentId === id) { this.currentId = this.list.length > 0 ? this.list[0].id : null; }
                return true;
            }
            getCurrent() { return this.list.find(s => s.id === this.currentId) || null; }
            getById(id) { return this.list.find(s => s.id === id) || null; }
            setCurrent(id) { const exists = this.list.some(s => s.id === id); if (exists) { this.currentId = id; return true; } return false; }
        }
        var sections = new Sections(db);