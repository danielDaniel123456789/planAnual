<?php
/**
 * consultar.php - Verifica si un correo existe en la tabla 'backups' y devuelve sus datos.
 * Método: GET
 * Parámetros: api_key (obligatorio), correo (obligatorio)
 * Respuesta: JSON con los datos del correo o error.
 */

// ============================================================
// 1. CABECERAS CORS (para desarrollo, permite cualquier origen)
// ============================================================
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

// Si la petición es OPTIONS (preflight), responder OK y terminar
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// ============================================================
// 2. INCLUIR CONEXIÓN A LA BASE DE DATOS
// ============================================================
require_once 'conexion.php';

// ============================================================
// 3. DEFINIR CLAVE API (debe coincidir con la del cliente)
// ============================================================
define('API_KEY', 'miClaveSuperSecreta123');

// ============================================================
// 4. VERIFICAR MÉTODO HTTP (solo GET)
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
        SELECT correo, version, fecha_subida, LENGTH(json_data) AS tamaño_bytes 
        FROM backups 
        WHERE correo = :correo
    ');
    $stmt->execute([':correo' => $correo]);
    $row = $stmt->fetch();

    if (!$row) {
        http_response_code(404);
        exit(json_encode([
            'error' => 'Correo no registrado',
            'message' => "El correo '$correo' no existe en la base de datos.",
        ]));
    }

    // ============================================================
    // 8. RESPUESTA EXITOSA
    // ============================================================
    echo json_encode([
        'success' => true,
        'correo' => $row['correo'],
        'version' => $row['version'],
        'fecha_subida' => $row['fecha_subida'],
        'tamaño_bytes' => (int) $row['tamaño_bytes'],
        'mensaje' => 'Correo encontrado.',
    ]);
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
