<?php

// registrar_correo.php - Da de alta un correo en la tabla backups (sin datos)

require_once 'conexion.php';
define('API_KEY', 'miClaveSuperSecreta123');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['error' => 'Usa POST']));
}

$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? $_POST['api_key'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    exit(json_encode(['error' => 'Clave inválida']));
}

$correo = $_POST['correo'] ?? '';
if (empty($correo) || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Correo inválido']));
}

// Verificar si ya existe
$stmt = $pdo->prepare('SELECT COUNT(*) FROM backups WHERE correo = :correo');
$stmt->execute([':correo' => $correo]);
if ($stmt->fetchColumn() > 0) {
    http_response_code(409);
    exit(json_encode(['error' => 'El correo ya está registrado']));
}

// Insertar con JSON vacío
$sql = "INSERT INTO backups (correo, json_data, version) VALUES (:correo, '{}', '1.0')";
$stmt = $pdo->prepare($sql);
$stmt->execute([':correo' => $correo]);

echo json_encode(['success' => true, 'message' => 'Correo registrado correctamente']);
