<?php

// Saída JSON; erros registrados em arquivo
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/php_error.log');

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    echo json_encode(["success" => true, "solicitacoes" => []]);
    exit;
}

$debug = (isset($_GET['debug']) && $_GET['debug'] === '1') || (isset($_POST['debug']) && $_POST['debug'] === '1');

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conn = new mysqli($host, $usuario, $senha, $banco);
    $conn->set_charset("utf8mb4");

    // aceita id por POST[id|alunoId] ou GET[id|alunoId]
    $alunoId = 0;
    if (isset($_POST['alunoId'])) $alunoId = intval($_POST['alunoId']);
    elseif (isset($_POST['id'])) $alunoId = intval($_POST['id']);
    elseif (isset($_GET['id'])) $alunoId = intval($_GET['id']);
    elseif (isset($_GET['alunoId'])) $alunoId = intval($_GET['alunoId']);

    if ($alunoId <= 0) {
        http_response_code(400);
        echo json_encode(["success" => false, "message" => "ID do aluno inválido", "alunoId_received" => $alunoId]);
        $conn->close();
        exit;
    }

    // Query: buscar solicitações na tabela solicitacoes_professor e dados do professor
    $sql = "SELECT s.ID AS ID,
                   s.ID_professor AS professor_id,
                   CONCAT_WS(' ', p.nome, p.sobrenome) AS nome_prof,
                   p.email AS email_professor,
                   COALESCE(NULLIF(p.foto, ''), 'padrao/user.jpg') AS foto,
                   COALESCE(s.status, 'pendente') AS status
            FROM solicitacoes_professor s
            INNER JOIN professor p ON s.ID_professor = p.id
            WHERE s.ID_aluno = ?";

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Erro ao preparar statement: " . $conn->error);
    }

    $stmt->bind_param("i", $alunoId);
    $stmt->execute();
    $result = $stmt->get_result();

    $baseUrl = 'https://proatleta.site/';
    $solicitacoes = [];

    while ($row = $result->fetch_assoc()) {
        $nome_prof = trim((string)($row['nome_prof'] ?? ''));
        $rawFoto = trim((string)($row['foto'] ?? ''));
        if ($rawFoto === '') {
            $foto = $baseUrl . 'padrao/user.jpg';
        } elseif (!preg_match('#^https?://#i', $rawFoto)) {
            $foto = $baseUrl . ltrim($rawFoto, "/");
        } else {
            $foto = $rawFoto;
        }

        $solicitacoes[] = [
            "ID" => isset($row['ID']) ? (int)$row['ID'] : null,
            "professor_id" => isset($row['professor_id']) ? (int)$row['professor_id'] : null,
            "nome_prof" => $nome_prof,
            "email_professor" => $row['email_professor'] ?? '',
            "foto" => $foto,
            "status" => $row['status'] ?? 'pendente'
        ];
    }

    $out = ["success" => true, "solicitacoes" => $solicitacoes];
    if ($debug) {
        $out["_debug"] = [
            "alunoId_received" => $alunoId,
            "rows_returned" => count($solicitacoes),
            "sql" => $sql
        ];
    }

    echo json_encode($out, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

    $stmt->close();
    $conn->close();
    exit;
} catch (Throwable $e) {
    error_log("get_solicitacoes error: " . $e->getMessage());
    http_response_code(500);
    $msg = "Erro interno no servidor.";
    if ($debug) $msg = $e->getMessage();
    echo json_encode(["success" => false, "message" => $msg]);
    exit;
}
?>