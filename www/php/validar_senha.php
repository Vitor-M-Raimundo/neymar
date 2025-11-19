<?php

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
  http_response_code(204);
  exit;
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
$email = $payload['email'] ?? '';
$senha = $payload['senha'] ?? '';

if (!$email || !$senha) {
  echo json_encode(['success' => false, 'message' => 'Dados ausentes']);
  exit;
}

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senhaDb = "Vini@#07alves";
$banco = "u339248760_proatleta";

try {
  $pdo = new PDO("mysql:host=$host;dbname=$banco;charset=utf8", $usuario, $senhaDb, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
  ]);

  $user = null;
  $table = null;
  foreach (['aluno', 'professor'] as $t) {
    $st = $pdo->prepare("SELECT id, senha FROM $t WHERE email = ? LIMIT 1");
    $st->execute([$email]);
    if ($row = $st->fetch(PDO::FETCH_ASSOC)) {
      $user = $row;
      $table = $t;
      break;
    }
  }
  if (!$user) {
    echo json_encode(['success' => false, 'message' => 'Usuário não encontrado']);
    exit;
  }

  $hash = $user['senha'] ?? '';
  $ok = false;
  if ($hash && preg_match('/^\$2[aby]\$|^\$argon2/i', $hash)) {
    $ok = password_verify($senha, $hash);
    if ($ok && password_needs_rehash($hash, PASSWORD_DEFAULT)) {
      $novoHash = password_hash($senha, PASSWORD_DEFAULT);
      $upd = $pdo->prepare("UPDATE $table SET senha = ? WHERE id = ?");
      $upd->execute([$novoHash, $user['id']]);
    }
  } else {
    $ok = hash_equals((string) $hash, (string) $senha);
    if ($ok) {
      $novoHash = password_hash($senha, PASSWORD_DEFAULT);
      $upd = $pdo->prepare("UPDATE $table SET senha = ? WHERE id = ?");
      $upd->execute([$novoHash, $user['id']]);
    }
  }

  echo json_encode(['success' => $ok]);
} catch (Throwable $e) {
  http_response_code(500);
  echo json_encode(['success' => false, 'message' => 'Erro no servidor']);
}