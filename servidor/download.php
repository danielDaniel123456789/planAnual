<?php

// download.php - Devuelve el JSON de un correo (solo si existe)

require_once 'conexion.php';
define('API_KEY', 'miClaveSuperSecreta123');

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    exit(json_encode(['error' => 'Usa GET']));
}

$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? $_GET['api_key'] ?? '';
if ($apiKey !== API_KEY) {
    http_response_code(401);
    exit(json_encode(['error' => 'Clave inválida']));
}

$correo = $_GET['correo'] ?? '';
if (empty($correo) || !filter_var($correo, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit(json_encode(['error' => 'Correo inválido']));
}

$stmt = $pdo->prepare('SELECT json_data, version, fecha_subida FROM backups WHERE correo = :correo');
$stmt->execute([':correo' => $correo]);
$row = $stmt->fetch();

if ($row) {
    header('Content-Type: application/json');
    header('Content-Disposition: attachment; filename="backup_'.$correo.'_'.date('Y-m-d').'.json"');
    echo $row['json_data'];
} else {
    http_response_code(404);
    echo json_encode(['error' => 'No se encontró respaldo para este correo']);
}
