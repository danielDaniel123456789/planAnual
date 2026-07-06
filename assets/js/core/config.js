    class Config {
            constructor() {
                this.data = {};
                this.defaults = { tema: 'dark', nombreProfesor: '', ministerioEducacion: 'MINISTERIO DE EDUCACIÓN PÚBLICA',
                    direccionRegional: 'DIRECCIÓN REGIONAL DE SAN JOSÉ OESTE', circuitoEscolar: 'CIRCUITO ESCOLAR 01',
                    nombreColegio: 'COLEGIO TÉCNICO PROFESIONAL DE EDUCACIÓN COMERCIAL Y DE SERVICIOS' };
                this.loaded = false;
            }
            load() {
                try {
                    const stored = localStorage.getItem('app_config');
                    if (stored) this.data = JSON.parse(stored);
                    for (const key in this.defaults) {
                        if (!(key in this.data)) this.data[key] = this.defaults[key];
                    }
                    this.loaded = true;
                    this.save();
                } catch (e) {
                    console.warn('Error cargando configuración:', e);
                    this.data = { ...this.defaults };
                    this.loaded = true;
                }
                return this.data;
            }
            save() { try { localStorage.setItem('app_config', JSON.stringify(this.data)); } catch (e) { console.warn('Error guardando configuración:', e); } }
            get(key) { if (!this.loaded) this.load(); return this.data[key] !== undefined ? this.data[key] : this.defaults[key]; }
            set(key, value) { this.data[key] = value; this.save(); }
        }
        var config = new Config();
        config.load();