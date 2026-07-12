<?php

// insert.php - Guarda respaldo vía POST, solo si el correo ya existe

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';
define('API_KEY', 'miClaveSuperSecreta123');

// 1. Verificar método POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Método no permitido. Usa POST.']));
}

// 2. Validar API Key
$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? $_POST['api_key'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    exit(json_encode(['error' => 'Clave API inválida']));
}

// 3. Obtener datos
$correo = $_POST['correo'] ?? '';
$version = $_POST['version'] ?? '1.0';
$jsonData = $_POST['json'] ?? null;

if ($jsonData === null) {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);
    if (json_last_error() === JSON_ERROR_NONE && is_array($data)) {
        $correo = $data['correo'] ?? $correo;
        $version = $data['version'] ?? $version;
        $jsonData = $data['json'] ?? null;
    }
}

if ($jsonData === null) {
    http_response_code(400);
    exit(json_encode(['error' => 'No se enviaron datos JSON']));
}

// 4. Validar correo
if (empty($correo) || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Correo electrónico inválido']));
}

// 5. Validar JSON
if (is_array($jsonData) || is_object($jsonData)) {
    $jsonString = json_encode($jsonData);
} else {
    $jsonString = $jsonData;
}
$test = json_decode($jsonString);
if ($test === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    exit(json_encode(['error' => 'JSON inválido: '.json_last_error_msg()]));
}

// 6. Verificar que el correo exista
try {
    $stmtCheck = $pdo->prepare('SELECT COUNT(*) FROM backups WHERE correo = :correo');
    $stmtCheck->execute([':correo' => $correo]);
    if (!$stmtCheck->fetchColumn()) {
        http_response_code(404);
        exit(json_encode([
            'error' => 'Correo no registrado',
            'message' => 'El correo no existe en la base de datos. Debes registrarlo primero.',
        ]));
    }

    // 7. Actualizar registro
    $sql = 'UPDATE backups 
            SET json_data = :json_data, 
                version = :version, 
                fecha_subida = NOW() 
            WHERE correo = :correo';
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':correo' => $correo,
        ':json_data' => $jsonString,
        ':version' => $version,
    ]);

    $response = [
        'success' => true,
        'message' => 'Respaldo actualizado correctamente',
        'correo' => $correo,
        'version' => $version,
        'tamaño_bytes' => strlen($jsonString),
    ];
    echo json_encode($response);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: '.$e->getMessage()]);
}
