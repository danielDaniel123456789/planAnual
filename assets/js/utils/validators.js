// ==================== VALIDADORES ====================

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidName(name) {
    return name && name.trim().length >= 2;
}

function isValidNumber(value, min = 0, max = 100) {
    const num = parseFloat(value);
    return !isNaN(num) && num >= min && num <= max;
}

function isValidDate(date) {
    return date && !isNaN(new Date(date).getTime());
}

function isValidPercentage(value) {
    return isValidNumber(value, 0, 100);
}

function validateStudent(student) {
    const errors = [];
    if (!student.nombre || student.nombre.trim().length < 2) {
        errors.push('El nombre debe tener al menos 2 caracteres');
    }
    if (!student.correo || !isValidEmail(student.correo)) {
        errors.push('El correo electrónico no es válido');
    }
    return errors;
}

function validateStudents(students) {
    const errors = [];
    students.forEach((student, index) => {
        const studentErrors = validateStudent(student);
        if (studentErrors.length > 0) {
            errors.push(`Estudiante ${index + 1}: ${studentErrors.join(', ')}`);
        }
    });
    return errors;
}