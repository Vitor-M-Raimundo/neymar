<?php
// Cabeçalhos CORS
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json; charset=UTF-8");

// Responde a preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Conexão com o banco
$host = "localhost";
$usuario = "u339248760_proatleta1";
$senha = "Vini@#07alves";
$banco = "u339248760_proatleta";

$conn = new mysqli($host, $usuario, $senha, $banco);

if ($conn->connect_error) {
    echo json_encode(["success" => false, "message" => "Falha na conexão: " . $conn->connect_error]);
    exit;
}

// Pega o ID do professor
$professor_id = isset($_GET['professor_id']) ? intval($_GET['professor_id']) : 0;

if ($professor_id <= 0) {
    echo json_encode(["success" => false, "message" => "ID do professor inválido"]);
    exit;
}

// Busca todos os alunos vinculados ao professor através da tabela aluno_professor
$sql = "SELECT DISTINCT a.id, a.nome, a.email, a.foto 
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

$alunos = [];
while ($row = $result->fetch_assoc()) {
    // Conta quantos treinos este aluno tem
    $stmt_count = $conn->prepare("SELECT COUNT(*) as total_treinos FROM treinos WHERE professor_id = ? AND aluno_id = ?");
    $stmt_count->bind_param("ii", $professor_id, $row['id']);
    $stmt_count->execute();
    $count_result = $stmt_count->get_result();
    $count_row = $count_result->fetch_assoc();
    
    $alunos[] = [
        'id' => $row['id'],
        'nome' => $row['nome'],
        'email' => $row['email'],
        'foto' => $row['foto'] ?? 'img/user.jpg',
        'total_treinos' => $count_row['total_treinos']
    ];
    
    $stmt_count->close();
}

echo json_encode([
    "success" => true,
    "alunos" => $alunos,
    "total" => count($alunos)
]);

$stmt->close();
$conn->close();
?>