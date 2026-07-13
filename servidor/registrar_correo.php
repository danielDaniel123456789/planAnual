<?php

// insertarCorreo.php - Registra un correo en la tabla backups (JSON vacío)

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once 'conexion.php';
define('API_KEY', 'miClaveSuperSecreta123');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Método no permitido. Usa POST.']));
}

$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? $_POST['api_key'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    exit(json_encode(['error' => 'Clave API inválida']));
}

$correo = $_POST['correo'] ?? '';
if (empty($correo) || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Correo electrónico inválido']));
}

try {
    // Verificar si el correo ya existe
    $stmtCheck = $pdo->prepare('SELECT COUNT(*) FROM backups WHERE correo = :correo');
    $stmtCheck->execute([':correo' => $correo]);
    if ($stmtCheck->fetchColumn() > 0) {
        http_response_code(409);
        exit(json_encode(['error' => 'El correo ya está registrado']));
    }

    // Insertar con JSON vacío
    $sql = "INSERT INTO backups (correo, json_data, version) VALUES (:correo, '{}', '1.0')";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':correo' => $correo]);

    echo json_encode(['success' => true, 'message' => 'Correo registrado correctamente']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Error en la base de datos: '.$e->getMessage()]);
}
