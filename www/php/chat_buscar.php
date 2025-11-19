<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Content-Type: application/json; charset=utf-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

date_default_timezone_set('America/Sao_Paulo');

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

function out($arr, $code = 200) {
  http_response_code($code);
  echo json_encode($arr, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') out(['sucesso' => false, 'mensagem' => 'Método inválido'], 405);

$conversa_id = isset($_GET['conversa_id']) ? (int)$_GET['conversa_id'] : 0;
$apos_id     = isset($_GET['apos_id'])     ? (int)$_GET['apos_id']     : 0; // param used by frontend polling
$limit       = isset($_GET['limit'])       ? (int)$_GET['limit']       : 200;
if ($limit <= 0) $limit = 200;
$limit = min($limit, 1000);

if ($conversa_id <= 0) out(['sucesso' => false, 'mensagem' => 'Parâmetros inválidos'], 400);

$conn = @new mysqli($host, $usuario, $senha, $banco);
if ($conn->connect_error) out(['sucesso' => false, 'mensagem' => 'Erro de conexão'], 500);
$conn->set_charset('utf8mb4');
$conn->query("SET time_zone = '-03:00'");

// Verifica existência de conversa
$stmt = $conn->prepare("SELECT 1 FROM conversas WHERE id=? LIMIT 1");
$stmt->bind_param('i', $conversa_id);
$stmt->execute();
$stmt->bind_result($one);
$ok = $stmt->fetch() ? true : false;
$stmt->close();
if (!$ok) { $conn->close(); out(['sucesso' => false, 'mensagem' => 'Conversa inexistente'], 404); }

// Detecta colunas para compatibilidade com frontend
$cols = [];
$rs = $conn->query("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'mensagens'");
while ($r = $rs->fetch_assoc()) $cols[strtolower($r['COLUMN_NAME'])] = true;
$rs->close();

$select = "SELECT id, conversa_id, remetente_id, conteudo, DATE_FORMAT(criado, '%Y-%m-%d %H:%i:%s') AS criado";
$legacyRemIs = false;
if (isset($cols['remetente_professor'])) {
  $select .= ", remetente_professor";
} elseif (isset($cols['remetente_is_professor'])) {
  $select .= ", remetente_is_professor";
  $legacyRemIs = true;
}
$select .= " FROM mensagens WHERE conversa_id=? AND id>? ORDER BY id ASC LIMIT ?";

$stmt = $conn->prepare($select);
$stmt->bind_param('iii', $conversa_id, $apos_id, $limit);
$stmt->execute();
$res = $stmt->get_result();

$mensagens = [];
while ($row = $res->fetch_assoc()) {
  // normaliza coluna para o frontend: remetente_professor com semântica 0=professor,1=aluno
  if ($legacyRemIs && isset($row['remetente_is_professor'])) {
    // coluna legada: 1=professor,0=aluno -> converte: 0=professor,1=aluno
    $row['remetente_professor'] = ($row['remetente_is_professor'] == 1) ? 0 : 1;
    unset($row['remetente_is_professor']);
  }
  $mensagens[] = $row;
}
$stmt->close();
$conn->close();

out(['sucesso' => true, 'mensagens' => $mensagens]);
?>