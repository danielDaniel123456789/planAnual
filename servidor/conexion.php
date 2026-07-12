<?php

// conexion.php
$host = 'localhost';          // o '127.0.0.1'
$dbname = 'educuose_json_educacion'; // el nombre de tu base de datos
$username = 'educuose_educuose_json_educacion';     // el usuario que tiene acceso a la DB
$password = 'educuose_json_educacion';  // la contraseña de ese usuario

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch (PDOException $e) {
    exit('Error de conexión: '.$e->getMessage());
}
