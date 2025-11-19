<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
header("Content-Type: application/json; charset=utf-8");

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

$conn = new mysqli($host, $usuario, $senha, $banco);
if ($conn->connect_error) { http_response_code(500); echo json_encode(['sucesso'=>false,'mensagem'=>'Erro de conexão']); exit; }
$conn->set_charset('utf8mb4');

$professor_id = isset($_REQUEST['professor_id']) ? intval($_REQUEST['professor_id']) : 0;
$aluno_id     = isset($_REQUEST['aluno_id']) ? intval($_REQUEST['aluno_id']) : 0;

if ($professor_id <= 0 || $aluno_id <= 0) {
  echo json_encode(['sucesso'=>false,'mensagem'=>'Parâmetros inválidos']); $conn->close(); exit;
}

// Requer o índice único uniq_prof_aluno
$sql = "INSERT INTO conversas (professor_id, aluno_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE id=LAST_INSERT_ID(id), ultima_mensagem=ultima_mensagem";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $professor_id, $aluno_id);
if (!$stmt->execute()) {
  echo json_encode(['sucesso'=>false,'mensagem'=>'Falha ao obter conversa']); $stmt->close(); $conn->close(); exit;
}
$conversaId = $conn->insert_id;
$stmt->close();

echo json_encode(['sucesso'=>true,'conversa_id'=>$conversaId,'professor_id'=>$professor_id,'aluno_id'=>$aluno_id], JSON_UNESCAPED_UNICODE);
$conn->close();