   class Students {
            constructor(database) { this.db = database; this.list = []; this.currentSectionId = null; }
            async load(sectionId) {
                this.currentSectionId = sectionId;
                this.list = await this.db.getByIndex(STORES.ESTUDIANTES, 'seccionId', sectionId);
                return this.list;
            }
            async save(students) {
                await this.db.deleteByIndex(STORES.ESTUDIANTES, 'seccionId', this.currentSectionId);
                for (const student of students) {
                    await this.db.add(STORES.ESTUDIANTES, {
                        cedula: student.cedula?.trim() || '',
                        nombre: student.nombre?.trim() || '',
                        apellidos: student.apellidos?.trim() || '',
                        correo: student.correo?.trim() || '',
                        seccionId: this.currentSectionId
                    });
                }
                this.list = await this.db.getByIndex(STORES.ESTUDIANTES, 'seccionId', this.currentSectionId);
                return this.list;
            }
            async addStudent(studentData) {
                const student = {
                    cedula: studentData.cedula?.trim() || '',
                    nombre: studentData.nombre?.trim() || '',
                    apellidos: studentData.apellidos?.trim() || '',
                    correo: studentData.correo?.trim() || '',
                    seccionId: this.currentSectionId
                };
                const id = await this.db.add(STORES.ESTUDIANTES, student);
                this.list = await this.db.getByIndex(STORES.ESTUDIANTES, 'seccionId', this.currentSectionId);
                return id;
            }
            async deleteStudent(id) {
                await this.db.delete(STORES.ESTUDIANTES, id);
                this.list = this.list.filter(s => s.id !== id);
                return this.list;
            }
            getById(id) { return this.list.find(s => s.id === id) || null; }
            getFullName(student) { return `${student.nombre || ''} ${student.apellidos || ''}`.trim() || student.nombre || 'Sin nombre'; }
        }
        var students = new Students(db);