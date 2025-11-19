<?php

ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') exit(0);

$LOG_FILE = __DIR__ . '/registrar_dispositivo.log';
function logReg($msg) {
    global $LOG_FILE;
    $line = '['.date('Y-m-d H:i:s').'] '.$msg.PHP_EOL;
    @file_put_contents($LOG_FILE, $line, FILE_APPEND | LOCK_EX);
}

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
    $raw = file_get_contents('php://input');
    logReg("RAW: " . ($raw === false ? '<no-body>' : $raw));
    $body = json_decode($raw, true);
    if (!is_array($body)) {
        throw new Exception('JSON inválido');
    }

    $usuario_id = intval($body['usuario_id'] ?? 0);
    $tipo_usuario = strtolower(trim($body['tipo_usuario'] ?? ''));
    $token = trim($body['token'] ?? '');
    $plataforma = trim($body['plataforma'] ?? 'android');

    logReg("Parsed usuario_id={$usuario_id} tipo_usuario={$tipo_usuario} plataforma={$plataforma} token_prefix=" . substr($token,0,8));

    if ($usuario_id <= 0 || !in_array($tipo_usuario, ['aluno','professor']) || $token === '') {
        throw new Exception('Parâmetros inválidos');
    }

    $conn = new mysqli($host, $usuario, $senha, $banco);
    if ($conn->connect_error) throw new Exception('Erro conexão: ' . $conn->connect_error);
    $conn->set_charset('utf8mb4');

    // Verifica se token já existe
    $stmt = $conn->prepare("SELECT id, usuario_id, tipo_usuario FROM tokens_dispositivo WHERE token = ? LIMIT 1");
    if (!$stmt) throw new Exception('Erro prepare select: ' . $conn->error);
    $stmt->bind_param('s', $token);
    $stmt->execute();
    $res = $stmt->get_result();
    if ($row = $res->fetch_assoc()) {
        // update
        $id = intval($row['id']);
        $stmt->close();
        $upd = $conn->prepare("UPDATE tokens_dispositivo SET usuario_id = ?, tipo_usuario = ?, plataforma = ?, atualizado_em = CURRENT_TIMESTAMP WHERE id = ?");
        if (!$upd) throw new Exception('Erro prepare update: ' . $conn->error);
        $upd->bind_param('issi', $usuario_id, $tipo_usuario, $plataforma, $id);
        if (!$upd->execute()) {
            $errmsg = $upd->error;
            $upd->close();
            throw new Exception('Erro SQL update: ' . $errmsg);
        }
        $upd->close();
        logReg("Token existente atualizado id={$id}");
        echo json_encode(['success' => true, 'action' => 'updated', 'id' => $id]);
    } else {
        $stmt->close();
        // insert
        $ins = $conn->prepare("INSERT INTO tokens_dispositivo (usuario_id, tipo_usuario, token, plataforma, criado_em, atualizado_em) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)");
        if (!$ins) throw new Exception('Erro prepare insert: ' . $conn->error);
        $ins->bind_param('isss', $usuario_id, $tipo_usuario, $token, $plataforma);
        if (!$ins->execute()) {
            $errmsg = $ins->error;
            $ins->close();
            throw new Exception('Erro SQL insert: ' . $errmsg);
        }
        $insertId = $ins->insert_id;
        $ins->close();
        logReg("Token inserido id={$insertId}");
        echo json_encode(['success' => true, 'action' => 'inserted', 'id' => $insertId]);
    }

} catch (Exception $e) {
    http_response_code(400);
    $msg = $e->getMessage();
    logReg("ERROR: " . $msg);
    echo json_encode(['success' => false, 'message' => $msg]);
} finally {
    if (isset($conn) && $conn instanceof mysqli) $conn->close();
}