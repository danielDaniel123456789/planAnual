<?php
/**
 * descargarJSON.php.
 *
 * Endpoint para descargar el respaldo JSON asociado a un correo.
 * Método: GET
 * Parámetros:
 *   - api_key (obligatorio) - Clave de autenticación
 *   - correo   (obligatorio) - Correo electrónico registrado
 *
 * Respuesta:
 *   - 200 OK: Devuelve el archivo JSON para descarga.
 *   - 400 Bad Request: Faltan parámetros o formato inválido.
 *   - 401 Unauthorized: API key inválida.
 *   - 404 Not Found: Correo no registrado.
 *   - 405 Method Not Allowed: Solo GET permitido.
 *   - 500 Internal Server Error: Error en la base de datos.
 */

// ============================================================
// 1. CABECERAS CORS
// ============================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
// 2. INCLUIR CONEXIÓN A LA BASE DE DATOS
// ============================================================
require_once 'conexion.php'; // Debe definir $pdo

// ============================================================
// 3. DEFINIR CLAVE API
// ============================================================
define('API_KEY', 'miClaveSuperSecreta123');

// ============================================================
// 4. VERIFICAR MÉTODO HTTP
// ============================================================
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(['error' => 'Método no permitido. Usa GET.']));
}

// ============================================================
// 5. VALIDAR CLAVE API
// ============================================================
$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? $_GET['api_key'] ?? '';

if ($apiKey !== API_KEY) {
    http_response_code(401);
    exit(json_encode(['error' => 'Clave API inválida']));
}

// ============================================================
// 6. OBTENER Y VALIDAR CORREO
// ============================================================
$correo = $_GET['correo'] ?? '';

if (empty($correo)) {
    http_response_code(400);
    exit(json_encode(['error' => 'El parámetro "correo" es obligatorio.']));
}

if (!filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Correo electrónico inválido.']));
}

// ============================================================
// 7. CONSULTAR LA BASE DE DATOS
// ============================================================
try {
    $stmt = $pdo->prepare('
        SELECT json_data, fecha_subida 
        FROM backups 
        WHERE correo = :correo
    ');
    $stmt->execute([':correo' => $correo]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        http_response_code(404);
        exit(json_encode([
            'error' => 'Correo no registrado',
            'message' => "El correo '$correo' no existe en la base de datos.",
        ]));
    }

    // ============================================================
    // 8. VALIDAR QUE EL JSON SEA VÁLIDO (compatible con PHP < 8.3)
    // ============================================================
    $json_data = $row['json_data'];

    // Verificar que sea un JSON válido usando json_decode
    $test = json_decode($json_data);
    if ($test === null && json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(500);
        exit(json_encode([
            'error' => 'El respaldo almacenado no es un JSON válido.',
            'details' => json_last_error_msg(),
        ]));
    }

    // ============================================================
    // 9. DEVOLVER EL JSON CON CABECERAS DE DESCARGA
    // ============================================================
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="backup_'.$correo.'_'.date('Y-m-d').'.json"');
    header('Content-Length: '.strlen($json_data));
    header('Cache-Control: private, max-age=0, must-revalidate');
    header('Pragma: public');

    echo $json_data;
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error en la base de datos: '.$e->getMessage(),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Error interno: '.$e->getMessage(),
    ]);
}
