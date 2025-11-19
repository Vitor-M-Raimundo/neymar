<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { echo json_encode(["success" => true, "associados" => []]); exit; }

$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

$conn = new mysqli($host, $usuario, $senha, $banco);
if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Falha na conexão: " . $conn->connect_error]);
    exit;
}
$conn->set_charset("utf8mb4");

$alunoId = 0;
if (isset($_POST['alunoId'])) $alunoId = intval($_POST['alunoId']);
elseif (isset($_GET['id'])) $alunoId = intval($_GET['id']);
elseif (isset($_GET['alunoId'])) $alunoId = intval($_GET['alunoId']);

if ($alunoId <= 0) {
    echo json_encode(["success" => false, "message" => "ID do aluno inválido"]);
    exit;
}

$sql = "SELECT ap.ID AS link_id,
               ap.Professor_ID AS professor_id,
               CONCAT_WS(' ', p.nome, p.sobrenome) AS nome_prof,
               p.email AS email,
               COALESCE(NULLIF(p.foto, ''), 'padrao/user.jpg') AS foto
        FROM aluno_professor ap
        INNER JOIN professor p ON ap.Professor_ID = p.id
        WHERE ap.Aluno_ID = ?";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Erro ao preparar query: " . $conn->error]);
    $conn->close();
    exit;
}
$stmt->bind_param("i", $alunoId);
if (!$stmt->execute()) {
    echo json_encode(["success" => false, "message" => "Erro ao executar query: " . $stmt->error]);
    $stmt->close();
    $conn->close();
    exit;
}

$result = $stmt->get_result();
$baseUrl = 'https://proatleta.site/';
$associados = [];
while ($row = $result->fetch_assoc()) {
    $fotoRaw = trim((string)($row['foto'] ?? ''));
    if ($fotoRaw === '') $foto = $baseUrl . 'padrao/user.jpg';
    elseif (!preg_match('#^https?://#i', $fotoRaw)) $foto = $baseUrl . ltrim($fotoRaw, "/");
    else $foto = $fotoRaw;

    $associados[] = [
        "id" => isset($row['professor_id']) ? (int)$row['professor_id'] : null,
        "link_id" => isset($row['link_id']) ? (int)$row['link_id'] : null,
        "nome_prof" => $row['nome_prof'] ?? '',
        "email" => $row['email'] ?? '',
        "foto" => $foto
    ];
}

echo json_encode(["success" => true, "associados" => $associados], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
$stmt->close();
$conn->close();
?>