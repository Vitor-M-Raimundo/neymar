<?php

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

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

// aceitar tanto ?professor_id= quanto ?id=
$professor_id = isset($_GET['professor_id']) ? intval($_GET['professor_id']) : (isset($_GET['id']) ? intval($_GET['id']) : 0);
if ($professor_id <= 0) {
    echo json_encode(["success" => false, "message" => "ID do professor inválido"]);
    exit;
}

$sql = "SELECT DISTINCT a.id, a.nome AS nome_aluno, a.email, COALESCE(NULLIF(a.foto, ''), 'padrao/user.jpg') AS foto 
        FROM aluno a
        INNER JOIN aluno_professor ap ON a.id = ap.Aluno_ID
        WHERE ap.Professor_ID = ?
        ORDER BY a.nome ASC";

$stmt = $conn->prepare($sql);
if (!$stmt) {
    echo json_encode(["success" => false, "message" => "Erro ao preparar query: " . $conn->error]);
    exit;
}
$stmt->bind_param("i", $professor_id);
$stmt->execute();
$result = $stmt->get_result();

$baseUrl = 'https://proatleta.site/';
$alunos = [];
while ($row = $result->fetch_assoc()) {
    $fotoRaw = trim((string)($row['foto'] ?? ''));
    if ($fotoRaw === '') $foto = $baseUrl . 'padrao/user.jpg';
    elseif (!preg_match('#^https?://#i', $fotoRaw)) $foto = $baseUrl . ltrim($fotoRaw, "/");
    else $foto = $fotoRaw;

    // contar treinos (mantendo lógica original se existir tabela treinos)
    $stmt_count = $conn->prepare("SELECT COUNT(*) as total_treinos FROM treinos WHERE professor_id = ? AND aluno_id = ?");
    if ($stmt_count) {
        $stmt_count->bind_param("ii", $professor_id, $row['id']);
        $stmt_count->execute();
        $count_result = $stmt_count->get_result();
        $count_row = $count_result->fetch_assoc();
        $total = intval($count_row['total_treinos'] ?? 0);
        $stmt_count->close();
    } else {
        $total = 0;
    }

    $alunos[] = [
        'id' => (int)$row['id'],
        'nome_aluno' => $row['nome_aluno'] ?? '',
        'email' => $row['email'] ?? '',
        'foto' => $foto,
        'total_treinos' => $total
    ];
}

echo json_encode([
    "success" => true,
    "alunos" => $alunos,
    "total" => count($alunos)
], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

$stmt->close();
$conn->close();
?>