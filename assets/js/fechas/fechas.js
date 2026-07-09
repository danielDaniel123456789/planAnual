  function escapeHtml(str) {
            if (!str) return '';
            const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
            return str.replace(/[&<>"']/g, function(m) { return map[m]; });
        }

        function getDayMonth() {
            const now = new Date();
            return String(now.getDate()).padStart(2, '0') + '/' + String(now.getMonth() + 1).padStart(2, '0');
        }

        function getToday() { return new Date().toISOString().split('T')[0]; }


function getDayMonth() {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`; // formato DD/MM/YYYY
}